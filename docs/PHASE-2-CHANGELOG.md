# Phase 2 changelog — Group management

### Added
- Group creation page and server action.
- Dashboard group links and create-group entry point.
- Group overview page with active members and group metadata.
- Add registered users by email through a database RPC.
- Manager-only assistant-manager appointment.
- Manager-only member deactivation.
- Hashed invitation token creation, expiry and maximum-use settings.
- Authenticated invitation acceptance with row-level locking.
- Login and signup preserve the invitation return path.
- Group creation/member activity events.
- Migration `0002_group_management.sql`.

### Security
- Database RPCs re-check the current Supabase user and group role.
- Raw invitation token is not persisted in the database.
- Assistant managers cannot assign assistant-manager roles.
- Non-members cannot read group detail data due to RLS.
- Invite acceptance requires authentication and consumes invitation use atomically.

### Not included yet
- Email delivery for invitations.
- Member payment submissions and approval.
- Contributions, expenses and receipt uploads.
- Financial dashboard and settlement.
- Member self-service leave-group flow.
