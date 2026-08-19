// Generates src/content/docs/reference/changelog.md from the root CHANGELOG.md.
//
// The docs changelog used to be maintained by hand and drifted 22 versions
// behind before anyone noticed. It is now derived, so it cannot drift: the
// root CHANGELOG.md is the single source of truth.
//
// Runs as part of `npm run build` and `npm run dev` — see package.json.
// Output is gitignored; do not edit it or commit it.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const SOURCE = resolve(here, '../../CHANGELOG.md');
const TARGET = resolve(here, '../src/content/docs/reference/changelog.md');
const RELEASES = 'https://github.com/joshtune/mx-workflow/releases';

const raw = readFileSync(SOURCE, 'utf8');

const body = raw
  .split('\n')
  // Drop everything before the first version heading: the H1 and the
  // Keep a Changelog / SemVer preamble, which the frontmatter replaces.
  .slice(raw.split('\n').findIndex((l) => /^## /.test(l)))
  // `## [1.2.3] - 2026-01-01` -> `## 1.2.3 — 2026-01-01`, and
  // `## [Unreleased]` -> `## Unreleased`. Starlight builds heading anchors
  // from the text, so brackets would leak into every version's slug.
  .map((line) =>
    line
      .replace(/^## \[([^\]]+)\] - (.+)$/, '## $1 — $2')
      .replace(/^## \[([^\]]+)\]\s*$/, '## $1'),
  )
  // Drop the trailing link-reference definitions. With the headings no longer
  // written as `[1.2.3]`, nothing resolves against them.
  .filter((line) => !/^\[[^\]]+\]:\s+https?:\/\//.test(line))
  .join('\n')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

if (!body) {
  throw new Error(`sync-changelog: no version sections found in ${SOURCE}`);
}

const page = `---
title: Changelog
description: Version history and release notes.
tableOfContents:
  maxHeadingLevel: 2
---

<!--
  GENERATED FILE — DO NOT EDIT.
  Produced from the root CHANGELOG.md by docs/scripts/sync-changelog.mjs.
  Edit that file instead; this one is regenerated on every build.
-->

All notable changes to mx-workflow are documented here, generated from the project's [CHANGELOG.md](https://github.com/joshtune/mx-workflow/blob/main/CHANGELOG.md). The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Tagged releases are on [GitHub](${RELEASES}).

${body}
`;

mkdirSync(dirname(TARGET), { recursive: true });
writeFileSync(TARGET, page);

const versions = body.match(/^## /gm)?.length ?? 0;
console.log(`sync-changelog: wrote ${versions} sections to ${TARGET}`);
