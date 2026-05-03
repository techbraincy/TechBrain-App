-- ============================================================
-- 013 create_order RPC
-- Atomic function: upsert customer → generate reference →
-- insert order → insert order_items → write idempotency record.
-- All steps run in one transaction; any failure rolls back everything.
-- ============================================================

create or replace function public.create_order(
  p_business_id      uuid,
  p_customer_name    text,
  p_customer_phone   text,
  p_type             public.order_type,
  p_source           public.order_source,
  p_items            jsonb,
  p_delivery_address text    default null,
  p_notes            text    default null,
  p_subtotal         numeric default 0,
  p_total            numeric default 0,
  p_language         text    default 'el',
  p_idempotency_key  text    default null,
  p_endpoint         text    default 'POST /api/orders'
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_customer_id  uuid;
  v_approval     boolean := false;
  v_reference    text;
  v_status       public.order_status;
  v_order_id     uuid;
  v_result       jsonb;
begin
  -- 1. Upsert customer (unique on business_id, phone)
  insert into public.customers (business_id, phone, name, language)
  values (p_business_id, p_customer_phone, p_customer_name, coalesce(p_language, 'el'))
  on conflict (business_id, phone) do update
    set name     = excluded.name,
        language = excluded.language
  returning id into v_customer_id;

  -- 2. Check staff_approval_enabled for this business
  select coalesce(staff_approval_enabled, false)
  into   v_approval
  from   public.business_features
  where  business_id = p_business_id;

  -- 3. Generate human-readable reference (ORD-NNNN, count-based per business)
  v_reference := public.generate_order_reference(p_business_id);

  -- 4. Determine initial order status
  v_status := case
    when coalesce(v_approval, false) then 'awaiting_approval'::public.order_status
    else 'pending'::public.order_status
  end;

  -- 5. Insert order row
  insert into public.orders (
    business_id,
    customer_id,
    reference,
    type,
    source,
    status,
    subtotal,
    delivery_fee,
    total,
    delivery_address,
    delivery_notes,
    customer_phone,
    customer_name,
    preferred_language
  ) values (
    p_business_id,
    v_customer_id,
    v_reference,
    p_type,
    p_source,
    v_status,
    coalesce(p_subtotal, 0),
    0,
    coalesce(p_total, 0),
    p_delivery_address,
    p_notes,
    p_customer_phone,
    p_customer_name,
    coalesce(p_language, 'el')
  )
  returning id into v_order_id;

  -- 6. Insert order items
  -- note: order_items.subtotal is GENERATED ALWAYS — do not insert it
  insert into public.order_items (
    order_id,
    business_id,
    name_el,
    name_en,
    unit_price,
    quantity,
    notes
  )
  select
    v_order_id,
    p_business_id,
    (item ->> 'name_el'),
    nullif(item ->> 'name_en', ''),
    (item ->> 'unit_price')::numeric,
    (item ->> 'quantity')::integer,
    nullif(item ->> 'notes', '')
  from jsonb_array_elements(p_items) as item;

  -- 7. Build result payload
  v_result := jsonb_build_object(
    'order_id',  v_order_id,
    'reference', v_reference,
    'status',    v_status::text
  );

  -- 8. Write idempotency record if a key was provided
  --    ON CONFLICT DO NOTHING guards against concurrent retries
  if p_idempotency_key is not null then
    insert into public.request_idempotency
      (idempotency_key, business_id, endpoint, response)
    values
      (p_idempotency_key, p_business_id, p_endpoint, v_result)
    on conflict (business_id, idempotency_key) do nothing;
  end if;

  return v_result;
end;
$$;
