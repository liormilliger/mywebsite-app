# GitOps and CI/CD

**Summary:** Designs pipelines and GitOps flows where a commit is a deployment, across Jenkins,
GitHub Actions, Bitbucket Pipelines, FluxCD and ArgoCD.

## Evidence
- **Two-repo GitOps model with FluxCD (current role).** One repo holds the Helm charts, another holds
  the deployment state per customer and environment (chart version, image tags, values). Flux
  reconciles each cluster from Git. Different customers can run different chart versions at the
  same time, and changes are promoted through staging first.
- **Secrets in GitOps:** wired values-from-secrets into every customer's HelmRelease so no
  credentials live in the GitOps repo.
- **Bitbucket Pipelines for multi-environment cloud deploys.** Pipelines with reusable steps for
  unit tests, CloudFormation and SAM validation, deploying network + VPN, deploying the platform,
  deploying Lambdas with database migrations, and a guarded full teardown. Production VPN deploys
  automatically restore peers after a rebuild.
- **GitHub Actions + ArgoCD (this website).** Build → Gitleaks and Trivy scans → push to ECR → bump
  the image tag in a separate k8s repo → ArgoCD sync to EKS; plus an in-place deploy path on a
  self-hosted runner for the cost-saving EC2 setup.
- **Jenkins:** per-service pipelines and Jenkinsfiles (demos on the classic site).
- **Per-service CI/CD and microservice migrations:** 30+ microservices migrated with their own
  pipelines.

## Depth signals
- Separates "what is deployed" (Git state) from "how it is built" (charts, images).
- Builds safety into pipelines: validation steps before deploy, explicit prod-confirmation flags on
  destructive operations, automated recovery steps.
