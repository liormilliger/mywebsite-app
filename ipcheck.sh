#!/usr/bin/env bash
# ipcheck.sh - quick identity summary for an IP address
# Usage: ipcheck.sh <ip>

LOG="/root/mywebsite-app/logs/nginx/liormilliger_access.log"

IP="$1"
if [[ -z "$IP" ]]; then
  echo "Usage: $0 <ip>"
  exit 1
fi

# Basic IPv4/IPv6 sanity check
if ! [[ "$IP" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ || "$IP" =~ ^[0-9a-fA-F:]+$ ]]; then
  echo "Error: '$IP' does not look like an IP address"
  exit 1
fi

for cmd in whois dig curl host; do
  command -v "$cmd" >/dev/null || echo "Warning: '$cmd' not installed (apt install whois dnsutils curl)"
done

# Return the first non-empty value for any of the given whois keys
wfield() {
  local key val
  for key in "$@"; do
    val=$(grep -i -m1 "^${key}:" <<<"$WHOIS" | cut -d: -f2- | sed 's/^[[:space:]]*//')
    [[ -n "$val" ]] && { echo "$val"; return; }
  done
  echo "-"
}

# Pull a field out of ipinfo's JSON without needing jq
jfield() {
  grep -m1 "\"$1\"" <<<"$INFO" | sed -E 's/.*: *"?([^"]*)"?,?$/\1/'
}

WHOIS=$(timeout 15 whois "$IP" 2>/dev/null)
INFO=$(curl -s --max-time 10 "https://ipinfo.io/$IP" 2>/dev/null)
RDNS=$(dig -x "$IP" +short +time=3 +tries=1 2>/dev/null | head -1)
[[ -z "$RDNS" ]] && RDNS=$(host -W 3 "$IP" 2>/dev/null | awk '/pointer/ {print $NF; exit}')

ORG=$(wfield OrgName org-name owner descr)
NET=$(wfield NetName netname)
RANGE=$(wfield CIDR NetRange inetnum inet6num route)
ABUSE=$(wfield OrgAbuseEmail abuse-mailbox abuse-c)
[[ "$ABUSE" == "-" ]] && ABUSE=$(grep -Eio -m1 'abuse@[a-z0-9.-]+' <<<"$WHOIS" || echo "-")

ASN=$(jfield org)
CITY=$(jfield city)
REGION=$(jfield region)
COUNTRY=$(jfield country)

echo "=== $IP ==="
printf "%-12s %s\n" "Owner:"    "$ORG"
printf "%-12s %s\n" "Network:"  "$NET ($RANGE)"
printf "%-12s %s\n" "ASN:"      "${ASN:--}"
printf "%-12s %s\n" "Location:" "${CITY:--}, ${REGION:--}, ${COUNTRY:--}"
printf "%-12s %s\n" "Reverse:"  "${RDNS:-none}"
printf "%-12s %s\n" "Abuse:"    "$ABUSE"

# Hint at hosting type based on owner/ASN
TYPE="Unknown / possibly residential or ISP"
case "$ORG $ASN $RDNS" in
  *[Mm]icrosoft*|*[Aa]zure*)             TYPE="Cloud: Microsoft Azure" ;;
  *[Gg]oogle*)                           TYPE="Cloud: Google Cloud" ;;
  *[Aa]mazon*|*AWS*|*amazonaws*)         TYPE="Cloud: AWS" ;;
  *[Dd]igital[Oo]cean*)                  TYPE="Cloud: DigitalOcean" ;;
  *[Ll]inode*|*[Aa]kamai*)               TYPE="Cloud: Linode/Akamai" ;;
  *[Oo][Vv][Hh]*)                        TYPE="Hosting: OVH" ;;
  *[Hh]etzner*)                          TYPE="Hosting: Hetzner" ;;
  *[Oo]racle*)                           TYPE="Cloud: Oracle" ;;
  *[Hh]osting*|*[Ss]erver*|*[Dd]ata*[Cc]enter*|*VPS*) TYPE="Hosting / datacenter" ;;
esac
printf "%-12s %s\n" "Type:" "$TYPE"

# fail2ban status, if available
if command -v fail2ban-client >/dev/null; then
  JAILS=$(fail2ban-client banned 2>/dev/null | tr '}' '\n' | grep -F "'$IP'" | grep -oE "'[a-z0-9-]+': \[" | tr -d "':[ ")
  printf "%-12s %s\n" "Banned in:" "${JAILS:-not banned}"
fi

# Activity in the nginx log, if readable
if [[ -r "$LOG" ]]; then
  HITS=$(grep -c "^$IP " "$LOG")
  printf "%-12s %s\n" "Log hits:" "$HITS"
  if (( HITS > 0 )); then
    echo "Top requested paths:"
    grep "^$IP " "$LOG" | awk -F'"' '{split($2,r," "); print r[2]}' \
      | sort | uniq -c | sort -rn | head -5 | sed 's/^/  /'
  fi
fi