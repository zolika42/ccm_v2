#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

CCM_DUMP="${1:-}"
STORE_DUMP="${2:-}"
DB_SERVICE="${DB_SERVICE:-postgres}"
DB_USER="${LEGACY_DB_SUPERUSER:-postgres}"
CCM_DB="${CG_CCM_DB_NAME:-ccm}"
STORE_DB="${CG_STORE_DB_NAME:-columbia_games}"

if [[ -z "$CCM_DUMP" || -z "$STORE_DUMP" ]]; then
  echo "Usage: scripts/db/restore-legacy.sh /path/to/ccm.sql.gz /path/to/columbia_games.sql.gz" >&2
  exit 1
fi

for file in "$CCM_DUMP" "$STORE_DUMP"; do
  if [[ ! -f "$file" ]]; then
    echo "Missing dump file: $file" >&2
    exit 1
  fi
done

if ! docker compose ps "$DB_SERVICE" >/dev/null 2>&1; then
  echo "Docker Compose service '$DB_SERVICE' is not available. Start the stack first with 'make up'." >&2
  exit 1
fi

psql_exec() {
  docker compose exec -T "$DB_SERVICE" psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d postgres "$@"
}

stream_sql() {
  local file="$1"
  local database="$2"

  if [[ "$file" == *.gz ]]; then
    gunzip -c "$file" | docker compose exec -T "$DB_SERVICE" psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$database"
  else
    cat "$file" | docker compose exec -T "$DB_SERVICE" psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$database"
  fi
}

echo "[restore] Recreating database: $CCM_DB"
psql_exec -c "DROP DATABASE IF EXISTS \"$CCM_DB\";"
psql_exec -c "CREATE DATABASE \"$CCM_DB\";"
stream_sql "$CCM_DUMP" "$CCM_DB"

echo "[restore] Recreating database: $STORE_DB"
psql_exec -c "DROP DATABASE IF EXISTS \"$STORE_DB\";"
psql_exec -c "CREATE DATABASE \"$STORE_DB\";"
stream_sql "$STORE_DUMP" "$STORE_DB"

echo "[restore] Done."
