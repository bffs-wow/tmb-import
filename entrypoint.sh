#!/bin/sh

# Exit immediately if a command exits with a non-zero status.
set -e

# Git configuration (optional, if you want to commit from within the container)
# git config --global user.email "your-email@example.com"
# git config --global user.name "Your Name"

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

# Run the main application
node src/app.js