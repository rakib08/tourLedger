# Mobile UX Corrections

## Group details description
- Group descriptions are initially clamped to three lines.
- A Read more / Read less control expands and collapses longer descriptions.
- Destination, travel dates, currency and role information remain outside the expandable description.

## Financial overview
- The overview is the financial landing page and task hub.
- Available balance appears first.
- Contribution, expense and pending-payment summaries follow.
- Quick actions (Submit a contribution / Record a group expense) are visually separated from management tasks.
- Standard contribution settings, payment verification and transaction history open dedicated routes.
- Removed the duplicate Financial overview navigation card.
- Removed repeated finance navigation cards from individual finance pages.
- Individual finance pages include a direct link back to Financial overview.
- Recent activity remains a compact preview with a View all link.

## PWA installation prompt
- The prompt appears only when a browser install event is available, or iOS Add to Home Screen guidance applies.
- Explicit dismissal is persisted in localStorage across routes and browser sessions.
- The prompt is hidden after successful installation.
- Declining the native browser install dialog does not count as explicit dismissal; the TourLedger banner remains until the user dismisses it.
- Service-worker caching rules for authenticated pages and private finance data are unchanged.

## Database and permissions
- No database migration is required.
- Existing server actions, Supabase RLS policies and role-based permission checks are unchanged.
