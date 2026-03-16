# UAT Script (updated for CG-195..199)

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
- Open `/checkout`
- Confirm checkout clearly says guest checkout is disabled and login is required
- Open `/library` and confirm login prompt/error
- Open `/wishlist` and confirm login prompt/error

### 2. New customer registration
- Open `/login`
- Create a new account with email and password (name optional)
- Confirm the UI becomes authenticated immediately
- Confirm `/auth/me` equivalent UI shows the new customer id/email/name
- Refresh the page and confirm remembered-session behavior when enabled

### 3. Authenticated buyer session
- Log in with a known fixture customer
- Confirm `/auth/me` equivalent UI looks correct
- Confirm cart survives login state changes
- Confirm auth persistence mode and browser id are visible in the account UI

### 4. Profile / make changes
- While authenticated, edit shipping/billing fields on `/login`
- Save profile
- Confirm the updated values stay on screen after save
- Refresh session and confirm the same values are returned again

### 5. Password reset policy
- Open `/login`
- Confirm the page shows that email-based forgot-password is intentionally unavailable
- While authenticated, change the password through the authenticated reset form
- Log out
- Log back in with the new password

### 6. Purchase flow
- Add one product
- Open `/checkout`
- Validate with missing fields and confirm structured errors
- Submit with a valid draft
- Confirm success state/order ID
- Confirm cart is cleared

### 7. Library flow
- Open `/wishlist`
- Confirm wishlist summary appears for the authenticated customer and shows saved quantities
- Add a product to wishlist from `/products` or a PDP and confirm it appears in `/wishlist` (CG-223)
- Change a wishlist quantity on `/wishlist`, save it, and confirm the updated quantity persists (CG-223)
- Submit a purchase that overlaps the wishlist and confirm the checkout success block reports the wishlist side-effect (CG-224)
- Open `/library`
- Confirm owned downloads list appears
- Catalog parity spot-check (CG-200): open Products, pick a category + subcategory + third-level `sub_category2`, and verify the list narrows correctly.
- Logged-in catalog parity (CG-201): sign in with a fixture user, open Products, and verify at least one product is marked `Owned` and one is marked `Preordered` without breaking anonymous browsing.
- 3rd-party meta parity (CG-202): open a product that has legacy 3rd-party metadata and verify the PDP shows the enrichment block and gallery without breaking the base product view.
- Click a download button for a mapped downloadable product
- Confirm file stream or redirect works

### 8. Regression
- Run `make smoke`
- Confirm no request/response errors in API logs
