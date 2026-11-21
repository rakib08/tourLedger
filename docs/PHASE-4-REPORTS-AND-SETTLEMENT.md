# TourLedger — Phase 4: Reports & Settlement

## New report page
Route: `/groups/[groupId]/finances/reports`

- Member-wise contribution totals for active group members.
- Standard and additional contribution subtotals.
- Posted contribution count per member.
- Expense category breakdown, including uncategorized expenses.
- Monthly contribution vs expense trends.
- Report aggregation runs in a membership-checked database function and is not restricted to the UI's recent transaction page size.

## Settlement page
Route: `/groups/[groupId]/finances/settlement`

- All active group members can view the final settlement snapshot.
- Only the manager can finalize a settlement.
- The manager selects which active members participate.
- Remaining available balance is split equally in integer minor units.
- Any indivisible minor units are distributed one by one in the selected member order.
- All pending payment submissions must be reviewed before finalization.
- Finalization is atomic: the settlement, allocations, group completion status and activity log are written together.
- A group can have only one final settlement.
- Finalized settlement and allocation rows are immutable.
- Once finalized, the group financial ledger and contribution submissions become read-only.

## Important settlement behavior
The settlement stores the amount and selected member allocations as a snapshot. It does not create duplicate contribution or expense ledger entries. The available balance is the posted contribution/refund total less posted expenses at finalization time.

## Database migration
Apply `supabase/migrations/0005_reports_and_settlement.sql` after migrations 0001–0004.

## Suggested test sequence
1. Add contributions and expenses.
2. Review/reject all pending payment submissions.
3. Open reports and compare the member/category totals with the ledger.
4. Open settlement as the manager and deselect one member.
5. Finalize settlement.
6. Verify allocations sum exactly to the final balance.
7. Verify all members can view the snapshot.
8. Verify financial writes and settlement edits/deletes are rejected after finalization.
