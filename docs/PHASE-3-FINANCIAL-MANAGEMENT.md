# Phase 3 — Financial Management

## Included

- Group finance overview: verified contributions, posted expenses, refunds and available balance.
- Currency-aware integer minor-unit parsing and display.
- Member contribution submission for standard and additional payments.
- Payment review by managers and assistant managers.
- Approval creates the official contribution transaction atomically with the submission status change.
- Rejection stores the reviewer and optional reason.
- Manager-configured expected standard contribution amount per member.
- Manager/assistant-manager expense recording with group category validation.
- Latest 100 official ledger entries, including voided history.
- Managers and assistant managers can void a posted transaction only with a reason; voided rows remain in the ledger and are excluded from balances.
- Database-side role checks in SECURITY DEFINER RPCs; no direct client write grants for financial ledger, submissions or finance settings.
- Activity log entries for contribution submissions, review decisions, standard contribution changes, and ledger changes.

## Apply migration

Run `0003_financial_management.sql` in Supabase SQL Editor after `0001_initial_schema.sql` and `0002_group_management.sql`. Do not rerun earlier migrations.

## User flows

### Member

1. Open group → Open group finances.
2. Submit standard or additional contribution, amount, payment method and optional reference.
3. Submission appears as pending and does not affect group balance.
4. Member can view their own pending submissions and group ledger.

### Manager / Assistant Manager

1. Review pending submissions.
2. Approve to create an official contribution ledger entry, or reject with a note.
3. Record group expenses using the group expense categories.
4. Review the official transaction history and current balance.
5. Void a mistaken posted transaction with a reason; the record remains visible for audit.

### Manager only

- Set the expected standard contribution amount per member.

## Security notes

- `financial_transactions`, `contribution_submissions`, and `group_finance_settings` do not grant direct client writes.
- Mutations go through database functions that validate the current authenticated user and active group role.
- Pending submissions are separate from official financial transactions.
- Balances use posted transactions only; voided transactions remain visible but are excluded.
- The current UI does not upload receipt images. A future receipt workflow must use a private Storage bucket, scoped object paths and Storage RLS policies.
- Final settlement and refund allocation are not part of this phase.

## Verification checklist

- [ ] Apply migration 0003 after migrations 0001 and 0002.
- [ ] Member can submit a standard contribution.
- [ ] Member can submit an additional contribution.
- [ ] Pending contribution is excluded from balance.
- [ ] Ordinary member cannot approve/reject another user's submission.
- [ ] Manager can approve a submission and the official contribution appears once.
- [ ] Manager can reject a submission and the balance remains unchanged.
- [ ] Assistant manager can review submissions.
- [ ] Ordinary member cannot record an expense.
- [ ] Assistant manager and manager can record an expense.
- [ ] Category from another group is rejected by the database function.
- [ ] Manager can set standard contribution amount; assistant manager cannot.
- [ ] Posted transaction can be voided only by a manager/assistant with a reason.
- [ ] Voided transaction remains in history but is excluded from balance.
