# @fileoverview Exercises the critical API flows after restore so regressions surface immediately.
#!/usr/bin/env bash
set -euo pipefail

PYTHON_BIN=""
for candidate in /usr/bin/python3 python3 python; do
  if command -v "$candidate" >/dev/null 2>&1; then
    resolved="$(command -v "$candidate")"
    if "$resolved" - <<'PYTEST' >/dev/null 2>&1
print("ok")
PYTEST
    then
      PYTHON_BIN="$resolved"
      break
    fi
  fi
done

if [ -z "$PYTHON_BIN" ]; then
  echo "[smoke] ERROR: no working python interpreter found" >&2
  exit 1
fi

API_BASE_URL="${API_BASE_URL:-http://localhost:8080}"
COOKIE_JAR="${COOKIE_JAR:-/tmp/ccm_smoke.cookies}"

rm -f "$COOKIE_JAR"

echo "[smoke] GET /health"
curl -fsS "$API_BASE_URL/health" >/dev/null

echo "[smoke] POST /auth/login (expected 401 or 422 with valid JSON)"
login_status="$(curl -sS -o /tmp/ccm_login.json -w '%{http_code}' \
  -H 'Content-Type: application/json' \
  -d '{"email":"smoke@example.invalid","password":"not-the-right-password"}' \
  "$API_BASE_URL/auth/login")"
if [[ "$login_status" != "401" && "$login_status" != "422" ]]; then
  echo "[smoke] FAIL: expected 401/422 from /auth/login, got $login_status" >&2
  cat /tmp/ccm_login.json >&2
  exit 1
fi

echo "[smoke] GET /catalog/products?limit=1"
curl -fsS "$API_BASE_URL/catalog/products?limit=1" >/tmp/ccm_catalog.json
product_id="$($PYTHON_BIN - <<'PY'
import json
with open('/tmp/ccm_catalog.json') as f:
    data=json.load(f)
items=((data or {}).get('data') or {}).get('items') or []
print(items[0].get('productId','') if items else '')
PY
)"
if [[ -z "$product_id" ]]; then
  echo "[smoke] FAIL: could not resolve a catalog product for cart smoke" >&2
  cat /tmp/ccm_catalog.json >&2
  exit 1
fi

echo "[smoke] GET /cart"
curl -fsS -c "$COOKIE_JAR" -b "$COOKIE_JAR" "$API_BASE_URL/cart" >/dev/null

echo "[smoke] GET /cart/summary"
curl -fsS -c "$COOKIE_JAR" -b "$COOKIE_JAR" "$API_BASE_URL/cart/summary" >/dev/null

echo "[smoke] POST /cart/items ($product_id x1)"
curl -fsS -c "$COOKIE_JAR" -b "$COOKIE_JAR" \
  -H 'Content-Type: application/json' \
  -d "{\"productId\":\"$product_id\",\"quantity\":1}" \
  "$API_BASE_URL/cart/items" >/tmp/ccm_cart_add.json
$PYTHON_BIN - <<'PY'
import json,sys
with open('/tmp/ccm_cart_add.json') as f:
    data=json.load(f)
cart=(data or {}).get('data') or {}
if not (cart.get('summary') or {}).get('hasItems'):
    print('[smoke] FAIL: cart add did not create items', file=sys.stderr)
    sys.exit(1)
PY

echo "[smoke] GET /checkout/summary"
curl -fsS -c "$COOKIE_JAR" -b "$COOKIE_JAR" "$API_BASE_URL/checkout/summary" >/tmp/ccm_checkout_summary.json
$PYTHON_BIN - <<'PY'
import json,sys
with open('/tmp/ccm_checkout_summary.json') as f:
    data=json.load(f)
checkout=(data or {}).get('data') or {}
cart=(checkout.get('cart') or {})
if not ((cart.get('summary') or {}).get('hasItems')):
    print('[smoke] FAIL: checkout summary did not see the cart', file=sys.stderr)
    sys.exit(1)
PY

echo "[smoke] POST /checkout/validate"
curl -fsS -c "$COOKIE_JAR" -b "$COOKIE_JAR" \
  -H 'Content-Type: application/json' \
  -d '{"shipName":"Smoke User","shipEmail":"smoke@example.invalid","paymentType":"paypal"}' \
  "$API_BASE_URL/checkout/validate" >/tmp/ccm_checkout_validate.json
$PYTHON_BIN - <<'PY'
import json,sys
with open('/tmp/ccm_checkout_validate.json') as f:
    data=json.load(f)
validation=((data or {}).get('data') or {}).get('validation') or {}
if 'errors' not in validation:
    print('[smoke] FAIL: checkout validate missing validation payload', file=sys.stderr)
    sys.exit(1)
PY

echo "[smoke] PATCH /cart/items/$product_id (quantity=2)"
curl -fsS -c "$COOKIE_JAR" -b "$COOKIE_JAR" \
  -X PATCH \
  -H 'Content-Type: application/json' \
  -d '{"quantity":2}' \
  "$API_BASE_URL/cart/items/$product_id" >/tmp/ccm_cart_update.json
$PYTHON_BIN - <<'PY'
import json,sys
with open('/tmp/ccm_cart_update.json') as f:
    data=json.load(f)
items=((data or {}).get('data') or {}).get('items') or []
match=next((item for item in items if item.get('productId')), None)
if not match or int(match.get('quantity',0)) != 2:
    print('[smoke] FAIL: cart update did not persist quantity 2', file=sys.stderr)
    sys.exit(1)
PY

echo "[smoke] DELETE /cart/items/$product_id"
curl -fsS -c "$COOKIE_JAR" -b "$COOKIE_JAR" \
  -X DELETE \
  "$API_BASE_URL/cart/items/$product_id" >/tmp/ccm_cart_delete.json
$PYTHON_BIN - <<'PY'
import json,sys
with open('/tmp/ccm_cart_delete.json') as f:
    data=json.load(f)
summary=((data or {}).get('data') or {}).get('summary') or {}
if summary.get('hasItems'):
    print('[smoke] FAIL: cart delete still reports items', file=sys.stderr)
    sys.exit(1)
PY

echo "[smoke] GET /auth/me (expected 401 but valid JSON)"
status_code="$(curl -sS -o /tmp/ccm_auth_me.json -w '%{http_code}' "$API_BASE_URL/auth/me")"
if [[ "$status_code" != "401" ]]; then
  echo "[smoke] FAIL: expected 401 from /auth/me, got $status_code" >&2
  cat /tmp/ccm_auth_me.json >&2
  exit 1
fi

echo "[smoke] GET /library (expected 401 but valid JSON)"
status_code="$(curl -sS -o /tmp/ccm_library_anon.json -w '%{http_code}' "$API_BASE_URL/library")"
if [[ "$status_code" != "401" ]]; then
  echo "[smoke] FAIL: expected 401 from /library, got $status_code" >&2
  cat /tmp/ccm_library_anon.json >&2
  exit 1
fi

if [[ -n "${SMOKE_CHECKOUT_EMAIL:-}" && -n "${SMOKE_CHECKOUT_PASSWORD:-}" ]]; then
  echo "[smoke] OPTIONAL PURCHASE SMOKE: login"
  curl -fsS -c "$COOKIE_JAR" -b "$COOKIE_JAR" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$SMOKE_CHECKOUT_EMAIL\",\"password\":\"$SMOKE_CHECKOUT_PASSWORD\"}" \
    "$API_BASE_URL/auth/login" >/tmp/ccm_checkout_login.json

  echo "[smoke] OPTIONAL PURCHASE SMOKE: add cart item"
  curl -fsS -c "$COOKIE_JAR" -b "$COOKIE_JAR" \
    -H 'Content-Type: application/json' \
    -d "{\"productId\":\"$product_id\",\"quantity\":1}" \
    "$API_BASE_URL/cart/items" >/dev/null

  echo "[smoke] OPTIONAL PURCHASE SMOKE: checkout summary"
  curl -fsS -c "$COOKIE_JAR" -b "$COOKIE_JAR" "$API_BASE_URL/checkout/summary" >/tmp/ccm_purchase_summary.json
  checkout_payload="$($PYTHON_BIN - <<'PYJSON'
import json
with open('/tmp/ccm_purchase_summary.json') as f:
    data = json.load(f)
draft = ((data or {}).get('data') or {}).get('draft') or {}
draft['shipMethod'] = draft.get('shipMethod') or 'Smoke ship'
draft['paymentType'] = draft.get('paymentType') or 'free'
print(json.dumps(draft))
PYJSON
)"

  echo "[smoke] OPTIONAL PURCHASE SMOKE: submit"
  submit_status="$(curl -sS -o /tmp/ccm_purchase_submit.json -w '%{http_code}' \
    -c "$COOKIE_JAR" -b "$COOKIE_JAR" \
    -H 'Content-Type: application/json' \
    -d "$checkout_payload" \
    "$API_BASE_URL/checkout/submit")"
  if [[ "$submit_status" != "200" ]]; then
    echo "[smoke] FAIL: purchase smoke expected 200 from /checkout/submit, got $submit_status" >&2
    cat /tmp/ccm_purchase_submit.json >&2
    exit 1
  fi

  echo "[smoke] OPTIONAL PURCHASE SMOKE: library fetch"
  library_status="$(curl -sS -o /tmp/ccm_library_auth.json -w '%{http_code}' \
    -c "$COOKIE_JAR" -b "$COOKIE_JAR" \
    "$API_BASE_URL/library")"
  if [[ "$library_status" != "200" ]]; then
    echo "[smoke] FAIL: library fetch expected 200 after authenticated purchase smoke, got $library_status" >&2
    cat /tmp/ccm_library_auth.json >&2
    exit 1
  fi
  $PYTHON_BIN - <<'PY'
import json,sys
with open('/tmp/ccm_library_auth.json') as f:
    data=json.load(f)
payload=(data or {}).get('data') or {}
meta=payload.get('meta') or {}
if 'items' not in payload or 'count' not in meta:
    print('[smoke] FAIL: library payload missing items/meta', file=sys.stderr)
    sys.exit(1)
PY
fi

echo "[smoke] API smoke checks passed."
