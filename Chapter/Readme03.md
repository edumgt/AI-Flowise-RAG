# Readme03 - Docker Compose 실행과 상태 점검

## 1) 실행
```bash
docker compose --env-file .env up -d --build
docker compose ps
```

## 2) 상태/로그 점검
```bash
docker compose logs -f --tail=200
```

## 3) 서비스 접속 URL
- FE + API Gateway: http://localhost:3005
- Flowise: http://localhost:3000
- Qdrant: http://localhost:6333/dashboard
- Jaeger: http://localhost:16686
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3006
- MinIO Console: http://localhost:9001

## 4) 첫 기동 이슈 대응
- Ollama 모델 미다운로드로 초기 응답 지연 가능
- MinIO 준비 전 `minio-init` 재시도 로그는 정상
- 포트 충돌 시 compose가 실패하므로 먼저 포트 점검

## 5) 정리/초기화
```bash
docker compose down -v
```
`-v` 옵션은 볼륨을 제거하므로 데이터가 초기화됩니다.
