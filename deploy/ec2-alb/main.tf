terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

provider "aws" {
  region = var.region
}

# TODO: VPC/ALB/EC2 리소스 구성
# - aws_vpc, aws_subnet, aws_lb, aws_lb_target_group, aws_instance 등
