#!/bin/sh
set -e

# Helper function to match the Node.js timestamp format
log() {
  # The -u flag forces UTC output
  echo "[$(date -u '+%Y-%m-%d %H:%M:%S')] $1"
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

# Always remove the repo directory to avoid corrupted state from previous runs
if [ -d "$REPO_DIR" ]; then
  log "🧹 Removing old repository directory to ensure a clean clone..."
  rm -rf "$REPO_DIR"
fi

log "🚚 Cloning repository..."
git clone https://github.com/bffs-wow/loot.git "$REPO_DIR"

cd "$REPO_DIR"
git checkout gh-pages

# Keep a copy of the previously committed snapshot for the diff/notification step
if [ -f assets/tmb-data.json ]; then
  log "📸 Saving previous snapshot for diffing..."
  cp assets/tmb-data.json ../temp/previous.json
fi

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

# Clean up repo directory after successful execution
cd ..
log "🧹 Cleaning up repository directory..."
rm -rf "$REPO_DIR"

# Notify Discord if the data payload changed (empty imports stay silent).
# The import already succeeded at this point — a notification failure must not
# fail the run, so don't let set -e abort us.
if [ -f temp/previous.json ] && [ -f temp/tmb-data.json ]; then
    log "🔔 Checking for data changes to notify about..."
    if node notify.js temp/tmb-data.json temp/previous.json; then
        :
    else
        log "⚠️ Notification step exited with an error (data push already succeeded)."
    fi
else
    log "ℹ️ No previous snapshot yet — skipping notification."
fi