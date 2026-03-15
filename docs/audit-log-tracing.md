# Audit Log and Request Tracing (CG-192)

## What exists
- every API response carries `meta.requestId`
- the API also returns `X-Request-Id` header
- server-side errors and key flow events are logged as structured JSON

## Key events
- uncaught exceptions
- API error envelopes
- library download allow/deny/ready decisions
- checkout submit success/failure

## Why this matters
When a checkout or download bug happens, the request ID lets support/dev correlate browser output, server logs, and the underlying code path quickly.


## Where to find the log
### Default file log
By default the API writes structured JSON lines to:
- `var/log/api.log`

This default is injected by `apps/api/bootstrap.php` through `APP_LOG_FILE` when no explicit log path is configured.

### Native PHP server
If you run the API through:
- `make native-api`
- or `php -S 0.0.0.0:8080 -t apps/api/public`

then the same events are written to `var/log/api.log`. If file logging fails for any reason, PHP falls back to the terminal error stream.

### Docker
The repo root is bind-mounted into the API container, so the same log file is available on the host at:
- `var/log/api.log`

You can also inspect container stderr with:
- `make api-logs`
- `docker compose logs -f api`

## Typical events to grep for
- `checkout_submit_started`
- `checkout_submit_rejected`
- `checkout_submit_succeeded`
- `checkout_submit_failed`
- `library_download_denied`
- `library_download_ready`
- `api_error`
- `uncaught_exception`

## Example commands
```bash
# Tail the structured JSON log file
tail -f var/log/api.log

# Filter only download events
rg 'library_download_' var/log/api.log

# Filter a single request by request ID
rg '9b79e704651108bf' var/log/api.log
```
