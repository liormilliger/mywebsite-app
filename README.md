# My Personal Website & Portfolio

This repository contains the source code for my personal portfolio website. The primary goal of this site is to serve as an elaborate, interactive CV, showcasing my skills, knowledge, and the technologies I work with. It includes a PostgreSQL database to track website traffic, and an AI agent that visitors can ask about my work (see [AI agent](#-ai-agent)).

## 🏛️ Project Architecture

This website is part of a larger cloud-native project. It is built to run on AWS EKS with ArgoCD GitOps, to show a complete CI/CD path, but to keep costs low it currently runs in production with Docker Compose on a single EC2 instance (Nginx, Certbot for Let's Encrypt, the Flask app and PostgreSQL), deployed by a self-hosted GitHub Actions runner on that instance. The infrastructure and deployment pipeline are managed across three dedicated repositories:

-   **🌐 [mywebsite-app](https://github.com/liormilliger/mywebsite-app.git) (This Repo):** Contains the Python/Flask application code, HTML/CSS for the frontend, and Docker configuration for containerization.
-   **🔧 [mywebsite-k8s](https://github.com/liormilliger/mywebsite-k8s.git):** Holds the Kubernetes deployment files and ArgoCD App-of-Apps manifests for GitOps-based deployment.
-   **🏗️ [mywebsite-iac](https://github.com/liormilliger/mywebsite-iac.git):** Includes the Terraform Infrastructure as Code (IaC) to provision the AWS VPC, EKS cluster, and deploy ArgoCD via its Helm chart.

## 🚀 Tech Stack

-   **Backend:** Python with [Flask](https://flask.palletsprojects.com/en/2.2.x/)
-   **Database:** [PostgreSQL](https://www.postgresql.org/)
-   **Frontend:** HTML5 & CSS3
-   **Containerization:** [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/)
-   **Web Server:** [Nginx](https://www.nginx.com/) (used as a reverse proxy)
-   **AI:** [Claude API](https://docs.claude.com) (Claude Haiku 5.5), optional local model via [Ollama](https://ollama.com)
-   **Secrets:** AWS Secrets Manager, read with the EC2 instance role

## 🐳 Docker Configuration

This repository includes a multi-container setup orchestrated by Docker Compose to run the full application stack.

-   `Dockerfile`: A simple Dockerfile that containerizes the Flask application, creating a lightweight and optimized image.
-   `docker-compose.yml`: This file defines three services:
    -   **`app`**: The Python/Flask application service. It waits for the `db` service to be healthy before starting, ensuring the database is ready to accept connections.
    -   **`nginx`**: An Nginx service that acts as a reverse proxy, handling incoming traffic on port `80` and forwarding it to the `app` service.
    -   **`db`**: A PostgreSQL database service. It uses a named volume (`postgres_data`) to persist data across container restarts and runs initialization scripts from the `./init` directory on its first launch. A health check is configured to ensure the database is running and ready.
    -   **`ollama`** (optional, `local-llm` profile): a local model the agent falls back to when the daily Claude budget is spent. Not started unless you ask for it.

## 🤖 AI agent

The home page (`/`) is an AI agent that answers questions about my work. Answers come only from `app/knowledge/profile.json` and the skill files in `app/knowledge/skills/` (one Markdown file per area, all public) and are shown as text plus cards (projects, role fit, stack, timeline, certifications), each with links to its sources on the classic page.

-   **Routes:** `/` agent · `/classic` the classic one-page site · `/ask` returns to the agent · `POST /api/ask` streams answers (Server-Sent Events) · `/llms.txt` plain-text profile for other AI assistants.
-   **Switching views:** the "Open the full website" button goes to `/classic?view=classic` and remembers the choice for 30 days with a `site_view` cookie; "Ask the AI version" clears it.
-   **Job descriptions:** visitors can paste a job description and get a requirement-by-requirement fit table (strong / good / growing / gap).
-   **Who answers:** Claude, while today's spend is under the daily budget; then the local Ollama model if it's running; otherwise keyword-matched answers from the same profile. Each step falls back to the next on error.
-   **Limits:** questions per IP per day, per session, and per question length, plus a site-wide daily Claude budget. Set a monthly spend limit on the Anthropic workspace as the hard cap.
-   **API key:** read from AWS Secrets Manager using the EC2 instance role; nothing is stored on the instance. The role needs `secretsmanager:GetSecretValue` on the secret, and the instance metadata hop limit must be 2 so containers can reach the role.
-   **Conversation log:** every question and answer is stored in Postgres (`chat_sessions`, `chat_messages`, view `chat_log_by_ip`) with tokens, cost and errors. The tables are created automatically on first use.

| Variable | Default | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY_SECRET_ARN` | set in `docker-compose.yaml` | Secrets Manager ARN of the API key |
| `ANTHROPIC_API_KEY` | empty | Overrides the secret (local testing) |
| `ANTHROPIC_MODEL` | `claude-haiku-5-5` | Model |
| `ANTHROPIC_EFFORT` | `low` | Thinking effort |
| `ASK_DAILY_BUDGET_USD` | `0.50` | Daily Claude budget, resets 00:00 UTC |
| `ASK_MAX_PROMPTS_PER_SESSION` | `20` | Questions per browser session |
| `ASK_MAX_PROMPTS_PER_IP_PER_DAY` | `60` | Questions per IP per day |
| `ASK_MAX_PROMPT_CHARS` | `6000` | Longest question accepted |
| `OLLAMA_URL` / `OLLAMA_MODEL` | `http://ollama:11434` / `qwen2.5:1.5b` | Local fallback model |

Set any of these in `.env` on the server, then run `docker compose up -d --no-deps app`.

Useful queries (`docker exec -it mywebsite-db psql -U <user> -d mywebsite`):

```sql
-- Latest conversations
SELECT * FROM chat_log_by_ip ORDER BY created_at DESC LIMIT 20;
-- Claude spend per day
SELECT date(created_at), count(*), sum(cost_usd) FROM chat_messages
WHERE model LIKE 'claude%' GROUP BY 1 ORDER BY 1 DESC;
```

To start the local model: `docker compose --profile local-llm up -d`, then `docker exec mywebsite-ollama ollama pull qwen2.5:1.5b`.

## 💻 Running the Application Locally

You can run the application in two ways: as a standalone Flask app (without the database) or as a full-stack application using Docker Compose.

### Method 1: Running Standalone (without Database)

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/liormilliger/mywebsite-app.git](https://github.com/liormilliger/mywebsite-app.git)
    ```

2.  **Navigate to the project directory:**
    ```bash
    cd mywebsite-app
    ```

3.  **Create and activate a virtual environment:**
    * **On macOS/Linux:**
        ```bash
        python3 -m venv venv
        source venv/bin/activate
        ```
    * **On Windows:**
        ```bash
        python -m venv venv
        .\venv\Scripts\activate
        ```

4.  **Install the required dependencies:**
    ```bash
    cd app
    pip install -r requirements.txt
    ```

5.  **Run the Flask application:**
    ```bash
    python3 app-local.py
    ```
    Without a database nothing is logged. The agent uses keyword answers unless `ANTHROPIC_API_KEY` is set.

6.  **Open your browser and navigate to the following address:**
    [http://localhost:5001](http://localhost:5001)

### Method 2: Running with Docker Compose (Full Stack)

This method will launch the Flask application, the Nginx reverse proxy, and the PostgreSQL database.

1.  **Ensure you have Docker and Docker Compose installed.**

2.  **Clone and navigate to the repository directory** (if you haven't already).

3.  **Build and run the services using Docker Compose:**
    ```bash
    docker-compose up --build
    ```

4.  **Open your browser and navigate to the following address:**
    [http://localhost:80](http://localhost:80)
    