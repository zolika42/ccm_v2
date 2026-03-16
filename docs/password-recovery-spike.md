# Password Recovery / Reset Audit (CG-196)

## Goal
Avoid shipping an improvised forgot-password flow while still closing the legacy-parity gap around password reset.

## Audit result from checked-in assets
- the original rewrite only had a spike note here
- the checked-in assets do **not** identify a verified legacy forgot-password entrypoint
- the checked-in assets do **not** identify a verified email delivery dependency
- the current rewrite login code compares against `customers.customer_password`, so the active compatibility expectation is still the legacy password column

## Rewrite decision
- **do not** ship an email-based forgot-password flow yet
- **do** ship an authenticated password reset flow for already logged-in customers
- expose the current policy via API so QA/UAT can verify the behavior intentionally

## Implemented endpoints
- `GET /auth/password/recovery-policy`
- `POST /auth/password/reset`

## Why this is safe
- no guessed mail integration
- no token/email reset flow without proven legacy behavior
- password rotation remains available for authenticated customers
- the reset path stays dump-compatible by requiring a non-empty new password, but not inventing a stricter minimum length than the legacy dataset itself proves

## Follow-up still needed for full legacy proof
- identify the old public recovery entrypoint (if any)
- identify how legacy email sending worked
- verify whether parity requires reproducing it or whether the rewrite decision remains to keep it disabled
