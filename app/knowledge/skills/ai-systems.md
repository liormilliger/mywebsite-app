# AI systems and agents

**Summary:** Builds production AI systems around LLMs: retrieval, agents, MCP servers and the
infrastructure, cost controls and safety around them.

## Evidence
- **RAG over company knowledge via MCP (current role):** an MCP server that indexes a Confluence space
  into Qdrant and gives Claude search, page-fetch and sync tools. Postgres tracks per-page sync
  state so re-syncs skip unchanged pages; webhooks and a scheduled re-sync keep it fresh.
- **Git and pull-request MCP server:** a lightweight read-only MCP server over several Bitbucket
  repositories (history, diffs, open PRs, reviewers), running on a small EC2 instance behind Caddy
  TLS with systemd timers. Sized deliberately: no Kubernetes or load balancer where it adds nothing.
- **Company knowledge base ("organizational brain"):** FastAPI + Claude + Qdrant with embeddings,
  plus pipelines that turn raw company content into a categorized, machine-readable wiki for other
  agents, with an LLM classifier replacing a keyword heuristic that proved unreliable.
- **Agents in the cluster:** a log-triage agent (Claude with a local Ollama fallback, read-only
  permissions) and an agentic diagnostic workflow with runbooks as decision trees.
- **Local LLMs on edge hardware:** Ollama on K3s with GPU scheduling; evaluated local embeddings on
  a live system using isolated collections and databases so production was never touched.
- **Quorum:** a collaborative workspace where a team works with Claude together in real time
  (streaming, WebSockets, Cognito, MCP connectors, living documents with versioned diffs).
- **This website's agent:** Claude with tool use rendering UI cards, a daily budget and per-visitor
  limits, API key from Secrets Manager, local-model fallback, full conversation logging.
- **Also:** LangChain, n8n workflows, Gemini API, embeddings.
