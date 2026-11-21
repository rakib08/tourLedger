# Temporary Super Admin Approval

Apply `supabase/migrations/0007_super_admin_group_approval.sql` after migrations `0001` through `0006`.

## Register The Super Admin

1. Sign in to TourLedger using the account that should be the Super Admin.
2. In Supabase Dashboard, open **Authentication → Users** and copy that account's user UUID.
3. In **SQL Editor**, run the following statement after replacing the UUID:

```sql
insert into public.super_admins (user_id)
values ('YOUR-SUPER-ADMIN-AUTH-USER-UUID')
on conflict (user_id) do nothing;
```

Only accounts listed in `public.super_admins` can open `/2000-super-admin` or approve, reject, and permanently delete groups. Do not expose this table to normal users.

## Temporary Workflow

- New group submissions are stored with `approval_status = 'pending'`.
- The requester sees a confirmation message and a pending status on the dashboard.
- Approval creates the requester's manager membership and the six default expense categories.
- Rejected requests remain visible to the requester as rejected, but do not create a group membership.
- Permanent deletion cascades through database rows related to the group. Private Storage objects uploaded for that group are not automatically removed by PostgreSQL; remove those objects from the `tourledger-private` bucket if the group had uploaded receipts or payment proofs.

This is a temporary single-Super-Admin workflow. Keep the `super_admins` table restricted and remove this workflow when a permanent administration system is introduced.


## 32-Character Permanent-Deletion Confirmation

Permanent group deletion requires both Super Admin authorization and a private 32-character confirmation code.

1. Generate a random 32-character code on your own device. For example, in PowerShell:

   ```powershell
   -join ((1..32 | ForEach-Object { 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[(Get-Random -Maximum 62)] }))
   ```

2. Store the generated code somewhere private and secure (for example, a password manager or an offline encrypted note). You will need to enter it each time you permanently delete a group.
3. Add it to your local `.env.local` file and to your production hosting provider's server-side environment variables:

   ```env
   SUPER_ADMIN_DELETE_CODE=PASTE_YOUR_EXACT_32_CHARACTER_CODE_HERE
   ```

4. Restart/redeploy the application after changing the environment variable.
5. On `/2000-super-admin`, enter the same 32-character code in the deletion form before selecting **Delete Permanently**.

The code is checked only in the server action, is not exposed as a public environment variable, and is not stored in the database. The server rejects deletion if the configured code or submitted code is not exactly 32 characters. Do not commit `.env.local`, put the code in client-side code, or share it with group members. If you lose the code, set a new one in the server environment and restart/redeploy.
