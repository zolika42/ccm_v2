#!/usr/bin/env bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://localhost:8080}"

echo "[smoke] GET /health"
curl -fsS "$API_BASE_URL/health" >/dev/null

echo "[smoke] GET /catalog/products?limit=1"
curl -fsS "$API_BASE_URL/catalog/products?limit=1" >/dev/null

echo "[smoke] GET /auth/me (expected 401 but valid JSON)"
status_code="$(curl -sS -o /tmp/ccm_auth_me.json -w '%{http_code}' "$API_BASE_URL/auth/me")"
if [[ "$status_code" != "401" ]]; then
  echo "[smoke] FAIL: expected 401 from /auth/me, got $status_code" >&2
  cat /tmp/ccm_auth_me.json >&2
  exit 1
fi

echo "[smoke] API smoke checks passed."
