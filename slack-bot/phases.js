/**
 * phases.js
 * Conversation prompt system, phase-specific prompt generators, output parsers,
 * and marker-based action detection (Claude decides intent, not regex).
 */

// ── Conversation System ──────────────────────────────────────────────────────

const MAX_HISTORY_MESSAGES = 40;

/**
 * Format conversation history into a prompt-friendly string.
 */
export function formatHistory(history) {
  const recent = history.slice(-MAX_HISTORY_MESSAGES);
  if (recent.length === 0) return "(no prior messages)";
  return recent
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n\n");
}

/**
 * Build the system prompt portion based on the current session state.
 * phaseContext provides state-specific details (PRD summary, plan summary, etc.)
 */
export function conversationSystemPrompt(state, phaseContext = {}) {
  const base = [
    `You are mx-bot, a helpful AI assistant for a dev team. You're chatting in a Slack thread.`,
    `Keep responses concise and conversational — this is Slack, not a document.`,
    ``,
    `You have access to the mx-workflow build pipeline that can take ideas from concept to committed code.`,
  ].join("\n");

  const markerInstructions = {
    CONVERSATION: [
      ``,
      `CURRENT STATE: Free conversation (no active build)`,
      phaseContext.projectName
        ? `Project context: ${phaseContext.projectName} at ${phaseContext.projectPath}`
        : `No specific project selected.`,
      ``,
      `Help the user brainstorm, discuss ideas, answer questions — whatever they want to talk about.`,
      ``,
      `ACTION MARKERS — include at the END of your response ONLY when the user clearly wants to start building:`,
      `- When the user says something like "let's build this", "build it", "start the build", "can you build that":`,
      `  Include on its own line:`,
      `  ---BUILD_START---`,
      `  <one-line summary of what to build, incorporating everything discussed>`,
      `  ---END_BUILD_START---`,
      ``,
      `Do NOT include this marker for general discussion, questions, or brainstorming.`,
      `Do NOT ask the user if they want to build unless they bring it up.`,
    ].join("\n"),

    DISCOVERY_PENDING: [
      ``,
      `CURRENT STATE: Build pipeline — Discovery phase`,
      `The user was asked discovery questions and is providing answers.`,
      phaseContext.questions ? `\nDiscovery questions that were asked:\n${phaseContext.questions}` : ``,
      ``,
      `Help the user with any questions they have. When they have provided answers to the discovery questions:`,
      `- Include ---ADVANCE--- on its own line at the end of your response`,
      `- Before the marker, restate what you understood from their answers`,
      ``,
      `If they want to cancel: include ---CANCEL--- on its own line`,
      `If they're just asking a question or chatting, respond naturally with no markers.`,
    ].join("\n"),

    PREFLIGHT_PENDING: [
      ``,
      `CURRENT STATE: Build pipeline — Context confirmation`,
      `The inferred technical context was shown to the user.`,
      phaseContext.discoveryContext ? `\nInferred context:\n${phaseContext.discoveryContext}` : ``,
      ``,
      `Help the user with any questions. When they confirm the context is correct:`,
      `- Include ---ADVANCE--- on its own line at the end`,
      ``,
      `If they want changes to the inferred context:`,
      `- Include ---REVISE--- on its own line, followed by the corrections on the next line`,
      ``,
      `If they want to cancel: include ---CANCEL---`,
      `For questions or discussion, respond naturally with no markers.`,
    ].join("\n"),

    PRD_REVIEW: [
      ``,
      `CURRENT STATE: Build pipeline — PRD review`,
      `A PRD was generated and the user is reviewing it.`,
      phaseContext.prdSummary ? `\nPRD summary:\n${phaseContext.prdSummary}` : ``,
      phaseContext.prdPath ? `PRD file: ${phaseContext.prdPath}` : ``,
      ``,
      `Help the user understand the PRD. Answer any questions naturally.`,
      ``,
      `When the user approves the PRD (e.g., "approved", "looks good", "go ahead"):`,
      `- Include ---ADVANCE--- on its own line at the end`,
      ``,
      `When the user wants changes (e.g., "add X", "remove Y", "change Z"):`,
      `- Include ---REVISE--- on its own line, followed by the specific changes on the next line`,
      ``,
      `If they want to cancel: include ---CANCEL---`,
      `For questions or discussion, respond naturally with no markers.`,
    ].join("\n"),

    PLAN_REVIEW: [
      ``,
      `CURRENT STATE: Build pipeline — Plan review`,
      `An implementation plan was generated and the user is reviewing it.`,
      phaseContext.planSummary ? `\nPlan summary:\n${phaseContext.planSummary}` : ``,
      phaseContext.planPath ? `Plan file: ${phaseContext.planPath}` : ``,
      ``,
      `Help the user understand the plan. Answer any questions naturally.`,
      ``,
      `When the user approves the plan (e.g., "approved", "looks good", "let's build"):`,
      `- Include ---ADVANCE--- on its own line at the end`,
      ``,
      `When the user wants changes:`,
      `- Include ---REVISE--- on its own line, followed by the specific changes on the next line`,
      ``,
      `If they want to cancel: include ---CANCEL---`,
      `For questions or discussion, respond naturally with no markers.`,
    ].join("\n"),
  };

  return base + (markerInstructions[state] || "");
}

/**
 * Build the full prompt for a conversation turn.
 */
export function buildConversationPrompt(systemPrompt, history, currentMessage) {
  return [
    systemPrompt,
    ``,
    `--- Conversation so far ---`,
    formatHistory(history),
    `--- End conversation ---`,
    ``,
    `User: ${currentMessage}`,
    ``,
    `Respond naturally. Include action markers ONLY when the user's intent is clear.`,
  ].join("\n");
}

/**
 * Parse Claude's conversation response for action markers.
 * Returns { text, action, buildInstruction?, reviseFeedback? }
 */
export function parseConversationResponse(stdout) {
  let text = stdout.trim();
  let action = null;
  let buildInstruction = null;
  let reviseFeedback = null;

  // Check for BUILD_START
  const buildMatch = text.match(/---BUILD_START---([\s\S]*?)---END_BUILD_START---/);
  if (buildMatch) {
    action = "build_start";
    buildInstruction = buildMatch[1].trim();
    text = text.replace(/---BUILD_START---[\s\S]*?---END_BUILD_START---/, "").trim();
  }

  // Check for ADVANCE
  if (text.includes("---ADVANCE---")) {
    action = "advance";
    text = text.replace(/---ADVANCE---/g, "").trim();
  }

  // Check for REVISE
  const reviseMatch = text.match(/---REVISE---\s*([\s\S]*?)$/);
  if (reviseMatch) {
    action = "revise";
    reviseFeedback = reviseMatch[1].trim();
    text = text.replace(/---REVISE---[\s\S]*$/, "").trim();
  }

  // Check for CANCEL
  if (text.includes("---CANCEL---")) {
    action = "cancel";
    text = text.replace(/---CANCEL---/g, "").trim();
  }

  return { text, action, buildInstruction, reviseFeedback };
}

// ── Phase-Specific Prompt Generators ─────────────────────────────────────────
// These run the actual build phases (discovery, PRD, plan, build).
// They are NOT conversational — they produce structured output for the bot to parse.

/**
 * Phase 0: Discovery — ask direction questions, don't generate anything yet.
 */
export function discoveryPrompt(instruction, projectPath) {
  return [
    `You are running ONLY the discovery phase of a build pipeline.`,
    ``,
    `The user wants to build: "${instruction}"`,
    `Project directory: ${projectPath}`,
    ``,
    `Read the project's CLAUDE.md, package.json, and key files to understand the tech stack.`,
    ``,
    `Then follow this process:`,
    `1. Restate your understanding of what the user wants to build.`,
    `2. Ask 3-6 quick binary/multiple-choice direction questions relevant to this idea.`,
    `   Only ask what you genuinely cannot infer. Skip obvious questions.`,
    ``,
    `Format your output as:`,
    `- A brief restatement of the idea`,
    `- Numbered questions`,
    ``,
    `End your output with exactly: ---DISCOVERY_QUESTIONS---`,
    ``,
    `Do NOT generate a PRD, plan, or any code. Only ask questions.`,
  ].join("\n");
}

/**
 * Phase 0.5: Inferred context — process user's answers, infer technical decisions.
 */
export function inferredContextPrompt(instruction, answers, sessionDir) {
  return [
    `You are running the inferred-context phase of a build pipeline.`,
    ``,
    `The user wants to build: "${instruction}"`,
    `Working directory: ${sessionDir}`,
    ``,
    `The user answered these discovery questions:`,
    answers,
    ``,
    `Based on their answers and the codebase:`,
    `1. Infer the technical context and present it in this format:`,
    ``,
    `INFERRED CONTEXT`,
    `================`,
    `Platform:    [Web app / CLI / Mobile / etc.]`,
    `Stack:       [from CLAUDE.md, package.json, or answers]`,
    `Database:    [Yes/No — which]`,
    `Auth:        [Yes/No — method]`,
    `Deployment:  [inferred]`,
    `Scope:       MVP`,
    ``,
    `2. Detect quality commands (lint, typecheck, test) from the project.`,
    `3. Show a brief pipeline overview.`,
    ``,
    `Output the full discovery context (everything the PRD phase needs to know)`,
    `between these markers:`,
    `---DISCOVERY_CONTEXT---`,
    `[all context here]`,
    `---END_DISCOVERY_CONTEXT---`,
    ``,
    `Do NOT generate a PRD or any code.`,
  ].join("\n");
}

/**
 * Phase 1: PRD generation.
 */
export function prdPrompt(instruction, discoveryContext, feedbackHistory) {
  const feedback =
    feedbackHistory.length > 0
      ? `\n\nUser feedback to incorporate in this revision:\n${feedbackHistory.map((f, i) => `${i + 1}. ${f}`).join("\n")}`
      : "";

  return [
    `Run /mx:prd "${instruction}"`,
    ``,
    `Discovery context:`,
    discoveryContext,
    feedback,
    ``,
    `Write the PRD to .agents/prds/{kebab-case-name}.prd.md`,
    `Include the "User Roles & Expectations" section with unique IDs (A1, C2, etc.)`,
    ``,
    `After writing the PRD, commit it:`,
    `git add .agents/prds/ && git commit -m "docs(prd): add PRD for {name}"`,
    ``,
    `Then output a summary in this exact format:`,
    `---PRD_SUMMARY---`,
    `FILE: <path to generated PRD file>`,
    `PROBLEM: <one-line problem statement>`,
    `SOLUTION: <one-line solution>`,
    `MUST_COUNT: <number of must-haves>`,
    `SHOULD_COUNT: <number of should-haves>`,
    `MUST_LIST: <newline-separated ID: description for each must-have>`,
    `---END_PRD_SUMMARY---`,
  ].join("\n");
}

/**
 * Phase 2: Plan generation.
 */
export function planPrompt(instruction, prdPath, discoveryContext, feedbackHistory) {
  const feedback =
    feedbackHistory.length > 0
      ? `\n\nUser feedback to incorporate in this revision:\n${feedbackHistory.map((f, i) => `${i + 1}. ${f}`).join("\n")}`
      : "";

  return [
    `Run /mx:plan "${instruction}"`,
    ``,
    `Use the PRD at: ${prdPath}`,
    `Discovery context:`,
    discoveryContext,
    feedback,
    ``,
    `Write the plan to .agents/plans/{kebab-case-name}.plan.md`,
    `Determine build strategy (team vs single) based on plan complexity.`,
    ``,
    `After writing the plan, commit it:`,
    `git add .agents/plans/ && git commit -m "docs(plan): add implementation plan for {name}"`,
    ``,
    `Then output a summary in this exact format:`,
    `---PLAN_SUMMARY---`,
    `FILE: <path to generated plan file>`,
    `SUMMARY: <one-line summary>`,
    `CHANGES: <count> files`,
    `NEW_FILES: <count>`,
    `TESTS: <count> scenarios`,
    `CONFIDENCE: <X>/10`,
    `STRATEGY: <team or single>`,
    `---END_PLAN_SUMMARY---`,
  ].join("\n");
}

/**
 * Phases 3-5: Build + QA + Report — uses existing /mx:build with skip flags.
 */
export function buildPrompt(instruction, prdPath, planPath) {
  return [
    `Run /mx:build --auto --skip-prd ${prdPath} --skip-plan ${planPath} "${instruction}"`,
    ``,
    `This will execute phases 3-5 (build, QA, report) using the approved PRD and plan.`,
    ``,
    `After the build completes, output a summary block in this exact format:`,
    `---SUMMARY---`,
    `STATUS: success`,
    `BRANCH: <branch name>`,
    `PR_URL: <full GitHub PR URL or none>`,
    `STEPS_COMPLETED: <comma-separated list>`,
    `---END---`,
    ``,
    `If any step fails, output:`,
    `---SUMMARY---`,
    `STATUS: failed`,
    `FAILED_STEP: <which step>`,
    `ERROR: <brief error description>`,
    `---END---`,
  ].join("\n");
}

// ── Phase Output Parsers ─────────────────────────────────────────────────────

function extractField(block, name) {
  const match = block.match(new RegExp(`${name}:\\s*(.+)`));
  return match ? match[1].trim() : null;
}

function extractMultilineField(block, name) {
  const match = block.match(new RegExp(`${name}:\\s*([\\s\\S]*?)(?=\\n[A-Z_]+:|---)`));
  return match ? match[1].trim() : null;
}

export function parseDiscoveryOutput(stdout) {
  const marker = "---DISCOVERY_QUESTIONS---";
  const idx = stdout.indexOf(marker);
  return {
    questions: idx >= 0 ? stdout.substring(0, idx).trim() : stdout.trim(),
    raw: stdout,
  };
}

export function parsePreflightOutput(stdout) {
  const match = stdout.match(
    /---DISCOVERY_CONTEXT---([\s\S]*?)---END_DISCOVERY_CONTEXT---/
  );
  return {
    discoveryContext: match ? match[1].trim() : stdout.trim(),
    raw: stdout,
  };
}

export function parsePrdOutput(stdout) {
  const match = stdout.match(/---PRD_SUMMARY---([\s\S]*?)---END_PRD_SUMMARY---/);
  if (!match) return { file: null, problem: null, solution: null, mustCount: 0, shouldCount: 0, mustList: null, raw: stdout };

  const block = match[1];
  return {
    file: extractField(block, "FILE"),
    problem: extractField(block, "PROBLEM"),
    solution: extractField(block, "SOLUTION"),
    mustCount: parseInt(extractField(block, "MUST_COUNT") || "0", 10),
    shouldCount: parseInt(extractField(block, "SHOULD_COUNT") || "0", 10),
    mustList: extractMultilineField(block, "MUST_LIST"),
    raw: stdout,
  };
}

export function parsePlanOutput(stdout) {
  const match = stdout.match(/---PLAN_SUMMARY---([\s\S]*?)---END_PLAN_SUMMARY---/);
  if (!match) return { file: null, summary: null, changes: null, newFiles: null, tests: null, confidence: null, strategy: null, raw: stdout };

  const block = match[1];
  return {
    file: extractField(block, "FILE"),
    summary: extractField(block, "SUMMARY"),
    changes: extractField(block, "CHANGES"),
    newFiles: extractField(block, "NEW_FILES"),
    tests: extractField(block, "TESTS"),
    confidence: extractField(block, "CONFIDENCE"),
    strategy: extractField(block, "STRATEGY"),
    raw: stdout,
  };
}

export function parseBuildOutput(stdout) {
  return {
    status: extractField(stdout, "STATUS"),
    prUrl: (() => {
      const m = stdout.match(/PR_URL:\s*(https:\/\/github\.com\/[^\s]+)/);
      return m ? m[1] : null;
    })(),
    branch: (() => {
      const m = stdout.match(/BRANCH:\s*([^\n]+)/);
      return m ? m[1].trim() : null;
    })(),
    failedStep: extractField(stdout, "FAILED_STEP"),
    error: extractField(stdout, "ERROR"),
  };
}
