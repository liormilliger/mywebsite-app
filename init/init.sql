-- init.sql

-- This script creates a schema to log website traffic, tracking unique
-- visitors and the specific pages they view over time.

-- Table to store unique visitor information.
-- The IP address is the primary key here, as it uniquely identifies a visitor.
CREATE TABLE IF NOT EXISTS visitors (
    ip_address INET PRIMARY KEY,
    first_visit_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_visit_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_agent TEXT -- Optional: store browser/device info
);

-- Table to log each individual page view.
-- This table has its own primary key (view_id) because a visitor can have many page views.
-- It uses a foreign key to link back to the visitors table.
CREATE TABLE IF NOT EXISTS page_views (
    view_id SERIAL PRIMARY KEY,
    visitor_ip INET NOT NULL,
    page_route TEXT NOT NULL, -- e.g., '/', '/about-me', '/tech-in-action'
    view_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_visitor_ip
        FOREIGN KEY(visitor_ip)
        REFERENCES visitors(ip_address)
        ON DELETE CASCADE -- If a visitor is deleted, their page views are also deleted.
);
