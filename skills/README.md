# mx-workflow Skills

Standalone [Claude Skills](https://claude.com/claude-code) versions of mx-workflow's sharpest review agents. Want just one reviewer — not the whole plugin? Install a single skill.

Each skill is **self-contained**: it carries its full instructions in `SKILL.md` with no dependency on the plugin, so it works installed on its own.

## Available skills

| Skill | What it does | Derived from |
|---|---|---|
| [`silent-failure-hunter`](./silent-failure-hunter/SKILL.md) | Finds swallowed errors, empty catches, and unjustified fallbacks | agent `mx-silent-failure-hunter` |
| [`type-design-analyzer`](./type-design-analyzer/SKILL.md) | Rates encapsulation and invariant strength of types | agent `mx-type-design-analyzer` |
| [`comment-analyzer`](./comment-analyzer/SKILL.md) | Flags inaccurate, redundant, and rotting comments | agent `mx-comment-analyzer` |
| [`hallucination-check`](./hallucination-check/SKILL.md) | Catches invented APIs / imports vs installed deps | command `/mx:hallucination-check` |

## Install one

Copy the skill directory into your skills location — either personal (`~/.claude/skills/<name>/`) or project (`.claude/skills/<name>/`):

```bash
# personal — available in every project
cp -r skills/silent-failure-hunter ~/.claude/skills/

# or project-scoped — shared with the repo
cp -r skills/silent-failure-hunter .claude/skills/
```

Then invoke it by name (`/silent-failure-hunter`) or let Claude trigger it from the `description`. The whole plugin remains the better experience if you want all of them plus `/mx:review` orchestrating them together — these standalone copies are for people who want exactly one.

## Source of truth & sync

These skills are **derived copies**. The canonical version of each lives in the plugin (`agents/` or `commands/`), noted in a comment at the top of every `SKILL.md`. Standalone skills can't reference the plugin's files, so the instructions are duplicated by design.

**When you change a source agent/command, update its skill too** (and vice versa). Keep the substance in sync; the only intended differences are framing (skill vs agent/command) and the self-contained scope notes.
