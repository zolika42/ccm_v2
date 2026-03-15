# Download Security Review (CG-183)

## Scope

This note documents how the rewrite bridges legacy downloadable products without inventing a new token system in v1.

## Current bridge

The API exposes `GET /library/{productId}/download`. The endpoint:

1. requires an authenticated session
2. checks ownership using `preorders + products`
3. requires the product to be downloadable
4. requires a non-empty `downloadable_filename`
5. rejects unsafe filenames unless `basename(filename) === filename`
6. then resolves delivery in one of two modes:
   - `LEGACY_DOWNLOAD_ROOT` → stream the file directly from disk
   - `LEGACY_DOWNLOAD_BASE_URL` → redirect to a trusted legacy/static download origin

## Why this is acceptable for v1

- The rewrite does **not** change entitlement semantics. Ownership still comes from `preorders`.
- The rewrite does **not** create a parallel download authorization store.
- The bridge is thin, explicit, and easy to audit.

## Security rules

- No raw path fragments from the database are trusted.
- Only basename-safe filenames are allowed.
- If the filename contains path separators, the request fails.
- If disk streaming is enabled, the resolved file must remain under `LEGACY_DOWNLOAD_ROOT`.
- Responses are marked `private, no-store` and `nosniff`.
- Every download decision is logged with request ID, customer ID, and product ID.

## Non-goals

- No signed download tokens yet
- No new CDN authorization layer
- No file renaming/rehashing migration

## Recommendation

For v1, prefer `LEGACY_DOWNLOAD_ROOT` when the rewrite and the legacy files live on the same trusted host. Use `LEGACY_DOWNLOAD_BASE_URL` only when a pre-existing trusted download origin already exists.

## Follow-up parking lot

A new tokenized download subsystem remains a later parking-lot item (`CG-P03`).
