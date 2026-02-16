#!/bin/bash
set -euxo pipefail

yum update -y
amazon-linux-extras install docker -y
service docker start
usermod -a -G docker ec2-user

# docker compose plugin
mkdir -p /usr/local/lib/docker/cli-plugins
curl -L https://github.com/docker/compose/releases/download/v2.29.2/docker-compose-linux-x86_64   -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# App repo (예시: S3/CodeCommit/GitHub 등으로 배포 전략 선택)
# 여기서는 placeholder. 운영에서는 artifact를 S3에서 내려받도록 권장.
mkdir -p /opt/bank-rag
echo "TODO: fetch your repo artifact into /opt/bank-rag" > /opt/bank-rag/README.txt

# Example:
# cd /opt/bank-rag && docker compose --env-file .env up -d --build
