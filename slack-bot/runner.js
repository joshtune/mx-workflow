/**
 * runner.js
 * Spawns Claude Code with /mx:build --auto, streams output, returns result metadata
 */

import { spawn } from "child_process";
import { mkdirSync, createWriteStream } from "fs";
import path from "path";
import crypto from "crypto";

const MX_PLUGIN_DIR =
  process.env.MX_PLUGIN_DIR ||
  path.resolve(process.env.HOME, "workspace/workbench/other-projects/mx-workflow");
const LOG_DIR =
  process.env.MX_LOG_DIR ||
  path.resolve(process.env.HOME, "builds", ".logs");

/**
 * @param {object} opts
 * @param {string} opts.instruction  - The raw build instruction from Slack
 * @param {function} opts.onOutput   - Called with each line of output
 * @param {string} opts.workDir      - Where to create project session directories
 * @returns {Promise<{prUrl, branch, sessionId, logFile}>}
 */
export async function runner({ instruction, onOutput, workDir }) {
  const sessionId = crypto.randomBytes(4).toString("hex");
  const sessionDir = path.join(workDir, `session-${sessionId}`);
  const logFile = path.join(LOG_DIR, `${sessionId}.log`);

  // Ensure dirs exist
  mkdirSync(sessionDir, { recursive: true });
  mkdirSync(LOG_DIR, { recursive: true });

  const logStream = createWriteStream(logFile, { flags: "a" });

  onOutput(`[mx] Session ${sessionId} started`);
  onOutput(`[mx] Work dir: ${sessionDir}`);
  onOutput(`[mx] Instruction: ${instruction}`);
  onOutput("─".repeat(50));

  // Use /mx:build --auto which handles the full pipeline:
  // discovery (inferred) → PRD → plan → build (test-first, auto team/single) → QA → commit
  const prompt = [
    `Run /mx:build --auto "${instruction}"`,
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

  return new Promise((resolve, reject) => {
    const proc = spawn(
      "claude",
      [
        "--print",
        "--dangerously-skip-permissions",
        "--output-format",
        "text",
        "--plugin-dir",
        MX_PLUGIN_DIR,
        prompt,
      ],
      {
        cwd: sessionDir,
        env: {
          ...process.env,
          MX_SESSION_ID: sessionId,
          FORCE_COLOR: "0", // no ANSI escape codes in Slack
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
      text
        .split("\n")
        .filter(Boolean)
        .forEach(onOutput);
    });

    proc.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderr += text;
      logStream.write("[stderr] " + text);
      text
        .split("\n")
        .filter(Boolean)
        .forEach((line) => onOutput(`[warn] ${line}`));
    });

    proc.on("close", async (code) => {
      logStream.end();
      onOutput("─".repeat(50));
      onOutput(`[mx] Process exited with code ${code}`);

      if (code !== 0) {
        return reject(
          new Error(
            `Claude Code exited with code ${code}\n\n${stderr.slice(-1000)}`
          )
        );
      }

      // Extract metadata from output
      const prUrl = extractPrUrl(stdout);
      const branch = extractBranch(stdout);

      resolve({ prUrl, branch, sessionId, logFile });
    });

    proc.on("error", (err) => {
      logStream.end();
      reject(
        new Error(
          `Failed to spawn claude: ${err.message}\n\nIs Claude Code installed? Run: npm install -g @anthropic-ai/claude-code`
        )
      );
    });
  });
}

// ── Output parsers ────────────────────────────────────────────────────────────

function extractPrUrl(output) {
  const match = output.match(/PR_URL:\s*(https:\/\/github\.com\/[^\s]+)/);
  return match ? match[1] : null;
}

function extractBranch(output) {
  const match = output.match(/BRANCH:\s*([^\n]+)/);
  return match ? match[1].trim() : null;
}
