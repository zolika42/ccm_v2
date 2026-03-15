.PHONY: up down logs api-logs web-logs ps restore verify smoke legacy-refresh native-api native-web

up:
	docker compose up --build -d

down:
	docker compose down

logs:
	docker compose logs -f --tail=200

api-logs:
	docker compose logs -f --tail=200 api

web-logs:
	docker compose logs -f --tail=200 web

ps:
	docker compose ps

restore:
	@if [ -z "$(CCM_DUMP)" ] || [ -z "$(STORE_DUMP)" ]; then \
		echo "Usage: make restore CCM_DUMP=/abs/path/ccm.sql.gz STORE_DUMP=/abs/path/columbia_games.sql.gz"; \
		exit 1; \
	fi
	@./scripts/db/restore-legacy.sh "$(CCM_DUMP)" "$(STORE_DUMP)"

verify:
	@./scripts/db/verify-legacy.sh

smoke:
	@./scripts/db/smoke-api.sh

legacy-refresh:
	@if [ -z "$(CCM_DUMP)" ] || [ -z "$(STORE_DUMP)" ]; then \
		echo "Usage: make legacy-refresh CCM_DUMP=/abs/path/ccm.sql.gz STORE_DUMP=/abs/path/columbia_games.sql.gz"; \
		exit 1; \
	fi
	@./scripts/db/restore-legacy.sh "$(CCM_DUMP)" "$(STORE_DUMP)"
	@./scripts/db/verify-legacy.sh
	@./scripts/db/smoke-api.sh

native-api:
	php -S 0.0.0.0:8080 -t apps/api/public

native-web:
	cd apps/web && npm install && npm run dev -- --host 0.0.0.0 --port 5173
