#!/bin/bash

set -e

PEM_FILE="$1"
SERVER_HOST="$2"

REMOTE_USER="ubuntu"
REMOTE_DIR="/home/ubuntu/polypong"
SERVICE_NAME="polypong"

if [ -z "$PEM_FILE" ] || [ -z "$SERVER_HOST" ]; then
    echo "Usage:"
    echo './deploy.sh "path/to/key.pem" your-server-host'
    exit 1
fi

if [ ! -f "$PEM_FILE" ]; then
    echo "❌ PEM file not found: $PEM_FILE"
    exit 1
fi

if [ ! -d "dist" ]; then
    echo "❌ dist directory does not exist."
    exit 1
fi

echo "🔨 Building project..."
npm run build

echo "📤 Uploading dist to server..."

scp -i "$PEM_FILE" \
    -r dist/* \
    "$REMOTE_USER@$SERVER_HOST:$REMOTE_DIR/"

echo "📦 Installing production dependencies on server..."

ssh -i "$PEM_FILE" \
    "$REMOTE_USER@$SERVER_HOST" \
    "cd $REMOTE_DIR && npm install --omit=dev"

echo "♻️ Restarting service..."

ssh -i "$PEM_FILE" \
    "$REMOTE_USER@$SERVER_HOST" \
    "sudo systemctl restart $SERVICE_NAME"

echo "🔍 Checking service..."

ssh -i "$PEM_FILE" \
    "$REMOTE_USER@$SERVER_HOST" \
    "sudo systemctl status $SERVICE_NAME --no-pager"

echo ""
echo "✅ Deployment completed successfully!"