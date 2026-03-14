# Development environment

A projekt alapfuttatása **Docker Compose**. Ez a source of truth.
A `.ddev/` csak kényelmi réteg lokális fejlesztéshez.

## Docker Compose

1. Másold a root `.env.example` fájlt `.env` néven.
2. Másold az `apps/api/.env.example` fájlt `apps/api/.env` néven, ha natív futtatást is szeretnél.
3. Indítás:
   ```bash
   make up
   ```
4. Ha megvannak a dumpok:
   ```bash
   make restore CCM_DUMP=/abs/path/ccm.sql.gz STORE_DUMP=/abs/path/columbia_games.sql.gz
   make verify
   make smoke
   ```

Elérhetőségek:
- API: `http://localhost:8080`
- Web: `http://localhost:5173`
- Postgres: `localhost:55432`

## DDEV

A DDEV a PHP API-t és a Postgres DB-t kényelmesen fel tudja húzni, és Vite-ot is tud indítani extra daemonként.

Javasolt használat:
```bash
ddev start
ddev describe
```

A Vite DDEV alatt külön porton lesz elérhető a routeren keresztül.

## Megjegyzés

Az első körben **nem módosítjuk a legacy sémát**. A restore/verify/smoke szkriptek pontosan ezért vannak a projektben: dump refresh után gyorsan vissza lehessen állni egy ismert, használható állapotba.
