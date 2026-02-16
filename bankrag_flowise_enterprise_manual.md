# BankRAG Flowise Enterprise (WSL + Docker + Ollama) 운영/사용 매뉴얼

> 대상: **은행업 종사자 업무 지원 RAG**(규정/업무 매뉴얼/FAQ/내부 프로세스 문서 검색 + 요약/답변)  
> 환경: **WSL2 + Docker Desktop(WSL Integration)** + **Ollama(Local LLM/Embedding)** + **Qdrant(Vector DB)** + **Flowise(UI)**  
> 관측: **OpenTelemetry Collector + Jaeger + Prometheus + Grafana**

---

## 0. 전체 구성 한눈에 보기

### 0.1 서비스 구성(도커 컴포즈)
- **Flowise**: RAG 플로우를 GUI로 구성/실행하는 오케스트레이터 (포트 **3000**)
- **api-gateway**: 단일 엔드포인트/인증/테넌트 라우팅(예: `/api/...`) (포트 **3005**)
- **langchain-js**: LangChain(Node) 기반 체인/툴 실행 서비스 (포트 **3001**)
- **llamaindex-py**: LlamaIndex(Python) 기반 인덱싱/검색 서비스 (포트 **8000**)
- **indexing-worker**: 문서 파싱/스플릿/업로드 잡 처리 워커
- **Ollama**: 로컬 LLM 및 임베딩 모델 서버 (포트 **11434**)
- **Qdrant**: 벡터 DB (포트 **6333**)
- **Redis**: 잡 큐/캐시 (기본 **6379**)
- **MinIO**: S3 호환 오브젝트 스토리지(업로드/아카이브) (포트 **9000/9001**)
- **otel-collector**: OTLP 수집/프로세싱/익스포트 (포트 **4318**)
- **Jaeger**: 분산 트레이싱 UI (포트 **16686**)
- **Prometheus**: 메트릭 수집 (포트 **9090**)
- **Grafana**: 대시보드 (포트 **3006**)

### 0.2 기본 접속 주소
- Flowise: `http://localhost:3000`
- API Gateway: `http://localhost:3005`
- LangChain JS: `http://localhost:3001`
- LlamaIndex Py: `http://localhost:8000`
- Ollama: `http://localhost:11434`
- Qdrant: `http://localhost:6333`
- Jaeger: `http://localhost:16686`
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3006` (기본: `admin / admin1234`)
- MinIO: `http://localhost:9000` (Console: `http://localhost:9001`)

> ⚠️ 포트 충돌이 자주 발생합니다. 아래 **트러블슈팅** 섹션을 참고하세요.

---

## 1. 설치/실행(WSL + Docker Desktop)

### 1.1 사전 준비
- Windows에 Docker Desktop 설치
- Docker Desktop → Settings → Resources → WSL Integration 활성화
- WSL(우분투 등)에서 `docker` / `docker compose` 사용 가능 확인

```bash
docker version
docker compose version
```

### 1.2 프로젝트 준비
```bash
cd /home/AI-Flowise-RAG
cp .env.example .env
```

### 1.3 기동
```bash
docker compose --env-file .env up -d --build
docker compose ps
```

정상이라면 주요 컨테이너가 `Up` 상태입니다.

---

## 2. Ollama 모델 준비(LLM/Embedding)

### 2.1 모델 Pull (항상 이 방식 권장)
컨테이너 이름이 바뀌어도 안전한 `docker compose exec`를 사용합니다.

```bash
docker compose --env-file .env exec ollama ollama pull llama3.1:8b
docker compose --env-file .env exec ollama ollama pull nomic-embed-text
docker compose --env-file .env exec ollama ollama list
```

### 2.2 Ollama 상태 확인
```bash
curl http://localhost:11434/api/tags | head
```

---

## 3. Flowise 계정 설정(Setup Account) 화면 사용법

Flowise 최신 인증 방식은 **이메일+패스워드** 로그인입니다. 처음 접속 시 `Setup Account` 화면이 뜰 수 있습니다.

### 3.1 Existing Username/Password의 의미
- `Existing Username`: 기존 환경변수 `FLOWISE_USERNAME`
- `Existing Password`: 기존 환경변수 `FLOWISE_PASSWORD`

즉, “이 서버의 기존 관리자”임을 증명하기 위한 단계입니다.

확인:
```bash
grep -E 'FLOWISE_USERNAME|FLOWISE_PASSWORD' .env
```

### 3.2 New Account Details 입력
- Administrator Name: 표시용 이름(예: `admin`)
- Administrator Email: 앞으로 로그인 ID가 될 이메일
- Password 규칙:
  - 최소 8자
  - 소문자 1개 이상
  - 대문자 1개 이상
  - 숫자 1개 이상
  - 특수문자 1개 이상

예시:
- `BankRag!2026`
- `Flowise#Kim2026`
- `Ollama@Rag8B`

설정 완료 후부터는 **이메일/새 비번**으로 로그인합니다.

### 3.3 Existing Password를 모를 때
컨테이너에서 확인:
```bash
docker compose exec flowise printenv | grep -E 'FLOWISE_USERNAME|FLOWISE_PASSWORD'
```

---

## 4. RAG 사용 흐름(권장 운영 시나리오)

### 4.1 표준 흐름
1) 문서 업로드 → 2) 파싱/청크 분할 → 3) 임베딩 생성 → 4) Qdrant 인덱싱  
5) 질문 → 6) Retriever → 7) LLM 응답(근거 포함)

### 4.2 은행 업무용 프롬프트 가이드(예시)
- “내부 규정 기반으로 답하라”
- “근거 문서 조항/페이지/파일명을 함께 제공하라”
- “모르면 모른다고 말하고, 추가 확인 질문을 하라”
- “개인정보/고객정보는 출력하지 말라(마스킹)”
- “실무 절차는 단계별로 정리하라”

---

## 5. 문서 업로드 API(파일 업로드 → 파싱 → 인덱싱)

> 실제 엔드포인트 경로는 프로젝트 구현에 따라 다를 수 있습니다.  
> 일반적으로 **api-gateway**가 단일 업로드 엔드포인트를 제공하고, 워커가 비동기 인덱싱을 수행합니다.

### 5.1 업로드 예시(curl)
아래는 “테넌트/부서”를 헤더로 분리하는 예시입니다.

```bash
curl -X POST "http://localhost:3005/api/docs/upload" \
  -H "X-Tenant: retail-banking" \
  -H "X-Department: compliance" \
  -F "file=@./samples/bank_policy.pdf"
```

**응답 예시**
- `jobId`: 인덱싱 작업 ID
- `documentId`: 문서 식별자
- `status`: queued/processing/done/error

### 5.2 인덱싱 작업 상태 조회 예시
```bash
curl "http://localhost:3005/api/jobs/<jobId>" \
  -H "X-Tenant: retail-banking"
```

### 5.3 업로드 저장 위치(개념)
- 파일 원본: `uploads_data` (또는 MinIO bucket)
- 청크/메타데이터: Qdrant payload + 별도 메타 저장소(프로젝트에 따라 Redis/파일/DB)

---

## 6. 멀티 테넌트(부서/권한별 컬렉션 분리)

### 6.1 기본 원칙
- 테넌트(회사/조직) → 컬렉션 네임스페이스 분리
- 부서(준법/리테일/기업금융/리스크) → 서브 컬렉션 또는 필터 분리
- 권한(Role) → 검색 필터(메타데이터 기반) 또는 API Gateway 레벨에서 제어

### 6.2 Qdrant 컬렉션 분리 예시
- `tenant__retail-banking__dept__compliance`
- `tenant__retail-banking__dept__ops`
- `tenant__corporate__dept__risk`

### 6.3 권장 헤더/클레임
- `X-Tenant`: 테넌트 ID
- `X-Department`: 부서
- `X-Role`: role (viewer/editor/admin)
- (선택) `X-UserId`: 감사 로그 목적

> 운영 팁: “테넌트/부서”는 **컬렉션 분리**를 우선하고, role은 **필터/ACL**로 처리하면 관리가 쉽습니다.

---

## 7. Flowise에서 Ollama + Qdrant RAG 플로우 구성(예시)

> Flowise UI는 버전에 따라 노드 이름이 조금 다를 수 있습니다.

### 7.1 필수 노드(개념)
1) **Document Loader** (파일/URL/텍스트)
2) **Text Splitter** (chunk size/overlap)
3) **Embeddings**: Ollama `nomic-embed-text`
4) **Vector Store**: Qdrant(컬렉션 = tenant/dept 기준)
5) **Retriever**
6) **LLM**: Ollama `llama3.1:8b`
7) **Prompt Template/System Prompt**
8) (선택) **Conversation Memory**
9) (선택) **Citations/Source** 출력

### 7.2 권장 설정값
- Chunk size: 800~1200 tokens(또는 800~1200 chars)
- Overlap: 80~150
- TopK: 4~8
- Temperature: 0.2~0.5 (업무/규정 답변은 낮게)

### 7.3 “근거 포함” 응답 형식 예시
- 답변 본문
- 참고 문서 리스트(파일명/섹션/페이지/링크)
- 주의사항(확실하지 않은 부분 표시)

---

## 8. 관측(Observability): 로그/토큰/Latency/에러 + OpenTelemetry

### 8.1 Jaeger로 트레이스 보기
- 접속: `http://localhost:16686`
- Service 드롭다운에서 `api-gateway`, `langchain-js`, `llamaindex-py` 등 선택
- Operation별 latency 확인
- 에러 span/exception 이벤트 확인

### 8.2 Prometheus + Grafana
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3006` (기본 계정: `admin / admin1234`)

Grafana에서 확인할 것:
- 요청 수(RPS)
- p95/p99 latency
- 에러율(5xx)
- 큐 적체(워커 backlog)
- Ollama 응답 시간/타임아웃

### 8.3 토큰/비용 추적(로컬 LLM 기준)
Ollama는 OpenAI처럼 “요금”은 없지만, 운영관점에서:
- prompt tokens / completion tokens
- 평균 응답 시간
- 컨텍스트 길이 증가에 따른 latency
를 지표화하는 것이 중요합니다.

(프로젝트에서 token count를 span attribute로 넣도록 구현되어 있으면 Jaeger/Grafana에서 집계 가능합니다.)

---

## 9. 배포(운영 전환 가이드)

### 9.1 EC2 + ALB
- ALB: 80/443 → Target Group(Flowise 3000, Gateway 3005 등)
- 보안그룹: 최소 포트만 허용
- 스토리지: EBS(볼륨) 또는 S3(운영시)
- 내부망 Qdrant/Redis/MinIO는 외부 노출 금지 권장

### 9.2 ECS(Fargate/EC2)
- 서비스 단위로 분리(Flowise/Gateway/Worker/Ollama/Qdrant)
- Ollama는 GPU/로컬 디스크 요구로 ECS EC2 타입이 더 쉬울 수 있음
- 로그: CloudWatch + OTEL exporter

### 9.3 Kubernetes + Helm
- 각 컴포넌트 Helm chart로 패키징
- Secret/ConfigMap 분리(.env)
- Ingress(NGINX/ALB Ingress)로 라우팅
- PV/PVC:
  - Qdrant data
  - Flowise data
  - uploads/jobs/audit
  - Ollama model cache(선택)

---

## 10. 트러블슈팅(자주 터지는 것들)

### 10.1 포트 충돌(예: 6379, 4318)
**증상**
- `Bind for 0.0.0.0:<port> failed: port is already allocated`

**원인 확인**
```bash
sudo ss -ltnp | grep ':6379' || true
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Ports}}" | grep 6379 || true
```

**해결**
- 점유 중인 컨테이너 중지:
  ```bash
  docker stop <container>
  ```
- 또는 compose 포트 변경:
  - `6379:6379` → `16379:6379`
  - `4318:4318` → `14318:4318` (필요 시)

### 10.2 Ollama 모델 pull이 실패하거나 “서비스가 안 떠있음”
- 먼저 `docker compose ps`로 `ollama`가 Up인지 확인
- Up이 아니면 로그 확인:
  ```bash
  docker compose logs -n 200 ollama
  ```
- 모델 pull은 항상:
  ```bash
  docker compose exec ollama ollama pull <model>
  ```

### 10.3 Python requirements 충돌(pydantic/llama-index)
- `ResolutionImpossible` 메시지면 보통 **버전 고정이 과도**합니다.
- 해결 전략:
  - `pydantic`를 최신 요구에 맞춰 상향(예: `>=2.11.5,<3`)
  - `llama-index` 계열을 “같은 core major” 범위로 통일
  - 필요 없는 provider(OpenAI) 패키지 제거(로컬 Ollama만 쓸 때)

### 10.4 Node(langchain-js) npm ERESOLVE
- peer deps 충돌 발생 시:
  - Dockerfile에서 `npm ci --legacy-peer-deps` 사용(개발용)
  - 또는 의존성 정리/lock 재생성(정석)

---

## 11. 운영 체크리스트(권장)

### 11.1 보안
- 외부 노출 포트 최소화(Flowise/Gateway만)
- MinIO/Qdrant/Redis는 내부망 전용
- 관리자 계정/비번 정책 준수(복잡도, 주기적 변경)
- 업로드 문서 접근 ACL(테넌트/부서/역할)

### 11.2 품질
- 근거(출처) 표시가 항상 나오도록 프롬프트/응답 포맷 고정
- “모르면 모른다” 정책 활성화
- 금칙어/민감정보 마스킹(PII) 필터 적용

### 11.3 성능
- chunk 전략 튜닝(너무 작으면 검색비용↑, 너무 크면 정확도↓)
- TopK/재랭킹(옵션)
- Ollama 모델/컨텍스트 길이 최적화

---

## 12. 빠른 검증 명령 모음(복붙용)

```bash
# 전체 상태
docker compose ps

# Flowise
curl -sI http://127.0.0.1:3000 | head -n 5

# Ollama
curl -s http://127.0.0.1:11434/api/tags | head

# Qdrant
curl -s http://127.0.0.1:6333/healthz || true

# Jaeger
curl -sI http://127.0.0.1:16686 | head -n 5

# Prometheus
curl -sI http://127.0.0.1:9090 | head -n 5

# Grafana
curl -sI http://127.0.0.1:3006 | head -n 5
```

---

## 부록 A) 용어 정리(은행 업무 관점)
- **RAG**: 검색(Retrieval) + 생성(Generation)을 결합해 “근거 기반 답변”을 제공
- **테넌트**: 조직 단위 분리(예: 법인/계열/조직)
- **컬렉션**: 벡터 DB의 논리적 저장 단위(Qdrant)
- **OTel**: 분산 추적/메트릭/로그 표준(OpenTelemetry)
- **Chunk**: 문서를 검색 가능한 작은 단위로 쪼갠 텍스트 조각

---

## 부록 B) “은행업 종사자”용 권장 문서 카테고리
- 준법/AML/KYC 가이드
- 여신/수신/외환/기업금융 프로세스
- 내부통제/감사 체크리스트
- 상품 약관/FAQ/대고객 안내문
- 내부 시스템 사용 매뉴얼(업무 화면/권한)
