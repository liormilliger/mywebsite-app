CREATE TABLE IF NOT EXISTS visitors (
    ip_address INET PRIMARY KEY,
    first_visit_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_visit_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_agent TEXT

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
