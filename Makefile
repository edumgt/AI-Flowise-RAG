SHELL:=/bin/bash

.PHONY: up down logs ps seed seed-js seed-py

up:
	docker compose --env-file .env up -d --build

down:
	docker compose down -v

logs:
	docker compose logs -f --tail=200

ps:
	docker compose ps

seed:
	$(MAKE) seed-js
	$(MAKE) seed-py

seed-js:
	docker compose exec -T langchain_api node src/scripts/ingest.js

seed-py:
	docker compose exec -T llamaindex_api python -m app.ingest
