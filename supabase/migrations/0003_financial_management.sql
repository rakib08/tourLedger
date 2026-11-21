-- TourLedger Phase 3: member payment submissions, manager verification and expense ledger.
-- Apply AFTER 0001_initial_schema.sql and 0002_group_management.sql.
-- All money values are integer minor units (BDT poisha: 100 = ৳1).

create table if not exists public.group_finance_settings (
  group_id uuid primary key references public.tour_groups(id) on delete cascade,
  standard_contribution_minor bigint not null default 0 check (standard_contribution_minor >= 0),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.contribution_submissions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.tour_groups(id) on delete cascade,
  member_id uuid not null references auth.users(id) on delete restrict,
  contribution_kind public.contribution_kind not null,
  amount_minor bigint not null check (amount_minor > 0),
  payment_method text not null default 'cash' check (char_length(trim(payment_method)) between 1 and 40),
  reference_note text,
  proof_path text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  transaction_id uuid unique references public.financial_transactions(id) on delete restrict,
  constraint reviewed_submission_consistency check (
    (status = 'pending' and reviewed_by is null and reviewed_at is null and transaction_id is null)
    or (status = 'approved' and reviewed_by is not null and reviewed_at is not null and transaction_id is not null)
    or (status = 'rejected' and reviewed_by is not null and reviewed_at is not null and transaction_id is null)
  )
);
create index if not exists contribution_submissions_group_status_idx
  on public.contribution_submissions(group_id, status, submitted_at desc);
create index if not exists contribution_submissions_member_idx
  on public.contribution_submissions(group_id, member_id, submitted_at desc);

alter table public.group_finance_settings enable row level security;
alter table public.contribution_submissions enable row level security;

-- Explicit grants are required in addition to RLS policies.
grant select on public.group_finance_settings to authenticated;
grant select on public.contribution_submissions to authenticated;
grant select on public.financial_transactions to authenticated;
grant select on public.expense_categories to authenticated;
grant select on public.group_members to authenticated;
grant select on public.profiles to authenticated;
grant select on public.tour_groups to authenticated;
grant select on public.activity_logs to authenticated;
-- No direct client writes to the financial ledger or submission review state.
revoke insert, update, delete on public.financial_transactions from anon, authenticated;
revoke insert, update, delete on public.contribution_submissions from anon, authenticated;
revoke insert, update, delete on public.group_finance_settings from anon, authenticated;

 drop policy if exists "finance_settings_read_group" on public.group_finance_settings;
create policy "finance_settings_read_group" on public.group_finance_settings
for select to authenticated using (public.is_group_member(group_id));

 drop policy if exists "contribution_submissions_read_group" on public.contribution_submissions;
create policy "contribution_submissions_read_group" on public.contribution_submissions
for select to authenticated using (
  member_id = (select auth.uid()) or public.can_manage_group(group_id)
);

create or replace function public.submit_contribution(
  p_group_id uuid,
  p_kind text,
  p_amount_minor bigint,
  p_payment_method text default 'cash',
  p_reference_note text default null,
  p_proof_path text default null
)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_id uuid;
begin
  if v_user is null then raise exception 'Please sign in to submit a payment.'; end if;
  if not public.is_group_member(p_group_id) then raise exception 'You are not an active member of this group.'; end if;
  if p_amount_minor is null or p_amount_minor <= 0 or p_amount_minor > 1000000000000 then
    raise exception 'Enter a valid contribution amount.';
  end if;
  if p_kind is null or p_kind not in ('standard', 'additional') then raise exception 'Invalid contribution type.'; end if;
  if p_payment_method is null or char_length(trim(p_payment_method)) not between 1 and 40 then
    raise exception 'Select a valid payment method.';
  end if;
  if p_proof_path is not null and (length(p_proof_path) > 500 or position('..' in p_proof_path) > 0) then
    raise exception 'Invalid payment proof reference.';
  end if;

  insert into public.contribution_submissions(
    group_id, member_id, contribution_kind, amount_minor, payment_method, reference_note, proof_path
  ) values (
    p_group_id, v_user, p_kind::public.contribution_kind, p_amount_minor,
    trim(p_payment_method), nullif(trim(p_reference_note), ''), p_proof_path
  ) returning id into v_id;

  insert into public.activity_logs(group_id, actor_id, action, entity_type, entity_id, details)
  values (p_group_id, v_user, 'contribution.submitted', 'contribution_submission', v_id,
    jsonb_build_object('amount_minor', p_amount_minor, 'kind', p_kind));
  return v_id;
end;
$$;

create or replace function public.review_contribution_submission(
  p_submission_id uuid,
  p_decision text,
  p_review_note text default null
)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := (select auth.uid());
  v_submission public.contribution_submissions%rowtype;
  v_transaction_id uuid;
  v_group_currency char(3);
begin
  if v_actor is null then raise exception 'Please sign in.'; end if;
  if p_decision is null or p_decision not in ('approve', 'reject') then raise exception 'Invalid review decision.'; end if;

  select * into v_submission from public.contribution_submissions
  where id = p_submission_id for update;
  if not found then raise exception 'Payment submission not found.'; end if;
  if not public.can_manage_group(v_submission.group_id) then raise exception 'You do not have permission to review payments.'; end if;
  if v_submission.status <> 'pending' then raise exception 'This payment has already been reviewed.'; end if;

  if p_decision = 'approve' then
    insert into public.financial_transactions(
      group_id, type, contribution_kind, member_id, title, description,
      amount_minor, recorded_by, status
    ) values (
      v_submission.group_id, 'contribution'::public.transaction_type,
      v_submission.contribution_kind, v_submission.member_id,
      case when v_submission.contribution_kind = 'standard' then 'Standard contribution' else 'Additional contribution' end,
      concat('Verified ', v_submission.payment_method,
        case when v_submission.reference_note is not null then ' — ' || v_submission.reference_note else '' end),
      v_submission.amount_minor, v_actor, 'posted'::public.transaction_status
    ) returning id into v_transaction_id;
    update public.contribution_submissions set status = 'approved', reviewed_by = v_actor,
      reviewed_at = now(), review_note = nullif(trim(p_review_note), ''), transaction_id = v_transaction_id
    where id = p_submission_id;
  else
    update public.contribution_submissions set status = 'rejected', reviewed_by = v_actor,
      reviewed_at = now(), review_note = nullif(trim(p_review_note), '')
    where id = p_submission_id;
  end if;

  insert into public.activity_logs(group_id, actor_id, action, entity_type, entity_id, details)
  values (v_submission.group_id, v_actor, 'contribution.' || p_decision,
    'contribution_submission', p_submission_id,
    jsonb_build_object('amount_minor', v_submission.amount_minor, 'member_id', v_submission.member_id,
      'transaction_id', v_transaction_id, 'review_note', nullif(trim(p_review_note), '')));
  return v_transaction_id;
end;
$$;

create or replace function public.record_group_expense(
  p_group_id uuid,
  p_title text,
  p_amount_minor bigint,
  p_category_id uuid default null,
  p_description text default null,
  p_occurred_at timestamptz default now(),
  p_receipt_path text default null
)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := (select auth.uid());
  v_id uuid;
begin
  if v_actor is null then raise exception 'Please sign in.'; end if;
  if not public.can_manage_group(p_group_id) then raise exception 'Only managers and assistant managers can record expenses.'; end if;
  if p_title is null or char_length(trim(p_title)) not between 1 and 140 then raise exception 'Enter an expense title.'; end if;
  if p_amount_minor is null or p_amount_minor <= 0 or p_amount_minor > 1000000000000 then raise exception 'Enter a valid expense amount.'; end if;
  if p_category_id is not null and not exists (
    select 1 from public.expense_categories where id = p_category_id and group_id = p_group_id
  ) then raise exception 'The selected category does not belong to this group.'; end if;
  if p_receipt_path is not null and (length(p_receipt_path) > 500 or position('..' in p_receipt_path) > 0) then raise exception 'Invalid receipt reference.'; end if;

  insert into public.financial_transactions(
    group_id, type, category_id, title, description, amount_minor, occurred_at,
    recorded_by, receipt_path, status
  ) values (
    p_group_id, 'expense'::public.transaction_type, p_category_id, trim(p_title),
    nullif(trim(p_description), ''), p_amount_minor, coalesce(p_occurred_at, now()),
    v_actor, p_receipt_path, 'posted'::public.transaction_status
  ) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.set_group_standard_contribution(
  p_group_id uuid,
  p_amount_minor bigint
)
returns void
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := (select auth.uid());
begin
  if v_actor is null then raise exception 'Please sign in.'; end if;
  if not public.is_group_owner(p_group_id) then raise exception 'Only the tour manager can change the standard contribution.'; end if;
  if p_amount_minor is null or p_amount_minor < 0 or p_amount_minor > 1000000000000 then raise exception 'Enter a valid standard contribution amount.'; end if;
  insert into public.group_finance_settings(group_id, standard_contribution_minor, updated_by, updated_at)
  values (p_group_id, p_amount_minor, v_actor, now())
  on conflict (group_id) do update set standard_contribution_minor = excluded.standard_contribution_minor,
    updated_by = excluded.updated_by, updated_at = now();
  insert into public.activity_logs(group_id, actor_id, action, entity_type, entity_id, details)
  values (p_group_id, v_actor, 'finance.standard_contribution_changed', 'finance_settings', p_group_id,
    jsonb_build_object('standard_contribution_minor', p_amount_minor));
end;
$$;

create or replace function public.void_financial_transaction(
  p_transaction_id uuid,
  p_reason text
)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := (select auth.uid());
  v_transaction public.financial_transactions%rowtype;
begin
  if v_actor is null then raise exception 'Please sign in.'; end if;
  select * into v_transaction from public.financial_transactions
  where id = p_transaction_id for update;
  if not found then raise exception 'Transaction not found.'; end if;
  if not public.can_manage_group(v_transaction.group_id) then raise exception 'You do not have permission to void this transaction.'; end if;
  if v_transaction.status <> 'posted' then raise exception 'Only posted transactions can be voided.'; end if;
  if p_reason is null or char_length(trim(p_reason)) < 3 or char_length(trim(p_reason)) > 300 then raise exception 'Enter a reason (3–300 characters).'; end if;
  update public.financial_transactions set status = 'voided'::public.transaction_status,
    description = concat_ws(E'\n', description, 'VOID REASON: ' || trim(p_reason)), updated_at = now()
  where id = p_transaction_id;
end;
$$;

revoke all on function public.submit_contribution(uuid, text, bigint, text, text, text) from public;
revoke all on function public.review_contribution_submission(uuid, text, text) from public;
revoke all on function public.record_group_expense(uuid, text, bigint, uuid, text, timestamptz, text) from public;
revoke all on function public.set_group_standard_contribution(uuid, bigint) from public;
revoke all on function public.void_financial_transaction(uuid, text) from public;
grant execute on function public.submit_contribution(uuid, text, bigint, text, text, text) to authenticated;
grant execute on function public.review_contribution_submission(uuid, text, text) to authenticated;
grant execute on function public.record_group_expense(uuid, text, bigint, uuid, text, timestamptz, text) to authenticated;
grant execute on function public.set_group_standard_contribution(uuid, bigint) to authenticated;
grant execute on function public.void_financial_transaction(uuid, text) to authenticated;
