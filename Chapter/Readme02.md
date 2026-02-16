# Readme02 - 환경변수(.env)와 실행 설정

## 1) 기본 절차
```bash
cp .env.example .env
```

## 2) 핵심 설정 항목

### 공통
- `ENV`
- `JWT_SECRET`
- `CORS_ORIGIN`

### LLM/임베딩
- `LLM_PROVIDER=ollama` (기본)
- OpenAI 사용 시: `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_EMBEDDING_MODEL`
- Ollama 사용 시: `OLLAMA_BASE_URL`, `OLLAMA_LLM_MODEL`, `OLLAMA_EMBED_MODEL`

### 데이터 인프라
- `QDRANT_URL`
- `REDIS_URL`
- `S3_*` (MinIO/S3 연동)

### 관측
- `OTEL_EXPORTER_OTLP_ENDPOINT`
- `SERVICE_NAMESPACE`

## 3) 보안 권장사항
- 개발 환경이라도 `JWT_SECRET`, `S3_SECRET_KEY`, API Key는 즉시 변경
- `.env`는 Git에 커밋하지 않기
- 팀 협업 시 `.env.example`에 키 이름만 유지

## 4) 모델 준비 관련
`.env.example`의 `OLLAMA_PULL_MODELS`는 시작 후 모델 준비 자동화 힌트로 활용 가능합니다.
실제 운영에서는 배포 파이프라인에서 사전 pull을 권장합니다.
