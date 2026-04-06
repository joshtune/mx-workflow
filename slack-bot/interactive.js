/**
 * interactive.js
 * Conversation-driven build orchestrator.
 * Every message goes through Claude — Claude decides intent via structured markers.
 * Phase runners are triggered by markers, not regex classification.
 */

import { updateSession, completeSession, cancelSession, failSession, STATES } from "./session.js";
import { spawnClaude } from "./runner.js";
import {
  conversationSystemPrompt,
  buildConversationPrompt,
  parseConversationResponse,
  discoveryPrompt,
  inferredContextPrompt,
  prdPrompt,
  planPrompt,
  buildPrompt,
  parseDiscoveryOutput,
  parsePreflightOutput,
  parsePrdOutput,
  parsePlanOutput,
  parseBuildOutput,
} from "./phases.js";

// ── Slack helpers ────────────────────────────────────────────────────────────

async function postToThread(client, session, text) {
  await client.chat.postMessage({
    channel: session.channel,
    thread_ts: session.threadTs,
    text,
  });
}

function createLogStreamer(client, session) {
  let logBuffer = [];
  let logMsgTs = session.logMessageTs;
  let flushTimer = null;
  const MAX_LOG_LINES = 40;
  const FLUSH_INTERVAL_MS = 3000;

  async function ensureLogMessage() {
    if (logMsgTs) return;
    const msg = await client.chat.postMessage({
      channel: session.channel,
      thread_ts: session.threadTs,
      text: "*Build log:*\n```\nInitializing...\n```",
    });
    logMsgTs = msg.ts;
    updateSession(session.id, { logMessageTs: logMsgTs });
  }

  async function flush() {
    if (!logMsgTs || logBuffer.length === 0) return;
    const visibleLines = logBuffer.slice(-MAX_LOG_LINES);
    const text = "*Build log:*\n```\n" + visibleLines.join("\n") + "\n```";
    await client.chat
      .update({ channel: session.channel, ts: logMsgTs, text })
      .catch(() => {});
  }

  function scheduleFlush() {
    if (flushTimer) return;
    flushTimer = setTimeout(async () => {
      flushTimer = null;
      await flush();
    }, FLUSH_INTERVAL_MS);
  }

  function onOutput(line) {
    logBuffer.push(line);
    scheduleFlush();
  }

  async function stop() {
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = null;
    await flush();
  }

  return { ensureLogMessage, onOutput, stop };
}

function addToHistory(session, role, content) {
  const history = [...(session.history || []), { role, content }];
  updateSession(session.id, { history });
  // Update local reference too
  session.history = history;
}

// ── Entry point ──────────────────────────────────────────────────────────────

/**
 * Start a new conversation session. Sends the first message through the
 * conversation handler — no build is triggered yet.
 */
export async function startConversation({ session, firstMessage, client }) {
  await handleReply({ session, text: firstMessage, client });
}

// ── Unified conversation handler ─────────────────────────────────────────────

/**
 * Handle any user message in a session thread.
 * Routes through Claude with state-appropriate context. Claude decides intent.
 */
export async function handleReply({ session, text, client }) {
  // If a phase is currently running, just acknowledge
  const runningStates = new Set([
    STATES.DISCOVERY_RUNNING,
    STATES.PRD_RUNNING,
    STATES.PLAN_RUNNING,
    STATES.BUILD_RUNNING,
  ]);
  if (runningStates.has(session.state)) {
    await postToThread(client, session, `_Phase is still running — I'll let you know when it's ready for review._`);
    return;
  }

  // Add user message to history
  addToHistory(session, "user", text);

  // Build phase context based on current state
  const phaseContext = buildPhaseContext(session);

  // Build the conversation prompt
  const systemPrompt = conversationSystemPrompt(session.state, phaseContext);
  const prompt = buildConversationPrompt(systemPrompt, session.history, text);

  // Spawn Claude for the conversation turn
  try {
    const result = await spawnClaude({
      prompt,
      cwd: session.sessionDir,
      sessionId: session.id,
      projectName: session.projectName,
      onOutput: () => {}, // no live streaming for conversation turns
      logFile: session.build.logFile,
    });

    if (result.code !== 0) {
      await postToThread(client, session, `_Something went wrong. Try again?_`);
      return;
    }

    // Parse response for markers
    const parsed = parseConversationResponse(result.stdout);

    // Post the conversational response to Slack (markers stripped)
    if (parsed.text) {
      await postToThread(client, session, parsed.text);
      addToHistory(session, "assistant", parsed.text);
    }

    // Act on markers
    if (parsed.action) {
      await handleAction({ session, action: parsed.action, parsed, client });
    }
  } catch (err) {
    await postToThread(client, session, `_Error: ${err.message}_`);
  }
}

// ── Action handler ───────────────────────────────────────────────────────────

async function handleAction({ session, action, parsed, client }) {
  switch (action) {
    case "build_start": {
      const instruction = parsed.buildInstruction || session.instruction;
      updateSession(session.id, { instruction });
      await runDiscoveryPhase({ session, client });
      break;
    }

    case "advance":
      await advanceToNextPhase({ session, client });
      break;

    case "revise":
      await reviseCurrentPhase({ session, feedback: parsed.reviseFeedback, client });
      break;

    case "cancel":
      cancelSession(session.id);
      await postToThread(client, session, "*Build cancelled.*");
      break;
  }
}

async function advanceToNextPhase({ session, client }) {
  switch (session.state) {
    case STATES.DISCOVERY_PENDING:
      // User answered discovery questions — run inferred context
      await runPreflightPhase({ session, client });
      break;

    case STATES.PREFLIGHT_PENDING:
      // User confirmed context — run PRD
      await runPrdPhase({ session, client });
      break;

    case STATES.PRD_REVIEW:
      // User approved PRD — run plan
      await runPlanPhase({ session, client });
      break;

    case STATES.PLAN_REVIEW:
      // User approved plan — run build
      await runBuildPhase({ session, client });
      break;

    default:
      await postToThread(client, session, `_Nothing to advance — current state: ${session.state}_`);
  }
}

async function reviseCurrentPhase({ session, feedback, client }) {
  switch (session.state) {
    case STATES.PREFLIGHT_PENDING: {
      const combinedAnswers = [
        session.discovery.answers || "",
        `\nCorrections: ${feedback}`,
      ].join("\n");
      updateSession(session.id, {
        discovery: { ...session.discovery, answers: combinedAnswers },
      });
      await runPreflightPhase({ session, client });
      break;
    }

    case STATES.PRD_REVIEW: {
      const prd = { ...session.prd };
      prd.feedbackHistory = [...prd.feedbackHistory, feedback];
      updateSession(session.id, { prd });
      await runPrdPhase({ session: { ...session, prd }, client });
      break;
    }

    case STATES.PLAN_REVIEW: {
      const plan = { ...session.plan };
      plan.feedbackHistory = [...plan.feedbackHistory, feedback];
      updateSession(session.id, { plan });
      await runPlanPhase({ session: { ...session, plan }, client });
      break;
    }

    default:
      await postToThread(client, session, `_Nothing to revise in current state: ${session.state}_`);
  }
}

// ── Phase runners ────────────────────────────────────────────────────────────

async function runDiscoveryPhase({ session, client }) {
  updateSession(session.id, { state: STATES.DISCOVERY_RUNNING });

  const streamer = createLogStreamer(client, session);
  await streamer.ensureLogMessage();

  try {
    const prompt = discoveryPrompt(session.instruction, session.sessionDir);
    const result = await spawnClaude({
      prompt,
      cwd: session.sessionDir,
      sessionId: session.id,
      projectName: session.projectName,
      onOutput: streamer.onOutput,
      logFile: session.build.logFile,
    });
    await streamer.stop();

    if (result.code !== 0) {
      failSession(session.id);
      await postToThread(client, session, `*Discovery failed*\n\`\`\`\n${result.stderr.slice(-500)}\n\`\`\``);
      return;
    }

    const parsed = parseDiscoveryOutput(result.stdout);
    updateSession(session.id, {
      state: STATES.DISCOVERY_PENDING,
      discovery: { ...session.discovery, questions: parsed.questions },
    });

    const summaryMsg = `*Discovery Questions*\n\n${parsed.questions}`;
    await postToThread(client, session, summaryMsg);
    addToHistory(session, "assistant", summaryMsg);
  } catch (err) {
    failSession(session.id);
    await postToThread(client, session, `*Discovery failed*\n\`\`\`\n${err.message}\n\`\`\``);
  }
}

async function runPreflightPhase({ session, client }) {
  // Gather the user's latest answers from conversation history
  const recentUserMessages = (session.history || [])
    .filter((m) => m.role === "user")
    .slice(-5)
    .map((m) => m.content)
    .join("\n");

  const answers = session.discovery?.answers || recentUserMessages;
  updateSession(session.id, {
    discovery: { ...session.discovery, answers },
  });

  await postToThread(client, session, "_Inferring technical context..._");

  const streamer = createLogStreamer(client, session);

  try {
    const prompt = inferredContextPrompt(session.instruction, answers, session.sessionDir);
    const result = await spawnClaude({
      prompt,
      cwd: session.sessionDir,
      sessionId: session.id,
      projectName: session.projectName,
      onOutput: streamer.onOutput,
      logFile: session.build.logFile,
    });
    await streamer.stop();

    if (result.code !== 0) {
      failSession(session.id);
      await postToThread(client, session, `*Context inference failed*\n\`\`\`\n${result.stderr.slice(-500)}\n\`\`\``);
      return;
    }

    const parsed = parsePreflightOutput(result.stdout);
    updateSession(session.id, {
      state: STATES.PREFLIGHT_PENDING,
      discovery: { ...session.discovery, discoveryContext: parsed.discoveryContext },
    });

    const contextDisplay = parsed.discoveryContext || result.stdout.trim();
    const truncated = contextDisplay.length > 1500 ? contextDisplay.slice(0, 1500) + "\n..." : contextDisplay;
    const summaryMsg = `*Inferred Context*\n\`\`\`\n${truncated}\n\`\`\``;
    await postToThread(client, session, summaryMsg);
    addToHistory(session, "assistant", summaryMsg);
  } catch (err) {
    failSession(session.id);
    await postToThread(client, session, `*Context inference failed*\n\`\`\`\n${err.message}\n\`\`\``);
  }
}

async function runPrdPhase({ session, client }) {
  updateSession(session.id, { state: STATES.PRD_RUNNING });
  await postToThread(client, session, "*Generating PRD...*");

  const streamer = createLogStreamer(client, session);
  await streamer.ensureLogMessage();

  try {
    const discoveryContext =
      session.discovery?.discoveryContext ||
      session.discovery?.answers ||
      session.instruction;

    const prompt = prdPrompt(
      session.instruction,
      discoveryContext,
      session.prd?.feedbackHistory || []
    );

    const result = await spawnClaude({
      prompt,
      cwd: session.sessionDir,
      sessionId: session.id,
      projectName: session.projectName,
      onOutput: streamer.onOutput,
      logFile: session.build.logFile,
    });
    await streamer.stop();

    if (result.code !== 0) {
      failSession(session.id);
      await postToThread(client, session, `*PRD generation failed*\n\`\`\`\n${result.stderr.slice(-500)}\n\`\`\``);
      return;
    }

    const parsed = parsePrdOutput(result.stdout);

    updateSession(session.id, {
      state: STATES.PRD_REVIEW,
      prd: { ...session.prd, path: parsed.file, summary: parsed },
    });

    const mustList = parsed.mustList ? `\n\n*Must-haves:*\n${parsed.mustList}` : "";
    const summaryMsg = [
      `*PRD Generated*`,
      parsed.file ? `> File: \`${parsed.file}\`` : "",
      parsed.problem ? `> Problem: ${parsed.problem}` : "",
      parsed.solution ? `> Solution: ${parsed.solution}` : "",
      `> Scope: ${parsed.mustCount} must-haves, ${parsed.shouldCount} should-haves`,
      mustList,
    ]
      .filter(Boolean)
      .join("\n");

    await postToThread(client, session, summaryMsg);
    addToHistory(session, "assistant", summaryMsg);
  } catch (err) {
    failSession(session.id);
    await postToThread(client, session, `*PRD generation failed*\n\`\`\`\n${err.message}\n\`\`\``);
  }
}

async function runPlanPhase({ session, client }) {
  updateSession(session.id, { state: STATES.PLAN_RUNNING });
  await postToThread(client, session, "*Generating implementation plan...*");

  const streamer = createLogStreamer(client, session);
  await streamer.ensureLogMessage();

  try {
    const discoveryContext =
      session.discovery?.discoveryContext ||
      session.discovery?.answers ||
      session.instruction;

    const prdPath = session.prd?.path;
    if (!prdPath) {
      failSession(session.id);
      await postToThread(client, session, "*Plan generation failed — no PRD path found.*");
      return;
    }

    const prompt = planPrompt(
      session.instruction,
      prdPath,
      discoveryContext,
      session.plan?.feedbackHistory || []
    );

    const result = await spawnClaude({
      prompt,
      cwd: session.sessionDir,
      sessionId: session.id,
      projectName: session.projectName,
      onOutput: streamer.onOutput,
      logFile: session.build.logFile,
    });
    await streamer.stop();

    if (result.code !== 0) {
      failSession(session.id);
      await postToThread(client, session, `*Plan generation failed*\n\`\`\`\n${result.stderr.slice(-500)}\n\`\`\``);
      return;
    }

    const parsed = parsePlanOutput(result.stdout);

    updateSession(session.id, {
      state: STATES.PLAN_REVIEW,
      plan: { ...session.plan, path: parsed.file, summary: parsed, strategy: parsed.strategy },
    });

    const summaryMsg = [
      `*Plan Generated*`,
      parsed.file ? `> File: \`${parsed.file}\`` : "",
      parsed.summary ? `> Summary: ${parsed.summary}` : "",
      parsed.changes ? `> Changes: ${parsed.changes}` : "",
      parsed.newFiles ? `> New files: ${parsed.newFiles}` : "",
      parsed.tests ? `> Tests: ${parsed.tests}` : "",
      parsed.confidence ? `> Confidence: ${parsed.confidence}` : "",
      parsed.strategy ? `> Strategy: ${parsed.strategy}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    await postToThread(client, session, summaryMsg);
    addToHistory(session, "assistant", summaryMsg);
  } catch (err) {
    failSession(session.id);
    await postToThread(client, session, `*Plan generation failed*\n\`\`\`\n${err.message}\n\`\`\``);
  }
}

async function runBuildPhase({ session, client }) {
  updateSession(session.id, { state: STATES.BUILD_RUNNING });
  await postToThread(client, session, "*Building, running QA, and finalizing...*");

  const streamer = createLogStreamer(client, session);
  await streamer.ensureLogMessage();

  try {
    const prdPath = session.prd?.path;
    const planPath = session.plan?.path;

    if (!prdPath || !planPath) {
      failSession(session.id);
      await postToThread(client, session, "*Build failed — missing PRD or plan path.*");
      return;
    }

    const prompt = buildPrompt(session.instruction, prdPath, planPath);

    const result = await spawnClaude({
      prompt,
      cwd: session.sessionDir,
      sessionId: session.id,
      projectName: session.projectName,
      onOutput: streamer.onOutput,
      logFile: session.build.logFile,
    });
    await streamer.stop();

    const parsed = parseBuildOutput(result.stdout);

    if (result.code !== 0 || parsed.status === "failed") {
      failSession(session.id);
      const errorDetail = parsed.error || result.stderr.slice(-500);
      const failedStep = parsed.failedStep ? ` at \`${parsed.failedStep}\`` : "";
      await postToThread(
        client,
        session,
        `*Build failed${failedStep}*\n\`\`\`\n${errorDetail}\n\`\`\`\n\n_Session: \`${session.id}\`_`
      );
      return;
    }

    updateSession(session.id, {
      build: { ...session.build, prUrl: parsed.prUrl, branch: parsed.branch },
    });
    completeSession(session.id);

    const prLine = parsed.prUrl ? `\n*PR:* ${parsed.prUrl}` : "";
    const branchLine = parsed.branch ? `\n*Branch:* \`${parsed.branch}\`` : "";

    await postToThread(
      client,
      session,
      `*Build complete!*${branchLine}${prLine}\n\n_Session: \`${session.id}\`_`
    );
  } catch (err) {
    failSession(session.id);
    await postToThread(client, session, `*Build failed*\n\`\`\`\n${err.message}\n\`\`\`\n\n_Session: \`${session.id}\`_`);
  }
}

// ── Phase context builder ────────────────────────────────────────────────────

function buildPhaseContext(session) {
  const ctx = {
    projectName: session.projectName,
    projectPath: session.projectPath,
  };

  if (session.state === STATES.DISCOVERY_PENDING) {
    ctx.questions = session.discovery?.questions;
  }

  if (session.state === STATES.PREFLIGHT_PENDING) {
    ctx.discoveryContext = session.discovery?.discoveryContext;
  }

  if (session.state === STATES.PRD_REVIEW) {
    const s = session.prd?.summary;
    if (s) {
      ctx.prdSummary = [
        s.problem ? `Problem: ${s.problem}` : "",
        s.solution ? `Solution: ${s.solution}` : "",
        `Scope: ${s.mustCount} must-haves, ${s.shouldCount} should-haves`,
        s.mustList ? `Must-haves:\n${s.mustList}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    }
    ctx.prdPath = session.prd?.path;
  }

  if (session.state === STATES.PLAN_REVIEW) {
    const s = session.plan?.summary;
    if (s) {
      ctx.planSummary = [
        s.summary ? `Summary: ${s.summary}` : "",
        s.changes ? `Changes: ${s.changes}` : "",
        s.tests ? `Tests: ${s.tests}` : "",
        s.confidence ? `Confidence: ${s.confidence}` : "",
        s.strategy ? `Strategy: ${s.strategy}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    }
    ctx.planPath = session.plan?.path;
  }

  return ctx;
}
