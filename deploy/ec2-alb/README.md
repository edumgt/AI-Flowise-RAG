# EC2 + ALB 배포 예시 (Docker Compose 기반)

> 목적: 가장 빠르게 **단일 EC2**에서 서비스(게이트웨이/엔진/Qdrant/Flowise/OTel)를 올리고, **ALB**로 외부 트래픽을 수용하는 예시.

## 구성
- ALB (HTTP/HTTPS) → Target Group → EC2:3005 (api-gateway)
- EC2 내부에서 docker compose로 전체 스택 실행
- 보안그룹: ALB는 80/443, EC2는 ALB SG만 허용(3005)

## 디렉토리
- `terraform/` : 최소 예시 (VPC/Subnet은 기존 리소스 사용 가정)
- `userdata/` : EC2 초기 설정 + 레포 pull + compose up

## 빠른 흐름
1) ECR(선택): 이미지 빌드/푸시 또는 EC2에서 직접 빌드
2) Terraform apply로 ALB/EC2/SecurityGroup 생성
3) 접속: `http(s)://<ALB-DNS>/`

## 주의
- 실제 운영에서는 **SSM**, **Secrets Manager**, **EBS/Backup**, **WAF**, **TLS 인증서(ACM)** 등을 적용하세요.
