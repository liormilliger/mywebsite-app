# Kubernetes, Helm and edge deployments

**Summary:** Builds and runs Kubernetes platforms end to end, from single-node K3s clusters on
edge devices in the field to managed EKS, packaged as versioned Helm charts. CKA certified.

## Evidence
- **Edge platform on K3s (current role).** Owns the deployment of a 13+ microservice edge
  intelligence platform to single-node K3s clusters that run on field units and on EC2 for staging.
  Migrated the platform from a monolith-style install to Kubernetes.
- **Helm umbrella chart.** Designed and maintains an umbrella chart with a subchart per service
  (message broker, PostgreSQL, Elasticsearch, Nginx, data collectors, AI services and more), with semantic versioning and dozens of controlled chart releases.
- **Zero-touch install.** An Ansible playbook takes a fresh Ubuntu device to a running cluster in
  one pass: K3s install, registry credentials, secrets, a single `helm install`, then hands
  ownership to GitOps (FluxCD) for every later change.
- **Kubernetes patterns used in production:** CronJobs and Jobs (e.g. a "passport" job that
  collects the unit's software versions and hardware data and uploads it to S3), scoped RBAC for
  in-cluster jobs, ConfigMaps generated at install time, hostPath persistence for edge storage,
  init-style model-pull jobs, and GPU scheduling for local LLM inference (Ollama).
- **Air-gapped and low-connectivity operation:** services and data designed to keep working on
  isolated units, with data packaged and shipped when a link is available.
- **Backup and restore on the edge:** scripts to snapshot, export and restore Elasticsearch indices
  from a K3s pod to an archive and back.
- **Earlier:** KEDA and Karpenter autoscaling, EKS clusters provisioned with Terraform, this
  website's own Kubernetes manifests (mywebsite-k8s).

## Depth signals
- Comfortable with chart dependency management, values layering per customer, release
  versioning and rollback.
- Thinks about the whole lifecycle: install, upgrade through GitOps, backup, teardown and cleanup.
