#!/usr/bin/env bash
# =============================================================================
# Portable Server Setup Script
# Installs Coolify OR runs standalone Docker — works on any fresh Linux server
# =============================================================================
set -euo pipefail

REPO_URL="git@github.com:giuseppePintus/PositionControllerRecordItaliaGpsSystem.git"
APP_DIR="$HOME/gps-tracker"
BRANCH="${1:-main}"

echo "============================================="
echo "  GPS Tracker - Portable Server Setup"
echo "============================================="
echo ""

# -----------------------------------------------------------------------------
# 1. Check prerequisites
# -----------------------------------------------------------------------------
check_command() {
  if ! command -v "$1" &> /dev/null; then
    echo "⚠ $1 not found. Installing..."
    return 1
  fi
  echo "✓ $1 found"
  return 0
}

# Install Docker if missing
if ! check_command docker; then
  echo "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker "$USER"
  echo "✓ Docker installed. You may need to log out/in for group to take effect."
fi

# Install Docker Compose plugin if missing
if ! docker compose version &> /dev/null; then
  echo "Installing Docker Compose plugin..."
  sudo apt-get update && sudo apt-get install -y docker-compose-plugin
fi

# Install Git if missing
if ! check_command git; then
  sudo apt-get update && sudo apt-get install -y git
fi

echo ""

# -----------------------------------------------------------------------------
# 2. Choose deployment mode
# -----------------------------------------------------------------------------
echo "Choose deployment mode:"
echo "  1) Coolify (full PaaS with web UI, auto-deploy from GitHub)"
echo "  2) Standalone Docker Compose (lightweight, manual deploy)"
echo ""
read -rp "Enter choice [1/2] (default: 2): " DEPLOY_MODE
DEPLOY_MODE="${DEPLOY_MODE:-2}"

if [[ "$DEPLOY_MODE" == "1" ]]; then
  # -------------------------------------------------------------------------
  # COOLIFY SETUP
  # -------------------------------------------------------------------------
  echo ""
  echo "Installing Coolify..."
  curl -fsSL https://cdn.coollabs.io/coolify/install.sh | sudo bash

  echo ""
  echo "============================================="
  echo "  Coolify installed!"
  echo "============================================="
  echo ""
  echo "Next steps:"
  echo "  1. Open http://$(hostname -I | awk '{print $1}'):8000"
  echo "  2. Create your admin account"
  echo "  3. Add a new Resource → Docker Compose"
  echo "  4. Connect your GitHub repo: $REPO_URL"
  echo "  5. Set branch: $BRANCH"
  echo "  6. Add environment variables from .env.example"
  echo "  7. Deploy!"
  echo ""
  echo "Coolify will auto-deploy on every push to $BRANCH"
  echo "============================================="

else
  # -------------------------------------------------------------------------
  # STANDALONE DOCKER COMPOSE
  # -------------------------------------------------------------------------
  echo ""
  echo "Setting up standalone deployment..."

  # Clone or update repo
  if [[ -d "$APP_DIR" ]]; then
    echo "Updating existing installation..."
    cd "$APP_DIR"
    git fetch origin
    git checkout "$BRANCH"
    git pull origin "$BRANCH"
  else
    echo "Cloning repository..."
    git clone -b "$BRANCH" "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
  fi

  # Create .env if it doesn't exist
  if [[ ! -f .env ]]; then
    echo ""
    echo "Creating .env from template..."
    cp .env.example .env
    echo "⚠ IMPORTANT: Edit .env with your actual values:"
    echo "  nano $APP_DIR/.env"
    echo ""
    read -rp "Press Enter after editing .env (or Ctrl+C to edit later)..."
  fi

  # Build and start
  echo "Building and starting services..."
  docker compose build
  docker compose up -d

  echo ""
  echo "============================================="
  echo "  GPS Tracker is running!"
  echo "============================================="
  echo ""
  echo "  App:    http://$(hostname -I | awk '{print $1}'):3001"
  echo "  Logs:   docker compose -f $APP_DIR/docker-compose.yml logs -f"
  echo "  Stop:   docker compose -f $APP_DIR/docker-compose.yml down"
  echo "  Update: cd $APP_DIR && git pull && docker compose up -d --build"
  echo ""
fi

echo "Done!"
