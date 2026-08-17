-- Low-stock counts computed in the database — client-side counting truncates
-- at PostgREST's 1000-row response cap on large catalogues.
create or replace function low_stock_counts()
returns table (shop_id uuid, low_count bigint)
language sql
security definer
as $$
  select l.shop_id, count(*)
    from stock_level l
    join variant v on v.id = l.variant_id
   where v.is_active
     and l.qty_on_hand <= v.reorder_point
   group by l.shop_id;
$$;
