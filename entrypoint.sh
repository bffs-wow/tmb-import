#!/bin/sh
set -e

# Helper function to match the Node.js timestamp format
log() {
  echo "[$(date '+%m/%d/%Y, %I:%M:%S %p')] $1"
}

# 1. Clean up ANY leftover lock files from previous crashes
log "🧹 Cleaning up Chromium lock files..."
rm -f /app/user_data/SingletonLock
rm -f /app/user_data/SingletonCookie
rm -f /app/user_data/SingletonSocket
log "🧹 Pruning Chromium cache to prevent protocol timeouts..."
# These folders are NOT needed for your login session but cause the 'Page.enable' hang
rm -rf /app/user_data/Default/Cache/*
rm -rf /app/user_data/Default/Code\ Cache/*
rm -rf /app/user_data/Default/Service\ Worker/*
rm -rf /app/user_data/Default/WebStorage/*

# 2. Prevent overlapping runs (The Lockfile check)
LOCKFILE="/app/temp/tmb-import.lock"
if [ -f "$LOCKFILE" ]; then
    log "⚠️ Another import is already running (Lockfile exists). Exiting."
    exit 0
fi

touch "$LOCKFILE"
# Ensure we remove our own lockfile even if the script fails
trap 'rm -f "$LOCKFILE"; exit' INT TERM EXIT

# 3. Run the App
node src/app.js

# --- Extract Git Config from YAML ---
GIT_EMAIL=$(grep "GIT_USER_EMAIL:" config.yaml | cut -d '"' -f 2)
GIT_NAME=$(grep "GIT_USER_NAME:" config.yaml | cut -d '"' -f 2)

# Apply the Git configuration extracted from YAML
log "👤 Setting Git identity to: $GIT_NAME <$GIT_EMAIL>"
git config --global user.email "$GIT_EMAIL"
git config --global user.name "$GIT_NAME"

# Define the repo directory
REPO_DIR="repo"

# Clone the site github pages repo (or pull if it exists)
if [ -d "$REPO_DIR" ]; then
  log "🔄 Pulling existing repository..."
  git -C "$REPO_DIR" pull
else
  log "🚚 Cloning repository..."
  git clone https://github.com/bffs-wow/loot.git "$REPO_DIR"
fi

cd "$REPO_DIR"
git checkout gh-pages

# Copy the downloaded data into the repo
log "📂 Copying data to assets..."
cp ../temp/tmb-data.json assets/tmb-data.json

# Commit & push
log "🚀 Committing and pushing to GitHub..."
git add .
# Added a quick check to avoid empty commits if nothing changed
if [ -n "$(git status --porcelain)" ]; then
    git commit -m "Automated tmb data import - $(date)"
    git push origin gh-pages
    log "✅ Push successful."
else
    log "ℹ️ No changes detected in data. Skipping commit."
fi