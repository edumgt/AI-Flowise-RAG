# ECS(Fargate) + ALB 배포 예시

> 목표: `api-gateway`를 ALB 뒤에 두고, 내부적으로 langchain/llamaindex를 서비스로 붙이는 예시.
> Qdrant/Flowise는 운영 환경에서 **관리형/외부 DB**로 분리 권장.

## 권장 운영 형태
- ECS Service: api-gateway (public)
- ECS Service: langchain-js (private)
- ECS Service: llamaindex-py (private)
- Vector DB: Qdrant (ECS/Fargate로 운영 가능하지만 영속 볼륨/백업 고려)
- Traces/Metrics: OTEL Collector (sidecar 또는 별도 service)

## 파일
- `taskdefs/` : TaskDefinition JSON 샘플 (환경변수/Secret placeholder 포함)
- `scripts/` : ECR push + ecs update-service 예시

## 주의
- 실제 배포 시에는 Secrets Manager로 OPENAI_API_KEY/JWT_SECRET 등을 관리하세요.
- Qdrant를 ECS로 운영한다면 EFS 또는 외부 스토리지 전략이 필요합니다.
