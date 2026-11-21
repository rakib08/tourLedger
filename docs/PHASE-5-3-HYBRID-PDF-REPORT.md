# Phase 5.3 – Hybrid Complete Tour PDF Report

## Architecture

- The browser requests `/api/groups/[groupId]/reports/pdf-data`.
- The server authenticates the user and verifies active manager/assistant-manager membership.
- The server reads group metadata, posted transactions, member names, expense categories, standard contribution settings and any finalized settlement allocation snapshot.
- The endpoint returns JSON with `Cache-Control: private, no-store`.
- `src/lib/finance/pdf.ts` runs in the browser and generates the PDF. It uses a dependency-free PDF writer, so no PDF rendering package or additional server runtime is required.
- The browser creates a Blob URL and downloads the report. The Blob URL is revoked after download.

## Report contents

1. Tour overview and complete financial summary.
2. Member contribution summary and contribution transaction details.
3. Complete chronological expense table.
4. Individual member financial statements and final reconciliation.

The report uses A4 portrait pages, navy/gold styling, summary cards, horizontal spending/category bars, repeating table headers, automatic page breaks and page numbering.

## Data integrity rules

- Only `financial_transactions.status = 'posted'` rows are retrieved.
- Pending contribution submissions are not queried.
- Voided transactions are excluded.
- Group cash follows the existing ledger rule: contributions + refunds - expenses.
- Outstanding standard contributions use the configured standard contribution target and posted standard contributions in the report's selected range.
- The current schema does not define a member expense-sharing method or individual expense-share field. The report therefore marks member expense share and net payable/receivable as not configured instead of inventing an equal split.
- Finalized `settlement_allocations` are shown separately as refund allocations; they are not misrepresented as expense shares.
- Expense responsible party is shown as the account that recorded the expense because the current transaction schema has no separate `paid_by` field.

## Operational notes

- No database migration or new npm dependency is required.
- Full timeline means all posted financial records attached to the group, including pre-tour contributions and bookings.
- Custom date range is optional.
- Export endpoint pages through transaction rows and has a 50,000-row safety limit.
- Current built-in PDF fonts are Helvetica. Non-ASCII text (including Bengali) is substituted with `?`; Unicode font embedding is a separate enhancement.
