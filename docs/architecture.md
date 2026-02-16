# 아키텍처 개요

## 1) 문서 업로드 → 파싱 → 인덱싱
1. FE(브라우저)에서 파일 업로드
2. `api-gateway`가 파일을 `/data/uploads`에 저장
3. 선택된 엔진 서비스로 `/ingest/file` 호출
4. 엔진이 파일을 파싱 → 청크/임베딩 → Qdrant 컬렉션(`bankrag__tenant__dept`)에 업서트

## 2) 멀티 테넌트
- JWT에 포함된 `tenant`, `depts`(접근 가능한 부서 목록)로 접근 제어
- 부서별 컬렉션을 분리하여 검색/노출 범위를 물리적으로 차단

## 3) 관측(OpenTelemetry)
- Node, FastAPI 서비스에 OTel SDK/Instrumentations 적용
- OTel Collector가 traces/metrics 수집
- Traces: Jaeger, Metrics: Prometheus/Grafana

## 4) 운영 포인트
- 실환경: 업로드 파일은 S3(또는 내부 오브젝트 스토리지)로 분리 권장
- 인덱싱은 비동기 작업 큐(예: SQS/Celery/Temporal)로 분리 권장
- 컬렉션/네임스페이스는 규정(보관기간/삭제) 정책과 연계 필요
