# Flowise 구축/운영 예시 + RAG 파이프라인 레포 (Bank 업무 시나리오)

이 레포는 **Flowise**와 함께, RAG 파이프라인을 **LangChain(JS)** / **LlamaIndex(Python)** 으로 구현하고,
운영에 필요한 **문서 업로드 API(파싱→인덱싱)**, **멀티 테넌트(부서/권한별 컬렉션 분리)**,
**관측(OpenTelemetry)**, **배포 예시(EC2/ALB · ECS · k8s Helm)**까지 포함한 데모 템플릿입니다.

> ⚠️ 본 문서/샘플 데이터는 데모용이며, 실제 규정/법령/내부통제는 소속 기관의 최신 문서를 따르세요.

---

## 구성요소

- **api-gateway** (Node/Express, CommonJS)
  - JWT 로그인
  - 문서 업로드 → 파싱/인덱싱 요청 (엔진 선택)
  - RAG 채팅 프록시
  - 정적 FE 제공 (Vanilla + Tailwind + Offcanvas UX)
- **langchain-js** (Node)
  - `/ingest/file` : 파일 경로 기반 파싱→인덱싱 (Qdrant)
  - `/chat` : 컬렉션 지정 검색 + 답변 생성
- **llamaindex-py** (FastAPI)
  - `/ingest/file` : 파일 경로 기반 파싱→인덱싱 (Qdrant)
  - `/chat` : 컬렉션 지정 검색 + 답변 생성
- **qdrant** : Vector DB (컬렉션 분리)
- **flowise** : Flow builder (옵션)
- **observability** : OpenTelemetry Collector → Jaeger/Prometheus/Grafana

### 멀티 테넌트(부서/권한별) 컬렉션 분리

컬렉션 이름 규칙(예시):

- `bankrag__{tenant}__{dept}`

사용자 권한은 `config/users.json`, 테넌트/부서 정의는 `config/tenants.yaml`에서 관리합니다.

---

## 빠른 실행 (로컬 Docker)

```bash
cp .env.example .env
docker compose up -d --build
```

접속:

- FE + API Gateway: http://localhost:3005
- Flowise: http://localhost:3000
- Qdrant: http://localhost:6333
- Jaeger: http://localhost:16686
- Grafana: http://localhost:3006 (admin / admin1234)

데모 계정:

- `admin / admin1234`
- `teller / teller1234`
- `risk / risk1234`
- `aml / aml1234`

---

## API 요약

### 로그인
- `POST /api/auth/login` → `{token, user}`

### 문서 업로드
- `POST /api/documents/upload` (multipart)
  - form fields: `tenant`, `dept`, `engine`(llamaindex|langchain)
  - file: `file`

### 채팅
- `POST /api/chat`
  - body: `{ question, tenant, dept, engine, topK }`

---

## 샘플 문서(은행업)
- `docs/banking/` : KYC, AML, 여신 프로세스, 창구 스크립트 등 데모용 문서

---

## 배포 예시

- `deploy/ec2-alb/` : EC2 + ALB (terraform + userdata placeholder)
- `deploy/ecs/` : ECS(Fargate) + ALB (taskdef 샘플)
- `deploy/helm/` : k8s Helm chart (템플릿 스켈레톤)

---

## Flowise 연동 포인트(추천)
- Flowise에서 Qdrant Vector Store를 사용하고, 컬렉션을 `bankrag__tenant__dept` 규칙으로 맞추면
  같은 Qdrant를 공유하면서도 권한별 스코프를 유지할 수 있습니다.
