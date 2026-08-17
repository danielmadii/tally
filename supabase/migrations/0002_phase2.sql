-- Tally Phase 2: void approval, returns, stock-in, daily summary rebuild.
-- All corrections are reversing entries — the ledger stays append-only.

-- Approve a void: freeze the sale as voided and put the stock back.
create or replace function void_sale(p_sale_id uuid, p_actor uuid, p_reason text default null)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_sale sale%rowtype;
begin
  select * into v_sale from sale where id = p_sale_id for update;
  if not found then
    raise exception 'Sale not found';
  end if;
  if v_sale.status <> 'completed' then
    raise exception 'Sale is not open';
  end if;

  update sale
     set status = 'voided',
         void_reason = coalesce(p_reason, void_request_reason, 'unspecified'),
         voided_by = p_actor,
         voided_at = now()
   where id = p_sale_id;

  insert into stock_movement (shop_id, variant_id, qty_delta, movement_type, ref_type, ref_id, created_by, note)
  select v_sale.shop_id, sl.variant_id, sl.qty, 'adjustment', 'sale_void', p_sale_id, p_actor, 'void reversal'
    from sale_line sl where sl.sale_id = p_sale_id;

  update stock_level lvl
     set qty_on_hand = lvl.qty_on_hand + sl.qty, updated_at = now()
    from sale_line sl
   where sl.sale_id = p_sale_id
     and lvl.shop_id = v_sale.shop_id
     and lvl.variant_id = sl.variant_id;

  insert into audit_log (actor_id, action, entity, entity_id, before, after)
  values (p_actor, 'void_approve', 'sale', p_sale_id,
          jsonb_build_object('status', 'completed'),
          jsonb_build_object('status', 'voided', 'reason', coalesce(p_reason, v_sale.void_request_reason)));

  return jsonb_build_object('id', p_sale_id, 'status', 'voided');
end;
$$;

-- Record a full return against a sale: stock comes back with a movement dated
-- now (the return period), the sale is flagged returned.
create or replace function return_sale(p_sale_id uuid, p_actor uuid, p_note text default null)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_sale sale%rowtype;
begin
  select * into v_sale from sale where id = p_sale_id for update;
  if not found then
    raise exception 'Sale not found';
  end if;
  if v_sale.status <> 'completed' then
    raise exception 'Sale is not open';
  end if;

  update sale set status = 'returned' where id = p_sale_id;

  insert into stock_movement (shop_id, variant_id, qty_delta, movement_type, ref_type, ref_id, created_by, note)
  select v_sale.shop_id, sl.variant_id, sl.qty, 'return', 'sale', p_sale_id, p_actor, p_note
    from sale_line sl where sl.sale_id = p_sale_id;

  update stock_level lvl
     set qty_on_hand = lvl.qty_on_hand + sl.qty, updated_at = now()
    from sale_line sl
   where sl.sale_id = p_sale_id
     and lvl.shop_id = v_sale.shop_id
     and lvl.variant_id = sl.variant_id;

  insert into audit_log (actor_id, action, entity, entity_id, after)
  values (p_actor, 'return', 'sale', p_sale_id, jsonb_build_object('note', p_note));

  return jsonb_build_object('id', p_sale_id, 'status', 'returned');
end;
$$;

-- Stock received: one ledger movement per line plus the cache, atomically.
create or replace function stock_in(
  p_shop_id uuid,
  p_actor   uuid,
  p_items   jsonb, -- [{variant_id, qty}]
  p_note    text default null
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_item jsonb;
  v_count int := 0;
begin
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    if (v_item->>'qty')::int <= 0 then
      raise exception 'Quantity must be positive';
    end if;

    insert into stock_movement (shop_id, variant_id, qty_delta, movement_type, created_by, note)
    values (p_shop_id, (v_item->>'variant_id')::uuid, (v_item->>'qty')::int, 'stock_in', p_actor, p_note);

    insert into stock_level (shop_id, variant_id, qty_on_hand, updated_at)
    values (p_shop_id, (v_item->>'variant_id')::uuid, (v_item->>'qty')::int, now())
    on conflict (shop_id, variant_id)
    do update set qty_on_hand = stock_level.qty_on_hand + excluded.qty_on_hand, updated_at = now();

    v_count := v_count + 1;
  end loop;

  insert into audit_log (actor_id, action, entity, after)
  values (p_actor, 'stock_in', 'stock_movement',
          jsonb_build_object('shop_id', p_shop_id, 'lines', v_count, 'note', p_note));

  return jsonb_build_object('lines', v_count);
end;
$$;

-- Nightly aggregation: rebuild one closed business day into daily_summary.
-- Always re-derivable from the ledger, so a bug in aggregation is a re-run.
create or replace function rebuild_daily_summary(p_date date)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_rows int;
begin
  delete from daily_summary where business_date = p_date;

  insert into daily_summary (business_date, shop_id, user_id, variant_id, revenue, units, sale_count)
  select s.business_date, s.shop_id, s.salesperson_id, sl.variant_id,
         sum(sl.line_total), sum(sl.qty), count(distinct s.id)
    from sale s
    join sale_line sl on sl.sale_id = s.id
   where s.business_date = p_date
     and s.status = 'completed'
   group by s.business_date, s.shop_id, s.salesperson_id, sl.variant_id;

  get diagnostics v_rows = row_count;
  return jsonb_build_object('date', p_date, 'rows', v_rows);
end;
$$;

-- Ledger-versus-cache reconciliation: report any stock_level row that
-- disagrees with the summed ledger. The ledger wins.
create or replace function stock_discrepancies()
returns table (shop_id uuid, variant_id uuid, cached int, ledger bigint)
language sql
security definer
as $$
  select l.shop_id, l.variant_id, l.qty_on_hand as cached, coalesce(m.total, 0) as ledger
    from stock_level l
    left join (
      select shop_id, variant_id, sum(qty_delta) as total
        from stock_movement group by shop_id, variant_id
    ) m using (shop_id, variant_id)
   where l.qty_on_hand <> coalesce(m.total, 0);
$$;
