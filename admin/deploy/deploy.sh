#!/usr/bin/env bash
# ── Deploy script for WS-VISION ────────────────────────────────────────
# Builds and deploys the admin control panel using Docker. This works on
# Windows machines with Docker Desktop (e.g. WS-VISION running Win Pro).
# No .NET SDK or Node.js required on the host — Docker handles all builds.
#
# Usage:
#   bash deploy/deploy.sh              # build + run
#   bash deploy/deploy.sh --build-only # build image only, don't run
#   bash deploy/deploy.sh --stop       # stop and remove the container
#
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
IMAGE_NAME="admin-panel"
CONTAINER_NAME="admin"
HOST_PORT="${ADMIN_PORT:-8443}"
DATA_DIR="${ADMIN_DATA_DIR:-/opt/admin/data}"

# ── Parse args ────────────────────────────────────────────────────────
BUILD_ONLY=false
STOP_ONLY=false
for arg in "$@"; do
  case "$arg" in
    --build-only) BUILD_ONLY=true ;;
    --stop)       STOP_ONLY=true ;;
  esac
done

# ── Stop ──────────────────────────────────────────────────────────────
if [ "$STOP_ONLY" = true ]; then
  echo "▶ Stopping container '$CONTAINER_NAME'..."
  docker rm -f "$CONTAINER_NAME" 2>/dev/null || true
  echo "✅ Container stopped."
  exit 0
fi

# ── Build ─────────────────────────────────────────────────────────────
echo "▶ Building Docker image '$IMAGE_NAME'..."
cd "$PROJECT_DIR"
docker build -t "$IMAGE_NAME" .

if [ "$BUILD_ONLY" = true ]; then
  echo "✅ Image built: $IMAGE_NAME"
  echo "   Run with: docker run -d -p 8443:8443 -v $DATA_DIR:/app/data $IMAGE_NAME"
  exit 0
fi

# ── Run ───────────────────────────────────────────────────────────────
echo "▶ Preparing data directory: $DATA_DIR..."
mkdir -p "$DATA_DIR"

echo "▶ Stopping existing container (if any)..."
docker rm -f "$CONTAINER_NAME" 2>/dev/null || true

echo "▶ Starting container '$CONTAINER_NAME' on port $HOST_PORT..."
docker run -d \
  --name "$CONTAINER_NAME" \
  -p "$HOST_PORT:8443" \
  -p 8080:8080 \
  -v "$DATA_DIR:/app/data" \
  --restart unless-stopped \
  "$IMAGE_NAME"

# NOTE: 8080 is exposed for HTTP→HTTPS redirect. You can omit it if all
# traffic comes in on 8443 directly.

echo ""
echo "✅ Done! The admin service is running on port $HOST_PORT."
echo "   Health check: curl -k https://ws-vision:$HOST_PORT/status"
echo "   Admin panel:  https://ws-vision:$HOST_PORT/login"
echo "   (use -k / accept the self-signed cert warning in your browser)"
echo ""
echo "⚠  To configure OAuth credentials, pass env vars or use --env-file:"
echo "   docker stop $CONTAINER_NAME && docker rm $CONTAINER_NAME"
echo "   docker run -d --name $CONTAINER_NAME -p $HOST_PORT:8080 \\"
echo "     -v $DATA_DIR:/app/data \\"
echo "     --env-file deploy/admin.env \\"
echo "     --restart unless-stopped \\"
echo "     $IMAGE_NAME"