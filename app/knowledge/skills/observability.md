# Observability and logging

**Summary:** Makes systems observable from the edge to the cloud, and is now adding AI on top of
logs to cut troubleshooting time.

## Evidence
- **Cloud observability (current role):** CloudWatch alarms, dashboards and SNS alerts in a dedicated
  observability stack; split VPN observability from the data-pipeline observability and wrote a
  metrics script for the VPN.
- **AI log agent (current role):** a read-only service that watches every pod's logs in the cluster,
  escalates each new error as an incident record (deduplicated), and writes a periodic report per
  service with an LLM-drafted suggestion of what to check. It uses Claude, falls back to a local
  model, and by design cannot act on the cluster.
- **Agentic diagnostics:** structured runbooks as decision trees (checks, pass conditions,
  auto-fix branches, escalation) plus an append-only case log to learn from past incidents.
- **Edge logging:** event-triggered collection and packaging of logs and system data on air-gapped
  devices with Python, Docker and Fluent-bit (Mission Recorder).
- **Stack experience:** Prometheus, Grafana, ELK/EFK (Elasticsearch, Logstash/Fluent-bit, Kibana),
  OpenTelemetry, Jaeger, CloudWatch; custom Prometheus exporter; this website exports Prometheus
  metrics.
- **About 70% faster troubleshooting:** combines years of hands-on production troubleshooting at
  JFrog with agentic workflows that read structured troubleshooting runbooks (troubleshooting.md
  files) to guide each investigation.
