#!/usr/bin/env bash
# =============================================================================
# Quick migrate: Export this server's data and transfer to another machine
# Usage: ./migrate.sh [target-host]
# =============================================================================
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="$APP_DIR/deploy/backup"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="gps-tracker-backup-${TIMESTAMP}.tar.gz"

echo "============================================="
echo "  GPS Tracker - Migration Tool"
echo "============================================="

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup Docker volume data
echo "1. Backing up application data..."
docker run --rm \
  -v gps-data:/data \
  -v "$BACKUP_DIR":/backup \
  alpine tar czf "/backup/data-${TIMESTAMP}.tar.gz" -C /data . 2>/dev/null || echo "   (no volume data yet)"

# Backup .env
echo "2. Backing up configuration..."
if [[ -f "$APP_DIR/.env" ]]; then
  cp "$APP_DIR/.env" "$BACKUP_DIR/env-${TIMESTAMP}.bak"
fi

# Create portable package
echo "3. Creating portable package..."
tar czf "$BACKUP_DIR/$BACKUP_FILE" \
  -C "$BACKUP_DIR" \
  "data-${TIMESTAMP}.tar.gz" \
  "env-${TIMESTAMP}.bak" \
  2>/dev/null || true

echo ""
echo "Backup created: $BACKUP_DIR/$BACKUP_FILE"

# Transfer to target if provided
TARGET_HOST="${1:-}"
if [[ -n "$TARGET_HOST" ]]; then
  echo ""
  echo "4. Transferring to $TARGET_HOST..."
  scp "$BACKUP_DIR/$BACKUP_FILE" "$TARGET_HOST:~/gps-tracker-backup.tar.gz"
  scp "$APP_DIR/deploy/setup-server.sh" "$TARGET_HOST:~/setup-server.sh"

  echo ""
  echo "On the target machine, run:"
  echo "  chmod +x ~/setup-server.sh && ~/setup-server.sh"
  echo "  # After setup, restore data:"
  echo "  tar xzf ~/gps-tracker-backup.tar.gz"
  echo "  docker run --rm -v gps-data:/data -v \$(pwd):/backup alpine sh -c 'tar xzf /backup/data-*.tar.gz -C /data'"
  echo "  cp env-*.bak ~/gps-tracker/.env"
  echo "  cd ~/gps-tracker && docker compose restart"
else
  echo ""
  echo "To transfer to another server:"
  echo "  scp $BACKUP_DIR/$BACKUP_FILE user@new-server:~/"
  echo "  scp $APP_DIR/deploy/setup-server.sh user@new-server:~/"
  echo ""
  echo "Then on the new server:"
  echo "  chmod +x ~/setup-server.sh && ~/setup-server.sh"
fi

echo ""
echo "Done!"
