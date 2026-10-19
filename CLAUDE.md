# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running Locally

**Without database (fastest for frontend/template work):**
```bash
cd app
source venv/bin/activate
pip install -r requirements.txt
python3 app-local.py
# Accessible at http://localhost:5000
```

**Full stack with Docker Compose (nginx + Flask + PostgreSQL + certbot):**
```bash
docker-compose up --build
# Accessible at http://localhost:80
```
Requires a `.env` file with `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB`.

## Running Tests

Integration tests live in `test_db.py` at the repo root and are not pytest — they run as a plain Python script inside the Docker CI network. To run them locally, bring up `docker-compose.ci.yaml` and execute the script in a container on the same network:

```bash
WEB_IMAGE=<image> docker-compose -f docker-compose.ci.yaml -p ci up -d
docker run --rm --network=ci_default \
  -v $(pwd)/test_db.py:/test_db.py \
  -e POSTGRES_HOST=db -e POSTGRES_DB=mywebsite \
  -e POSTGRES_USER=admin -e POSTGRES_PASSWORD=password \
  --entrypoint="" python:3.9-slim \
  sh -c "pip install psycopg2-binary requests && python -u /test_db.py"
docker-compose -f docker-compose.ci.yaml -p ci down
```

## Architecture

This is a personal portfolio/CV site built with Python/Flask, backed by PostgreSQL for visitor tracking.

**Two app entry points:**
- `app/app-local.py` — no database, for local development without Docker
- `app/app.py` — production version; imports `db.py`, registers Prometheus metrics, and logs every non-static request via a `@before_request` middleware that calls `log_visitor()`

**Templates** use Jinja2 inheritance from `app/templates/base.html`. All pages extend `base.html` which provides the nav, footer, and static asset links.

**Database schema** (`init/init.sql`): two tables — `visitors` (keyed on `ip_address INET`, upserted on repeat visits) and `page_views` (append-only log with FK to `visitors`). The schema is auto-applied by Postgres on first container start via `./init` mounted to `/docker-entrypoint-initdb.d`.

**Nginx** (`nginx/nginx.conf`) acts as a TLS-terminating reverse proxy on ports 80/443. HTTP redirects to HTTPS. Error pages (404/500/502/503/504) are served directly by Nginx from a mounted `error.html` rather than by Flask.

## CI/CD Pipeline

Three GitHub Actions workflows:

- **`push-image.yaml`** (main flow): builds Docker image → runs DB integration tests (only on `database` branch or commits with "db"/"database" in the message) → security scans with Gitleaks and Trivy → pushes to AWS ECR → commits updated image tag into the [mywebsite-k8s](https://github.com/liormilliger/mywebsite-k8s) repo to trigger ArgoCD GitOps deployment.

- **`local-ci-deployment.yaml`**: in-place deploy on a self-hosted runner; does a `git fetch + reset --hard`, rebuilds the `app` container, and verifies health via `curl`.

- **`local-ansible-deployment.yaml`**: Ansible-based deployment path (see `ansible/playbook.yaml`).

Image tags follow the format `1.<run_number>-<branch-name>`.

## Multi-Repo Context

The production deployment spans three repos:
- **mywebsite-app** (this repo): Flask app, templates, Docker config
- **mywebsite-k8s**: Kubernetes manifests and ArgoCD App-of-Apps (auto-updated by CI)
- **mywebsite-iac**: Terraform for AWS VPC, EKS cluster, and ArgoCD Helm install

## /ask (AI agent) and conversation log

- `app/agent.py` (Blueprint): `GET /ask` page, `POST /api/ask` streams Server-Sent Events, `GET /llms.txt`. Registered in both `app.py` (with `PostgresChatStore`) and `app-local.py` (with `NullChatStore`, nothing logged).
- Knowledge source is **only** `app/knowledge/profile.json`. Update it when projects or experience change; classic templates are separate.
- Claude writes short text, then calls display tools (`show_projects`, `show_role_fit`, `show_stack`, `show_timeline`, `show_stats`, `show_certifications`, `show_site_architecture`, `draft_intro`). The server turns each tool call into a component filled from the profile; `static/js/ask.js` renders and escapes it.
- Answer tiers: (1) Claude while today's (UTC) site-wide spend, summed from `chat_messages.cost_usd`, is under `ASK_DAILY_BUDGET_USD` (default 0.50); (2) local model via Ollama (`app/local_llm.py`) if `OLLAMA_URL` is reachable — it writes text only, from a compact slice of the profile, and the keyword router picks the cards; (3) keyword router (`route_intent` / `INTENTS`). Each tier falls through on error; if the spend can't be read, Claude is skipped (fail safe).
- Caps checked before any tier: `ASK_MAX_PROMPTS_PER_IP_PER_DAY` (60), `ASK_MAX_PROMPTS_PER_SESSION` (20), `ASK_MAX_PROMPT_CHARS` (1000). Claude cost uses `ANTHROPIC_PRICE_INPUT_PER_MTOK` / `ANTHROPIC_PRICE_OUTPUT_PER_MTOK` (Haiku 5.5 defaults 0.10 / 0.50), including cache reads and writes.
- API key: `app/secrets_loader.py` reads it from AWS Secrets Manager (`ANTHROPIC_API_KEY_SECRET_ARN`, set in docker-compose) using the EC2 instance role, cached 1 h; `ANTHROPIC_API_KEY` env overrides it for local testing. The instance role needs `secretsmanager:GetSecretValue` on that ARN, and the instance metadata hop limit must be 2 so containers can reach the role credentials.
- Other env: `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` (default `claude-haiku-5-5`), `OLLAMA_URL`, `OLLAMA_MODEL` (default `qwen2.5:1.5b`), `OLLAMA_TIMEOUT_SECONDS` (90).
- The `ollama` service in docker-compose is behind the `local-llm` profile: `docker compose --profile local-llm up -d`, then `docker exec mywebsite-ollama ollama pull qwen2.5:1.5b`.
- Daily Claude spend: `SELECT date(created_at), sum(cost_usd) FROM chat_messages WHERE model LIKE 'claude%' GROUP BY 1 ORDER BY 1 DESC;`
- `app/chat_store.py` logs every prompt (before the model runs) and every answer (text, components, trace, tool calls, model, tokens, latency, error, including interrupted streams). Tables `chat_sessions` and `chat_messages` plus view `chat_log_by_ip` are created on first use, so existing databases need no migration; the same DDL is in `init/init.sql`.
- Read the log: `SELECT * FROM chat_log_by_ip WHERE visitor_ip = '1.2.3.4';`
- The Dockerfile runs gunicorn with `gthread` workers so a streaming answer doesn't block other requests.
