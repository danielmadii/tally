-- Tally — Retail Sales Attribution & Stock System
-- Core schema (Blueprint Appendix A). Sales + stock are an append-only ledger:
-- rows are never edited or deleted, only reversed.

create extension if not exists pgcrypto;

-- ---------- organisation ----------

create table shop (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  name        text not null,
  city        text,
  address     text,
  is_active   boolean not null default true,
  opened_on   date,
  created_at  timestamptz not null default now()
);

create table app_user (
  id            uuid primary key default gen_random_uuid(),
  full_name     text not null,
  phone         text not null unique,
  pin_hash      text not null,
  role          text not null check (role in ('salesperson','supervisor','area_manager','admin')),
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  last_login_at timestamptz
);

-- Date-ranged: reports resolve shop from the sale row, never from the
-- salesperson's current assignment, so transfers don't rewrite history.
create table user_shop (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references app_user(id),
  shop_id    uuid not null references shop(id),
  start_date date not null default current_date,
  end_date   date,
  is_primary boolean not null default true
);
create index user_shop_user_idx on user_shop (user_id, start_date);

-- ---------- catalogue ----------

create table brand (
  id        uuid primary key default gen_random_uuid(),
  name      text not null unique,
  is_active boolean not null default true
);

create table category (
  id        uuid primary key default gen_random_uuid(),
  name      text not null,
  parent_id uuid references category(id)
);

create table product (
  id          uuid primary key default gen_random_uuid(),
  code        text unique,
  name        text not null,
  brand_id    uuid not null references brand(id),
  category_id uuid not null references category(id),
  description text,
  is_active   boolean not null default true
);

-- The thing actually sold. Everything downstream references variant, never product.
create table variant (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references product(id),
  sku           text not null unique,
  shade_name    text,
  shade_code    text,
  size_label    text,
  price         numeric(12,2) not null,
  cost_price    numeric(12,2),
  reorder_point int not null default 3,
  image_url     text,
  is_active     boolean not null default true
);
create index variant_product_idx on variant (product_id);

-- One variant may legitimately carry several barcodes.
create table variant_barcode (
  id         uuid primary key default gen_random_uuid(),
  variant_id uuid not null references variant(id),
  barcode    text not null unique,
  is_primary boolean not null default true
);

create table price_history (
  id         uuid primary key default gen_random_uuid(),
  variant_id uuid not null references variant(id),
  price      numeric(12,2) not null,
  cost_price numeric(12,2),
  valid_from timestamptz not null default now(),
  valid_to   timestamptz,
  changed_by uuid references app_user(id)
);

-- ---------- sales ledger (append-only) ----------

create sequence sale_no_seq;

create table sale (
  id                  uuid primary key default gen_random_uuid(),
  sale_no             text not null unique,
  shop_id             uuid not null references shop(id),
  salesperson_id      uuid not null references app_user(id),
  entered_by_id       uuid not null references app_user(id), -- differs only for supervisor entry
  business_date       date not null,                          -- frozen at insert (06:00 cut-off)
  sold_at             timestamptz not null default now(),
  subtotal            numeric(12,2) not null,
  discount_total      numeric(12,2) not null default 0,
  total               numeric(12,2) not null,
  status              text not null default 'completed' check (status in ('completed','voided','returned')),
  void_reason         text,
  voided_by           uuid references app_user(id),
  voided_at           timestamptz,
  void_requested_at   timestamptz,
  void_request_reason text,
  idempotency_key     text unique,
  device_hash         text,
  geo_lat             double precision,
  geo_lng             double precision
);
create index sale_shop_date_idx on sale (shop_id, business_date);
create index sale_person_date_idx on sale (salesperson_id, business_date);

create table sale_line (
  id                 uuid primary key default gen_random_uuid(),
  sale_id            uuid not null references sale(id),
  variant_id         uuid not null references variant(id),
  qty                int not null check (qty > 0),
  unit_price         numeric(12,2) not null,
  discount           numeric(12,2) not null default 0,
  line_total         numeric(12,2) not null,
  cost_price_at_sale numeric(12,2) -- copied at sale time, not joined
);
create index sale_line_sale_idx on sale_line (sale_id);
create index sale_line_variant_idx on sale_line (variant_id);

-- ---------- stock ----------

-- The stock ledger: source of truth, append-only.
create table stock_movement (
  id            uuid primary key default gen_random_uuid(),
  shop_id       uuid not null references shop(id),
  variant_id    uuid not null references variant(id),
  qty_delta     int not null, -- signed
  movement_type text not null check (movement_type in ('stock_in','sale','return','adjustment','count','write_off')),
  ref_type      text,
  ref_id        uuid,
  created_by    uuid references app_user(id),
  created_at    timestamptz not null default now(),
  note          text
);
create index stock_movement_idx on stock_movement (shop_id, variant_id, created_at);

-- Derived cache, rebuildable by summing the ledger. If they disagree, the ledger wins.
create table stock_level (
  shop_id     uuid not null references shop(id),
  variant_id  uuid not null references variant(id),
  qty_on_hand int not null default 0,
  updated_at  timestamptz not null default now(),
  primary key (shop_id, variant_id)
);

-- ---------- performance ----------

create table target (
  id           uuid primary key default gen_random_uuid(),
  period_month date not null, -- first day of month
  shop_id      uuid references shop(id),
  user_id      uuid references app_user(id),
  target_value numeric(12,2),
  target_units int,
  set_by       uuid references app_user(id),
  set_at       timestamptz not null default now(),
  check (shop_id is not null or user_id is not null)
);
create unique index target_user_month_idx on target (user_id, period_month) where user_id is not null;
create unique index target_shop_month_idx on target (shop_id, period_month) where user_id is null;

create table daily_summary (
  business_date date not null,
  shop_id       uuid not null references shop(id),
  user_id       uuid not null references app_user(id),
  variant_id    uuid not null references variant(id),
  revenue       numeric(12,2) not null default 0,
  units         int not null default 0,
  sale_count    int not null default 0,
  primary key (business_date, shop_id, user_id, variant_id)
);

-- ---------- governance ----------

create table audit_log (
  id         uuid primary key default gen_random_uuid(),
  actor_id   uuid references app_user(id),
  action     text not null,
  entity     text,
  entity_id  uuid,
  before     jsonb,
  after      jsonb,
  ip         text,
  created_at timestamptz not null default now()
);
create index audit_log_created_idx on audit_log (created_at);

-- ---------- reconciliation ----------

create table reconciliation (
  id            uuid primary key default gen_random_uuid(),
  shop_id       uuid not null references shop(id),
  business_date date not null,
  till_total    numeric(12,2) not null,
  entered_by    uuid not null references app_user(id),
  created_at    timestamptz not null default now(),
  unique (shop_id, business_date)
);

-- ---------- create_sale: one transaction, idempotent ----------
-- Writes the sale header, its lines, one stock movement per line and the
-- stock cache in a single transaction. A retried request (same idempotency
-- key) returns the original sale rather than creating a second.

create or replace function create_sale(
  p_idempotency_key text,
  p_shop_id         uuid,
  p_salesperson_id  uuid,
  p_entered_by_id   uuid,
  p_lines           jsonb, -- [{variant_id, qty, unit_price, discount}]
  p_device_hash     text default null,
  p_geo_lat         double precision default null,
  p_geo_lng         double precision default null
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_existing   sale%rowtype;
  v_sale_id    uuid := gen_random_uuid();
  v_sale_no    text;
  v_bdate      date;
  v_line       jsonb;
  v_subtotal   numeric(12,2) := 0;
  v_discount   numeric(12,2) := 0;
  v_line_total numeric(12,2);
  v_cost       numeric(12,2);
begin
  select * into v_existing from sale where idempotency_key = p_idempotency_key;
  if found then
    return jsonb_build_object('id', v_existing.id, 'sale_no', v_existing.sale_no,
                              'total', v_existing.total, 'duplicate', true);
  end if;

  -- Business day with a 06:00 cut-off: a sale rung at 23:50 (or 01:30) falls
  -- on the trading day it belongs to. Frozen here, never computed at report time.
  v_bdate := (now() - interval '6 hours')::date;
  v_sale_no := 'S' || to_char(now(), 'YYMMDD') || '-' || lpad(nextval('sale_no_seq')::text, 5, '0');

  insert into sale (id, sale_no, shop_id, salesperson_id, entered_by_id, business_date,
                    subtotal, discount_total, total, idempotency_key, device_hash, geo_lat, geo_lng)
  values (v_sale_id, v_sale_no, p_shop_id, p_salesperson_id, p_entered_by_id, v_bdate,
          0, 0, 0, p_idempotency_key, p_device_hash, p_geo_lat, p_geo_lng);

  for v_line in select * from jsonb_array_elements(p_lines)
  loop
    select cost_price into v_cost from variant where id = (v_line->>'variant_id')::uuid;
    v_line_total := (v_line->>'qty')::int * (v_line->>'unit_price')::numeric
                    - coalesce((v_line->>'discount')::numeric, 0);
    v_subtotal := v_subtotal + (v_line->>'qty')::int * (v_line->>'unit_price')::numeric;
    v_discount := v_discount + coalesce((v_line->>'discount')::numeric, 0);

    insert into sale_line (sale_id, variant_id, qty, unit_price, discount, line_total, cost_price_at_sale)
    values (v_sale_id, (v_line->>'variant_id')::uuid, (v_line->>'qty')::int,
            (v_line->>'unit_price')::numeric, coalesce((v_line->>'discount')::numeric, 0),
            v_line_total, v_cost);

    insert into stock_movement (shop_id, variant_id, qty_delta, movement_type, ref_type, ref_id, created_by)
    values (p_shop_id, (v_line->>'variant_id')::uuid, -((v_line->>'qty')::int),
            'sale', 'sale', v_sale_id, p_entered_by_id);

    insert into stock_level (shop_id, variant_id, qty_on_hand, updated_at)
    values (p_shop_id, (v_line->>'variant_id')::uuid, -((v_line->>'qty')::int), now())
    on conflict (shop_id, variant_id)
    do update set qty_on_hand = stock_level.qty_on_hand + excluded.qty_on_hand, updated_at = now();
  end loop;

  update sale set subtotal = v_subtotal, discount_total = v_discount,
                  total = v_subtotal - v_discount
  where id = v_sale_id;

  return jsonb_build_object('id', v_sale_id, 'sale_no', v_sale_no,
                            'total', v_subtotal - v_discount, 'duplicate', false);
end;
$$;

-- The app talks to the database through the service role only; RLS stays on
-- so the anon key can read nothing if it ever leaks into a client bundle.
alter table shop            enable row level security;
alter table app_user        enable row level security;
alter table user_shop       enable row level security;
alter table brand           enable row level security;
alter table category        enable row level security;
alter table product         enable row level security;
alter table variant         enable row level security;
alter table variant_barcode enable row level security;
alter table price_history   enable row level security;
alter table sale            enable row level security;
alter table sale_line       enable row level security;
alter table stock_movement  enable row level security;
alter table stock_level     enable row level security;
alter table target          enable row level security;
alter table daily_summary   enable row level security;
alter table audit_log       enable row level security;
alter table reconciliation  enable row level security;
