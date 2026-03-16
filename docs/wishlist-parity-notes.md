# Wishlist Parity Notes (CG-222 / CG-223 / CG-224)

## Legacy relation model
- Legacy config points the wishlist summary at `wishlists` / `real_wishlists`.
- In the store DB, `real_wishlists.ship_email` actually stores `customers.customerid` as text.
- The rewrite therefore reads and writes wishlist data by authenticated `customerid`, not by mutable email text.
- This keeps the customer↔wishlist relation stable even when the customer updates `ship_email` in profile data.

## Rewrite API surface
- `GET /wishlist` — authenticated wishlist summary/read model
- `POST /wishlist/items` — add / increment wishlist quantity
- `PATCH /wishlist/items/{productId}` — replace a wishlist quantity (0 means remove)
- `DELETE /wishlist/items/{productId}` — explicit remove

## Product validation
- Wishlist mutations only accept product IDs that currently exist in the rewrite catalog.
- Response payloads always return the refreshed wishlist state so the UI can reflect the post-mutation result immediately.

## Post-purchase side-effect (CG-224)
- After successful store-side `record_order` / `record_item`, the rewrite runs wishlist sync inside the same store transaction window.
- For each purchased product:
  - if the product is not on the wishlist: no-op
  - if purchased quantity is lower than wishlist quantity: decrement wishlist quantity
  - if purchased quantity consumes the saved quantity: remove the wishlist row
- The checkout submission payload exposes a `wishlist` side-effect block so UAT can verify what changed.

## Why this matches the current parity goal
- preserves legacy customer binding semantics
- exposes a readable wishlist summary for the rewrite UI
- supports add + replace/update flows
- leaves an auditable, checkable purchase-side effect trail in the checkout response
