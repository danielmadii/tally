-- Permanently remove a closed shop and everything recorded against it.
-- This is the one operation that erases ledger rows, so it is gated on the
-- shop already being deactivated and it reports exactly what it destroyed.
create or replace function delete_shop_cascade(p_shop_id uuid, p_actor uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_shop        shop%rowtype;
  v_sales       bigint;
  v_deactivated bigint;
begin
  select * into v_shop from shop where id = p_shop_id for update;
  if not found then
    raise exception 'Shop not found';
  end if;
  if v_shop.is_active then
    raise exception 'Deactivate % first, then delete it.', v_shop.name;
  end if;

  select count(*) into v_sales from sale where shop_id = p_shop_id;

  -- Salespeople lose their place to work; supervisors, area managers and
  -- admins stay active so they can be reassigned.
  with closed as (
    update app_user u
       set is_active = false
     where u.role = 'salesperson'
       and u.is_active
       and exists (select 1 from user_shop us where us.user_id = u.id and us.shop_id = p_shop_id)
    returning 1
  )
  select count(*) into v_deactivated from closed;

  delete from sale_line where sale_id in (select id from sale where shop_id = p_shop_id);
  delete from daily_summary where shop_id = p_shop_id;
  delete from sale where shop_id = p_shop_id;
  delete from stock_movement where shop_id = p_shop_id;
  delete from stock_level where shop_id = p_shop_id;
  delete from reconciliation where shop_id = p_shop_id;
  delete from target where shop_id = p_shop_id;
  delete from user_shop where shop_id = p_shop_id;
  delete from shop where id = p_shop_id;

  insert into audit_log (actor_id, action, entity, entity_id, before)
  values (p_actor, 'shop_delete', 'shop', p_shop_id,
          jsonb_build_object('name', v_shop.name, 'code', v_shop.code,
                             'sales_deleted', v_sales,
                             'salespeople_deactivated', v_deactivated));

  return jsonb_build_object('name', v_shop.name,
                            'salesDeleted', v_sales,
                            'salespeopleDeactivated', v_deactivated);
end;
$$;

grant execute on function delete_shop_cascade(uuid, uuid) to service_role;
