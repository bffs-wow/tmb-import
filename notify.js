#!/usr/bin/env node
// notify.js — Send a Discord notification when a TMB import changed the data payload.
//
// Usage: node notify.js <newer.json> <previous.json>
//   newer.json    the freshly downloaded snapshot (temp/tmb-data.json)
//   previous.json the last committed snapshot (temp/previous.json)
//
// Exit codes:
//   0  — no data change (nothing sent) OR notification sent successfully
//   2  — data changed but the webhook could not be reached (after retries)
//
// Reads DISCORD_WEBHOOK_URL from the environment. If unset, notification is
// skipped (exit 0) — the pipeline must never fail because notifications are
// not configured.

const fs = require("fs");
const https = require("https");
const path = require("path");

const USER_AGENT = "tmb-import-notify/1.0";
const MAX_EMBED_FIELDS = 25;
const MAX_FIELD_CHARS = 1024;
const MAX_EMBED_CHARS = 6000;

const GUILD_HOME = "https://thatsmybis.com/22344/best-friends";

// ---------------------------------------------------------------------------
// Load the two snapshots

function readSnapshot(file) {
  const raw = fs.readFileSync(file, "utf8");
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error(`Cannot parse snapshot ${file}: ${e.message}`);
  }
  if (!Array.isArray(parsed.data)) {
    throw new Error(`Snapshot ${file} has no "data" array`);
  }
  return parsed.data;
}

function loadInputs() {
  const [newerPath, previousPath] = process.argv.slice(2);
  if (!newerPath || !previousPath) {
    console.error(
      "Usage: node notify.js <newer.json> <previous.json> (newer = freshly downloaded, previous = last committed)"
    );
    process.exit(2);
  }
  return {
    newer: readSnapshot(path.resolve(newerPath)),
    previous: readSnapshot(path.resolve(previousPath)),
    newerFile: newerPath,
    previousFile: previousPath,
  };
}

// ---------------------------------------------------------------------------
// Indexes

function indexBy(data, key) {
  const map = new Map();
  for (const item of data) {
    map.set(item[key], item);
  }
  return map;
}

function itemKey(item) {
  return `${item.item_id}|${item.is_heroic || 0}`;
}

// ---------------------------------------------------------------------------
// Diff — new received loot (the headline)

function diffReceived(prev, next) {
  const has = new Set(prev.map(itemKey));
  return next.filter((item) => !has.has(itemKey(item)));
}

// ---------------------------------------------------------------------------
// Diff — character metadata changes

const META_FIELDS = [
  ["level", "level"],
  ["class", "class"],
  ["spec", "spec"],
  ["archetype", "archetype"],
  ["rank", "rank"],
  ["raid_group_name", "raid group"],
  ["inactive_at", "status"],
];

function diffMeta(prev, next) {
  const changes = [];
  for (const [key, label] of META_FIELDS) {
    const before = prev[key] == null ? "" : String(prev[key]);
    const after = next[key] == null ? "" : String(next[key]);
    if (before !== after && (before !== "" || after !== "")) {
      changes.push({ label, before, after });
    }
  }
  return changes;
}

// ---------------------------------------------------------------------------
// Character link

function charLink(nextChar) {
  const { id, slug } = nextChar;
  const pathPart = id && slug ? `c/${id}/${encodeURIComponent(slug)}` : slug ? slug : id ? `c/${id}` : null;
  return pathPart ? `${GUILD_HOME}/${pathPart}` : GUILD_HOME;
}

// ---------------------------------------------------------------------------
// Build the embed

const RANK_COLORS = { guild_master: 0xe67e22, officer: 0xe74c3c };
const STATUS_LABELS = { inactive_at: "now inactive", rank: "rank", raid_group_name: "raid group" };

function statusLabel(change) {
  if (change.label === "rank") return `rank → ${change.after}`;
  if (change.label === "raid_group_name") return `raid group → ${change.after}`;
  if (change.label === "status") return change.after ? "now inactive" : "now active";
  return `${change.label} → ${change.after}`;
}

function buildDescription(diff) {
  const parts = [];
  const { newReceived, chars, wishlistChanged, metaChanged } = diff;
  if (newReceived.length) {
    parts.push(
      `**${newReceived.length}** new received item${newReceived.length === 1 ? "" : "s"} across **${chars}** character${
        chars === 1 ? "" : "s"
      }`
    );
  }
  if (wishlistChanged) {
    parts.push(`**${wishlistChanged}** wishlist item${wishlistChanged === 1 ? "" : "s"} changed`);
  }
  if (metaChanged.length) {
    parts.push(`**${metaChanged.length}** character update${metaChanged.length === 1 ? "" : "s"}`);
  }
  return "Data updated: " + parts.join(", ") + ".";
}

function buildEmbed(diff) {
  const { chars, newReceived, wishlistChanged, metaChanged } = diff;
  const embed = {
    color: newReceived.length ? 0x2ecc71 : 0x3498db,
    title: "🎉 TMB Import — new data",
    url: "https://bffs-wow.github.io/loot/",
    description: buildDescription(diff),
    fields: [],
    footer: { text: "Automated by tmb-import" },
    timestamp: new Date().toISOString(),
  };

  const addField = (name, value, inline = true) => {
    if (embed.fields.length >= MAX_EMBED_FIELDS) return;
    if (value.length > MAX_FIELD_CHARS) value = value.slice(0, MAX_FIELD_CHARS - 3) + "…";
    embed.fields.push({ name, value: value || "—", inline });
  };

  const grouped = new Map();
  for (const item of newReceived) {
    const cid = item.pivot && item.pivot.character_id;
    const list = grouped.get(cid) || [];
    list.push(item);
    grouped.set(cid, list);
  }

  for (const [cid, items] of grouped) {
    const c = diff.charsById.get(cid);
    const lines = items.map((it) => {
      const wowhead = `https://www.wowhead.com/mop-classic/item=${it.item_id}`;
      const label = `[${it.name}](${wowhead})`;
      const raid = it.pivot && it.pivot.raid_id ? `${GUILD_HOME}/raids/${it.pivot.raid_id}/${encodeURIComponent(it.raid_slug || "")}` : null;
      const raidText = raid ? ` · [${it.raid_name || "raid"}](${raid})` : it.raid_name ? ` · ${it.raid_name}` : "";
      const note = it.pivot && it.pivot.note ? ` — *${it.pivot.note}*` : "";
      return `• ${label}${raidText}${note}`;
    });
    const name = c ? (c.slug ? `[${c.name}](${charLink(c)})` : c.name) : `Character ${cid}`;
    addField(name, lines.join("\n"));
  }

  if (metaChanged.length) {
    const c = metaChanged[0].char;
    const name = c.slug ? `[${c.name}](${charLink(c)})` : c.name;
    const labels = metaChanged.map((m) => statusLabel(m.change)).join(", ");
    addField(`ℹ️ ${name}`, labels);
  }

  if (wishlistChanged > 0) {
    addField("📝 Wishlists", `${wishlistChanged} wishlist item${wishlistChanged === 1 ? "" : "s"} changed`, true);
  }

  if (embed.fields.length === 0) {
    addField("Summary", "No notable field-level changes in this import.");
  }

  return embed;
}

// ---------------------------------------------------------------------------
// Compute the full diff

function computeDiff(previous, newer) {
  const prevById = indexBy(previous, "id");
  const nextById = indexBy(newer, "id");

  const changed = [];
  let wishlistChanged = 0;

  for (const nextChar of newer) {
    const prevChar = prevById.get(nextChar.id);
    if (!prevChar) {
      changed.push({
        char: nextChar,
        change: { label: "new_member", before: "", after: nextChar.name },
      });
      continue;
    }

    const newLoot = diffReceived(prevChar.received || [], nextChar.received || []);
    if (newLoot.length) {
      changed.push({ char: nextChar, change: { label: "received", items: newLoot } });
    }

    const meta = diffMeta(prevChar, nextChar);
    for (const m of meta) changed.push({ char: nextChar, change: m });

    const prevWish = (prevChar.wishlist || []).map(itemKey).sort();
    const nextWish = (nextChar.wishlist || []).map(itemKey).sort();
    if (prevWish.join("|") !== nextWish.join("|")) wishlistChanged += 1;
  }

  for (const prevChar of previous) {
    if (!nextById.has(prevChar.id)) {
      changed.push({
        char: prevChar,
        change: { label: "gquit", before: prevChar.name, after: "" },
      });
    }
  }

  const newReceived = changed.filter((c) => c.change.label === "received").flatMap((c) => c.change.items);
  const metaChanged = changed.filter((c) => ["level", "class", "spec", "archetype", "rank", "raid_group_name", "status"].includes(c.change.label));

  return {
    chars: new Set(changed.map((c) => c.char.id)).size,
    newReceived,
    wishlistChanged,
    metaChanged,
    charsById: nextById,
    changed,
  };
}

// ---------------------------------------------------------------------------
// Send the notification

function postWebhook(url, payload) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const body = JSON.stringify(payload);
    const req = https.request(
      {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
          "User-Agent": USER_AGENT,
        },
      },
      (res) => {
        let data = "";
        res.on("data", (d) => (data += d));
        res.on("end", () => {
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(data);
          else reject(new Error(`Discord returned ${res.statusCode}: ${data.slice(0, 200)}`));
        });
      }
    );
    req.on("error", reject);
    req.setTimeout(15000, () => req.destroy(new Error("timeout")));
    req.write(body);
    req.end();
  });
}

async function sendWithRetry(url, payload, attempts = 3) {
  let lastErr;
  for (let i = 1; i <= attempts; i++) {
    try {
      await postWebhook(url, payload);
      console.log(`✅ Discord notification sent (attempt ${i}).`);
      return;
    } catch (err) {
      lastErr = err;
      console.error(`⚠️  Webhook attempt ${i}/${attempts} failed: ${err.message}`);
      if (i < attempts) await new Promise((r) => setTimeout(r, 2000 * i));
    }
  }
  throw lastErr;
}

// ---------------------------------------------------------------------------

async function main() {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  const { newer, previous, newerFile, previousFile } = loadInputs();
  const diff = computeDiff(previous, newer);

  if (!webhookUrl && !process.env.DUMP_EMBED) {
    console.log("ℹ️  DISCORD_WEBHOOK_URL not set — skipping notification.");
    process.exit(0);
  }

  const changedCount =
    diff.newReceived.length + diff.metaChanged.length + (diff.wishlistChanged ? 1 : 0) + (diff.chars ? 1 : 0);

  if (!changedCount) {
    console.log(`ℹ️  No data change between ${previousFile} and ${newerFile} — no notification.`);
    process.exit(0);
  }

  console.log(
    `📊 Data changed: ${diff.newReceived.length} new received item(s), ${diff.wishlistChanged} wishlist changed, ${diff.metaChanged.length} meta change(s).`
  );

  const embed = buildEmbed(diff);
  if (process.env.DUMP_EMBED) {
    console.log("--- embed JSON ---");
    console.log(JSON.stringify({ embeds: [embed] }, null, 2));
    if (!webhookUrl) {
      console.log("ℹ️  DISCORD_WEBHOOK_URL not set — embed dumped, skipping notification.");
      process.exit(0);
    }
  }
  try {
    await sendWithRetry(webhookUrl, { embeds: [embed] });
    process.exit(0);
  } catch (err) {
    console.error(`❌ Failed to send Discord notification after retries: ${err.message}`);
    process.exit(2);
  }
}

main().catch((err) => {
  console.error(`❌ notify.js error: ${err.message}`);
  process.exit(2);
});