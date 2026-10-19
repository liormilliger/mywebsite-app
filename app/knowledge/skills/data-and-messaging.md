# Data and messaging

**Summary:** Works with relational, search and streaming data, and the messaging that moves data
between edge and cloud.

## Evidence
- **Edge-to-cloud messaging (current role):** each unit's local ActiveMQ broker forwards through the
  VPN to Amazon MQ; a Lambda consumer writes to Aurora PostgreSQL and fans updates out over
  WebSockets. Lior deploys and operates this path and debugged its hardest failure mode (a poller
  that reports healthy while consuming nothing).
- **PostgreSQL / Aurora:** Aurora through the RDS Data API, append-only schema migrations, restore
  from snapshot, managed-secret handoff between deploys automated; PostgreSQL on Kubernetes at the
  edge; this website's Postgres schema for visitors and AI conversations.
- **Elasticsearch:** runs it on K3s and wrote snapshot, export and restore tooling.
- **Kafka:** Java producer/consumer microservices streaming between MySQL and Kafka on EKS.
- **Also:** MySQL, DynamoDB, RDS, ActiveMQ, Amazon MQ.
- **Hands-on SQL:** e.g. helped a friend through a stuck database migration by building a
  PostgreSQL view that aggregated data from several tables, in a couple of minutes.
