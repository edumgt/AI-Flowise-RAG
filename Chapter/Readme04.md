# Readme04 - Ollama, Flowise, Qdrant 학습 실행 가이드

## 1) Ollama 모델 사전 다운로드(권장)
```bash
docker compose --env-file .env exec ollama ollama pull llama3.1:8b
docker compose --env-file .env exec ollama ollama pull nomic-embed-text
```

## 2) Ollama 확인
```bash
curl http://localhost:11434/api/tags | head
```

## 3) Flowise 템플릿 사용
- `flowise/flows/chatflow_bankrag_rag.json`
- `flowise/flows/ingestflow_bankrag_upsert.json`

Flowise UI에서 템플릿을 참고해 Qdrant retriever, chat model, prompt를 구성하세요.

## 4) Qdrant 컬렉션 운영 규칙
컬렉션 이름을 `bankrag__{tenant}__{dept}`로 분리하면,
부서/테넌트 간 검색 범위가 물리적으로 분리됩니다.

## 5) 실무 확장 포인트
- OCR 파이프라인(스캔 PDF 대응)
- 컬렉션 생명주기 정책(보관기간/삭제)
- 임베딩 모델 교체 실험(정확도/속도/비용)
