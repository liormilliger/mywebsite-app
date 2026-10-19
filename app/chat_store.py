"""
Conversation log for the /ask agent.

Every prompt and every answer is stored in Postgres, keyed by visitor IP:
  chat_sessions  one row per browser session (IP, user agent, persona)
  chat_messages  one row per user prompt / assistant answer, including the
                 generated UI components, tool trace, model, tokens, latency
                 and any error.

The tables are created on first use (CREATE ... IF NOT EXISTS), so an existing
production database picks them up without a manual migration. The same DDL is
in init/init.sql for fresh databases.

Each call opens its own short-lived connection, because answers are streamed
and the logging happens after the Flask request context may be gone.
"""
import json
import os
import threading
import time

import psycopg2

_SCHEMA_SQL = """
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

CREATE OR REPLACE VIEW chat_log_by_ip AS
SELECT m.visitor_ip, m.session_id, s.persona, s.user_agent, m.turn_index, m.role,
       m.content, m.components, m.model, m.input_tokens, m.output_tokens,
       m.latency_ms, m.error, m.created_at, m.cost_usd
FROM chat_messages m
JOIN chat_sessions s USING (session_id)
ORDER BY m.visitor_ip, s.started_at, m.turn_index, m.message_id;
"""


def client_ip(request):
    """Same IP extraction as db.log_visitor, so chat rows match visitors rows."""
    raw = request.headers.get('X-Forwarded-For', request.remote_addr) or '0.0.0.0'
    return raw.split(',')[0].strip().strip("'").strip('"').strip('\\') or '0.0.0.0'


class NullChatStore:
    """Used by app-local.py (no database). Saves no conversations, but keeps
    in-memory counters so the session cap and daily budget behave the same."""
    enabled = False

    def __init__(self):
        self._sessions = {}
        self._spend = {}
        self._lock = threading.Lock()

    def ensure_schema(self):
        pass

    def count_recent_prompts(self, ip, hours=24):
        return 0

    def count_session_prompts(self, session_id):
        return self._sessions.get(session_id, 0)

    def claude_spend_today(self):
        return self._spend.get(time.strftime('%Y-%m-%d', time.gmtime()), 0.0)

    def log_user_message(self, *, session_id, **kwargs):
        with self._lock:
            self._sessions[session_id] = self._sessions.get(session_id, 0) + 1
        return None

    def log_assistant_message(self, *, cost_usd=None, **kwargs):
        if cost_usd:
            day = time.strftime('%Y-%m-%d', time.gmtime())
            with self._lock:
                self._spend[day] = self._spend.get(day, 0.0) + float(cost_usd)
        return None


class PostgresChatStore:
    enabled = True

    def __init__(self, logger):
        self.logger = logger
        self._schema_ready = False
        self._lock = threading.Lock()

    def _connect(self):
        return psycopg2.connect(
            host=os.environ.get('POSTGRES_HOST', 'db'),
            dbname=os.environ['POSTGRES_DB'],
            user=os.environ['POSTGRES_USER'],
            password=os.environ['POSTGRES_PASSWORD'],
            port=os.environ.get('POSTGRES_PORT', 5432),
            connect_timeout=5,
        )

    def ensure_schema(self):
        if self._schema_ready:
            return
        with self._lock:
            if self._schema_ready:
                return
            try:
                conn = self._connect()
                try:
                    with conn, conn.cursor() as cur:
                        # Serialize concurrent gunicorn workers creating the schema.
                        cur.execute("SELECT pg_advisory_xact_lock(724001)")
                        cur.execute(_SCHEMA_SQL)
                finally:
                    conn.close()
                self._schema_ready = True
                self.logger.info("Chat log schema is ready.")
            except Exception as e:  # never break the page because logging failed
                self.logger.error(f"Could not prepare chat log schema: {e}")

    def count_recent_prompts(self, ip, hours=24):
        self.ensure_schema()
        try:
            conn = self._connect()
            try:
                with conn.cursor() as cur:
                    cur.execute(
                        """SELECT COUNT(*) FROM chat_messages
                           WHERE visitor_ip = %s AND role = 'user'
                             AND created_at > NOW() - make_interval(hours => %s)""",
                        (ip, hours),
                    )
                    return cur.fetchone()[0]
            finally:
                conn.close()
        except Exception as e:
            self.logger.error(f"Chat rate check failed: {e}")
            return 0

    def count_session_prompts(self, session_id):
        self.ensure_schema()
        try:
            conn = self._connect()
            try:
                with conn.cursor() as cur:
                    cur.execute("SELECT COUNT(*) FROM chat_messages WHERE session_id = %s AND role = 'user'",
                                (session_id,))
                    return cur.fetchone()[0]
            finally:
                conn.close()
        except Exception as e:
            self.logger.error(f"Chat session count failed: {e}")
            return 0

    def claude_spend_today(self):
        """Estimated Claude spend since 00:00 UTC, in USD. Returns None if the
        database can't be read, so the caller can fail safe (skip Claude)."""
        self.ensure_schema()
        try:
            conn = self._connect()
            try:
                with conn.cursor() as cur:
                    cur.execute(
                        """SELECT COALESCE(SUM(cost_usd), 0) FROM chat_messages
                           WHERE role = 'assistant'
                             AND created_at >= date_trunc('day', NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'""")
                    return float(cur.fetchone()[0])
            finally:
                conn.close()
        except Exception as e:
            self.logger.error(f"Chat spend check failed: {e}")
            return None

    def log_user_message(self, *, session_id, ip, user_agent, persona, turn_index, content, metadata=None):
        """Upsert the session and store the visitor's prompt. Called before the model runs,
        so the prompt is kept even if the answer fails or the visitor closes the tab."""
        self.ensure_schema()
        try:
            conn = self._connect()
            try:
                with conn, conn.cursor() as cur:
                    cur.execute(
                        """INSERT INTO chat_sessions (session_id, visitor_ip, user_agent, persona, message_count)
                           VALUES (%s, %s, %s, %s, 1)
                           ON CONFLICT (session_id) DO UPDATE
                           SET last_activity_at = NOW(),
                               message_count = chat_sessions.message_count + 1,
                               persona = COALESCE(EXCLUDED.persona, chat_sessions.persona),
                               user_agent = EXCLUDED.user_agent""",
                        (session_id, ip, user_agent, persona),
                    )
                    cur.execute(
                        """INSERT INTO chat_messages (session_id, visitor_ip, turn_index, role, content, metadata)
                           VALUES (%s, %s, %s, 'user', %s, %s) RETURNING message_id""",
                        (session_id, ip, turn_index, content, json.dumps(metadata or {})),
                    )
                    return cur.fetchone()[0]
            finally:
                conn.close()
        except Exception as e:
            self.logger.error(f"Could not log chat prompt: {e}")
            return None

    def log_assistant_message(self, *, session_id, ip, turn_index, content, components=None, trace=None,
                              metadata=None, model=None, input_tokens=None, output_tokens=None,
                              latency_ms=None, error=None, cost_usd=None):
        self.ensure_schema()
        try:
            conn = self._connect()
            try:
                with conn, conn.cursor() as cur:
                    cur.execute(
                        """INSERT INTO chat_messages
                             (session_id, visitor_ip, turn_index, role, content, components, trace, metadata,
                              model, input_tokens, output_tokens, latency_ms, error, cost_usd)
                           VALUES (%s, %s, %s, 'assistant', %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                           RETURNING message_id""",
                        (session_id, ip, turn_index, content or '',
                         json.dumps(components or []), json.dumps(trace or []), json.dumps(metadata or {}),
                         model, input_tokens, output_tokens, latency_ms, error, cost_usd),
                    )
                    message_id = cur.fetchone()[0]
                    cur.execute(
                        """UPDATE chat_sessions SET last_activity_at = NOW(),
                               message_count = message_count + 1
                           WHERE session_id = %s""",
                        (session_id,),
                    )
                    return message_id
            finally:
                conn.close()
        except Exception as e:
            self.logger.error(f"Could not log chat answer: {e}")
            return None
