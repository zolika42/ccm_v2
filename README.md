# ColumbiaGames Rewrite – Sprint 1 Starter

Ez a repo már nem csak kódszkeletont, hanem **futtatható fejlesztői környezetet** is ad:
- natív PHP API starter
- React + TypeScript web starter
- Docker Compose stack (API + web + Postgres + pgAdmin)
- opcionális DDEV wrapper
- restore / verify / smoke workflow a legacy dumpokhoz

## Mi van benne?

### API
A backend tudja ezeket az endpointokat:
- `GET /health`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`
- `GET /catalog/categories`
- `GET /catalog/products`
- `GET /catalog/products/{productId}`
- `GET /catalog/products/{productId}/related`

Az API két PostgreSQL kapcsolatot használ:
- `ccm`
- `columbia_games`

### Web
A frontend tartalmaz:
- login oldal közös auth state providerrel
- terméklista oldal cached query state-tel és kategória / alkategória szűréssel
- termék részletező oldal
- generált typed API kliens az OpenAPI spec alapján

API kliens generálás:
- `cd apps/web && npm run generate:api`
- `cd apps/web && npm run check:api-client`

## Gyors indítás Dockerrel
1. Másold át a root `.env.example` fájlt `.env` névre.
2. Indítsd el a stacket:
   - `make up`
3. Ha megvannak a dumpok, töltsd be őket:
   - `make restore CCM_DUMP=/abs/path/ccm.sql.gz STORE_DUMP=/abs/path/columbia_games.sql.gz`
4. Ellenőrzés:
   - `make verify`
   - `make smoke`
5. Ha böngészőből akarod átnézni az adatbázisokat, a pgAdmin is feláll a stackkel együtt:
   - `http://localhost:5050`
   - login: `admin@local.test` / `admin`
   - az előre felvett szerver a Compose-os `postgres` service-re mutat

Elérhetőségek:
- API: `http://localhost:8080`
- Web: `http://localhost:5173`
- Postgres: `localhost:5432`
- pgAdmin: `http://localhost:5050`

## DDEV
A `.ddev/` mappa opcionális kényelmi réteg. A source of truth továbbra is a Docker Compose.

## Következő ticketek
- UI parity inventory screenshotokkal (CG-003)
- parity / UAT végigellenőrzés valódi legacy képernyőkkel
- opcionális vizuális legacy polish, ha még kell a finomhangolás


## API contract

- OpenAPI spec: `apps/api/public/openapi.yaml`
- Runtime endpoint: `GET /openapi`
- Every JSON response now carries a `meta.requestId` and error payloads use `error.code/message/details`.


## Code comment reference

A browsable HTML view of frontend/backend/tooling source comments is generated at `docs/code-reference/index.html`.

Download bridge configuration for owned library files:
- `LEGACY_DOWNLOAD_ROOT=/absolute/path/to/legacy/downloads` to stream files directly
- or `LEGACY_DOWNLOAD_BASE_URL=https://legacy.example/downloads` to redirect to an existing trusted origin

## pgAdmin

- Külön indítás: `make pgadmin-up`
- Logok: `make pgadmin-logs`
- Leállítás: `make pgadmin-down`
- Az előre konfigurált szerver a default `postgres` userrel van felvéve. Ha ettől eltérő superusert használsz, frissítsd a `docker/pgadmin/servers.json` fájlt.
