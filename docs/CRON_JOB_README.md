# Cron Job Setup for Ubuntu

This document outlines how to set up a cron job on an Ubuntu server to run the `tmb-import` Docker service at regular intervals, replacing the functionality of the Windows Scheduled Task.

## Prerequisites

- Docker and Docker Compose installed on your Ubuntu server.
- The `tmb-import` repository cloned to your server, e.g., in `/opt/tmb-import`.
- A `config.yaml` file created in the root of the `tmb-import` directory with your sensitive configuration values (Discord token, export URLs). **Remember to never commit `config.yaml` to your Git repository.**

## 1. Create `config.yaml`

Copy `config.example.yaml` to `config.yaml` and fill in your actual values:

```bash
cp /opt/tmb-import/config.example.yaml /opt/tmb-import/config.yaml
nano /opt/tmb-import/config.yaml
```

## 2. Build the Docker Image

Navigate to the `tmb-import` directory and build the Docker image:

```bash
cd /opt/tmb-import
docker compose build
```

## 3. Set up Git Authentication (if needed)

If your Git repository for `loot.git` is private or requires authentication for pushing, you have a few options:

- **SSH Keys (Recommended):**
  1.  Generate an SSH key pair on your Ubuntu server if you don't have one.
  2.  Add the public key to your GitHub account.
  3.  Mount your SSH private key into the Docker container. In `docker-compose.yml`, uncomment and configure the `volumes` and `environment` sections under `tmb-import` service to mount your SSH private key.

  ```yaml
  # Example in docker-compose.yml
  services:
    tmb-import:
      # ... other configurations
      environment:
        - GIT_SSH_COMMAND="ssh -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no -i /app/ssh_keys/id_rsa"
      volumes:
        - ~/.ssh:/app/ssh_keys:ro # Mount your SSH keys from your host machine (adjust path as needed)
  ```

- **HTTPS with Personal Access Token:**
  - You can embed a GitHub Personal Access Token (PAT) in the Git remote URL (e.g., `https://<YOUR_PAT>@github.com/bffs-wow/loot.git`). This is generally less secure than SSH keys.

## 4. Schedule with Cron

The original Windows Scheduled Task had two triggers:

- Every 15 minutes between 4:00 PM and 12:00 AM (midnight) on Tuesdays and Thursdays.
- Every 2 hours between 10:00 AM and 12:00 AM (midnight) daily.

To replicate this with cron, you'll need to create entries in your user's crontab. Open your crontab for editing:

```bash
crontab -e
```

Add the following lines to the crontab. Replace `/opt/tmb-import` with the actual path to your repository:

```cron
# Run every 15 minutes on Tuesdays and Thursdays between 4 PM and 11:45 PM
*/15 16-23 * * Tue,Thu /usr/local/bin/docker compose -f /opt/tmb-import/docker-compose.yml run --rm tmb-import

# Run every 2 hours daily between 10 AM and 11 PM
0 */2 10-23 * * * /usr/local/bin/docker compose -f /opt/tmb-import/docker-compose.yml run --rm tmb-import
```

**Explanation of Cron Syntax:**

A cron entry has five time fields followed by the command to execute:

`minute hour day_of_month month day_of_week command`

- `*`: Any value
- `*/N`: Every N units
- `A-B`: Range of values
- `A,B,C`: List of values

**Important Notes:**

- `--rm`: This flag will remove the container after it exits, keeping your system clean.
- Ensure the `docker compose` command is executable from your cron environment. You can find its path with `which docker compose`.
- The `docker compose` command should be run from the directory containing `docker-compose.yml`, or you can specify the `-f` flag as shown above.
- Cron jobs run with a minimal environment. If `docker compose` is not in the default PATH for cron, use its absolute path (e.g., `/usr/local/bin/docker compose`).
- Verify that the user under which the cron job runs has permissions to execute `docker compose` commands. You might need to add the user to the `docker` group: `sudo usermod -aG docker $USER` and then log out and back in.

After saving the crontab, the cron jobs will be scheduled and should run automatically at the specified times.
