# Product Context: TMB Import

## Why this project exists:

The `tmb-import` application automates the process of extracting data from "That's My Bis" (TMB) and integrating it into a Git-managed repository. This is crucial for maintaining an up-to-date dataset for external applications, such as GitHub Pages sites that display loot or other related information.

## Problems it solves:

- **Manual Data Extraction:** Eliminates the need for manual data downloads from TMB, saving time and reducing human error.
- **Data Synchronization:** Ensures that the data consumed by external applications is always current with the latest TMB information.
- **Version Control for Data:** Integrates the data into a Git repository, providing a history of changes, easy rollbacks, and collaborative opportunities.
- **Platform Dependency:** Addresses the dependency on a Windows Scheduled Task by providing a Docker-based solution for Linux environments.

## How it should work:

1.  The application logs into TMB (via Discord authentication using a provided token).
2.  It navigates to specified data export URLs.
3.  It downloads JSON data and/or CSV item data.
4.  This downloaded data is then copied into a local Git repository.
5.  The changes in the Git repository are committed and pushed to a remote (e.g., GitHub Pages).

## User experience goals:

- **Automated and Hands-Off:** The primary goal is for the entire process to run without manual intervention after initial setup.
- **Reliable Data Updates:** Users (or consuming applications) should be able to rely on the Git repository always containing the most recent TMB data.
- **Easy Deployment:** The Docker-based solution should make deployment and management straightforward on an Ubuntu server.
