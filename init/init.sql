CREATE TABLE IF NOT EXISTS visitors (
    ip_address INET PRIMARY KEY,
    first_visit_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_visit_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_agent TEXT
);

CREATE TABLE IF NOT EXISTS page_views (
    view_id SERIAL PRIMARY KEY,
    visitor_ip INET NOT NULL,
    page_route TEXT NOT NULL,
    view_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_visitor_ip
        FOREIGN KEY(visitor_ip)
        REFERENCES visitors(ip_address)
        ON DELETE CASCADE
);

-- ── Ask (AI agent) conversation log ────────────────────────────────────────
-- One row per browser session on /ask, keyed by visitor IP.
CREATE TABLE IF NOT EXISTS chat_sessions (
    session_id       UUID PRIMARY KEY,
    visitor_ip       INET NOT NULL,
    user_agent       TEXT,
    persona          TEXT,
    started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    message_count    INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_ip ON chat_sessions (visitor_ip, started_at DESC);

-- Every prompt and every answer, in order, with everything the agent produced.
CREATE TABLE IF NOT EXISTS chat_messages (
    message_id    BIGSERIAL PRIMARY KEY,
    session_id    UUID NOT NULL REFERENCES chat_sessions(session_id) ON DELETE CASCADE,
    visitor_ip    INET NOT NULL,
    turn_index    INTEGER NOT NULL,
    role          TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content       TEXT NOT NULL,
    components    JSONB,
    trace         JSONB,
    metadata      JSONB,
    model         TEXT,
    input_tokens  INTEGER,
    output_tokens INTEGER,
    latency_ms    INTEGER,
    error         TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_ip ON chat_messages (visitor_ip, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages (session_id, turn_index);
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS cost_usd NUMERIC(12,6);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages (created_at);

-- Convenience view: full transcript grouped by IP, then session, in order.
CREATE OR REPLACE VIEW chat_log_by_ip AS
SELECT m.visitor_ip,
       m.session_id,
       s.persona,
       s.user_agent,
       m.turn_index,
       m.role,
       m.content,
       m.components,
       m.model,
       m.input_tokens,
       m.output_tokens,
       m.latency_ms,
       m.error,
       m.created_at,
       m.cost_usd
FROM chat_messages m
JOIN chat_sessions s USING (session_id)
ORDER BY m.visitor_ip, s.started_at, m.turn_index, m.message_id;
