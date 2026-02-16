# WSL + Docker Desktop + Ollama 개발 가이드

## 전제
- Windows에서 **Docker Desktop** 설치 + WSL Integration ON
- WSL(Ubuntu)에서 `docker` / `docker compose` 사용 가능

## 실행
```bash
cp .env.example .env
docker compose --env-file .env up -d --build
```

## Ollama 모델 다운로드(권장)
Ollama 컨테이너에 모델이 없으면 첫 요청에서 자동 다운로드로 시간이 오래 걸릴 수 있습니다.
아래처럼 미리 pull 해두세요.

```bash
# (권장) compose 프로젝트 이름/번호에 상관없이 안전하게 실행
docker compose --env-file .env exec ollama ollama pull llama3.1:8b
docker compose --env-file .env exec ollama ollama pull nomic-embed-text
```

> `docker exec <컨테이너이름>` 방식은 프로젝트/디렉터리명에 따라 이름이 달라져서 자주 틀립니다.
> 위처럼 `docker compose exec <service>`를 쓰면 서비스 이름(ollama)으로 바로 들어갈 수 있어요.

## 체크
- Ollama API: http://localhost:11434
```bash
curl http://localhost:11434/api/tags | head
```

## GPU 사용(선택)
- Windows에 NVIDIA Driver 설치
- Docker Desktop에서 GPU 사용 가능해야 함
- `docker-compose.yml`의 ollama 섹션에서 `deploy.resources.reservations.devices` 주석 해제
