# ColumbiaGames Rewrite – Sprint 1 Starter

Ez a csomag a tényleges Sprint 1 kezdetét adja meg:
- futtatható, dependency-light PHP API starter
- React + TypeScript web starter
- legacy-kompatibilis auth és catalog read-only flow

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

## Miért nem teljes Laravel app?
Itt most az volt a cél, hogy azonnal legyen **végrehajtható, kézzelfogható induló kód**. A mappastruktúra és a service/repository szétválasztás már úgy van rendezve, hogy ezt később könnyen Laravel alá lehessen húzni.

## Gyors indítás
1. Másold át az `.env.example`-t `.env`-re a rootban és az API mappában.
2. Állítsd be a két DB kapcsolatot.
3. API indítás:
   - `make api`
4. Frontend indítás:
   - `make web`

## Következő ticketek
- cart cookie bridge (`bid-cg`)
- active cart read
- add/update/remove cart items
- checkout field mapping
- digital library listing
