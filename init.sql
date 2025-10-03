-- This script will be executed when the container is first started.

CREATE TABLE IF NOT EXISTS traffic_log (
    log_id SERIAL PRIMARY KEY,
    visitor_ip VARCHAR(45) NOT NULL,
    page_visited TEXT NOT NULL,
    access_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

