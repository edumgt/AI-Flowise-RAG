# Runbook (샘플)

## 장애 대응
1. Qdrant healthcheck: http://qdrant:6333/healthz
2. Flowise 로그 확인: docker compose logs -f flowise
3. API 로그 확인: docker compose logs -f langchain_api llamaindex_api

## 데이터 재적재
- 샘플 문서가 변경되면 ingest 스크립트 재실행
  - make seed-js
  - make seed-py
