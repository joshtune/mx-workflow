---
description: "Bump version in plugin.json + marketplace.json, update CHANGELOG, commit, and tag"
argument-hint: "<patch|minor|major|x.y.z>"
allowed-tools: ["Bash", "Read", "Edit", "Grep"]
---

# Version Bump

Centralized version management — bumps version in both manifest files, updates CHANGELOG.md, commits, and creates a git tag.

**Bump argument:** $ARGUMENTS

## Instructions

### Step 1: Read Current State

Read these files in parallel:
- `plugin.json` (root of the plugin repo)
- `.claude-plugin/marketplace.json`
- `CHANGELOG.md`

Extract the current version from `plugin.json` (`"version"` field). Verify the version in `.claude-plugin/marketplace.json` (inside `plugins[0].version`) matches. If they differ, STOP and warn the user about the mismatch before proceeding.

### Step 2: Calculate New Version

Parse the current version as `MAJOR.MINOR.PATCH`.

Based on `$ARGUMENTS`:
- **patch** → increment PATCH (e.g., 1.2.3 → 1.2.4)
- **minor** → increment MINOR, reset PATCH (e.g., 1.2.3 → 1.3.0)
- **major** → increment MAJOR, reset MINOR and PATCH (e.g., 1.2.3 → 2.0.0)
- **Explicit version (x.y.z)** → use as-is after validating it is greater than current
- **No argument / empty** → default to **patch**

Tell the user: `Bumping version: {current} → {new}`

### Step 3: Update Version Files

1. **plugin.json** — update the `"version"` field to the new version
2. **.claude-plugin/marketplace.json** — update `plugins[0].version` to the new version

### Step 4: Update CHANGELOG.md

In CHANGELOG.md:
1. Find the `## [Unreleased]` section
2. Insert a new version section **after** `## [Unreleased]` with today's date:
   ```
   ## [Unreleased]

   ## [{new_version}] - {YYYY-MM-DD}
   ```
3. Move any content that was under `[Unreleased]` into the new version section
4. Update the comparison links at the bottom of the file:
   - Change the `[Unreleased]` link to compare from the new version tag
   - Add a new link for the new version comparing to the previous version

For example, if bumping from 1.0.1 to 1.0.2:
```
[Unreleased]: https://github.com/joshtune/mx-workflow/compare/v1.0.2...HEAD
[1.0.2]: https://github.com/joshtune/mx-workflow/compare/v1.0.1...v1.0.2
```

If the `[Unreleased]` section is empty (no content between `## [Unreleased]` and the next `##`), add a placeholder under the new version:

```
### Added

- `/mx:version` command for centralized version management
```

### Step 5: Show Diff and Confirm

Run:
```bash
git diff
```

Show the user the diff and ask: **"Commit and tag v{new_version}?"**

Wait for user confirmation before proceeding.

### Step 6: Commit and Tag

After user confirms:

```bash
git add plugin.json .claude-plugin/marketplace.json CHANGELOG.md
git commit -m "chore(release): bump version to {new_version}"
git tag -a "v{new_version}" -m "Release v{new_version}"
```

Tell the user:
```
Version bumped: {old} → {new}
Tag created: v{new_version}

To publish:
  git push && git push --tags

Then confirm the tag reached the remote:
  git ls-remote --tags origin | grep "refs/tags/v{new_version}$"
```

The verification step is not optional busywork. Use `git push --tags`, never
`--follow-tags` — the latter pushes only *annotated* tags, so a lightweight tag
(`git tag v1.2.3` without `-a`) is skipped silently and the local repo looks
released while the remote has no tag at all. If the check comes back empty,
push it explicitly with `git push origin v{new_version}`.
