-- Restrict transaction voiding to the group owner (manager), not assistant managers.
-- The existing RPC remains the only mutation path and continues to preserve the audit record.
create or replace function public.void_financial_transaction(
  p_transaction_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_transaction public.financial_transactions%rowtype;
begin
  if v_actor is null then
    raise exception 'Please sign in.';
  end if;

  select * into v_transaction
  from public.financial_transactions
  where id = p_transaction_id
  for update;

  if not found then
    raise exception 'Transaction not found.';
  end if;

  if not public.is_group_owner(v_transaction.group_id) then
    raise exception 'Only the group manager can void transactions.';
  end if;

  if v_transaction.status <> 'posted' then
    raise exception 'Only posted transactions can be voided.';
  end if;

  if p_reason is null or char_length(trim(p_reason)) < 3
     or char_length(trim(p_reason)) > 300 then
    raise exception 'Enter a reason (3–300 characters).';
  end if;

  update public.financial_transactions
  set status = 'voided'::public.transaction_status,
      description = concat_ws(E'\\n', description, 'VOID REASON: ' || trim(p_reason)),
      updated_at = now()
  where id = p_transaction_id;
end;
$$;

revoke all on function public.void_financial_transaction(uuid, text) from public;
grant execute on function public.void_financial_transaction(uuid, text) to authenticated;
