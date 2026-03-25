# Active Context: TMB Import Dockerization

## Current work focus:

- Completed the dockerization of the `tmb-import` application.
- Migrated configuration from `.env` to `config.yaml`.
- Replaced the Windows `task.bat` with a `entrypoint.sh` script.
- Provided documentation for setting up cron jobs on Ubuntu.

## Recent changes:

- **`Dockerfile` created:** Defines the Node.js 18 alpine environment, installs `git` and `openssh-client`, copies application files, installs dependencies, creates a `temp` directory, and sets `entrypoint.sh` as the command.
- **`docker-compose.yml` created:** Defines the `tmb-import` service, builds from the local Dockerfile, and mounts `config.yaml`, `repo`, and `temp` directories.
- **`config.example.yaml` created:** Provides a template for sensitive configuration values (`DISCORD_TOKEN`, `EXPORT_DATA_URL`, `EXPORT_ITEMS_URL`).
- **`.gitignore` updated:** Added `config.yaml` to prevent committing sensitive configuration.
- **`src/app.js` modified:** Updated to use `js-yaml` to read configuration from `config.yaml` instead of `process.env`.
- **`entrypoint.sh` created:** This script now handles the Git operations (clone/pull `loot.git`, checkout `gh-pages`), copies `tmb-data.json` and `tmb-items.csv` (if enabled) to the `repo` directory, commits and pushes changes, and then runs `node src/app.js`.
- **`CRON_JOB_README.md` created:** Provides detailed instructions for setting up cron jobs on Ubuntu to run the Docker Compose service, including cron syntax and Git authentication tips.

## Next steps:

- User to review the provided Docker setup and documentation.
- User to implement the cron job and `config.yaml` on their Ubuntu server.
- Consider implementing a `healthcheck` in `docker-compose.yml` if continuous monitoring is desired.
- Further refine Git authentication in `entrypoint.sh` if more specific requirements arise (e.g., dedicated SSH key for the container).

## Active decisions and considerations:

- **Local Docker build:** Decided to recommend cloning the repository and building the Docker image locally on the Ubuntu server for simplicity in a homelab environment.
- **Sensitive config handling:** `config.yaml` is `.gitignore`d, and `config.example.yaml` serves as documentation.
- **Breaking changes with `npm audit fix --force`:** Advised against running `npm audit fix --force` due to potential breaking changes with `puppeteer` that are outside the scope of the current dockerization task.

## Important patterns and preferences:

- **Docker Compose for multi-service management:** Even for a single service, `docker-compose.yml` provides a clear and declarative way to define the service.
- **Entrypoint script for complex container startup:** Using `entrypoint.sh` allows for pre-application commands (like Git operations) to be executed before the main Node.js application starts.
- **YAML for configuration:** Chosen for its human-readability and widespread use in containerized environments.

## Learnings and project insights:

- The original `task.bat` contained both application execution and Git operations, which were successfully separated and adapted for the Docker environment.
- Windows Scheduled Task scheduling required careful translation to cron syntax for accuracy. Missing the `8H` in `Duration` for the first trigger.
- Git authentication within a Docker container needs careful consideration (SSH key mounting vs. PAT).
