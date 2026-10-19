# Networking and security

**Summary:** Builds secure connectivity between edge devices and the cloud, and treats security as
part of the pipeline: least privilege, secrets management, scanning and hardened network rules.

## Evidence
- **WireGuard VPN concentrator, automated with Ansible (current role).** Roles and playbooks to deploy
  the concentrator, add and remove peers (field units and maintenance engineers), populate peers,
  and verify restores. Peer state is stored centrally so it can be rebuilt.
- **Firewall hardening:** tightened forward/accept rules, closed paths where a unit could initiate
  connections to a maintenance peer instead of only replying, per-person access to specific unit
  subnets, a duplicate-key guard, and stale-rule cleanup so redeploys never clobber existing peers.
- **Secrets management:** server private keys in AWS Secrets Manager with restore-or-generate
  logic; runtime secrets kept out of Git (Kubernetes secrets, values-from-secrets, SSM).
- **Least privilege everywhere:** scoped IAM users and roles for each deploy path; read-only
  Kubernetes RBAC for AI agents so they can observe but never act.
- **Supply-chain and code scanning:** Trivy and Gitleaks in CI; JFrog Xray and Artifactory
  experience from JFrog.
- **Web hardening on this site:** TLS-terminating Nginx with security headers and rate limiting,
  Let's Encrypt automation, Fail2ban protecting the EC2 host, and API keys from Secrets Manager
  through the instance role.
- **Link testing:** wrote throughput, time-to-first-byte and latency/jitter/loss test scripts for
  units running over satellite links through the VPN.
