#!/bin/bash
# Use this script for certificate renewals AFTER the initial setup.
# For first-time setup, use init-letsencrypt.sh instead.

set -e

echo "### Renewing Let's Encrypt certificate ..."
docker compose run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    -d liormilliger.com \
    --email liormilliger@gmail.com \
    --agree-tos \
    --force-renewal" certbot

echo "### Reloading nginx ..."
docker compose exec nginx nginx -s reload

echo "### Done. Certificate renewed successfully."
