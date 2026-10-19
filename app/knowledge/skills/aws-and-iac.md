# AWS and Infrastructure as Code

**Summary:** Builds multi-region, multi-tenant AWS platforms as code with CloudFormation, SAM,
Terraform and Terragrunt. AWS Solutions Architect Associate.

## Evidence
- **Per-customer isolated cloud platform (current role).** CloudFormation nested stacks: one root
  stack orchestrating network, VPN, auth, data, compute, frontend and observability stacks,
  parameterised by customer and stage. Each customer gets its own VPC, Aurora PostgreSQL, Amazon MQ,
  Cognito, S3 and CloudFront, fully namespaced. Deployed to several AWS regions.
- **Serverless backend with AWS SAM:** Lambda functions behind API Gateway (REST and WebSocket),
  Cognito JWT authorizers, an Amazon MQ event-source mapping, and schema migrations through the RDS
  Data API. Worked around a region missing services by choosing an in-region API Gateway WebSocket
  API for realtime updates.
- **Least-privilege IAM:** separate deploy users and policies per concern (VPN, platform, backend),
  narrowed Secrets Manager permissions, audit scripts.
- **Safe lifecycle management:** DeletionPolicies and retention so data, users and buckets survive
  teardowns; resources re-adopted on redeploy; teardown and "hard clean" scripts that also find
  orphaned network interfaces; SSM Parameter Store as the source of truth between stacks.
- **VPN-first architecture:** a WireGuard concentrator on EC2 linking edge units to private cloud
  services.
- **Terraform + Terragrunt:** DRY multi-environment VPC and EKS (public repos); Terraform IaC for
  this website's EKS path.
- **FinOps (JFrog):** Terraform + Lambda automation across AWS Organizations that eliminated 80% of
  cloud waste and cut monthly spend by 30%.

## Depth signals
- Knows the operational traps, not only the templates (e.g. the MQ→Lambda poller needing VPC
  endpoints, ENI release delays, per-node broker metrics).
