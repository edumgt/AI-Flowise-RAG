# Readme05 - Node/Python 서비스 및 운영도구 상세

## 1) API Gateway (Node.js)
역할:
- 로그인/JWT 발급
- 권한검사
- 파일 업로드 수신
- 인덱싱 작업 큐 적재
- 채팅 요청 라우팅(langchain-js, llamaindex-py, flowise)

핵심 라이브러리:
- express, jsonwebtoken, bullmq, multer, axios, aws-sdk(s3), opentelemetry

## 2) Indexing Worker (Node.js)
역할:
- Redis(BullMQ) 작업 소비
- 엔진별 ingest API 호출
- 잡 상태 기록

## 3) LangChain JS Service
역할:
- `/ingest/file`, `/chat` 제공
- JS 생태계에서 문서 파싱+임베딩+검색+생성 흐름 수행

## 4) LlamaIndex Py Service
역할:
- `/ingest/file`, `/chat` 제공
- Python 생태계 기반 RAG 처리

## 5) 관측 도구
- Jaeger: 트레이스 확인
- Prometheus: 메트릭 수집
- Grafana: 대시보드 시각화

## 6) 운영 체크리스트
- trace-id로 API/워커/엔진 흐름이 연결되는지
- tenant/dept 범위를 벗어난 문서 검색이 차단되는지
- 업로드/삭제 시 registry와 Qdrant 정합성이 맞는지
