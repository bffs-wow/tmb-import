# Technical Context: TMB Import Dockerization

## Technologies Used:

- **Node.js (18-alpine):** The runtime environment for the `tmb-import` application.
- **Puppeteer:** A Node library which provides a high-level API to control Chrome or Chromium over the DevTools Protocol. Used for web scraping TMB data.
- **Docker:** Containerization platform for packaging the application and its dependencies.
- **Docker Compose:** Tool for defining and running multi-container Docker applications. Used here to manage the single `tmb-import` service.
- **`js-yaml`:** A YAML parser/writer for JavaScript, used to read configuration from `config.yaml`.
- **`git`:** Version control system, used for cloning, pulling, committing, and pushing data to the `loot.git` repository.
- **`openssh-client`:** Required in the Docker image for SSH-based Git authentication.
- **Cron:** The Unix/Linux job scheduler, used for automating the execution of the Docker Compose service.

## Development Setup:

- **Operating System:** Primary deployment target is Ubuntu. Development environment may vary (e.g., Windows with WSL2 or direct Linux).
- **IDE:** Visual Studio Code (as inferred from environment details).
- **Dependencies:** Managed via `package.json` and `npm`.
- **Configuration:** `config.yaml` for application-specific settings; `.gitignore` for excluding sensitive data.

## Technical Constraints:

- **Puppeteer Headless Mode:** Puppeteer runs in headless mode within the Docker container, meaning no graphical browser interface is displayed.
- **Discord Authentication:** Relies on a Discord token for TMB login, which is sensitive and must be handled securely.
- **Git Authentication:** Pushing to GitHub (e.g., GitHub Pages) from within the Docker container requires proper authentication (SSH keys or PAT).
- **Network Access:** The container needs outbound network access to Discord, ThatsMyBis.com, and GitHub.
- **File System Permissions:** The Docker container needs appropriate permissions to read `config.yaml` and to read/write to the mounted `repo` and `temp` volumes.

## Dependencies:

- `puppeteer`
- `dotenv` (replaced by `js-yaml` for configuration, but `dotenv` was in original `package.json`)
- `js-yaml` (new dependency for YAML parsing)

## Tool Usage Patterns:

- **`docker build`:** Used to build the Docker image from the `Dockerfile`.
- **`docker compose up` / `docker compose run`:** Used to manage and execute the `tmb-import` service.
- **`npm install`:** Used within the Dockerfile to install Node.js dependencies.
- **`git` commands:** Used extensively in `entrypoint.sh` for repository management.
- **`cp` (copy) command:** Used in `entrypoint.sh` to move generated data.
- **`crontab -e`:** Used on the host to schedule the Docker Compose command.
