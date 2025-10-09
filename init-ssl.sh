#!/bin/bash

# --- Configuration ---
domains=(liormilliger.com)
email="liormilliger@gmail.com"
rsa_key_size=4096
data_path="./data/certbot"
# Set to 1 to use the Let's Encrypt staging server (for testing, avoids rate limits)
# Set to 0 to use the production server (for a real, trusted certificate)
staging=1

# --- Script Logic ---
if [ -d "$data_path" ]; then
  read -p "Existing data found for $domains. Continue and replace existing certificate? (y/N) " decision
  if [ "$decision" != "Y" ] && [ "$decision" != "y" ]; then
    exit
  fi
fi

if [ ! -e "$data_path/conf/options-ssl-nginx.conf" ] || [ ! -e "$data_path/conf/ssl-dhparams.pem" ]; then
  echo "### Downloading recommended TLS parameters ..."
  mkdir -p "$data_path/conf"
  curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf > "$data_path/conf/options-ssl-nginx.conf"
  curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem > "$data_path/conf/ssl-dhparams.pem"
  echo
fi

echo "### Creating dummy certificate for $domains ..."
path="/etc/letsencrypt/live/$domains"
mkdir -p "$data_path/conf/live/$domains"
docker-compose --env-file .env run --rm --entrypoint "\
  openssl req -x509 -nodes -newkey rsa:$rsa_key_size -days 1\
    -keyout '$path/privkey.pem' \
    -out '$path/fullchain.pem' \
    -subj '/CN=localhost'" certbot
echo

echo "### Starting nginx ..."
docker-compose --env-file .env up --force-recreate -d nginx
echo

echo "### Deleting dummy certificate for $domains ..."
docker-compose --env-file .env run --rm --entrypoint "\
  rm -Rf /etc/letsencrypt/live/$domains && \
  rm -Rf /etc/letsencrypt/archive/$domains && \
  rm -Rf /etc/letsencrypt/renewal/$domains.conf" certbot
echo

echo "### Requesting certificate from Let's Encrypt staging server ..."
domain_args=""
for domain in "${domains[@]}"; do
  domain_args="$domain_args -d $domain"
done

email_arg="--email $email"
case "$email" in
  "") email_arg="--register-unsafely-without-email" ;;
esac

staging_arg=""
if [ $staging != "0" ]; then staging_arg="--staging"; fi

docker-compose --env-file .env run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    $staging_arg \
    $email_arg \
    $domain_args \
    --rsa-key-size $rsa_key_size \
    --agree-tos \
    --force-renewal" certbot
echo

echo "### Reloading nginx ..."
docker-compose --env-file .env exec nginx nginx -s reload
echo

echo "### Starting all application services ..."
docker-compose --env-file .env up -d
echo

echo "### SSL staging setup complete! Your application is running with a test certificate. ###"

