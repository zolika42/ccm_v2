# API starter

Egyszerű, natív PHP 8.2+ API starter két Postgres kapcsolattal.

## Követelmények
- PHP 8.2+
- PDO_PGSQL
- session támogatás

## Indítás
```bash
php -S 0.0.0.0:8080 -t public
```

## Endpointok
- `GET /health`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`
- `GET /catalog/products`
- `GET /catalog/products/{productId}`
- `GET /catalog/products/{productId}/related`
