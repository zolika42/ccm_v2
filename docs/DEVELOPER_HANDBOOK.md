# Developer Handbook

> Generated automatically by `scripts/docs/generate-docs.mjs`. Do not hand-edit this file; update the generator instead.
> Generated at: 2026-03-16T07:39:51.243Z

## 1. What this repo is

ColumbiaGames Rewrite is a dual-stack application:
- a native PHP API under `apps/api`
- a React + TypeScript storefront under `apps/web`
- two PostgreSQL databases:
  - `ccm` = legacy cart/order/browser-state data
  - `columbia_games` = store/customer/product/preorder data

The repo is designed to let developers work in three modes:
1. Docker Compose (source of truth for the local stack)
2. Native host workflow for fast iteration
3. Legacy restore/verify/smoke workflow for validating the rewrite against production-like dumps

## 2. Source-of-truth rules

- **Docker Compose is the source of truth** for local runtime wiring.
- **`apps/api/public/openapi.yaml` is the source of truth** for the frontend API client.
- **`scripts/docs/generate-docs.mjs` is the source of truth** for this handbook.
- **Generated files must be reproducible**:
  - `apps/web/src/api/generated.ts` comes from `npm run generate:api`
  - `docs/DEVELOPER_HANDBOOK.md` comes from `node scripts/docs/generate-docs.mjs`

## 3. Repository map

### Root
- `Makefile` — common day-to-day commands
- `docker-compose.yml` — local stack wiring
- `Project_plan.txt` — original rewrite plan / backlog context
- `README.md` — short entrypoint for humans
- `docs/` — deeper technical and architecture documentation
- `scripts/db/` — restore / verify / smoke helpers
- `scripts/docs/` — doc generation and doc quality checks

### API
- `apps/api/public/index.php` — HTTP entrypoint and route registration
- `apps/api/src/Controllers` — HTTP controller layer
- `apps/api/src/Services` — use-case / orchestration layer
- `apps/api/src/Repositories` — database access layer
- `apps/api/src/Support` — routing, request, response, logging, cookie/session helpers

### Web
- `apps/web/src/App.tsx` — app shell and route table
- `apps/web/src/pages` — page-level UI
- `apps/web/src/cart` — cart context/state helpers
- `apps/web/src/api/client.ts` — ergonomic wrapper used by pages/components
- `apps/web/src/api/generated.ts` — generated typed client
- `apps/web/src/api/runtime.ts` — fetch/runtime abstraction used by generated client
- `apps/web/scripts/generate-api-client.mjs` — generator that reads the OpenAPI spec

## 4. Prerequisites

### Required
- Docker + Docker Compose
- Node.js 20+ for native frontend work
- npm
- PHP 8.2+ for native API work
- PostgreSQL client tools for restore helpers (or use the Docker stack)

### Nice to have
- GNU Make
- a working `python3` on the host for smoke helpers (the script now probes for a working interpreter automatically)

## 5. First-time setup

### Docker path (recommended)
1. Start the stack:
   - `make up`
2. Restore the legacy dumps when you have them:
   - `make legacy-refresh CCM_DUMP=/abs/path/ccm.sql.gz STORE_DUMP=/abs/path/columbia_games.sql.gz`
3. Open the app:
   - Web: `http://localhost:5173`
   - API: `http://localhost:8080`
   - Health: `http://localhost:8080/health`
   - OpenAPI: `http://localhost:8080/openapi`

### Native path
1. API:
   - `make native-api`
2. Web:
   - `make native-web`
3. Restore + verify + smoke when needed:
   - `make legacy-refresh CCM_DUMP=/abs/path/ccm.sql.gz STORE_DUMP=/abs/path/columbia_games.sql.gz`

## 6. Daily developer workflow

### Common root commands
- `docs`
- `docs-check`
- `up`
- `down`
- `logs`
- `api-logs`
- `api-log-file`
- `web-logs`
- `pgadmin-logs`
- `ps`
- `restore`
- `verify`
- `smoke`
- `legacy-refresh`
- `native-api`
- `native-web`
- `pgadmin-up`
- `pgadmin-down`

### Frontend commands
- `dev` → `node ./node_modules/vite/bin/vite.js`
- `build` → `npm run generate:api && node ./node_modules/vite/bin/vite.js build`
- `preview` → `node ./node_modules/vite/bin/vite.js preview`
- `generate:api` → `node ./scripts/generate-api-client.mjs`
- `typecheck` → `node ./node_modules/typescript/bin/tsc -p tsconfig.json --noEmit`
- `check:api-client` → `npm run generate:api && npm run typecheck`
- `docs:generate` → `node ../../scripts/docs/generate-docs.mjs && node ../../scripts/docs/generate-code-reference.mjs`
- `docs:check` → `node ../../scripts/docs/verify-source-comments.mjs`
- `postinstall` → `npm run docs:generate && npm run docs:check`

### Recommended loop
1. Pull latest code
2. Run `make up` (or `make native-api` + `make native-web`)
3. If schema-sensitive work changed, run `make legacy-refresh ...`
4. If API contract changed, run:
   - `cd apps/web`
   - `npm run generate:api`
   - `npm run check:api-client`
5. Before shipping, run smoke again

## 7. Architecture in plain language

### API request flow
1. `apps/api/public/index.php` parses the request and creates a request context
2. `Router` matches the route
3. A controller validates the HTTP shape
4. A service runs the use case
5. A repository talks to PostgreSQL
6. `JsonResponse` returns the uniform envelope

### Cart / checkout data flow
- Browser identity lives in the legacy `bid-cg` cookie bridge
- Active cart lives in the legacy `ccm` database using browser-state + EAV order/item rows
- Customer/product/preorder information lives in `columbia_games`
- Checkout submit bridges both worlds:
  - reads legacy cart state from `ccm`
  - persists order/customer effects in `columbia_games`
  - clears the active browser cart after submit

### Digital library
- The library is built from store preorders joined with downloadable products
- The API exposes this via `GET /library`
- The frontend renders it at `/library`

## 8. API contract and generated frontend client

The frontend must not hand-roll raw fetch calls for project endpoints anymore. The intended contract is:
1. API shape lives in `apps/api/public/openapi.yaml`
2. The generated frontend client is produced by `apps/web/scripts/generate-api-client.mjs`
3. Pages/components call the wrapper in `apps/web/src/api/client.ts`

### Current OpenAPI operations
- `GET /health` → `getHealth`
- `GET /openapi` → `getOpenapi`
- `POST /auth/login` → `login`
- `POST /auth/logout` → `logout`
- `GET /auth/me` → `me`
- `GET /catalog/categories` → `getCatalogCategories`
- `GET /catalog/products` → `listProducts`
- `GET /catalog/products/{productId}` → `getProduct`
- `GET /catalog/products/{productId}/related` → `getRelatedProducts`
- `GET /cart/identity` → `getCartIdentity`
- `GET /cart` → `getCart`
- `GET /cart/summary` → `getCartSummary`
- `POST /cart/items` → `addCartItem`
- `PATCH /cart/items/{productId}` → `updateCartItem`
- `DELETE /cart/items/{productId}` → `removeCartItem`
- `GET /checkout/summary` → `getCheckoutSummary`
- `POST /checkout/validate` → `validateCheckout`
- `POST /checkout/submit` → `submitCheckout`
- `GET /library` → `getLibrary`
- `GET /library/{productId}/download` → `getLibraryDownload`

### Rule of thumb
- Change backend route/shape? Update OpenAPI first.
- Change OpenAPI? Regenerate frontend client.
- Generated files may be committed, but they must stay reproducible from the generator.

## 9. Legacy data workflow

### Restore
- `scripts/db/restore-legacy.sh` recreates both legacy databases from dumps

### Verify
- `scripts/db/verify-legacy.sh` checks required tables/functions before app testing

### Smoke
- `scripts/db/smoke-api.sh` covers:
  - health
  - auth failure path
  - catalog lookup
  - cart read/write
  - checkout summary/validate
  - anonymous library protection
  - optional authenticated purchase smoke

## 10. Documentation workflow

### Central rule
Documentation is part of the build surface, not an afterthought.

### What must be kept up to date
- `README.md` — short repo entrypoint
- `docs/DEVELOPER_HANDBOOK.md` — central living handbook
- `docs/checkout-field-map.md` — checkout mapping notes
- `docs/payment-flow-audit.md` — payment flow findings
- `apps/api/public/openapi.yaml` / `docs/openapi.yaml` — API contract

### Automatic doc generation
- `npm install` in `apps/web` triggers doc generation and doc comment verification
- `make docs` regenerates docs manually
- `make docs-check` verifies that first-party source files carry a file-overview comment

## 11. Self-documenting code policy

Every first-party source file must explain its role at the top of the file with an `@fileoverview` comment (or an equivalent shell comment for bash scripts). Public entrypoints and adapters should prefer clear names over cleverness. When logic is non-obvious, add intent comments near the decision point instead of leaving tribal knowledge in chat history.

## 12. Troubleshooting

### White page in the frontend
- Usually a runtime React/import error or a generated-client mismatch
- Regenerate and rebuild:
  - `cd apps/web`
  - `npm run check:api-client`
  - `npm run build`

### Smoke fails on Python lookup
- The smoke script probes for a working Python interpreter, but if the host PATH is unusual, run with:
  - `PYTHON_BIN=/usr/bin/python3 ./scripts/db/smoke-api.sh`

### Build fails after OpenAPI changes
- Re-run `npm run generate:api`
- Check whether `apps/web/src/api/runtime.ts` still exists
- Check whether the OpenAPI operationId matches generator config

### Docker web build fails after npm script changes
- The web Dockerfile only works if the build context contains every file needed by npm lifecycle hooks
- If doc generation or client generation scripts move, update `apps/web/Dockerfile` too

## 13. Definition of done for future tickets

A ticket is not done unless:
- the code works
- the relevant doc is updated
- the OpenAPI spec is updated when the API changed
- the frontend client is regenerated when the spec changed
- smoke/typecheck/build still pass
