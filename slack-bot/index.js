#!/usr/bin/env node
/**
 * mx-workflow Slack Bot Orchestrator
 * Listens for build instructions in Slack → runs Claude Code + mx-workflow
 *
 * Two modes:
 *   --auto: Fire-and-forget (runs full pipeline autonomously)
 *   default: Conversational — chat naturally, build when ready, review phases interactively
 */

import { App } from "@slack/bolt";
import { runner, resolveProject, slugifyInstruction, createProjectDir } from "./runner.js";
import { createSession, findSessionByThread, loadActiveSessions } from "./session.js";
import { startConversation, handleReply } from "./interactive.js";
import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, ".env") });

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

const BUILDS_CHANNEL = process.env.SLACK_BUILDS_CHANNEL || "builds";

// ── Load persisted sessions on startup ───────────────────────────────────────

loadActiveSessions();

// ── Message handler ──────────────────────────────────────────────────────────

app.message(async ({ message, client, say }) => {
  if (message.subtype) return;
  if (message.bot_id) return;

  // ── Thread reply routing: check if this is a reply to an active session ──
  if (message.thread_ts && message.thread_ts !== message.ts) {
    const session = findSessionByThread(message.channel, message.thread_ts);
    if (session) {
      if (session.userId && session.userId !== message.user) {
        await client.chat.postMessage({
          channel: message.channel,
          thread_ts: message.thread_ts,
          text: `_This build session belongs to <@${session.userId}>. Only they can approve or provide feedback._`,
        });
        return;
      }
      await handleReply({ session, text: message.text, client });
      return;
    }
  }

  // ── New build request: channel / mention check ──
  const channelInfo = await client.conversations
    .info({ channel: message.channel })
    .catch(() => null);
  const channelName = channelInfo?.channel?.name;

  const isBotMentioned = message.text?.includes(
    `<@${process.env.SLACK_BOT_USER_ID}>`
  );
  const isBuildsChannel = channelName === BUILDS_CHANNEL;

  if (!isBuildsChannel && !isBotMentioned) return;

  const instruction = message.text.replace(/<@[A-Z0-9]+>/g, "").trim();

  if (!instruction || instruction.length < 5) {
    await say({
      text: "I need an instruction. Try: _Build a Stripe subscription API_",
      thread_ts: message.ts,
    });
    return;
  }

  // ── Dispatch: --auto → fire-and-forget, otherwise → interactive ──
  if (/--auto\b/i.test(instruction)) {
    await handleAutoRequest({ instruction, message, client, say });
  } else {
    await startNewConversation({
      instruction,
      threadTs: message.ts,
      channel: message.channel,
      userId: message.user,
      client,
    });
  }
});

// ── Slash command: /build ────────────────────────────────────────────────────

app.command("/build", async ({ command, ack, client, respond }) => {
  await ack();
  const instruction = command.text?.trim();

  if (!instruction) {
    await respond({
      text: "Usage: `/build <what to build>`\nExample: `/build a Stripe subscription API for a SaaS boilerplate`",
    });
    return;
  }

  if (/--auto\b/i.test(instruction)) {
    await handleAutoRequest({
      instruction,
      message: { ts: null, channel: command.channel_id },
      client,
      say: respond,
      userId: command.user_id,
    });
  } else {
    // Slash commands don't create a visible message, so post one to anchor the thread
    const initMsg = await client.chat.postMessage({
      channel: command.channel_id,
      text: `*Build requested by <@${command.user_id}>*\n> ${instruction}`,
    });

    await startNewConversation({
      instruction,
      threadTs: initMsg.ts,
      channel: command.channel_id,
      userId: command.user_id,
      client,
    });
  }
});

// ── Conversation session creation ────────────────────────────────────────────

async function startNewConversation({ instruction, threadTs, channel, userId, client }) {
  const resolved = resolveProject(instruction);

  if (resolved.error) {
    await client.chat.postMessage({
      channel,
      thread_ts: threadTs,
      text: resolved.error,
    });
    return;
  }

  const sessionId = crypto.randomBytes(4).toString("hex");
  const workDir = process.env.MX_WORK_DIR || path.join(process.env.HOME, "builds");
  let sessionDir;

  if (resolved.isNewProject) {
    const dirName = slugifyInstruction(resolved.instruction, sessionId);
    sessionDir = createProjectDir(workDir, dirName);
  } else {
    sessionDir = resolved.projectPath;
  }

  if (resolved.warning) {
    await client.chat.postMessage({
      channel,
      thread_ts: threadTs,
      text: `_${resolved.warning}_`,
    });
  }

  const session = createSession({
    id: sessionId,
    channel,
    threadTs,
    userId,
    instruction: resolved.instruction,
    projectPath: resolved.projectPath,
    projectName: resolved.projectName,
    isNewProject: resolved.isNewProject,
    sessionDir,
  });

  // Send the first message through the conversation handler — no build triggered yet
  await startConversation({ session, firstMessage: resolved.instruction, client });
}

// ── Auto mode (original fire-and-forget behavior) ───────────────────────────

async function handleAutoRequest({ instruction, message, client, say, userId }) {
  const threadTs = message.ts;
  const channel = message.channel;

  await client.chat.postMessage({
    channel,
    thread_ts: threadTs,
    text: `*Build started (auto mode)*\n> ${instruction}\n\nSpinning up Claude Code + mx-workflow...`,
  });

  const logMsg = await client.chat.postMessage({
    channel,
    thread_ts: threadTs,
    text: "*Build log:*\n```\nInitializing...\n```",
  });

  let logBuffer = [];
  const MAX_LOG_LINES = 40;

  async function flushLog() {
    const visibleLines = logBuffer.slice(-MAX_LOG_LINES);
    const text = "*Build log:*\n```\n" + visibleLines.join("\n") + "\n```";
    await client.chat
      .update({ channel, ts: logMsg.ts, text })
      .catch(() => {});
  }

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

  if (flushTimer) clearTimeout(flushTimer);
  await flushLog();

  const prLine = result.prUrl ? `\n*PR:* ${result.prUrl}` : "";
  const branchLine = result.branch ? `\n*Branch:* \`${result.branch}\`` : "";

  await client.chat.postMessage({
    channel,
    thread_ts: threadTs,
    text: `*Build complete!*${branchLine}${prLine}\n\n_Session: \`${result.sessionId}\`_`,
  });
}

// ── Start ────────────────────────────────────────────────────────────────────

(async () => {
  await app.start();
  console.log("mx-workflow Slack bot is running");
  console.log(`  Listening in #${BUILDS_CHANNEL} and for @mentions`);
  console.log(`  Interactive mode: enabled (use --auto for fire-and-forget)`);
})();
