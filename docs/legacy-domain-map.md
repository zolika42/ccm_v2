# Legacy Domain Map (CG-001)

## Databases

### `ccm`
- cart identity / browser state
- active order state
- order/item EAV rows

### `columbia_games`
- customers
- products
- related products
- preorders / digital library entitlements
- payment config helpers (`payflowpro`)

## Main rewrite domains
- Auth
- Catalog
- Cart
- Checkout
- Library
- Download delivery bridge

## Legacy integration touchpoints
- cookie: `bid-cg`
- functions: `record_order`, `record_item`, `preorder_update_or_insert`
- product downloadable metadata: `is_downloadable`, `downloadable_filename`
