# Reduce Firebase reads — incremental refresh, meta-docs & listeners

## Summary

- Replace periodic/visibility-driven full reads with incremental refreshes and lightweight meta-doc listeners to drastically reduce Firestore reads while preserving near-real-time UX.

## What changed

- Replaced comment polling with a `meta/commentsLatestChange` listener + single-doc fetch.
- Added `meta/*Stats` meta docs (`hikesStats`, `photosStats`) written by Cloud Functions to enable cheap consistency checks.
- Converted user-triggered `refreshUpdates()` to an incremental refresh using `getHikesSince()` and `getPhotosSince()`; falls back to full sync only when meta-stats mismatch.
- Added `setupCommentsChangeListener` and removed the periodic comment polling.
- Updated Cloud Functions to maintain meta docs and stats.
- Added emulator test scenarios and documentation (`scripts/emulator-read-test.js`).

## Measured impact (local emulator)

- comment polling → ~200 docs/read per poll
- guarded poll (TTL) → ~66.7 docs/read
- meta-doc + single-count fetch → ~1 doc/read (≈99% reduction for comment changes)
- full refresh avoided except when necessary (700 docs/read otherwise)

## Files touched (high level)

- functions/index.js (meta docs & stats updates)
- src/hooks/useHikeData.js (incremental refresh, listeners)
- src/services/firebaseService.js (comments change listener)
- scripts/emulator-read-test.js (tests + scenarios)

## Deployment (required)

1. Deploy Cloud Functions (must run first so meta docs are written):
   ```bash
   cd functions
   firebase deploy --only functions
   ```
2. Deploy frontend (if you want the latest client changes in production):
   - If using GitHub Pages (existing flow): `npm run deploy`
   - If hosting via Firebase Hosting: `npm run build && firebase deploy --only hosting`

## Verification / smoke tests

- Create/delete a comment in the Console or via UI → `meta/commentsLatestChange` should update and client should receive incremental update without polling large collections.
- Run `scripts/emulator-read-test.js` against the emulator to confirm read reductions.

## Rollback / notes

- Code falls back to full sync only when meta-stats disagree; this is a safety net.
- If anything fails, revert the PR and redeploy functions.

---

Please review and merge; I recommend deploying functions first.
