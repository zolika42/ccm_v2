#!/usr/bin/env bash
set -euo pipefail

docker exec -i ccm_v2_postgres psql -U "${LEGACY_DB_SUPERUSER:-postgres}" -d postgres <<'SQL'
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ccm') THEN
    CREATE ROLE ccm NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'columbia') THEN
    CREATE ROLE columbia NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'columbia_games') THEN
    CREATE ROLE columbia_games NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'columbia_dixie') THEN
    CREATE ROLE columbia_dixie NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'columbia_zoli') THEN
    CREATE ROLE columbia_zoli NOLOGIN;
  END IF;
END
$$;
SQL