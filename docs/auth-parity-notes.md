# Auth / Customer Parity Notes (CG-195, CG-196, CG-197, CG-198, CG-199)

## CG-195 — Registration / new customer creation

Implemented rewrite path:
- `POST /auth/register`
- frontend flow on `/login` (Account page)

Legacy-compatible write target:
- `columbia_games.customers`

Minimum required fields in the rewrite:
- `email`
- `password`

Dump-validated customer creation notes:
- `ship_name` is optional in the legacy table; the rewrite therefore no longer blocks blank names.
- legacy `customer_password` values include many passwords shorter than 8 characters, so the rewrite no longer imposes a new minimum length on create/reset.
- when registration only supplies shipping fields, the rewrite mirrors them into legacy billing fields on insert.
- empty stored card metadata now defaults to legacy-style placeholders: `choose` / `Month` / `Year`.

Supported additional customer fields written on create/update:
- shipping: `ship_phone`, `ship_street`, `ship_street2`, `ship_city`, `ship_state`, `ship_zip`, `ship_country`
- billing: `bill_name`, `bill_street`, `bill_street2`, `bill_city`, `bill_state`, `bill_zip`, `bill_country`
- stored payment snapshot metadata: `pay_cardtype`, `pay_cardmonth`, `pay_cardyear`, `pay_cardname`, `pay_card_last4`

Compatibility notes:
- login still authenticates against `customers.ship_email` + `customers.customer_password`
- successful registration signs the new customer into the rewrite immediately

## CG-196 — Password recovery / reset

Audit findings from the checked-in project assets:
- the checked-in rewrite previously only documented a spike
- the checked-in assets do **not** prove a legacy email-based forgot-password entrypoint
- the checked-in assets do **not** prove the legacy mail delivery dependency
- current login code shows password comparison against `customers.customer_password`, i.e. the rewrite currently expects the legacy password column directly

Implemented safe path:
- `GET /auth/password/recovery-policy` returns the current audit/decision summary
- `POST /auth/password/reset` allows an already authenticated customer to rotate the legacy password

Explicit non-goal for this ticket implementation:
- no email-based forgot-password flow is shipped without verified legacy evidence

## CG-197 — Customer profile update / “make changes”

Implemented rewrite path:
- `PUT /auth/profile`
- frontend profile form on `/login`

Validation note:
- email remains required and must be valid
- `name` is editable but not required because the dump contains many legacy customers with blank/null `ship_name`

Supported rewrite profile surface:
- identity: `name`, `email`
- shipping address/contact fields listed above
- billing fields listed above
- stored payment snapshot metadata listed above

Post-save behavior:
- `/auth/me` returns the updated values immediately after save

## CG-198 — Anonymous checkout vs login-required

Rewrite decision:
- checkout is **explicitly login-required**
- anonymous checkout is **disabled**

Reason:
- the current legacy submit path writes through customer-bound legacy functions and order fields (`customerid`, `ec_customer_id`, `record_order()`, `record_item()`), so the rewrite enforces an authenticated customer before submit

Backend enforcement:
- checkout requirements expose `requiresLogin = true`
- checkout requirements expose `guestCheckoutAllowed = false`
- checkout requirements expose `policy = login-required`
- checkout submit rejects unauthenticated users

Frontend enforcement:
- checkout page shows the login-required policy and directs the user to the account page

## CG-199 — Remember-me / browser customer mapping

Audit finding:
- the checked-in project assets document browser/cart continuity via `bid-cg` + `browser_state`
- they do **not** fully prove the original legacy browser→customer auto-login algorithm

Implemented migration replacement:
- the rewrite keeps `bid-cg` for browser/cart continuity
- authentication persistence is implemented as a first-party remembered session cookie (`rememberMe` on login/register)
- `/auth/me` exposes the current auth persistence mode and current browser id for observability

Decision:
- full legacy browser→customer parity is treated as **not proven / not mandatory** in the checked-in assets
- the remembered session is the explicit rewrite replacement
