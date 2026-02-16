# Readme01 - 실행을 위한 사전 소프트웨어 준비

## 1) 필수 소프트웨어
- Docker Desktop (권장 최신)
- Docker Compose v2 (`docker compose` 명령)
- Git
- (선택) curl, jq

## 2) 권장 개발 환경
- Windows + WSL2 Ubuntu 또는 macOS/Linux
- 이 저장소는 Docker 중심 실행이므로 로컬 Node/Python 설치 없이도 시작 가능

## 3) 설치 확인 명령어
```bash
docker --version
docker compose version
git --version
```

## 4) 포트 계획(충돌 사전 점검)
- 3005: FE + API Gateway
- 3000: Flowise
- 3001: langchain-js
- 8000: llamaindex-py
- 11434: Ollama
- 6333: Qdrant
- 6379: Redis
- 9000/9001: MinIO
- 16686: Jaeger
- 9090: Prometheus
- 3006: Grafana

포트 충돌이 있으면 기존 프로세스를 중지하거나 compose 포트 매핑을 변경하세요.

## 5) WSL 사용 시 팁
`docs/wsl-ollama-dev.md`에 WSL + Docker Desktop + Ollama 가이드가 정리되어 있습니다.
