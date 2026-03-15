# @fileoverview Common developer entrypoints for runtime management, restore/verify/smoke, and documentation generation.
.PHONY: docs docs-check up down logs api-logs api-log-file web-logs ps restore verify smoke legacy-refresh native-api native-web

docs:
	@node ./scripts/docs/generate-docs.mjs
	@node ./scripts/docs/generate-code-reference.mjs

docs-check:
	@node ./scripts/docs/verify-source-comments.mjs


up: docs
	docker compose up --build -d

down:
	docker compose down

logs:
	docker compose logs -f --tail=200

api-logs:
	docker compose logs -f --tail=200 api

api-log-file:
	tail -f var/log/api.log

web-logs:
	docker compose logs -f --tail=200 web

ps:
	docker compose ps

restore: docs
	@if [ -z "$(CCM_DUMP)" ] || [ -z "$(STORE_DUMP)" ]; then \
		echo "Usage: make restore CCM_DUMP=/abs/path/ccm.sql.gz STORE_DUMP=/abs/path/columbia_games.sql.gz"; \
		exit 1; \
	fi
	@./scripts/db/restore-legacy.sh "$(CCM_DUMP)" "$(STORE_DUMP)"

verify: docs
	@./scripts/db/verify-legacy.sh

smoke: docs
	@./scripts/db/smoke-api.sh

legacy-refresh: docs
	@if [ -z "$(CCM_DUMP)" ] || [ -z "$(STORE_DUMP)" ]; then \
		echo "Usage: make legacy-refresh CCM_DUMP=/abs/path/ccm.sql.gz STORE_DUMP=/abs/path/columbia_games.sql.gz"; \
		exit 1; \
	fi
	@./scripts/db/restore-legacy.sh "$(CCM_DUMP)" "$(STORE_DUMP)"
	@./scripts/db/verify-legacy.sh
	@./scripts/db/smoke-api.sh

native-api: docs
	php -S 0.0.0.0:8080 -t apps/api/public

native-web: docs
	cd apps/web && npm install && npm run dev -- --host 0.0.0.0 --port 5173
