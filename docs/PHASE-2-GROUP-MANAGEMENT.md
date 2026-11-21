# Phase 2 — Tour group management

## Features
- Create multiple tour groups under one signed-in user.
- The group creator is automatically inserted as the first manager by the existing database trigger.
- Group overview and active member list.
- Add an existing registered TourLedger user by exact email address.
- Manager can appoint assistant managers; assistant managers can add ordinary members only.
- Manager can deactivate a non-manager member.
- Generate invitation links with 1–30 day expiry and 1–100 maximum uses.
- Invitation token is generated from 32 cryptographically random bytes; only its SHA-256 hash is stored.
- Authenticated users can accept invitations. Unauthenticated visitors are sent to login/signup and returned to the invitation after successful authentication.
- Activity log entries for group creation and member changes.
- Seed common expense categories on group creation.

## Database migration
Apply `supabase/migrations/0002_group_management.sql` AFTER `0001_initial_schema.sql`.

The migration:
- Tightens membership insertion so assistants cannot appoint other assistants.
- Adds security-definer RPCs for invitation acceptance, adding a registered user by email, and deactivating a member.
- Checks the current authenticated user and manager role inside each RPC.
- Uses row locking while consuming invitation links to prevent concurrent over-use.
- Stores no raw invitation token.

## Routes
- `/groups/new` — create a tour group.
- `/groups/[groupId]` — group overview, member list, direct add and invite link creation.
- `/join/[token]` — accept a group invitation.
- `/dashboard` — links to the user's groups and group creation.

## Test checklist
1. Apply migration 0002 after migration 0001.
2. Sign in as a user and create a group. Verify that user appears as `manager`.
3. Create an invitation link and open it in a private/incognito browser.
4. Sign in as another registered user and accept the invitation.
5. Verify that the new user appears as `member`.
6. Try to add a user by email as a manager.
7. Promote an existing member to assistant manager using the manager's add-member form (deactivate first if already active).
8. Sign in as an assistant manager; confirm they can add members but cannot appoint assistant managers or remove members.
9. Sign in as an ordinary member; confirm they can see the group but cannot see management forms or call manager-only RPCs successfully.
10. Verify a user who is not a group member cannot open the group's detail route.

## Important operational note
Invitation acceptance requires an authenticated account. Invitation links are bearer credentials: share them only with intended participants, and revoke/expire them if they are exposed. This phase supports adding already registered users by email and joining through an invitation link. It does not send email invitations automatically.
