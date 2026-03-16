# @fileoverview Restores the legacy CCM and Columbia Games PostgreSQL dumps into the local development databases.
#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

load_root_env_defaults() {
  local env_file="$ROOT_DIR/.env"

  if [[ ! -f "$env_file" ]]; then
    return
  fi

  while IFS= read -r line || [[ -n "$line" ]]; do
    local key raw_value value

    line="${line%$''}"
    [[ -z "${line//[[:space:]]/}" ]] && continue
    [[ "$line" =~ ^[[:space:]]*# ]] && continue

    if [[ "$line" == export[[:space:]]* ]]; then
      line="${line#export }"
    fi

    [[ "$line" == *=* ]] || continue

    key="${line%%=*}"
    raw_value="${line#*=}"

    key="$(printf '%s' "$key" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
    [[ "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || continue

    if [[ -n "${!key+x}" ]]; then
      continue
    fi

    value="$(printf '%s' "$raw_value" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"

    if [[ ${#value} -ge 2 ]]; then
      if [[ "${value:0:1}" == '"' && "${value: -1}" == '"' ]]; then
        value="${value:1:-1}"
      elif [[ "${value:0:1}" == "'" && "${value: -1}" == "'" ]]; then
        value="${value:1:-1}"
      fi
    fi

    printf -v "$key" '%s' "$value"
    export "$key"
  done < "$env_file"
}

load_root_env_defaults

CCM_DUMP="${1:-}"
STORE_DUMP="${2:-}"
DB_SERVICE="${DB_SERVICE:-postgres}"
DB_USER="${LEGACY_DB_SUPERUSER:-postgres}"
CCM_DB="${CG_CCM_DB_NAME:-ccm}"
STORE_DB="${CG_STORE_DB_NAME:-columbia_games}"
REWRITE_DB="${CG_REWRITE_DB_NAME:-columbia_rewrite}"
BOOTSTRAP_ROLES_SCRIPT="${BOOTSTRAP_ROLES_SCRIPT:-scripts/db/bootstrap-roles.sh}"
REWRITE_SCHEMA_SCRIPT="${REWRITE_SCHEMA_SCRIPT:-scripts/db/rewrite-schema.sql}"
ADMIN_BOOTSTRAP_IDS="${CG_ADMIN_BOOTSTRAP_CUSTOMER_IDS:-}"
ADMIN_BOOTSTRAP_MERCHANT_ID="${CG_ADMIN_BOOTSTRAP_MERCHANT_ID:-cg}"
ADMIN_BOOTSTRAP_CONFIG_ID="${CG_ADMIN_BOOTSTRAP_CONFIG_ID:-default}"

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

filter_sql_dump() {
  awk '
    BEGIN {
      skip_handler = 0
      skip_agg = 0
    }

    # PostgreSQL 18+ already has plpgsql in every database.
    /^CREATE EXTENSION( IF NOT EXISTS)?[[:space:]].*plpgsql/ { next }
    /^COMMENT ON EXTENSION[[:space:]].*plpgsql/ { next }
    /^CREATE PROCEDURAL LANGUAGE[[:space:]]+plpgsql;$/ { next }
    /^ALTER PROCEDURAL LANGUAGE[[:space:]]+plpgsql[[:space:]]+OWNER TO[[:space:]].*;$/ { next }

    # Very old dumps may also contain the handler function explicitly.
    /^CREATE FUNCTION plpgsql_call_handler\(\) RETURNS opaque$/ {
      skip_handler = 1
      next
    }

    skip_handler {
      if (/;[[:space:]]*$/) {
        skip_handler = 0
      }
      next
    }

    /^ALTER FUNCTION public\.plpgsql_call_handler\(\) OWNER TO[[:space:]].*;$/ { next }

    # PostgreSQL 14+ changed array_append() from (anyarray, anyelement)
    # to (anycompatiblearray, anycompatible). Rewrite the old legacy
    # aggregate definition so restores work on modern PostgreSQL.
    /^CREATE AGGREGATE array_accum\(anyelement\)[[:space:]]*\($/ {
      skip_agg = 1
      print "CREATE AGGREGATE array_accum(anycompatible) ("
      print "    SFUNC = array_append,"
      print "    STYPE = anycompatiblearray,"
      print "    INITCOND = '\''{}'\''"
      print ");"
      next
    }

    skip_agg {
      if (/^\)[[:space:]]*;[[:space:]]*$/ || /^\);[[:space:]]*$/) {
        skip_agg = 0
      }
      next
    }

    /^ALTER AGGREGATE public\.array_accum\(anyelement\) OWNER TO[[:space:]].*;$/ {
      sub(/array_accum\(anyelement\)/, "array_accum(anycompatible)")
      print
      next
    }

    { print }
  '
}

stream_sql() {
  local file="$1"
  local database="$2"

  if [[ "$file" == *.gz ]]; then
    gunzip -c "$file" | filter_sql_dump | docker compose exec -T "$DB_SERVICE" psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$database"
  else
    cat "$file" | filter_sql_dump | docker compose exec -T "$DB_SERVICE" psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$database"
  fi
}

seed_admin_scopes() {
  local ids="$1"
  local merchant_id="$2"
  local config_id="$3"

  if [[ -z "$ids" ]]; then
    return
  fi

  IFS="," read -r -a raw_ids <<< "$ids"
  for raw_id in "${raw_ids[@]}"; do
    local customer_id
    customer_id="$(echo "$raw_id" | xargs)"
    if [[ -z "$customer_id" ]]; then
      continue
    fi

    docker compose exec -T "$DB_SERVICE" psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$REWRITE_DB" <<SQL
INSERT INTO admin_user_scopes (customerid, merchant_id, config_id, is_active, notes)
VALUES ($customer_id, '$merchant_id', '$config_id', true, 'bootstrap seed')
ON CONFLICT (customerid, merchant_id, config_id)
DO UPDATE SET is_active = EXCLUDED.is_active, notes = EXCLUDED.notes, updated_at = now();
SQL
  done
}

if [[ -x "$BOOTSTRAP_ROLES_SCRIPT" ]]; then
  echo "[restore] Bootstrapping legacy roles"
  "$BOOTSTRAP_ROLES_SCRIPT"
fi

echo "[restore] Recreating database: $CCM_DB"
psql_exec -c "DROP DATABASE IF EXISTS \"$CCM_DB\";"
psql_exec -c "CREATE DATABASE \"$CCM_DB\";"
stream_sql "$CCM_DUMP" "$CCM_DB"

echo "[restore] Recreating database: $STORE_DB"
psql_exec -c "DROP DATABASE IF EXISTS \"$STORE_DB\";"
psql_exec -c "CREATE DATABASE \"$STORE_DB\";"
stream_sql "$STORE_DUMP" "$STORE_DB"



echo "[restore] Recreating database: $REWRITE_DB"
psql_exec -c "DROP DATABASE IF EXISTS "$REWRITE_DB";"
psql_exec -c "CREATE DATABASE "$REWRITE_DB";"
if [[ ! -f "$REWRITE_SCHEMA_SCRIPT" ]]; then
  echo "Missing rewrite schema script: $REWRITE_SCHEMA_SCRIPT" >&2
  exit 1
fi
docker compose exec -T "$DB_SERVICE" psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$REWRITE_DB" < "$REWRITE_SCHEMA_SCRIPT"
seed_admin_scopes "$ADMIN_BOOTSTRAP_IDS" "$ADMIN_BOOTSTRAP_MERCHANT_ID" "$ADMIN_BOOTSTRAP_CONFIG_ID"

echo "[restore] Done."
