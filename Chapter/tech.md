# 기술 스택 상세 문서 (AI-Flowise-RAG)

## 1. 전체 아키텍처 스택 요약
이 저장소는 **RAG(검색증강생성)** 시스템을 운영형으로 구성한 멀티 서비스 아키텍처입니다.
핵심 구성은 다음과 같습니다.

- API Gateway (Node.js/Express)
- Indexing Worker (Node.js/BullMQ)
- LangChain JS Service (Node.js + LangChain)
- LlamaIndex Python Service (FastAPI + LlamaIndex)
- Flowise (시각적 LLM 오케스트레이션)
- Qdrant (벡터DB)
- Redis (작업 큐)
- MinIO (S3 호환 오브젝트 스토리지)
- Ollama (로컬 LLM/임베딩 모델 서빙)
- OpenTelemetry + Jaeger + Prometheus + Grafana (관측성)

이 모든 서비스는 `docker-compose.yml` 기준으로 단일 개발환경에서 함께 구동됩니다.

---

## 2. 언어/런타임

### 2.1 Node.js 기반 서비스
- `apps/api-gateway`
- `apps/indexing-worker`
- `apps/langchain-js`

각 서비스는 CommonJS 기반(`"type": "commonjs"`)이며, `express`, `axios`, `dotenv`를 공통으로 사용합니다.

### 2.2 Python 기반 서비스
- `apps/llamaindex-py`
- Python 웹 프레임워크는 FastAPI/uvicorn을 사용합니다.

---

## 3. AI/RAG 엔진 스택

### 3.1 LangChain JS
- 주요 패키지:
  - `langchain`
  - `@langchain/openai`
  - `@langchain/community`
  - `@qdrant/js-client-rest`
- 파서:
  - PDF: `pdf-parse`
  - DOCX: `mammoth`

### 3.2 LlamaIndex Python
- 주요 패키지:
  - `llama-index-core`
  - `llama-index-vector-stores-qdrant`
  - `llama-index-llms-ollama`
  - `llama-index-embeddings-ollama`
- 파서:
  - PDF: `pymupdf`
  - DOCX: `python-docx`

### 3.3 모델 프로바이더 전략
`.env.example` 기준으로 `LLM_PROVIDER`를 통해 프로바이더를 선택합니다.
- 기본값: `ollama`
- 대안: OpenAI (`OPENAI_API_KEY`, 모델명 지정)

---

## 4. 데이터/스토리지 스택

### 4.1 Vector DB: Qdrant
- 이미지: `qdrant/qdrant:v1.9.5`
- 대시보드: `http://localhost:6333/dashboard`
- 컬렉션 네이밍 규칙:
  - `bankrag__{tenant}__{dept}`

### 4.2 Queue/캐시: Redis
- 이미지: `redis:7.2-alpine`
- BullMQ 백엔드로 비동기 인덱싱 처리

### 4.3 Object Storage: MinIO
- 이미지: `minio/minio:latest`
- `minio-init` 서비스가 버킷 자동 생성
- S3 호환 API로 문서 파일 저장

### 4.4 로컬 볼륨
- qdrant_data, flowise_data, uploads_data, jobs_data, registry_data, audit_data, minio_data, ollama_data 등
- 컨테이너 재시작/재배포 시 데이터 지속성 보장

---

## 5. 백엔드/게이트웨이 스택

### 5.1 API Gateway
- 인증/인가: `jsonwebtoken`, `bcryptjs`
- 파일 업로드: `multer`
- 비동기 작업 생성: `bullmq`
- 스토리지 연동: `@aws-sdk/client-s3`
- 구성 파일: YAML/JSON (`yaml` 라이브러리)

### 5.2 Indexing Worker
- Queue consumer로 동작
- Gateway가 적재한 작업을 가져와 엔진(langchain-js / llamaindex-py) 호출

---

## 6. 관측성(Observability) 스택

### 6.1 OpenTelemetry
Node/Python 양쪽에 OTel SDK 적용.
- Trace/Metric Exporter: OTLP HTTP
- Collector 엔드포인트: `http://otel-collector:4318`

### 6.2 Jaeger
- 이미지: `jaegertracing/all-in-one:1.57`
- UI: `http://localhost:16686`

### 6.3 Prometheus
- 이미지: `prom/prometheus:v2.53.1`
- UI: `http://localhost:9090`

### 6.4 Grafana
- 이미지: `grafana/grafana:11.1.0`
- UI: `http://localhost:3006`

---

## 7. 오케스트레이션/배포/운영 스택

### 7.1 로컬 오케스트레이션
- Docker Compose 기반 멀티 컨테이너 실행
- `.env` 기반 환경변수 주입

### 7.2 배포 스켈레톤
README에 다음 경로가 안내되어 있습니다.
- `deploy/ec2-alb/`
- `deploy/ecs/`
- `deploy/helm/`

### 7.3 운영형 기능
- 문서 레지스트리 버전관리
- soft delete + Qdrant 포인트 삭제
- 감사로그(JSONL)

---

## 8. 프론트/사용자 인터페이스

### 8.1 FE + API Gateway
- 엔드포인트: `http://localhost:3005`
- 정적 파일은 `apps/api-gateway/public/`에서 제공

### 8.2 Flowise UI
- 엔드포인트: `http://localhost:3000`
- 템플릿 참조: `flowise/flows/`

---

## 9. 보안/권한 스택

- JWT 기반 인증
- 사용자/권한 파일: `config/users.json`
- 테넌트/부서 정의: `config/tenants.yaml`
- 멀티테넌트 접근 범위를 벡터 컬렉션 단위로 분리

---

## 10. 기술스택 학습 로드맵(권장)
1. Docker Compose로 전체 서비스 띄우기
2. API Gateway 인증/문서 업로드/챗 API 흐름 확인
3. LangChain과 LlamaIndex의 ingest/chat 경로 비교
4. Qdrant 컬렉션 구조와 tenant/dept 정책 이해
5. OTel → Jaeger/Prometheus/Grafana 경로 추적
6. Flowise 템플릿 import 후 엔진 선택형 운영 비교
