# Super Admin OTP-Protected Group Deletion

Apply `supabase/migrations/0008_super_admin_delete_otp.sql` after migrations `0001` through `0007`.

## Configure the fixed Super Admin inbox

Set these server-side environment variables in `.env.local` and your production hosting environment:

```env
SUPER_ADMIN_EMAIL=admin@gmail.com
GMAIL_USER=your-sender@gmail.com
GMAIL_APP_PASSWORD=your-16-character-google-app-password
OTP_HASH_SECRET=use-a-random-secret-of-at-least-32-characters
```

- `SUPER_ADMIN_EMAIL` is the one fixed recipient address for deletion OTPs. It must exactly match the email on the signed-in Super Admin account and that account must be listed in `public.super_admins`.
- `GMAIL_USER` is the Gmail account that sends the messages. It can be the same Gmail address or a separate sender account.
- `GMAIL_APP_PASSWORD` is a Google App Password, not the normal Gmail login password. Enable 2-Step Verification on the sender Google account and create an App Password. Never commit this value.
- `OTP_HASH_SECRET` is a long random server-only secret used to HMAC the six-digit code before storing it. Keep it stable across app instances and deployments. If rotated, outstanding codes will no longer verify.

Restart the Next.js server after changing `.env.local`.

## Deletion safeguards

- A code is sent only to `SUPER_ADMIN_EMAIL`; the browser cannot choose the recipient.
- Code is six digits, expires after five minutes, and is tied to the signed-in admin and one group.
- A resend is blocked for 60 seconds for the same group.
- Only five verification attempts are permitted; the code is single-use.
- The previous direct-delete RPC is revoked for `authenticated` users by migration 0008. The OTP verification RPC performs the deletion atomically.
- Database records cascade according to the existing group foreign keys. Supabase Storage objects are not automatically removed by this database operation and still require separate cleanup.

## Test

1. Sign in with the configured Super Admin account.
2. Open `/2000-super-admin` and choose **Delete Permanently** on a test group.
3. Select **Send Deletion OTP** and check the configured inbox (including Spam).
4. Enter the six-digit code. Confirm the group disappears from the list.
5. Verify a wrong/expired code does not delete the group.

Gmail SMTP uses implicit TLS on port 465. The hosting provider must permit outbound connections to `smtp.gmail.com:465`.
