/**
 * session.js
 * Session state machine with in-memory lookup + JSON file persistence.
 * Each interactive build gets a session that tracks its lifecycle through phases.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, unlinkSync } from "fs";
import path from "path";

const LOG_DIR = process.env.MX_LOG_DIR || path.resolve(process.env.HOME, "builds", ".logs");
const SESSIONS_DIR = path.join(LOG_DIR, "sessions");
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ── Valid states ─────────────────────────────────────────────────────────────

export const STATES = {
  CONVERSATION: "CONVERSATION",
  DISCOVERY_RUNNING: "DISCOVERY_RUNNING",
  DISCOVERY_PENDING: "DISCOVERY_PENDING",
  PREFLIGHT_PENDING: "PREFLIGHT_PENDING",
  PRD_RUNNING: "PRD_RUNNING",
  PRD_REVIEW: "PRD_REVIEW",
  PLAN_RUNNING: "PLAN_RUNNING",
  PLAN_REVIEW: "PLAN_REVIEW",
  BUILD_RUNNING: "BUILD_RUNNING",
  COMPLETE: "COMPLETE",
  CANCELLED: "CANCELLED",
  FAILED: "FAILED",
};

const TERMINAL_STATES = new Set([STATES.COMPLETE, STATES.CANCELLED, STATES.FAILED]);
const AWAITING_STATES = new Set([
  STATES.CONVERSATION,
  STATES.DISCOVERY_PENDING,
  STATES.PREFLIGHT_PENDING,
  STATES.PRD_REVIEW,
  STATES.PLAN_REVIEW,
]);

// ── In-memory store ──────────────────────────────────────────────────────────

/** @type {Map<string, object>} keyed by "channel:threadTs" */
const threadIndex = new Map();

/** @type {Map<string, object>} keyed by session id */
const sessionIndex = new Map();

// ── Persistence helpers ──────────────────────────────────────────────────────

function ensureDir() {
  mkdirSync(SESSIONS_DIR, { recursive: true });
}

function sessionPath(id) {
  return path.join(SESSIONS_DIR, `${id}.json`);
}

function persist(session) {
  ensureDir();
  writeFileSync(sessionPath(session.id), JSON.stringify(session, null, 2));
}

function threadKey(channel, threadTs) {
  return `${channel}:${threadTs}`;
}

function indexSession(session) {
  sessionIndex.set(session.id, session);
  if (session.channel && session.threadTs) {
    threadIndex.set(threadKey(session.channel, session.threadTs), session);
  }
}

function removeFromIndex(session) {
  sessionIndex.delete(session.id);
  if (session.channel && session.threadTs) {
    threadIndex.delete(threadKey(session.channel, session.threadTs));
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Create a new session and persist it.
 */
export function createSession({
  id,
  channel,
  threadTs,
  userId,
  instruction,
  projectPath,
  projectName,
  isNewProject,
  sessionDir,
}) {
  const now = new Date().toISOString();
  const session = {
    id,
    channel,
    threadTs,
    userId,
    state: STATES.CONVERSATION,
    instruction,
    projectPath,
    projectName,
    isNewProject: isNewProject || false,
    sessionDir,
    logMessageTs: null,
    history: [], // { role: 'user'|'assistant', content: string }[]
    discovery: { questions: null, answers: null, discoveryContext: null },
    prd: { path: null, summary: null, feedbackHistory: [] },
    plan: { path: null, summary: null, strategy: null, feedbackHistory: [] },
    build: { prUrl: null, branch: null, logFile: path.join(LOG_DIR, `${id}.log`) },
    createdAt: now,
    updatedAt: now,
  };

  indexSession(session);
  persist(session);
  return session;
}

/**
 * Update session fields and persist. Returns the updated session.
 */
export function updateSession(sessionId, patch) {
  const session = sessionIndex.get(sessionId);
  if (!session) throw new Error(`Session not found: ${sessionId}`);

  Object.assign(session, patch, { updatedAt: new Date().toISOString() });
  indexSession(session); // re-index in case channel/threadTs changed
  persist(session);
  return session;
}

/**
 * Look up a session by Slack channel + thread timestamp.
 * Returns null if no active session exists for that thread.
 */
export function findSessionByThread(channel, threadTs) {
  const session = threadIndex.get(threadKey(channel, threadTs));
  if (!session) return null;
  if (TERMINAL_STATES.has(session.state)) return null;
  return session;
}

/**
 * Get a session by ID.
 */
export function getSession(sessionId) {
  return sessionIndex.get(sessionId) || null;
}

/**
 * Check if a session is waiting for user input.
 */
export function isAwaitingInput(session) {
  return AWAITING_STATES.has(session.state);
}

/**
 * Mark session as complete.
 */
export function completeSession(sessionId) {
  return updateSession(sessionId, { state: STATES.COMPLETE });
}

/**
 * Mark session as cancelled.
 */
export function cancelSession(sessionId) {
  return updateSession(sessionId, { state: STATES.CANCELLED });
}

/**
 * Mark session as failed.
 */
export function failSession(sessionId) {
  return updateSession(sessionId, { state: STATES.FAILED });
}

/**
 * Load all non-terminal sessions from disk into memory.
 * Called on bot startup to restore state.
 * Sessions in RUNNING states are marked FAILED (the process was lost).
 * Expired sessions (>24h) are cleaned up.
 */
export function loadActiveSessions() {
  ensureDir();

  const files = readdirSync(SESSIONS_DIR).filter((f) => f.endsWith(".json"));
  let loaded = 0;
  let recovered = 0;
  let expired = 0;

  for (const file of files) {
    try {
      const raw = readFileSync(path.join(SESSIONS_DIR, file), "utf8");
      const session = JSON.parse(raw);

      // Clean up expired sessions
      const age = Date.now() - new Date(session.updatedAt).getTime();
      if (age > SESSION_TTL_MS) {
        unlinkSync(path.join(SESSIONS_DIR, file));
        expired++;
        continue;
      }

      // Skip terminal sessions — don't need them in memory
      if (TERMINAL_STATES.has(session.state)) continue;

      // Recover sessions that were mid-execution when bot died
      // CONVERSATION state is safe to resume — no running process
      const runningStates = new Set([
        STATES.DISCOVERY_RUNNING,
        STATES.PRD_RUNNING,
        STATES.PLAN_RUNNING,
        STATES.BUILD_RUNNING,
      ]);
      if (runningStates.has(session.state)) {
        session.state = STATES.FAILED;
        session.updatedAt = new Date().toISOString();
        persist(session);
        recovered++;
        // Still index it so we can notify the thread
        indexSession(session);
        continue;
      }

      // Active awaiting session — restore it
      indexSession(session);
      loaded++;
    } catch {
      // Skip corrupt files
    }
  }

  if (loaded || recovered || expired) {
    console.log(
      `[session] Loaded ${loaded} active, recovered ${recovered} interrupted, cleaned ${expired} expired`
    );
  }

  return { loaded, recovered, expired };
}
