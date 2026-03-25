# Project Brief: TMB Import Dockerization

This project aims to dockerize an existing Node.js application (`tmb-import`) that currently runs as a Windows Scheduled Task. The goal is to enable deployment on an Ubuntu homelab server using Docker Compose and cron jobs for scheduling. The core application logic in `src/app.js` should remain unchanged, focusing primarily on environment and configuration migration.

## Core Requirements:

1.  **Dockerization:** Create a Docker image for the Node.js application and a `docker-compose.yml` file for service definition.
2.  **Configuration Migration:** Convert environment variables from a `.env` file to a `config.yaml` file, ensuring sensitive information is not committed to Git.
3.  **Scheduled Task Replacement:** Migrate from Windows Scheduled Task (`task.bat` and `TMB import.xml`) to a Linux cron job.
4.  **Git Operations within Container:** Ensure that the Git operations (cloning/pulling a data repository, committing, and pushing) are handled correctly within the Docker container.

## Goals:

- Provide a portable and reproducible deployment solution for the `tmb-import` application.
- Enhance maintainability by centralizing configuration in a `.yaml` file.
- Automate the data import and Git synchronization process on a Linux environment.
