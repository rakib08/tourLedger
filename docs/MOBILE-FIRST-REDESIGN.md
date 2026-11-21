# TourLedger Mobile-First PWA Redesign

## Goals
- Design the application for phone-sized screens first, then progressively enhance for tablet and desktop.
- Keep all existing Supabase queries, server actions, RLS assumptions, group roles and finance business rules intact.
- Split the former long financial screen into focused routes.
- Add context-aware bottom navigation and PWA install/safe-area improvements.

## Financial routes
- `/groups/[groupId]/finances` — financial overview, balances, quick task links and recent activity.
- `/groups/[groupId]/finances/contribute` — contribution submission and the current user's recent submissions.
- `/groups/[groupId]/finances/expenses/new` — manager/assistant expense form.
- `/groups/[groupId]/finances/settings` — manager-only standard contribution setting.
- `/groups/[groupId]/finances/payments` — manager/assistant payment verification queue.
- `/groups/[groupId]/finances/transactions` — official transaction history and existing void action.

The shared `getFinanceContext` helper centralizes the existing authenticated group membership and finance data loading. Each page still relies on database RLS and the existing server actions for authorization and mutations.

## Navigation
- Dashboard context: Home and New group.
- Group context: Group, Finances and Home.
- Finance context: Group, Finances and Home, with finance task cards inside the finance area.
- Bottom navigation is mobile-only; desktop retains the top-level page structure.

## Mobile interaction standards
- Single-column layout by default, responsive grids at larger breakpoints.
- Minimum 44–48px touch controls; form fields use 16px text to avoid iOS focus zoom.
- Safe-area padding for devices with display cutouts and home indicators.
- Bottom navigation reserves content space so it does not cover page controls.
- Reduced-motion preference is respected.

## PWA and privacy
- Web app manifest starts at `/dashboard` and uses standalone display mode.
- Install prompt is shown when the browser exposes the install event; iOS users receive Add to Home Screen guidance.
- Service worker cache version is incremented. It continues to cache only the manifest and static icons. Authenticated pages, API responses, Supabase requests, receipts and financial data are deliberately not cached.

## Validation still required on the target environment
- Run `npm ci`, `npm run typecheck`, `npm run lint`, and `npm run build`.
- Test iOS Safari, Android Chrome, installed PWA mode, tablet and desktop widths.
- Verify bottom navigation does not overlap browser/home safe areas.
- Re-run manager, assistant manager and ordinary member authorization checks on every finance route.
- Confirm the browser install prompt appears only when browser installability criteria are met.
