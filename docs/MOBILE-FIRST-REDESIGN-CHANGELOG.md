# Mobile-First Redesign Changelog

- Replaced the long all-in-one financial page with a focused financial overview.
- Added dedicated contribution, expense, standard contribution settings, payment verification and transaction history pages.
- Added a shared finance context loader to keep data and membership checks consistent.
- Added context-aware mobile bottom navigation for dashboard, group and finance contexts.
- Redesigned financial cards and shortcuts for narrow screens.
- Increased form control and button touch areas and used 16px input text.
- Added safe-area CSS, viewport-fit support and reduced-motion handling.
- Added a browser PWA install prompt and iOS Add to Home Screen instructions.
- Updated the manifest start URL and service worker cache version. Private/authenticated data remains excluded from service-worker caching.
- Preserved the existing SQL migrations and financial server actions; no new database migration is required for this UI-only change.
