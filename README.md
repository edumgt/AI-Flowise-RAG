# Flowise 구축/운영 예시 Monorepo (RAG + LangChain + LlamaIndex)

이 레포는 **Flowise(로우코드)로 만든 RAG 파이프라인** + 동일한 기능을 **LangChain(JS)**, **LlamaIndex(Python)** 으로 직접 구현한 예제를 한 번에 제공합니다.

- ✅ Flowise: UI로 RAG 파이프라인 구성, 사내 서비스 운영 흐름 예시
- ✅ LangChain.js: Express API + Qdrant 기반 RAG (Ingest + Chat)
- ✅ LlamaIndex: FastAPI + Qdrant 기반 RAG (Ingest + Chat)
- ✅ Docker Compose로 한 번에 실행

---

## 아키텍처

```
Documents(MD/TXT/PDF*) -> Chunking -> Embeddings -> Qdrant(Vector DB)
                                                \-> Retriever -> LLM -> Answer + Sources
```

- Vector DB: Qdrant
- LLM/Embedding: OpenAI 또는 Ollama (환경변수로 토글)
- 샘플 문서: `docs/sample/`

> *PDF ingest는 기본 템플릿에서는 텍스트/markdown 중심으로 구성했습니다. 필요하면 PDF 로더를 추가하세요.

---

## 빠른 시작

### 1) 환경변수

```bash
cp .env.example .env
# OPENAI 사용 시 OPENAI_API_KEY만 넣어도 테스트 가능
```

### 2) 실행

```bash
docker compose --env-file .env up -d --build
```

- Flowise UI: http://localhost:3000
- LangChain API: http://localhost:3001
- LlamaIndex API: http://localhost:8000
- Qdrant: http://localhost:6333

### 3) 샘플 데이터 적재 (Ingest)

```bash
make seed
# 또는
make seed-js
make seed-py
```

### 4) 질의 (Chat)

**LangChain**

```bash
curl -s http://localhost:3001/chat \
  -H 'content-type: application/json' \
  -d '{"question":"이 레포는 무엇을 제공해?"}' | jq
```

**LlamaIndex**

```bash
curl -s http://localhost:8000/chat \
  -H 'content-type: application/json' \
  -d '{"question":"Qdrant는 어떤 역할이야?"}' | jq
```

---

## Flowise로 RAG 파이프라인 구성 (권장 플로우)

1. Flowise 접속: http://localhost:3000
2. 새 Chatflow 생성
3. (권장) Document Loader + Text Splitter + Embedding + Vector Store(Qdrant) 구성
4. Retriever + Chat Model 연결
5. `/api/v1/prediction/{chatflowId}` 로 외부 서비스 연동

> Flowise는 환경변수 `FLOWISE_USERNAME`, `FLOWISE_PASSWORD` 로 앱 레벨 인증을 켤 수 있습니다.

---

## 운영(Production) 체크리스트 (요약)

- **인증**: Flowise 앱 레벨 인증 + Reverse Proxy(예: NGINX) + 네트워크 ACL
- **비밀키/자격증명**: `.env`를 Secret Manager(또는 CI/CD secret)로 이동
- **저장소**: Flowise DB/로그/파일 경로는 volume으로 영속화
- **관측**: (선택) OpenTelemetry, Prometheus/Grafana, LLM tracing(LangSmith 등)
- **버전 고정**: 이미지 태그 고정 + 보안 패치 버전 추적

---

## 폴더 구조

```
.
├─ docker-compose.yml
├─ .env.example
├─ docs/
│  └─ sample/                 # 샘플 문서
├─ apps/
│  ├─ langchain-js/            # Node + Express + LangChain RAG API
│  └─ llamaindex-py/           # Python + FastAPI + LlamaIndex RAG API
├─ flowise/                    # (옵션) flow export, 운영 스크립트
└─ scripts/                    # 운영/유틸
```

---

## 라이선스

MIT (원하면 변경하세요)
