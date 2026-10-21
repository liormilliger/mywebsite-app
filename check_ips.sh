#!/usr/bin/env bash
# check_ips.sh - look up every new IP from chat_sessions with ipcheck.sh and store the
# result in the ip_details table (one row per IP, looked up once).
#
# Runs from cron every hour; it only does work at 06,08,10,12,14,16 and 20:00 Israel time
# (handled here, so daylight-saving changes are automatic). Run it by hand any time with:
#   ./check_ips.sh --now
#
# Needs: Docker (the mywebsite-db container), ipcheck.sh next to this file,
#        whois + dnsutils + curl on the host (apt install whois dnsutils curl).
set -uo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IPCHECK="${IPCHECK:-$DIR/ipcheck.sh}"
DB_CONTAINER="${DB_CONTAINER:-mywebsite-db}"
RUN_HOURS="${RUN_HOURS:-06 08 10 12 14 16 20}"
TZ_LOCAL="${TZ_LOCAL:-Asia/Jerusalem}"

# Only run at the scheduled local hours, unless called with --now
if [[ "${1:-}" != "--now" ]]; then
  HOUR=$(TZ="$TZ_LOCAL" date +%H)
  [[ " $RUN_HOURS " == *" $HOUR "* ]] || exit 0
fi

# One run at a time
exec 9>"/tmp/check_ips.lock"
flock -n 9 || { echo "$(date -Is) check_ips: previous run still active, skipping"; exit 0; }

# Database credentials from the project's .env (POSTGRES_USER, POSTGRES_DB)
if [[ -f "$DIR/.env" ]]; then set -a; . "$DIR/.env"; set +a; fi
: "${POSTGRES_USER:?POSTGRES_USER not set}" "${POSTGRES_DB:?POSTGRES_DB not set}"

# PSQL can be overridden for testing; by default it runs psql inside the db container
if [[ -n "${PSQL:-}" ]]; then
  psql_run() { $PSQL -v ON_ERROR_STOP=1 -qAt "$@"; }
else
  psql_run() { docker exec -i "$DB_CONTAINER" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -qAt "$@"; }
fi

[[ -x "$IPCHECK" ]] || { echo "$(date -Is) check_ips: $IPCHECK not found or not executable"; exit 1; }

# Table + convenience view (safe to run every time)
psql_run <<'SQL' || { echo "$(date -Is) check_ips: could not reach the database"; exit 1; }
SET client_min_messages = warning;
CREATE TABLE IF NOT EXISTS ip_details (
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip          INET PRIMARY KEY,
    owner       TEXT,
    location    TEXT,
    network     TEXT,
    asn         TEXT,
    type        TEXT,
    reverse     TEXT,
    abuse       TEXT
);
CREATE OR REPLACE VIEW chat_sessions_with_ip AS
SELECT s.session_id, s.visitor_ip, s.started_at, s.message_count, s.persona,
       d.owner, d.location, d.network, d.asn, d.type, d.reverse, d.abuse, d."timestamp" AS checked_at
FROM chat_sessions s
LEFT JOIN ip_details d ON d.ip = s.visitor_ip;
SQL

NEW_IPS=$(psql_run -c "SELECT DISTINCT host(s.visitor_ip) FROM chat_sessions s
                       WHERE NOT EXISTS (SELECT 1 FROM ip_details d WHERE d.ip = s.visitor_ip)")

count=0
for ip in $NEW_IPS; do
  out=$("$IPCHECK" "$ip" 2>/dev/null)
  # value after "Key:" on the matching line of ipcheck's output
  field() { awk -v k="$1:" 'index($0, k) == 1 { sub(k, ""); sub(/^[ \t]+/, ""); print; exit }' <<<"$out"; }

  psql_run \
    -v ip="$ip" \
    -v owner="$(field Owner)" \
    -v location="$(field Location)" \
    -v network="$(field Network)" \
    -v asn="$(field ASN)" \
    -v type="$(field Type)" \
    -v reverse="$(field Reverse)" \
    -v abuse="$(field Abuse)" <<'SQL'
INSERT INTO ip_details ("timestamp", ip, owner, location, network, asn, type, reverse, abuse)
VALUES (NOW(), :'ip', :'owner', :'location', :'network', :'asn', :'type', :'reverse', :'abuse')
ON CONFLICT (ip) DO NOTHING;
SQL
  if [[ $? -eq 0 ]]; then count=$((count + 1)); else echo "$(date -Is) check_ips: failed to store $ip"; fi
  sleep 1   # be polite to whois / ipinfo.io
done

echo "$(date -Is) check_ips: $count new IP(s) stored"