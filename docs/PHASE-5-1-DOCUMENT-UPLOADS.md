# TourLedger Phase 5.1 — Private Receipts and Payment Proofs

## Included

- Private Supabase Storage bucket: `tourledger-private`.
- Expense receipt upload on the manager/assistant-manager expense form.
- Contribution proof upload on the member contribution submission form.
- JPG, PNG, WebP and PDF files, maximum 10 MB.
- Group-scoped object paths: `{group_id}/{uploader_user_id}/{expense|contribution}/{uuid}.{extension}`.
- Storage RLS restricts expense uploads to managers/assistant managers and contribution uploads to active group members.
- Expense receipts can be viewed by active group members. Contribution proofs can be viewed by the submitter and group managers/assistant managers.
- Signed URLs are generated server-side for a short duration; the bucket is not public.
- Uploaded objects are removed if the associated financial RPC fails.

## Migration

Apply `supabase/migrations/0006_private_document_storage.sql` after migrations 0001–0005. It creates/configures the private bucket and its Storage object policies. It does not change financial ledger rows or existing finance RPCs.

## Configuration

No service-role key is required. Uploads use the authenticated server Supabase client and Storage RLS. Keep the bucket private.

## Manual verification

1. Apply migration 0006.
2. As a normal active member, submit a contribution with a JPG or PDF proof.
3. Confirm the submission is visible to managers in Payments Awaiting Verification and the View payment proof link opens.
4. Confirm a different ordinary member cannot retrieve that contribution proof.
5. As a manager or assistant manager, record an expense with a receipt.
6. Confirm active group members can open the receipt from Total Expenses.
7. Try an unsupported file type and a file larger than 10 MB; both should be rejected.
8. Try a normal contribution and expense without an attachment; both should continue to work.

## Notes and limitations

- Uploads are optional in this phase.
- The current implementation supports image and PDF attachments, not HEIC or video.
- Signed links expire after five minutes.
- There is intentionally no client-side delete policy for uploaded financial evidence.
- Full TypeScript/build validation and live Storage/RLS testing must be run in the user's configured Supabase project before production deployment.
