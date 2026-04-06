/**
 * phases.js
 * Pure functions: prompt generators for each build phase, output parsers,
 * and reply classification (approve / cancel / feedback).
 */

// ── Reply Classification ─────────────────────────────────────────────────────

const APPROVE_PATTERNS = [
  /^(yes|y|yep|yup|yeah|ok|okay|lgtm|looks good|approve|approved|proceed|go|go ahead|ship it|continue|confirm)$/i,
];

const CANCEL_PATTERNS = [
  /^(cancel|stop|abort|quit|nevermind|never mind|nvm)$/i,
];

/**
 * Classify a user's thread reply.
 * @param {string} text
 * @returns {{ type: 'approve' | 'cancel' | 'feedback', text: string }}
 */
export function classifyReply(text) {
  const cleaned = text.replace(/<@[A-Z0-9]+>/g, "").trim();

  for (const pat of CANCEL_PATTERNS) {
    if (pat.test(cleaned)) return { type: "cancel", text: cleaned };
  }

  for (const pat of APPROVE_PATTERNS) {
    if (pat.test(cleaned)) return { type: "approve", text: cleaned };
  }

  return { type: "feedback", text: cleaned };
}

// ── Prompt Generators ────────────────────────────────────────────────────────

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

// ── Output Parsers ───────────────────────────────────────────────────────────

function extractField(block, name) {
  const match = block.match(new RegExp(`${name}:\\s*(.+)`));
  return match ? match[1].trim() : null;
}

/**
 * Extract multi-line field value (everything after "NAME:" until next "---" or "FIELDNAME:")
 */
function extractMultilineField(block, name) {
  const match = block.match(new RegExp(`${name}:\\s*([\\s\\S]*?)(?=\\n[A-Z_]+:|---)`));
  return match ? match[1].trim() : null;
}

/**
 * Parse Phase 0 discovery output.
 */
export function parseDiscoveryOutput(stdout) {
  const marker = "---DISCOVERY_QUESTIONS---";
  const idx = stdout.indexOf(marker);
  return {
    questions: idx >= 0 ? stdout.substring(0, idx).trim() : stdout.trim(),
    raw: stdout,
  };
}

/**
 * Parse Phase 0.5 inferred context output.
 */
export function parsePreflightOutput(stdout) {
  const match = stdout.match(
    /---DISCOVERY_CONTEXT---([\s\S]*?)---END_DISCOVERY_CONTEXT---/
  );
  return {
    discoveryContext: match ? match[1].trim() : stdout.trim(),
    raw: stdout,
  };
}

/**
 * Parse Phase 1 PRD output.
 */
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

/**
 * Parse Phase 2 plan output.
 */
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

/**
 * Parse Phases 3-5 build output.
 */
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
