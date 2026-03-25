🛠 TMB-Import: Ubuntu Homelab Setup Guide
This guide covers the end-to-end setup for migrating the tmb-import task from a Windows environment to a headless Ubuntu OptiPlex server.

1. Initial Server Connection & Folder Setup

   Connect to your Dell OptiPlex and create the directory structure within your existing homelab folder.

Bash

# Connect to your server

ssh sean@arthur-server

# Create the directory structure

mkdir -p ~/homelab/tmb-import/repo ~/homelab/tmb-import/temp
cd ~/homelab/tmb-import

2. GitHub Authentication (SSH)

   Since the server needs to push loot data to GitHub, we use SSH keys for passwordless authentication.

Bash

# Generate a modern Ed25519 key (Press Enter for all prompts)

ssh-keygen -t ed25519 -C "sean-dell-server"

# Display the public key to add to GitHub Settings

cat ~/.ssh/id_ed25519.pub
Action Required: Copy the output and add it to GitHub > Settings > SSH and GPG keys.

3. Clone the Repositories

   We need both the tool itself and the repository where the data will be pushed.

Bash

# Clone the import tool into the current directory

git clone git@github.com:bffs-wow/tmb-import.git .

# Clone the loot destination repo into the 'repo' subfolder

git clone git@github.com:bffs-wow/loot.git repo

# Ensure permissions are correct for the 'sean' user

sudo chown -R sean:sean ~/homelab/tmb-import

4. Configuration (config.yaml)

   Create your configuration file. This file contains your Discord identity and Git signature.

Bash
nano config.yaml
Paste and edit the following:

YAML
GIT_USER_EMAIL: "your-email@example.com"
GIT_USER_NAME: "Sean Arthur (Server)"
DISCORD_TOKEN: "YOUR_DISCORD_TOKEN_HERE"
EXPORT_DATA_URL: "https://thatsmybis.com/22344/best-friends/export/characters-with-items/html"
EXPORT_ITEMS_URL: "https://thatsmybis.com/your-items-url-here"

5. Docker Environment

   Ensure your docker-compose.yml is optimized for the headless environment and SSH passthrough.

YAML
services:
tmb-import:
build: .
container_name: tmb-import
environment: - GIT_SSH_COMMAND=ssh -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no -i /app/ssh_keys/id_ed25519 - GIT_CONFIG_COUNT=1 - GIT_CONFIG_KEY_0=safe.directory - GIT_CONFIG_VALUE_0=/app/repo
volumes: - ./config.yaml:/app/config.yaml:ro - ./repo:/app/repo - ./temp:/app/temp - /home/sean/.ssh:/app/ssh_keys:ro

6. Build and Manual Test

   Always run a manual test before scheduling to ensure the Discord token injection and Git push are working.

Bash

# Force a clean build to include Chromium and Puppeteer fixes

docker compose build --no-cache

# Run the container manually

docker compose run --rm tmb-import

7. Scheduling with Crontab

   We schedule the task to run frequently during raid nights (Tue/Thu) and twice daily otherwise.

Bash
crontab -e
Add these lines at the bottom:

Code snippet

# TMB-Import: Every 15m (Tue/Thu 4PM-11:45PM)

_/15 16-23 _ \* 2,4 /usr/bin/docker compose -f /home/sean/homelab/tmb-import/docker-compose.yml run --rm tmb-import >> /home/sean/homelab/tmb-import/cron.log 2>&1

# TMB-Import: Every 2h (Daily 10AM-11PM)

0 10-23/2 \* \* \* /usr/bin/docker compose -f /home/sean/homelab/tmb-import/docker-compose.yml run --rm tmb-import >> /home/sean/homelab/tmb-import/cron.log 2>&1

8. Troubleshooting

   Logs: Check ~/homelab/tmb-import/cron.log for execution history.

Screenshots: If login fails, check ~/homelab/tmb-import/temp/error-debug.png to see what the browser saw.

Git Issues: Ensure the repo folder is not empty and contains a .git directory.
