#!/bin/bash
set -e

SERVICE_NAME="app"
CONTAINER_NAME="mywebsite-app"

echo "Stopping and removing existing container..."
docker-compose stop $SERVICE_NAME || true
docker-compose rm -f $SERVICE_NAME || true

echo "Pulling new code..."
git pull

echo "Building new image for service '$SERVICE_NAME'..."
docker-compose build --no-cache $SERVICE_NAME

echo "Starting new container with latest image..."
docker-compose up -d --no-deps $SERVICE_NAME

echo "Pruning unused images..."
docker image prune -f

echo "✅ Update complete for '$CONTAINER_NAME'."
