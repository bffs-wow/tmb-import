# Webhook URL ships via environment, not config.yaml

The Discord webhook URL is supplied to the container through the environment
(`DISCORD_WEBHOOK_URL`, per the homelab `.env` convention used by diun), not
through `config.yaml`. `config.yaml` already holds the Discord login token and
export URLs, so this split is about blast radius: the webhook URL is only ever
necessary for the post-push notification step, and keeping it in the host
`.env` means it is never read by the scraper and never touched by app code
that doesn't need it. Absent the variable, the pipeline simply skips
notification.