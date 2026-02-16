# EC2 + ALB 배포 스켈레톤

권장 아키텍처
- ALB -> (TargetGroup) -> EC2 (Docker Compose or systemd)
- 문서 저장: S3
- 관측: CloudWatch + OTEL Collector (sidecar/daemonset 개념)

이 폴더는 Terraform 스켈레톤입니다.
- vpc, alb, ec2, security-group, user-data 등을 조직 표준에 맞게 채우세요.
