# TourLedger

TourLedger is a mobile-first, multi-tenant tour-group finance PWA built with Next.js App Router, TypeScript, Supabase and Vercel.

## Current release: Phase 2 — Tour group management

Implemented:
- Email/password registration and sign-in through Supabase Auth.
- Email confirmation callback and session exchange.
- Password reset email and authenticated password update.
- Sign out.
- Create multiple tour groups; creator becomes the manager.
- Group detail pages and active member lists.
- Add existing registered users by email.
- Promote members to assistant manager (manager only); assistant managers can add ordinary members.
- Manager-only member deactivation.
- Invitation links with hashed tokens, expiry and use limits; accept after sign-in/sign-up.
- Profile provisioning through the `handle_new_user` database trigger.
- Server-side session refresh using the Next.js 16 `proxy.ts` convention.
- Protected dashboard route and signed-in user's profile/group overview.
- Webpack development script (`next dev --webpack`) to avoid the Turbopack CSS compilation issue observed in the initial Windows setup.
- PWA manifest and static-shell service worker retained.

Not yet implemented:
- Assistant-manager/member administration beyond initial add and deactivation.
- Contributions, expenses, receipt uploads and financial reports.
- Settlement finalization and refunds.

## Stack

- Next.js 16 App Router + React 19 + TypeScript
- Tailwind CSS 4
- Supabase Auth + PostgreSQL + Row Level Security
- `@supabase/ssr`
- Vercel

## Requirements

Use a currently supported Node.js LTS release. The project has been tested by the developer with Node.js 26.13.1 and Next.js 16.4.6. Development currently uses Webpack because the original Turbopack CSS pipeline failed while loading `magic-string`.

## Run locally

1. Keep your own `.env.local` file in the project root. The distributable ZIP intentionally does not include it.
2. Configure the following values:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

   `NEXT_PUBLIC_SUPABASE_ANON_KEY` may contain the Supabase publishable/anon key only. Never put a service-role key in a `NEXT_PUBLIC_*` variable or browser code.

3. Install and run:

   ```bash
   npm install
   npm run dev
   ```

4. Open http://localhost:3000.

The `dev` script intentionally runs `next dev --webpack` as the working Windows development configuration.

## Supabase setup

1. Create a Supabase project.
2. Open the Supabase SQL Editor and apply `supabase/migrations/0001_initial_schema.sql`, then `supabase/migrations/0002_group_management.sql` in that order.
3. In Supabase Authentication → URL Configuration:
   - Set Site URL to `http://localhost:3000` during local development.
   - Add `http://localhost:3000/auth/callback` to Redirect URLs.
   - Add your production Vercel domain callback URL after deployment.
4. Configure email confirmation as desired in Supabase Auth.
5. Add the same public Supabase URL and publishable/anon key to `.env.local`.
6. Restart the Next.js development server after changing environment variables.

The migration creates `profiles` rows automatically when a Supabase Auth user is created. It also contains the group/ledger schema and initial RLS policies for later phases.

## Authentication routes

- `/signup` — create an account
- `/login` — sign in
- `/forgot-password` — request a reset email
- `/auth/callback` — exchange the Supabase email callback code for a session
- `/reset-password` — set a new password after following a valid reset link
- `/dashboard` — signed-in workspace
- `/groups/new` — create a tour group
- `/groups/[groupId]` — group overview and member management
- `/join/[token]` — accept an invitation

See `docs/PHASE-2-GROUP-MANAGEMENT.md` for migration notes and a manual acceptance test checklist.

## Development commands

```bash
npm run dev       # Next.js development server using Webpack
npm run typecheck # TypeScript validation
npm run lint      # ESLint
npm run build     # Production build
npm start         # Run production server
```

## Product rules

- A user can own/manage multiple tour groups.
- Each group has one manager, assistant managers and members.
- Contributions support standard/equal and additional payments.
- Only managers and assistant managers may record expenses.
- Every active group member can read the group's financial records.
- Remaining funds are split equally among the active members selected for settlement. Minor-unit remainder allocation is deterministic by member ID.
- Members can be added by a manager or join using an invitation code/link.
- Members may submit payment information; official ledger posting is performed only after manager/assistant verification.

## Security principles

- Supabase Auth is used for identity and session management.
- The browser uses only the public publishable/anon key.
- Never expose a Supabase service-role key in browser code or `NEXT_PUBLIC_*` variables.
- RLS is the authorization boundary; hiding UI controls is not security.
- All group-scoped tables carry `group_id` and are protected by membership policies.
- Finance rows are readable by all active group members, but only managers/assistant managers may write.
- Avoid hard-deleting posted financial records in production. Use reversals/voiding with audit events.
- Password reset redirects must be added to the Supabase project's allowed redirect URLs.

## Financial model

Amounts are stored as integer minor units (`amount_minor`), not floating-point values. For BDT, 100 minor units = ৳1. Standard and additional contributions are separate transaction classifications. Refunds are explicit ledger transactions rather than silently changing old contributions. A final settlement must snapshot eligible members and amounts so the outcome remains auditable if membership later changes.

## Phase 3 — Financial Management

Apply `supabase/migrations/0003_financial_management.sql` after migrations 0001 and 0002.

Phase 3 adds the group finance overview, member contribution submissions, manager/assistant-manager payment review, official contribution ledger entries on approval, manager-only expense recording, manager-configured standard contribution reference, transaction history, and auditable transaction voiding. Pending payment submissions are never included in the available balance. All amounts are stored as integer currency minor units; the input/display helper respects the currency's minor-unit precision.

Open a group's finance area at `/groups/[groupId]/finances`. Receipt-file uploads and final settlement/refund distribution are not included in this phase's first delivery and should be implemented as separate secure workflows before launch.


## Mobile-first PWA UI

The application uses responsive, phone-first layouts, context-aware bottom navigation, safe-area spacing, touch-friendly controls, and an install prompt. Authenticated pages and financial data are not cached by the service worker.

Financial screens are separated into dedicated routes: overview, contribution submission, expense recording, contribution settings, payment verification, and transaction history.


## Mobile-first PWA UI

The application uses responsive, phone-first layouts, context-aware bottom navigation, safe-area spacing, touch-friendly controls, and an install prompt. Authenticated pages and financial data are not cached by the service worker.

Financial screens are separated into dedicated routes: overview, contribution submission, expense recording, contribution settings, payment verification, and transaction history.


## Financial enhancements (migration 0004)

After the existing migrations, apply `supabase/migrations/0004_manager_recorded_contributions.sql` in the Supabase SQL Editor. This enables the manager-only workflow for recording money already received from a selected active group member. It does not replace the member payment submission and verification flow.

New finance pages:
- `/groups/[groupId]/finances/contributions`
- `/groups/[groupId]/finances/expenses`

The Financial Overview contribution and expense summary cards link to these pages. The Pending Payments card is shown only to managers and assistant managers who can review submissions.


## Phase 4 — Reports and Settlement

After applying migrations 0001–0004, apply `supabase/migrations/0005_reports_and_settlement.sql`.

New pages:
- `/groups/[groupId]/finances/reports` — member-wise contribution history, standard/additional breakdown, expense categories (including uncategorized) and monthly income/expense trends.
- `/groups/[groupId]/finances/settlement` — manager finalization and member-visible immutable equal-refund allocation snapshot.

Settlement requires all pending contribution submissions to be reviewed. The manager chooses active members, the database splits the remaining balance in integer minor units, distributes any remainder deterministically in selected order, closes the group, and writes an activity log. Finalized settlements and allocations cannot be edited or deleted. Financial ledger writes are blocked after finalization.
