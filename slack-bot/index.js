#!/usr/bin/env node
/**
 * mx-workflow Slack Bot Orchestrator
 * Listens for build instructions in Slack → runs Claude Code + mx-workflow
 * Reports verbose progress back to Slack in real time
 */

import { App } from "@slack/bolt";
import { runner } from "./runner.js";
import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, ".env") });

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

// ── Trigger: message in #builds channel or @mention anywhere ─────────────────

const BUILDS_CHANNEL = process.env.SLACK_BUILDS_CHANNEL || "builds";

// Handle messages in the #builds channel (no mention needed)
app.message(async ({ message, client, say }) => {
  if (message.subtype) return; // skip bot messages, edits, etc.
  if (message.bot_id) return;

  const channelInfo = await client.conversations
    .info({ channel: message.channel })
    .catch(() => null);
  const channelName = channelInfo?.channel?.name;

  const isBotMentioned = message.text?.includes(
    `<@${process.env.SLACK_BOT_USER_ID}>`
  );
  const isBuildsChannel = channelName === BUILDS_CHANNEL;

  if (!isBuildsChannel && !isBotMentioned) return;

  // Strip the bot mention if present
  const instruction = message.text.replace(/<@[A-Z0-9]+>/g, "").trim();

  if (!instruction || instruction.length < 5) {
    await say({
      text: "I need an instruction. Try: _Build a Stripe subscription API_",
      thread_ts: message.ts,
    });
    return;
  }

  await handleBuildRequest({ instruction, message, client, say });
});

// Handle slash command /build
app.command("/build", async ({ command, ack, client, respond }) => {
  await ack();
  const instruction = command.text?.trim();

  if (!instruction) {
    await respond({
      text: "Usage: `/build <what to build>`\nExample: `/build a Stripe subscription API for a SaaS boilerplate`",
    });
    return;
  }

  await handleBuildRequest({
    instruction,
    message: { ts: null, channel: command.channel_id },
    client,
    say: respond,
    userId: command.user_id,
  });
});

// ── Core handler ─────────────────────────────────────────────────────────────

async function handleBuildRequest({
  instruction,
  message,
  client,
  say,
  userId,
}) {
  const threadTs = message.ts;
  const channel = message.channel;

  // Confirmation
  await client.chat.postMessage({
    channel,
    thread_ts: threadTs,
    text: `*Build started*\n> ${instruction}\n\nSpinning up Claude Code + mx-workflow...`,
  });

  // Create a live log message we'll update as output streams in
  const logMsg = await client.chat.postMessage({
    channel,
    thread_ts: threadTs,
    text: "*Build log:*\n```\nInitializing...\n```",
  });

  let logBuffer = [];
  const MAX_LOG_LINES = 40; // Slack message size limit buffer

  // Update the log message periodically with latest output
  async function flushLog() {
    const visibleLines = logBuffer.slice(-MAX_LOG_LINES);
    const text =
      "*Build log:*\n```\n" + visibleLines.join("\n") + "\n```";
    await client.chat
      .update({
        channel,
        ts: logMsg.ts,
        text,
      })
      .catch(() => {}); // Don't crash on rate limits
  }

  // Debounced flush — update at most every 3s to avoid Slack rate limits
  let flushTimer = null;
  function scheduleFlush() {
    if (flushTimer) return;
    flushTimer = setTimeout(async () => {
      flushTimer = null;
      await flushLog();
    }, 3000);
  }

  function onOutput(line) {
    logBuffer.push(line);
    scheduleFlush();
  }

  // Run the build
  let result;
  try {
    result = await runner({
      instruction,
      onOutput,
      workDir: process.env.MX_WORK_DIR || path.join(process.env.HOME, "builds"),
    });
  } catch (err) {
    if (flushTimer) clearTimeout(flushTimer);
    await flushLog();

    await client.chat.postMessage({
      channel,
      thread_ts: threadTs,
      text: `*Build failed*\n\`\`\`\n${err.message}\n\`\`\``,
    });
    return;
  }

  // Final flush
  if (flushTimer) clearTimeout(flushTimer);
  await flushLog();

  // Success report
  const prLine = result.prUrl ? `\n*PR:* ${result.prUrl}` : "";
  const branchLine = result.branch
    ? `\n*Branch:* \`${result.branch}\``
    : "";

  await client.chat.postMessage({
    channel,
    thread_ts: threadTs,
    text: `*Build complete!*${branchLine}${prLine}\n\n_Session: \`${result.sessionId}\`_`,
  });
}

// ── Start ─────────────────────────────────────────────────────────────────────

(async () => {
  await app.start();
  console.log("mx-workflow Slack bot is running");
  console.log(`  Listening in #${BUILDS_CHANNEL} and for @mentions`);
})();
