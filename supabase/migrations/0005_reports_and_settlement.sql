-- TourLedger Phase 4: reports and immutable final settlement.
-- Apply after migrations 0001 through 0004.

-- Aggregate reports on the server so reports are not limited by UI pagination.
create or replace function public.get_group_financial_report(p_group_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_report jsonb;
begin
  if not public.is_group_member(p_group_id) then
    raise exception 'You are not an active member of this group.';
  end if;

  select jsonb_build_object(
    'members', coalesce((
      select jsonb_agg(to_jsonb(member_rows) order by member_rows.member_name)
      from (
        select
          gm.user_id as member_id,
          coalesce(nullif(trim(pr.full_name), ''), 'TourLedger member') as member_name,
          gm.role::text as role,
          coalesce(sum(ft.amount_minor) filter (
            where ft.type = 'contribution'::public.transaction_type
              and ft.status = 'posted'::public.transaction_status
          ), 0)::bigint as contribution_total,
          coalesce(sum(ft.amount_minor) filter (
            where ft.type = 'contribution'::public.transaction_type
              and ft.contribution_kind = 'standard'::public.contribution_kind
              and ft.status = 'posted'::public.transaction_status
          ), 0)::bigint as standard_total,
          coalesce(sum(ft.amount_minor) filter (
            where ft.type = 'contribution'::public.transaction_type
              and ft.contribution_kind = 'additional'::public.contribution_kind
              and ft.status = 'posted'::public.transaction_status
          ), 0)::bigint as additional_total,
          (count(ft.id) filter (
            where ft.type = 'contribution'::public.transaction_type
              and ft.status = 'posted'::public.transaction_status
          ))::integer as contribution_count
        from public.group_members gm
        left join public.profiles pr on pr.id = gm.user_id
        left join public.financial_transactions ft
          on ft.group_id = gm.group_id and ft.member_id = gm.user_id
        where gm.group_id = p_group_id and gm.is_active
        group by gm.user_id, pr.full_name, gm.role
      ) member_rows
    ), '[]'::jsonb),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object(
        'category_id', category_rows.category_id,
        'category_name', category_rows.category_name,
        'total_minor', category_rows.total_minor,
        'expense_count', category_rows.expense_count
      ) order by category_rows.total_minor desc, category_rows.category_name)
      from (
        select ec.id as category_id, ec.name as category_name,
          coalesce(x.total_minor, 0)::bigint as total_minor,
          coalesce(x.expense_count, 0)::integer as expense_count
        from public.expense_categories ec
        left join (
          select category_id, sum(amount_minor)::bigint as total_minor, count(*)::integer as expense_count
          from public.financial_transactions
          where group_id = p_group_id and type = 'expense'::public.transaction_type
            and status = 'posted'::public.transaction_status
          group by category_id
        ) x on x.category_id = ec.id
        where ec.group_id = p_group_id
        union all
        select null::uuid, 'Uncategorized',
          coalesce(sum(amount_minor), 0)::bigint, count(*)::integer
        from public.financial_transactions
        where group_id = p_group_id and type = 'expense'::public.transaction_type
          and status = 'posted'::public.transaction_status and category_id is null
        having count(*) > 0
      ) category_rows
    ), '[]'::jsonb),
    'monthly', coalesce((
      select jsonb_agg(jsonb_build_object(
        'month', m.month_key,
        'contributions', m.contributions,
        'expenses', m.expenses
      ) order by m.month_key)
      from (
        select to_char(date_trunc('month', occurred_at), 'YYYY-MM') as month_key,
          coalesce(sum(amount_minor) filter (where type = 'contribution'::public.transaction_type), 0)::bigint as contributions,
          coalesce(sum(amount_minor) filter (where type = 'expense'::public.transaction_type), 0)::bigint as expenses
        from public.financial_transactions
        where group_id = p_group_id and status = 'posted'::public.transaction_status
          and type in ('contribution'::public.transaction_type, 'expense'::public.transaction_type)
        group by date_trunc('month', occurred_at)
      ) m
    ), '[]'::jsonb)
  ) into v_report;
  return v_report;
end;
$$;

revoke all on function public.get_group_financial_report(uuid) from public;
grant execute on function public.get_group_financial_report(uuid) to authenticated;

-- Prevent new or modified financial activity once a final settlement is recorded.
create or replace function public.prevent_finance_after_settlement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group_id uuid;
  v_status public.group_status;
begin
  v_group_id := case when tg_op = 'DELETE' then old.group_id else new.group_id end;
  select status into v_status from public.tour_groups where id = v_group_id for update;
  if v_status in ('completed'::public.group_status, 'archived'::public.group_status)
     or exists (select 1 from public.settlements where group_id = v_group_id) then
    raise exception 'This group has been settled or closed. Financial records are read-only.';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists prevent_financial_transactions_after_settlement on public.financial_transactions;
create trigger prevent_financial_transactions_after_settlement
before insert or update or delete on public.financial_transactions
for each row execute function public.prevent_finance_after_settlement();

drop trigger if exists prevent_contribution_submissions_after_settlement on public.contribution_submissions;
create trigger prevent_contribution_submissions_after_settlement
before insert or update or delete on public.contribution_submissions
for each row execute function public.prevent_finance_after_settlement();

-- Settlement snapshots and allocations may be inserted only through the atomic RPC.
create or replace function public.prevent_settlement_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'Finalized settlement records are immutable.';
end;
$$;

drop trigger if exists settlements_immutable on public.settlements;
create trigger settlements_immutable
before update or delete on public.settlements
for each row execute function public.prevent_settlement_mutation();

drop trigger if exists settlement_allocations_immutable on public.settlement_allocations;
create trigger settlement_allocations_immutable
before update or delete on public.settlement_allocations
for each row execute function public.prevent_settlement_mutation();

create or replace function public.finalize_group_settlement(
  p_group_id uuid,
  p_member_ids uuid[],
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_group public.tour_groups%rowtype;
  v_balance bigint;
  v_member_count integer;
  v_base bigint;
  v_remainder bigint;
  v_settlement_id uuid;
  v_member_id uuid;
  v_position integer;
begin
  if v_actor is null then raise exception 'Please sign in.'; end if;
  if not public.is_group_owner(p_group_id) then
    raise exception 'Only the group manager can finalize settlement.';
  end if;
  if p_note is not null and char_length(trim(p_note)) > 500 then
    raise exception 'Settlement note must be 500 characters or fewer.';
  end if;
  if p_member_ids is null or cardinality(p_member_ids) = 0 then
    raise exception 'Select at least one active member for settlement.';
  end if;
  if cardinality(p_member_ids) <> (
    select count(distinct selected.member_id) from unnest(p_member_ids) as selected(member_id)
  ) then
    raise exception 'A member cannot be selected more than once.';
  end if;

  select * into v_group from public.tour_groups where id = p_group_id for update;
  if not found then raise exception 'Tour group not found.'; end if;
  if v_group.status in ('completed'::public.group_status, 'archived'::public.group_status) then
    raise exception 'This group is already closed.';
  end if;
  if exists (select 1 from public.settlements where group_id = p_group_id) then
    raise exception 'A final settlement already exists for this group.';
  end if;
  if exists (
    select 1 from public.contribution_submissions
    where group_id = p_group_id and status = 'pending'
  ) then
    raise exception 'Review all pending contribution submissions before settlement.';
  end if;

  if exists (
    select 1 from unnest(p_member_ids) selected(user_id)
    where not exists (
      select 1 from public.group_members gm
      where gm.group_id = p_group_id and gm.user_id = selected.user_id and gm.is_active
    )
  ) then
    raise exception 'Every selected settlement member must be an active group member.';
  end if;

  select (
    coalesce(sum(amount_minor) filter (where type in (
      'contribution'::public.transaction_type, 'refund'::public.transaction_type
    )), 0)
    - coalesce(sum(amount_minor) filter (where type = 'expense'::public.transaction_type), 0)
  )::bigint
  into v_balance
  from public.financial_transactions
  where group_id = p_group_id and status = 'posted'::public.transaction_status;

  if v_balance < 0 then raise exception 'The group balance is negative. Correct the ledger before settlement.'; end if;

  v_member_count := cardinality(p_member_ids);
  v_base := v_balance / v_member_count;
  v_remainder := mod(v_balance, v_member_count);

  insert into public.settlements(group_id, total_refund_minor, finalized_by, note)
  values (p_group_id, v_balance, v_actor, nullif(trim(p_note), ''))
  returning id into v_settlement_id;

  -- Preserve the manager's selected order; distribute indivisible minor units
  -- one-by-one to the first selected members for exact reconciliation.
  v_position := 0;
  foreach v_member_id in array p_member_ids loop
    v_position := v_position + 1;
    insert into public.settlement_allocations(settlement_id, member_id, amount_minor)
    values (
      v_settlement_id,
      v_member_id,
      v_base + case when v_position <= v_remainder then 1 else 0 end
    );
  end loop;

  update public.tour_groups set status = 'completed'::public.group_status, updated_at = now()
  where id = p_group_id;

  insert into public.activity_logs(group_id, actor_id, action, entity_type, entity_id, details)
  values (
    p_group_id, v_actor, 'settlement.finalized', 'settlement', v_settlement_id,
    jsonb_build_object(
      'total_refund_minor', v_balance,
      'selected_member_ids', to_jsonb(p_member_ids),
      'member_count', v_member_count,
      'note', nullif(trim(p_note), '')
    )
  );

  return v_settlement_id;
end;
$$;

revoke all on function public.finalize_group_settlement(uuid, uuid[], text) from public;
grant execute on function public.finalize_group_settlement(uuid, uuid[], text) to authenticated;

-- Clients may read snapshots but cannot create, modify or delete them directly.
revoke insert, update, delete on public.settlements from anon, authenticated;
revoke insert, update, delete on public.settlement_allocations from anon, authenticated;
