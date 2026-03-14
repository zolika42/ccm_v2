# ColumbiaGames Rewrite – Sprint 1 Starter

Ez a repo már nem csak kódszkeletont, hanem **futtatható fejlesztői környezetet** is ad:
- natív PHP API starter
- React + TypeScript web starter
- Docker Compose stack (API + web + Postgres)
- opcionális DDEV wrapper
- restore / verify / smoke workflow a legacy dumpokhoz

## Mi van benne?

### API
A backend tudja ezeket az endpointokat:
- `GET /health`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`
- `GET /catalog/products`
- `GET /catalog/products/{productId}`
- `GET /catalog/products/{productId}/related`

Az API két PostgreSQL kapcsolatot használ:
- `ccm`
- `columbia_games`

### Web
A frontend tartalmaz:
- login oldal
- terméklista oldal
- termék részletező oldal
- typed API kliens

## Gyors indítás Dockerrel
1. Másold át a root `.env.example` fájlt `.env` névre.
2. Indítsd el a stacket:
   - `make up`
3. Ha megvannak a dumpok, töltsd be őket:
   - `make restore CCM_DUMP=/abs/path/ccm.sql.gz STORE_DUMP=/abs/path/columbia_games.sql.gz`
4. Ellenőrzés:
   - `make verify`
   - `make smoke`

Elérhetőségek:
- API: `http://localhost:8080`
- Web: `http://localhost:5173`
- Postgres: `localhost:55432`

## DDEV
A `.ddev/` mappa opcionális kényelmi réteg. A source of truth továbbra is a Docker Compose.

## Következő ticketek
- cart cookie bridge (`bid-cg`)
- active cart read
- add/update/remove cart items
- checkout field mapping
- digital library listing
