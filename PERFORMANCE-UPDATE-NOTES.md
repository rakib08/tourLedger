# TourLedger Performance Update

## Included changes
- Parallelized independent work in the group detail page and finance subpages. The shared finance context and page-specific Supabase client are initialized concurrently on contributions, expenses, reports and settlement pages.
- Removed an extra settlement profile lookup by reusing the profile map already loaded by the finance context.
- Added a reusable navy fading-spoke loading indicator to primary form submissions, authentication submissions and PDF report generation.
- Added route-level loading skeletons for dashboard, group, group finance and Super Admin navigation.
- Updated the service worker to cache same-origin Next.js build assets and public static assets (including fonts/icons) with bounded cache size.
- Added a lightweight offline page. Navigation requests remain network-only and fall back to this page when offline.
- Private pages, RSC/navigation payloads, API responses, Supabase requests, receipts and financial records are never stored in the service-worker cache.

## Deployment
No database migration or environment variable change is required. Replace the files at the same paths, commit and deploy to Vercel. The service worker cache version is incremented to v3 and will replace the previous TourLedger static cache after activation.

## Validation
The updated service-worker.js passed `node --check`. A full Next.js typecheck/build and live Supabase performance test were not run in this environment. Run `npm run typecheck` and `npm run build` locally before deploying.
