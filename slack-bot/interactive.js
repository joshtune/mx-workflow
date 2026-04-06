/**
 * interactive.js
 * Orchestrator for two-way interactive builds.
 * Drives sessions through phases, mediates Slack conversation at each gate.
 */

import { updateSession, completeSession, cancelSession, failSession, STATES } from "./session.js";
import { spawnClaude } from "./runner.js";
import {
  classifyReply,
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

/**
 * Create a debounced log streamer that updates a single Slack message
 * with the latest output lines. Same pattern as the original bot.
 */
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

  function reset() {
    logBuffer = [];
  }

  return { ensureLogMessage, onOutput, stop, reset };
}

// ── Entry point ──────────────────────────────────────────────────────────────

/**
 * Start a new interactive session — runs Phase 0 (discovery).
 */
export async function startInteractive({ session, client }) {
  await postToThread(
    client,
    session,
    `*Interactive build started*\n> ${session.instruction}\n\n_Running discovery..._`
  );

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

    await postToThread(
      client,
      session,
      `*Phase 0: Discovery*\n\n${parsed.questions}\n\n_Reply with your answers to continue, or "cancel" to stop._`
    );
  } catch (err) {
    failSession(session.id);
    await postToThread(client, session, `*Discovery failed*\n\`\`\`\n${err.message}\n\`\`\``);
  }
}

// ── Thread reply router ──────────────────────────────────────────────────────

/**
 * Handle a user's thread reply for an active session.
 * Routes to the correct handler based on session state.
 */
export async function handleReply({ session, text, client }) {
  const reply = classifyReply(text);

  // Cancel works from any awaiting state
  if (reply.type === "cancel") {
    cancelSession(session.id);
    await postToThread(client, session, "*Build cancelled.*");
    return;
  }

  switch (session.state) {
    case STATES.DISCOVERY_PENDING:
      await handleDiscoveryReply({ session, reply, client });
      break;

    case STATES.PREFLIGHT_PENDING:
      await handlePreflightReply({ session, reply, client });
      break;

    case STATES.PRD_REVIEW:
      await handlePrdReply({ session, reply, client });
      break;

    case STATES.PLAN_REVIEW:
      await handlePlanReply({ session, reply, client });
      break;

    case STATES.DISCOVERY_RUNNING:
    case STATES.PRD_RUNNING:
    case STATES.PLAN_RUNNING:
    case STATES.BUILD_RUNNING:
      await postToThread(
        client,
        session,
        `_Phase is still running — I'll let you know when it's ready for review._`
      );
      break;

    default:
      await postToThread(
        client,
        session,
        `_Session is in state \`${session.state}\` — no input expected._`
      );
  }
}

// ── Phase handlers ───────────────────────────────────────────────────────────

async function handleDiscoveryReply({ session, reply, client }) {
  // Store user's answers
  const answers = reply.text;
  updateSession(session.id, {
    discovery: { ...session.discovery, answers },
  });

  await postToThread(client, session, "_Processing your answers..._");

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

    // Show the inferred context and ask for confirmation
    const contextDisplay = parsed.discoveryContext || result.stdout.trim();
    await postToThread(
      client,
      session,
      [
        `*Inferred Context*`,
        "```",
        contextDisplay.length > 1500 ? contextDisplay.slice(0, 1500) + "\n..." : contextDisplay,
        "```",
        "",
        `_Reply "go" to proceed to PRD generation, give feedback to adjust, or "cancel" to stop._`,
      ].join("\n")
    );
  } catch (err) {
    failSession(session.id);
    await postToThread(client, session, `*Context inference failed*\n\`\`\`\n${err.message}\n\`\`\``);
  }
}

async function handlePreflightReply({ session, reply, client }) {
  if (reply.type === "approve") {
    await runPrdPhase({ session, client });
  } else {
    // User gave feedback — re-run discovery with their corrections
    const combinedAnswers = [
      session.discovery.answers || "",
      `\nCorrections: ${reply.text}`,
    ].join("\n");

    updateSession(session.id, {
      discovery: { ...session.discovery, answers: combinedAnswers },
    });

    await postToThread(client, session, "_Adjusting context..._");

    const streamer = createLogStreamer(client, session);

    try {
      const prompt = inferredContextPrompt(session.instruction, combinedAnswers, session.sessionDir);
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
        await postToThread(client, session, `*Context update failed*\n\`\`\`\n${result.stderr.slice(-500)}\n\`\`\``);
        return;
      }

      const parsed = parsePreflightOutput(result.stdout);
      updateSession(session.id, {
        discovery: { ...session.discovery, discoveryContext: parsed.discoveryContext },
      });

      const contextDisplay = parsed.discoveryContext || result.stdout.trim();
      await postToThread(
        client,
        session,
        [
          `*Updated Context*`,
          "```",
          contextDisplay.length > 1500 ? contextDisplay.slice(0, 1500) + "\n..." : contextDisplay,
          "```",
          "",
          `_Reply "go" to proceed to PRD generation, give feedback to adjust, or "cancel" to stop._`,
        ].join("\n")
      );
    } catch (err) {
      failSession(session.id);
      await postToThread(client, session, `*Context update failed*\n\`\`\`\n${err.message}\n\`\`\``);
    }
  }
}

async function handlePrdReply({ session, reply, client }) {
  if (reply.type === "approve") {
    await runPlanPhase({ session, client });
  } else {
    // Feedback — re-run PRD with feedback incorporated
    const prd = { ...session.prd };
    prd.feedbackHistory = [...prd.feedbackHistory, reply.text];
    updateSession(session.id, { prd });

    await postToThread(client, session, `_Revising PRD with your feedback..._`);
    await runPrdPhase({ session: { ...session, prd }, client });
  }
}

async function handlePlanReply({ session, reply, client }) {
  if (reply.type === "approve") {
    await runBuildPhase({ session, client });
  } else {
    // Feedback — re-run plan with feedback incorporated
    const plan = { ...session.plan };
    plan.feedbackHistory = [...plan.feedbackHistory, reply.text];
    updateSession(session.id, { plan });

    await postToThread(client, session, `_Revising plan with your feedback..._`);
    await runPlanPhase({ session: { ...session, plan }, client });
  }
}

// ── Phase runners ────────────────────────────────────────────────────────────

async function runPrdPhase({ session, client }) {
  updateSession(session.id, { state: STATES.PRD_RUNNING });
  await postToThread(client, session, "*Phase 1: Generating PRD...*");

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
      prd: {
        ...session.prd,
        path: parsed.file,
        summary: parsed,
      },
    });

    const mustList = parsed.mustList
      ? `\n\n*Must-haves:*\n${parsed.mustList}`
      : "";

    await postToThread(
      client,
      session,
      [
        `*Phase 1 Complete — PRD Generated*`,
        parsed.file ? `> File: \`${parsed.file}\`` : "",
        parsed.problem ? `> Problem: ${parsed.problem}` : "",
        parsed.solution ? `> Solution: ${parsed.solution}` : "",
        `> Scope: ${parsed.mustCount} must-haves, ${parsed.shouldCount} should-haves`,
        mustList,
        "",
        `_Reply "approved" to proceed to plan, give feedback to revise, or "cancel" to stop._`,
      ]
        .filter(Boolean)
        .join("\n")
    );
  } catch (err) {
    failSession(session.id);
    await postToThread(client, session, `*PRD generation failed*\n\`\`\`\n${err.message}\n\`\`\``);
  }
}

async function runPlanPhase({ session, client }) {
  updateSession(session.id, { state: STATES.PLAN_RUNNING });
  await postToThread(client, session, "*Phase 2: Generating implementation plan...*");

  const streamer = createLogStreamer(client, session);
  await streamer.ensureLogMessage();

  try {
    const discoveryContext =
      session.discovery?.discoveryContext ||
      session.discovery?.answers ||
      session.instruction;

    // Re-read session to get latest prd path
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
      plan: {
        ...session.plan,
        path: parsed.file,
        summary: parsed,
        strategy: parsed.strategy,
      },
    });

    await postToThread(
      client,
      session,
      [
        `*Phase 2 Complete — Plan Generated*`,
        parsed.file ? `> File: \`${parsed.file}\`` : "",
        parsed.summary ? `> Summary: ${parsed.summary}` : "",
        parsed.changes ? `> Changes: ${parsed.changes}` : "",
        parsed.newFiles ? `> New files: ${parsed.newFiles}` : "",
        parsed.tests ? `> Tests: ${parsed.tests}` : "",
        parsed.confidence ? `> Confidence: ${parsed.confidence}` : "",
        parsed.strategy ? `> Strategy: ${parsed.strategy}` : "",
        "",
        `_Reply "approved" to start building, give feedback to revise, or "cancel" to stop._`,
      ]
        .filter(Boolean)
        .join("\n")
    );
  } catch (err) {
    failSession(session.id);
    await postToThread(client, session, `*Plan generation failed*\n\`\`\`\n${err.message}\n\`\`\``);
  }
}

async function runBuildPhase({ session, client }) {
  updateSession(session.id, { state: STATES.BUILD_RUNNING });
  await postToThread(client, session, "*Phases 3-5: Building, running QA, and finalizing...*");

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
