# UAT Script (CG-193)

Run this after `make legacy-refresh` and before merging major rewrite changes.

## Setup
1. `make up`
2. `make legacy-refresh CCM_DUMP=... STORE_DUMP=...`
3. `cd apps/web && npm run check:api-client && npm run build`

## Script

### 1. Anonymous user
- Open `/products`
- Open a PDP
- Add an item to cart
- Confirm `/cart` shows the item
- Open `/library` and confirm login prompt/error

### 2. Authenticated buyer
- Log in with a known fixture customer
- Confirm `/auth/me` equivalent UI looks correct
- Confirm cart survives login state changes

### 3. Purchase flow
- Add one product
- Open `/checkout`
- Validate with missing fields and confirm structured errors
- Submit with a valid draft
- Confirm success state/order ID
- Confirm cart is cleared

### 4. Library flow
- Open `/library`
- Confirm owned downloads list appears
- Click a download button for a mapped downloadable product
- Confirm file stream or redirect works

### 5. Regression
- Run `make smoke`
- Confirm no request/response errors in API logs
