#!/usr/bin/env bash
set -euo pipefail

echo "[seed] Ingest sample docs into both APIs"

curl -s -X POST "http://127.0.0.1:${LANGCHAIN_API_PORT:-3001}/ingest" >/dev/null || true
curl -s -X POST "http://127.0.0.1:${LLAMAINDEX_API_PORT:-8000}/ingest" >/dev/null || true

echo "[seed] done"
