.PHONY: api web

api:
	php -S 0.0.0.0:8080 -t apps/api/public

web:
	cd apps/web && npm install && npm run dev -- --host 0.0.0.0 --port 5173
