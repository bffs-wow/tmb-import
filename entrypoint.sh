#!/bin/sh
LOCKFILE="/app/temp/tmb.lock"

# Check if lockfile exists
if [ -f "$LOCKFILE" ]; then
  echo "⚠️ Another import is already running. Exiting to avoid profile conflict."
  exit 0
fi

# Create the lockfile
touch "$LOCKFILE"

# Ensure the lockfile is deleted even if the script crashes
trap 'rm -f "$LOCKFILE"; exit' INT TERM EXIT

# Exit immediately if a command exits with a non-zero status.
set -e

# Run the main application (Puppeteer/Node)
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
