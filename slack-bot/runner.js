/**
 * runner.js
 * Resolves project from Slack message, spawns Claude Code with /mx:build --auto,
 * streams output, returns result metadata.
 *
 * Supports four project reference patterns:
 *   1. Project prefix:  "dashboard: add dark mode"
 *   2. Slash command:   "/build api fix the webhook bug"
 *   3. Default project: "fix the login bug" (uses config default)
 *   4. Explicit flag:   "--repo billing add export button"
 */

import { spawn } from "child_process";
import { existsSync, mkdirSync, createWriteStream, readFileSync, writeFileSync } from "fs";
import path from "path";
import crypto from "crypto";

const MX_PLUGIN_DIR =
  process.env.MX_PLUGIN_DIR ||
  path.resolve(process.env.HOME, "mx-workflow");
const LOG_DIR =
  process.env.MX_LOG_DIR ||
  path.resolve(process.env.HOME, "builds", ".logs");
const CONFIG_PATH = path.resolve(MX_PLUGIN_DIR, "slack-bot", ".mx-mac-mini.json");

// ── Config loader ─────────────────────────────────────────────────────────────

let _config = null;

function loadConfig() {
  if (_config) return _config;
  if (!existsSync(CONFIG_PATH)) return null;
  try {
    _config = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
    return _config;
  } catch (err) {
    console.error("[runner] Failed to parse .mx-mac-mini.json:", err.message);
    return null;
  }
}

/** Reload config on next call (used when config may have changed) */
export function reloadConfig() {
  _config = null;
}

/**
 * Register a completed project in .mx-mac-mini.json so it can be referenced
 * by alias in future builds. Called automatically after a build completes.
 *
 * @param {string} alias - Short name for the project (e.g., "task-manager")
 * @param {string} projectPath - Absolute path to the project directory
 * @param {string} [repo] - GitHub repo in "owner/repo" format
 */
export function registerProject(alias, projectPath, repo) {
  let config = loadConfig();
  if (!config) {
    config = {
      version: "1.0",
      new_project_dir: process.env.MX_WORK_DIR || path.resolve(process.env.HOME, "builds"),
      projects: {},
    };
  }
  if (!config.projects) config.projects = {};

  config.projects[alias] = {
    path: projectPath,
    repo: repo || null,
    registered: new Date().toISOString(),
  };

  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  _config = null; // bust cache
  console.log(`[runner] Registered project: ${alias} -> ${projectPath}`);
}

// ── Project resolver ──────────────────────────────────────────────────────────

/**
 * Parse a raw Slack message and resolve it to a project path + clean instruction.
 *
 * @param {string} rawMessage - The raw message text from Slack
 * @returns {{ projectPath: string|null, projectName: string|null, instruction: string, isNewProject: boolean, error?: string, warning?: string, usedDefault?: boolean }}
 */
export function resolveProject(rawMessage) {
  const config = loadConfig();
  let text = rawMessage.trim();

  // ── Pattern 4: Explicit --repo flag ──────────────────────────────────────
  const repoFlagMatch = text.match(/^--repo\s+(\S+)\s+(.*)/is);
  if (repoFlagMatch) {
    const alias = repoFlagMatch[1].toLowerCase();
    const instruction = repoFlagMatch[2].trim();
    const project = config?.projects?.[alias];
    if (project) {
      return { projectPath: project.path, projectName: alias, instruction, isNewProject: false };
    }
    return { projectPath: null, projectName: alias, instruction, isNewProject: false, error: `Unknown project: "${alias}". Run /mx:setup-mac-mini to register it.` };
  }

  // ── Pattern 1: Project prefix with colon ─────────────────────────────────
  const colonMatch = text.match(/^(\w[\w-]*)\s*:\s*(.*)/is);
  if (colonMatch) {
    const alias = colonMatch[1].toLowerCase();
    const instruction = colonMatch[2].trim();
    const project = config?.projects?.[alias];
    if (project) {
      return { projectPath: project.path, projectName: alias, instruction, isNewProject: false };
    }
    // Not a known alias — fall through to other patterns
  }

  // ── Pattern 2: First word is a known project alias ───────────────────────
  if (config?.projects) {
    const words = text.split(/\s+/);
    const firstWord = words[0]?.toLowerCase();
    if (config.projects[firstWord]) {
      const instruction = words.slice(1).join(" ").trim();
      return { projectPath: config.projects[firstWord].path, projectName: firstWord, instruction, isNewProject: false };
    }
  }

  // ── New project detection ─────────────────────────────────────────────────
  const newProjectPattern = /^(build|create|start|make|scaffold)\s+(a\s+|an\s+|new\s+)?(?!feature|fix|bug|test)/i;
  if (newProjectPattern.test(text)) {
    const newProjectDir = config?.new_project_dir || path.resolve(process.env.HOME, "builds");
    return { projectPath: newProjectDir, projectName: null, instruction: text, isNewProject: true };
  }

  // ── Pattern 3: Default project (bare message) ─────────────────────────────
  if (config?.default_project && config?.projects?.[config.default_project]) {
    const project = config.projects[config.default_project];
    return {
      projectPath: project.path,
      projectName: config.default_project,
      instruction: text,
      isNewProject: false,
      usedDefault: true,
    };
  }

  // ── No config / no match ──────────────────────────────────────────────────
  const newProjectDir = config?.new_project_dir || path.resolve(process.env.HOME, "builds");
  return {
    projectPath: newProjectDir,
    projectName: null,
    instruction: text,
    isNewProject: true,
    warning: "No project config found. Run /mx:setup-mac-mini on the Mac mini first. Treating as new project.",
  };
}

// ── Spawn primitive ──────────────────────────────────────────────────────────

/**
 * Low-level Claude Code spawner. Used by both the auto runner and the
 * interactive runner. Returns raw output; caller handles parsing.
 *
 * @param {object} opts
 * @param {string} opts.prompt       - The prompt to send to Claude
 * @param {string} opts.cwd          - Working directory
 * @param {string} opts.sessionId    - Session ID (set as MX_SESSION_ID env var)
 * @param {string} [opts.projectName] - Project name (set as MX_PROJECT_NAME env var)
 * @param {function} opts.onOutput   - Called with each line of streamed output
 * @param {string} opts.logFile      - Path to append log output
 * @returns {Promise<{ stdout: string, stderr: string, code: number }>}
 */
export async function spawnClaude({ prompt, cwd, sessionId, projectName, onOutput, logFile }) {
  mkdirSync(path.dirname(logFile), { recursive: true });
  const logStream = createWriteStream(logFile, { flags: "a" });

  return new Promise((resolve, reject) => {
    const proc = spawn(
      "claude",
      [
        "--print",
        "--dangerously-skip-permissions",
        "--output-format", "text",
        "--plugin-dir", MX_PLUGIN_DIR,
        prompt,
      ],
      {
        cwd,
        env: {
          ...process.env,
          MX_SESSION_ID: sessionId,
          MX_PROJECT_NAME: projectName || "new-project",
          FORCE_COLOR: "0",
        },
        stdio: ["ignore", "pipe", "pipe"],
      }
    );

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      stdout += text;
      logStream.write(text);
      text.split("\n").filter(Boolean).forEach(onOutput);
    });

    proc.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderr += text;
      logStream.write("[stderr] " + text);
      text.split("\n").filter(Boolean).forEach((line) => onOutput(`[warn] ${line}`));
    });

    proc.on("close", (code) => {
      logStream.end();
      resolve({ stdout, stderr, code });
    });

    proc.on("error", (err) => {
      logStream.end();
      reject(new Error(`Failed to spawn claude: ${err.message}\n\nIs Claude Code installed? Run: npm install -g @anthropic-ai/claude-code`));
    });
  });
}

// ── Main runner (auto mode — unchanged external API) ─────────────────────────

/**
 * @param {object} opts
 * @param {string} opts.instruction  - Raw Slack message text (before project resolution)
 * @param {function} opts.onOutput   - Called with each line of streamed output
 * @param {string} [opts.workDir]    - Override work directory (fallback for new projects)
 * @returns {Promise<{prUrl, branch, sessionId, projectName, logFile}>}
 */
export async function runner({ instruction: rawMessage, onOutput, workDir }) {
  const sessionId = crypto.randomBytes(4).toString("hex");

  const resolved = resolveProject(rawMessage);

  if (resolved.error) {
    throw new Error(resolved.error);
  }

  if (resolved.warning) {
    onOutput(`[warn] ${resolved.warning}`);
  }

  if (resolved.usedDefault) {
    onOutput(`[mx] Using default project: ${resolved.projectName}`);
  } else if (resolved.projectName) {
    onOutput(`[mx] Project: ${resolved.projectName} -> ${resolved.projectPath}`);
  } else if (resolved.isNewProject) {
    onOutput(`[mx] New project — will be created in ${resolved.projectPath}`);
  }

  let sessionDir;
  if (resolved.isNewProject) {
    sessionDir = path.join(workDir || resolved.projectPath, `session-${sessionId}`);
    mkdirSync(sessionDir, { recursive: true });
  } else {
    sessionDir = resolved.projectPath;
  }

  const logFile = path.join(LOG_DIR, `${sessionId}.log`);

  onOutput(`[mx] Session: ${sessionId}`);
  onOutput(`[mx] Dir: ${sessionDir}`);
  onOutput(`[mx] Task: ${resolved.instruction}`);
  onOutput("─".repeat(50));

  const prompt = [
    `Run /mx:build --auto "${resolved.instruction}"`,
    "",
    "After the build completes, output a summary block in this exact format:",
    "---SUMMARY---",
    "STATUS: success",
    "BRANCH: <branch name>",
    "PR_URL: <full GitHub PR URL or none>",
    "STEPS_COMPLETED: <comma-separated list>",
    "---END---",
    "",
    "If any step fails, output:",
    "---SUMMARY---",
    "STATUS: failed",
    "FAILED_STEP: <which step>",
    "ERROR: <brief error description>",
    "---END---",
  ].join("\n");

  const result = await spawnClaude({
    prompt,
    cwd: sessionDir,
    sessionId,
    projectName: resolved.projectName,
    onOutput,
    logFile,
  });

  onOutput("─".repeat(50));
  onOutput(`[mx] Exited with code ${result.code}`);

  if (result.code !== 0) {
    throw new Error(`Build failed (exit ${result.code})\n\n${result.stderr.slice(-800)}`);
  }

  return {
    prUrl: extractPrUrl(result.stdout),
    branch: extractBranch(result.stdout),
    sessionId,
    projectName: resolved.projectName,
    logFile,
  };
}

// ── Output parsers ────────────────────────────────────────────────────────────

export function extractPrUrl(output) {
  const match = output.match(/PR_URL:\s*(https:\/\/github\.com\/[^\s]+)/);
  return match ? match[1] : null;
}

export function extractBranch(output) {
  const match = output.match(/BRANCH:\s*([^\n]+)/);
  return match ? match[1].trim() : null;
}
