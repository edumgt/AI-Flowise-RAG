#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "[bootstrap] created .env (edit it with your keys)"
fi

docker compose --env-file .env up -d --build

echo "\nFlowise: http://localhost:3000"
echo "LangChain API: http://localhost:3001"
echo "LlamaIndex API: http://localhost:8000"
echo "Qdrant: http://localhost:6333"
