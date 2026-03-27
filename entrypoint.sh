#!/bin/sh
set -e

# 1. Clean up ANY leftover lock files from previous crashes
# These are the specific files causing your "Profile in use" error
echo "🧹 Cleaning up Chromium lock files..."
rm -f /app/user_data/SingletonLock
rm -f /app/user_data/SingletonCookie
rm -f /app/user_data/SingletonSocket

# 2. Prevent overlapping runs (The Lockfile check)
LOCKFILE="/app/temp/tmb-import.lock"
if [ -f "$LOCKFILE" ]; then
    echo "⚠️ Another import is already running (Lockfile exists). Exiting."
    exit 0
fi

touch "$LOCKFILE"
# Ensure we remove our own lockfile even if the script fails
trap 'rm -f "$LOCKFILE"; exit' INT TERM EXIT

# 3. Run the App
node src/app.js

# --- Extract Git Config from YAML ---
# This looks for the key, grabs the part between double quotes
GIT_EMAIL=$(grep "GIT_USER_EMAIL:" config.yaml | cut -d '"' -f 2)
GIT_NAME=$(grep "GIT_USER_NAME:" config.yaml | cut -d '"' -f 2)

# Apply the Git configuration extracted from YAML
echo "Setting Git identity to: $GIT_NAME <$GIT_EMAIL>"
git config --global user.email "$GIT_EMAIL"
git config --global user.name "$GIT_NAME"

# Define the repo directory
REPO_DIR="repo"

# Clone the site github pages repo (or pull if it exists)
if [ -d "$REPO_DIR" ]; then
  echo "Pulling existing repository..."
  git -C "$REPO_DIR" pull
else
  echo "Cloning repository..."
  git clone https://github.com/bffs-wow/loot.git "$REPO_DIR"
fi

cd "$REPO_DIR"
git checkout gh-pages

# Copy the downloaded data into the repo
cp ../temp/tmb-data.json assets/tmb-data.json

# Uncomment the below to copy the items CSV if needed
# cp ../temp/tmb-items.csv assets/tmb-items.csv

# Commit & push
git add .
git commit -m "Automated tmb data import"
git push origin
