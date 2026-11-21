# Phase 1 — Authentication and user profiles

## Added
- `/signup`: email/password account registration with full-name metadata.
- `/login`: email/password authentication.
- `/forgot-password`: request a Supabase password recovery email.
- `/auth/callback`: PKCE callback code exchange and safe local redirect handling.
- `/reset-password`: update password after a valid recovery session.
- `/dashboard`: server-authenticated user workspace, profile greeting and RLS-scoped group list.
- `src/proxy.ts`: Supabase SSR cookie refresh using the Next.js 16 Proxy convention.
- Server actions validate input and call Supabase Auth from the server.

## Existing database dependency
The existing `0001_initial_schema.sql` migration creates `profiles` and the `handle_new_user` trigger. Apply that migration before testing signup, so each new Auth user receives a profile row.

## Supabase Auth URL configuration
For local development, set:
- Site URL: `http://localhost:3000`
- Redirect URL: `http://localhost:3000/auth/callback`

Add the corresponding production callback URL when deploying.

## Important
- The distributable project archive does not contain `.env.local`.
- Keep the existing local `.env.local` file in place and do not replace it with `.env.example`.
- No service-role key is required for this phase.
- The dashboard's tour-group listing depends on the existing schema migration being applied.
