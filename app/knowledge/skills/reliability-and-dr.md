# Reliability, incident response and disaster recovery

**Summary:** Treats incidents as a reason to build systems that recover by themselves, and
documents the result so others can operate it.

## Evidence
- **From an accidental production teardown to a three-layer recovery design (current role).** After a
  production VPN concentrator was torn down by accident and every peer would have needed
  re-onboarding, Lior designed and shipped disaster recovery for it:
  1. the server's identity key is kept in Secrets Manager and restored automatically on every
     deploy (restore, adopt or generate, and self-heal if the local key is wrong);
  2. every peer's configuration is stored centrally and restored automatically on production
     deploys when peers are missing;
  3. daily EBS snapshots plus an automatic snapshot right before any teardown.
  A rebuilt concentrator now comes back with all peers working, without touching the field units.
- **Data that survives rebuilds:** restore Aurora from the latest snapshot, retain Cognito users and
  data buckets, persist CloudFront settings across redeploys.
- **DR tests:** a scripted disaster-recovery test run against environments, with recorded results.
- **Load and stress testing:** VPN load, stress and message-queue tests, and a satellite-link test
  suite (overnight baseline, load ramp, control round-trip latency).
- **Troubleshooting mindset:** "verify the data path, not the status": checking that consumers
  actually consume and data actually lands, instead of trusting a green status.
- **Runbooks and docs:** deployment references, DR runbooks, peer onboarding guides and daily
  changelogs, so the next person can operate the system without him.
- **Support background (JFrog):** diagnosed enterprise customers' production pipelines under
  pressure: logs, Java code, networking, performance and storage.
