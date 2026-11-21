# TourLedger — Financial Enhancements

## New pages
- `/groups/[groupId]/finances/contributions`: lists contribution ledger entries for the group.
- `/groups/[groupId]/finances/expenses`: lists expense ledger entries for the group.
- The Total contributions and Total expenses cards on Financial Overview link to these pages.
- The lists include voided entries with a visible status for audit transparency; only posted records contribute to totals and balances.

## Pending payments
- The Pending payments card is hidden from ordinary members.
- Managers and assistant managers who can review submissions see a clickable card linking to `/payments`.

## Manager-recorded contributions
- Managers can record a contribution for an active member from the Submit a contribution page.
- The manager selects the member from the active group member dropdown, then selects contribution kind, amount and payment method.
- This action represents money already received by the manager. It posts directly to the official ledger and balance.
- It does not create a pending submission or require a second approval.
- The database RPC validates that the caller is the group's manager and the selected user is an active member of that group.
- All records retain the selected member as `member_id` and the manager as `recorded_by`, with an activity log entry.

## Database migration
Apply `supabase/migrations/0004_manager_recorded_contributions.sql` after migrations 0001, 0002 and 0003.
