# Legacy Integration Contract (CG-002)

## What the rewrite may do
- read/write cart state in `ccm`
- read customers/products/preorders in `columbia_games`
- call `record_order`, `record_item`, `preorder_update_or_insert`
- use the legacy browser/cart cookie bridge
- bridge downloadable files through explicit configuration

## What the rewrite must not do in v1
- mutate legacy schemas
- invent a new payment provider flow without audit
- invent a new entitlement store
- trust raw download paths from DB values

## Source-of-truth rules
- OpenAPI spec describes the rewrite API contract
- docs capture architecture and operating rules
- generated code must stay reproducible
