#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# Define the service name from your docker-compose.yaml
SERVICE_NAME="app"
CONTAINER_NAME="mywebsite-app"

echo "Building new image for service '$SERVICE_NAME'..."
docker-compose build $SERVICE_NAME

echo "Re-creating container '$CONTAINER_NAME' with the new image..."
# --no-deps is crucial. It ensures we only restart 'app' 
# and not 'nginx' (which depends on it) or 'db'.
# 'up' will detect the new image and re-create the container.
docker-compose up -d --no-deps $SERVICE_NAME

echo "Update complete for '$CONTAINER_NAME'."

# Optional: Clean up old, dangling images left from the build
echo "Cleaning up dangling images..."
docker image prune -f

echo "Done."