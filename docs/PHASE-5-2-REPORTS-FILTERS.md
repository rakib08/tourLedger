# Phase 5.2 — PDF Financial Reports & Advanced Transaction Filters

## Included
- Advanced transaction search, filters (type, contribution kind, member, category, status, date and amount), sorting, matching count and posted net total.
- Manager/assistant-manager PDF exports on the Reports page: complete, contributions, expenses and member statement.
- PDF endpoint re-checks the authenticated user's active group membership and manager role on every request.
- PDF exports query official posted financial transactions only. Pending submissions and voided transactions are excluded.
- PDF generation uses a small built-in PDF writer; no new package or database migration is required.

## Notes
- Amount filters are interpreted in the group's currency major units and converted using that currency's minor-unit precision.
- Transaction Explorer currently filters the transaction rows loaded by the existing finance context (up to 1,000 latest rows). A later scalability improvement can move filtering and pagination into a server-side query for very large groups.
- The PDF export endpoint currently caps a report at 10,000 matching posted transactions.
- PDF text uses standard Helvetica and substitutes non-ASCII glyphs; this keeps the PDF dependency-free but means Bengali names/labels may appear as question marks. Unicode font embedding is a follow-up improvement if Bengali PDF output is required.
