#!/usr/bin/env node
// Deterministic lessons-learned bookkeeping for mx-workflow. No AI, no dependencies.
//
// Storage (committed with the project, so lessons are shared team memory):
//   .claude/lessons/log.jsonl   append-only; never rewritten
//   .claude/lessons/tags.json   the controlled tag vocabulary
//
// Log records (one JSON object per line):
//   {"kind":"lesson", "id","date","ticket","type","tag","description","area"}
//   {"kind":"promotion","date","ids":[...],"to"}
//   {"kind":"tag-merge","date","from","to"}
//
// Promotion and tag merges are appended as events, so the log is never edited
// and its history stays auditable. State is derived by replaying it.

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';

const ROOT = process.env.MX_LESSONS_DIR || join(process.cwd(), '.claude', 'lessons');
const LOG = join(ROOT, 'log.jsonl');
const TAGS = join(ROOT, 'tags.json');
const DEFAULT_THRESHOLD = 3;
const CLAUDE_MD_LIMIT = 100;
const TYPES = ['bug', 'feature'];

function die(msg) {
  console.error(`lessons: ${msg}`);
  process.exit(1);
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) out[key] = true;
      else {
        out[key] = next;
        i++;
      }
    } else out._.push(a);
  }
  return out;
}

const today = () => new Date().toISOString().slice(0, 10);

function ensureDir() {
  mkdirSync(ROOT, { recursive: true });
}

function readTags() {
  if (!existsSync(TAGS)) return {};
  try {
    return JSON.parse(readFileSync(TAGS, 'utf8'));
  } catch {
    die(`${TAGS} is not valid JSON`);
  }
}

function writeTags(tags) {
  ensureDir();
  const sorted = Object.fromEntries(Object.entries(tags).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(TAGS, JSON.stringify(sorted, null, 2) + '\n');
}

function readLog() {
  if (!existsSync(LOG)) return [];
  return readFileSync(LOG, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line, i) => {
      try {
        return JSON.parse(line);
      } catch {
        die(`${LOG} line ${i + 1} is not valid JSON`);
      }
    });
}

function append(record) {
  ensureDir();
  appendFileSync(LOG, JSON.stringify(record) + '\n');
}

// Replay the log into current state: lessons with merged tags and promotion status.
function state() {
  const merges = new Map();
  const promoted = new Map();
  const lessons = [];
  for (const r of readLog()) {
    if (r.kind === 'lesson') lessons.push(r);
    else if (r.kind === 'tag-merge') merges.set(r.from, r.to);
    else if (r.kind === 'promotion') for (const id of r.ids) promoted.set(id, r.to);
  }
  const resolve = (tag) => {
    let t = tag;
    for (let hops = 0; merges.has(t) && hops < 50; hops++) t = merges.get(t);
    return t;
  };
  return lessons.map((l) => ({ ...l, tag: resolve(l.tag), promotedTo: promoted.get(l.id) || null }));
}

function cmdAdd(args) {
  const { ticket, type, tag, description, area } = args;
  for (const [k, v] of Object.entries({ ticket, type, tag, description, area })) {
    if (!v || v === true) die(`--${k} is required`);
  }
  if (!TYPES.includes(type)) die(`--type must be one of: ${TYPES.join(', ')}`);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(tag)) die('--tag must be lowercase-hyphenated (e.g. error-handling)');

  const tags = readTags();
  if (!tags[tag]) {
    if (!args['new-tag']) {
      const known = Object.keys(tags).join(', ') || '(none yet)';
      die(`unknown tag "${tag}". Reuse an existing tag if one fits: ${known}. Otherwise pass --new-tag "<one-line meaning>".`);
    }
    if (args['new-tag'] === true) die('--new-tag needs a one-line meaning');
    tags[tag] = { description: args['new-tag'], created: today() };
    writeTags(tags);
  }

  const duplicate = state().find(
    (l) => l.ticket === ticket && l.tag === tag && l.description === description
  );
  if (duplicate) {
    console.log(`duplicate of ${duplicate.id}; not added`);
    return;
  }

  const record = {
    kind: 'lesson',
    id: randomUUID().slice(0, 8),
    date: today(),
    ticket,
    type,
    tag,
    description,
    area,
  };
  append(record);
  console.log(`added ${record.id} [${tag}] ${description}`);
}

function cmdTags(args) {
  const tags = readTags();
  const counts = new Map();
  for (const l of state()) counts.set(l.tag, (counts.get(l.tag) || 0) + 1);
  const rows = Object.entries(tags).map(([tag, meta]) => ({
    tag,
    description: meta.description,
    entries: counts.get(tag) || 0,
  }));
  if (args.json) return console.log(JSON.stringify(rows, null, 2));
  if (!rows.length) return console.log('no tags yet');
  for (const r of rows) console.log(`${r.tag.padEnd(28)} ${String(r.entries).padStart(3)}  ${r.description}`);
}

function cmdCount(args) {
  const threshold = Number(args.threshold || DEFAULT_THRESHOLD);
  if (!Number.isInteger(threshold) || threshold < 1) die('--threshold must be a positive integer');
  const unpromoted = state().filter((l) => !l.promotedTo);
  const groups = new Map();
  for (const l of unpromoted) {
    if (!groups.has(l.tag)) groups.set(l.tag, []);
    groups.get(l.tag).push(l);
  }
  const clusters = [...groups.entries()]
    .map(([tag, entries]) => ({
      tag,
      count: entries.length,
      flagged: entries.length >= threshold,
      areas: [...new Set(entries.map((e) => e.area))].sort(),
      types: [...new Set(entries.map((e) => e.type))].sort(),
      entries: entries.map(({ id, date, ticket, type, description, area }) => ({ id, date, ticket, type, description, area })),
    }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));

  if (args.json) {
    return console.log(JSON.stringify({ threshold, unpromoted: unpromoted.length, clusters }, null, 2));
  }
  console.log(`unpromoted entries: ${unpromoted.length} (threshold ${threshold})`);
  if (!clusters.length) return;
  for (const c of clusters) {
    console.log(`${c.flagged ? 'FLAG' : '    '}  ${c.tag.padEnd(28)} ${String(c.count).padStart(3)}  ${c.areas.join(', ')}`);
  }
}

function cmdPromote(args) {
  const { tag, to } = args;
  if (!tag || tag === true) die('--tag is required');
  if (!to || to === true) die('--to <path of the rule file or skill> is required');
  const ids = args.ids && args.ids !== true ? String(args.ids).split(',') : null;
  const targets = state().filter((l) => l.tag === tag && !l.promotedTo && (!ids || ids.includes(l.id)));
  if (!targets.length) die(`no unpromoted entries for tag "${tag}"${ids ? ' with those ids' : ''}`);
  append({ kind: 'promotion', date: today(), ids: targets.map((l) => l.id), to });
  console.log(`promoted ${targets.length} entries for "${tag}" -> ${to}`);
}

function cmdMergeTags(args) {
  const { from, to } = args;
  if (!from || from === true || !to || to === true) die('--from and --to are required');
  if (from === to) die('--from and --to must differ');
  const tags = readTags();
  if (!tags[from]) die(`unknown tag "${from}"`);
  if (!tags[to]) die(`unknown tag "${to}"; create it by adding a lesson with --new-tag first, or merge into an existing tag`);
  append({ kind: 'tag-merge', date: today(), from, to });
  delete tags[from];
  writeTags(tags);
  console.log(`merged "${from}" into "${to}"`);
}

function cmdClaudeMd(args) {
  const file = args.file && args.file !== true ? args.file : join(process.cwd(), 'CLAUDE.md');
  if (!existsSync(file)) return console.log(`no ${file}`);
  const lines = readFileSync(file, 'utf8').split('\n').length - (readFileSync(file, 'utf8').endsWith('\n') ? 1 : 0);
  const over = lines > CLAUDE_MD_LIMIT;
  console.log(`${file}: ${lines} lines (limit ~${CLAUDE_MD_LIMIT})${over ? ' — OVER, prune or move rules into nested CLAUDE.md or a skill' : ''}`);
  if (over) process.exitCode = 2;
}

const HELP = `usage: lessons.mjs <command> [options]

  add --ticket ID --type bug|feature --tag TAG --area PATH --description TEXT [--new-tag "meaning"]
  tags [--json]
  count [--threshold N] [--json]       group unpromoted entries by tag; flag tags at or over the threshold (default ${DEFAULT_THRESHOLD})
  promote --tag TAG --to PATH [--ids a,b]
  merge-tags --from TAG --to TAG
  check-claude-md [--file PATH]        exit code 2 if over ~${CLAUDE_MD_LIMIT} lines

Data: ${'<project>'}/.claude/lessons/ (override with MX_LESSONS_DIR)`;

const [cmd, ...rest] = process.argv.slice(2);
const args = parseArgs(rest);
const commands = {
  add: cmdAdd,
  tags: cmdTags,
  count: cmdCount,
  promote: cmdPromote,
  'merge-tags': cmdMergeTags,
  'check-claude-md': cmdClaudeMd,
};

if (!cmd || cmd === '--help' || cmd === 'help') console.log(HELP);
else if (commands[cmd]) commands[cmd](args);
else die(`unknown command "${cmd}"\n\n${HELP}`);
