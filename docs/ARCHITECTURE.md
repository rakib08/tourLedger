# TourLedger architecture decisions

## Tenant boundary

A `tour_groups` row is the tenant boundary. A user may belong to many groups through `group_members`; membership role is scoped to a single group. A manager can therefore manage several independent trips without gaining access to other managers' trips.

## Authentication and identity

Supabase Auth is the identity provider. `profiles.id` references `auth.users.id` one-to-one. The `handle_new_user` trigger provisions a profile using the submitted `full_name` metadata. The application reads the authenticated user with `supabase.auth.getUser()` on the server. The Next.js 16 `proxy.ts` refreshes Supabase SSR cookies for requests.

The browser receives only the Supabase publishable/anon key. A service-role key must never be included in browser bundles or `NEXT_PUBLIC_*` variables.

## Authorization matrix

| Action | Manager | Assistant manager | Member |
|---|---:|---:|---:|
| Read group and financial ledger | Yes | Yes | Yes |
| Add/edit/void financial entries | Yes | Yes | No |
| Manage ordinary members | Yes | Configurable later | No |
| Promote/demote assistant managers | Yes | No | No |
| Close group / finalize settlement | Yes | No | No |

All authorization must be enforced in PostgreSQL RLS and trusted server-side functions/actions. UI visibility is only a convenience.

## Financial ledger

`financial_transactions` is the single source of truth for cash movements:

- `contribution` with `contribution_kind = standard | additional`
- `expense`
- `refund`

All amounts are positive integer minor units; `type` determines whether they increase or decrease the available balance. Reversals should be explicit entries linked to the original transaction, not destructive edits. Contributions are attributed to a member. Expenses have a title/category and recorder. Refunds are attributed to the receiving member.

Balance = posted contributions − posted expenses − posted refunds.

Settlement is a separate immutable snapshot: eligible member IDs and per-member refund amounts are stored at finalization. The default equal split uses all active members at the moment the manager finalizes, unless the manager explicitly selects another eligible set. The product UI must clearly show the eligible set before confirmation.

## Invitations

Invitation tokens are generated from cryptographically secure random bytes, stored only as hashes, and expire. Acceptance must happen through a server-side operation that checks the authenticated user, token hash, expiry, use limit and current group status before inserting membership. Do not expose an admin/service-role key in the browser.

## Auditability

Every create/update/void/finalize/role-change operation should create an append-only activity event containing actor, group, action, target, timestamp and safe before/after metadata. In production, protect audit rows from update/delete even for managers.

## PWA/offline

Start with installability and an app manifest. Offline support should initially cache only static shell assets. Financial writes should use a durable, idempotent outbox with server-side authorization and conflict handling; never assume a cached balance is authoritative. Do not cache private financial API responses in a shared service-worker cache.

## PWA cache policy

The initial service worker caches only the public manifest and app icons. It deliberately does not cache navigation responses, authenticated content, Supabase responses, receipt files or financial data. A later offline transaction queue must be explicitly designed around idempotency keys, retries, authorization re-checks and conflict resolution.
