# ECS(Fargate) + ALB 스켈레톤

- 서비스 분리 권장:
  - api-gateway (public)
  - indexing-worker (private)
  - langchain-js (private)
  - llamaindex-py (private)
  - qdrant (stateful: ECS보다 관리형/EC2/EKS 권장)
  - observability stack (managed or EKS)

이 폴더에는 샘플 task definition JSON을 넣었습니다.
