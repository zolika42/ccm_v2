# Parity Checklist (CG-190)

Use this checklist when comparing the rewrite against the legacy storefront.

## Auth
- [ ] Login accepts a known legacy customer email/password
- [ ] Logout clears the rewrite session
- [ ] `/auth/me` matches the logged-in customer

## Catalog
- [ ] Product list loads
- [ ] Search (`q`) works
- [ ] Product detail loads
- [ ] Related products load

## Cart
- [ ] Add to cart works from list view
- [ ] Add to cart works from PDP
- [ ] Quantity update works
- [ ] Remove works
- [ ] Cart survives refresh via cookie bridge

## Checkout
- [ ] Summary reflects active cart
- [ ] Validate returns structured errors
- [ ] Submit records the order
- [ ] Cart clears after successful submit

## Library
- [ ] Owned downloads are visible when logged in
- [ ] Anonymous library request is blocked
- [ ] Download button is shown only for products with mapped files
- [ ] `GET /library/{productId}/download` enforces ownership

## Ops
- [ ] `make legacy-refresh` completes
- [ ] `make smoke` passes
- [ ] `npm run check:api-client` passes
- [ ] `npm run build` passes
