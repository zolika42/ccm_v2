# @fileoverview Verifies that the expected legacy tables and functions exist before application smoke tests run.
#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

DB_SERVICE="${DB_SERVICE:-postgres}"
DB_USER="${LEGACY_DB_SUPERUSER:-postgres}"
CCM_DB="${CG_CCM_DB_NAME:-ccm}"
STORE_DB="${CG_STORE_DB_NAME:-columbia_games}"
REWRITE_DB="${CG_REWRITE_DB_NAME:-columbia_rewrite}"

check_sql() {
  local database="$1"
  local sql="$2"
  docker compose exec -T "$DB_SERVICE" psql -tA -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$database" -c "$sql"
}

require_equals() {
  local label="$1"
  local actual="$2"
  local expected="$3"
  if [[ "$actual" != "$expected" ]]; then
    echo "[verify] FAIL: $label (expected '$expected', got '$actual')" >&2
    exit 1
  fi
  echo "[verify] OK: $label"
}

require_table() {
  local database="$1"
  local table="$2"
  local exists
  exists="$(check_sql "$database" "SELECT to_regclass('$table') IS NOT NULL;")"
  require_equals "$database table $table" "$exists" "t"
}

require_function() {
  local database="$1"
  local function_name="$2"
  local exists
  exists="$(check_sql "$database" "SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = '$function_name');")"
  require_equals "$database function $function_name" "$exists" "t"
}

require_table "$CCM_DB" 'public.orders'
require_table "$CCM_DB" 'public.items'
require_table "$CCM_DB" 'public.order_status'
require_table "$CCM_DB" 'public.browser_state'

require_table "$STORE_DB" 'public.customers'
require_table "$STORE_DB" 'public.products'
require_table "$STORE_DB" 'public.preorders'
require_table "$STORE_DB" 'public.related_products'

require_function "$STORE_DB" 'record_order'
require_function "$STORE_DB" 'record_item'
require_function "$STORE_DB" 'preorder_update_or_insert'

require_table "$REWRITE_DB" 'public.admin_user_scopes'
require_table "$REWRITE_DB" 'public.admin_order_marks'

echo "[verify] Legacy + rewrite schema checks passed."
