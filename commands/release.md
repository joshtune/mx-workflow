---
description: "Bump version, update changelog, commit, tag, push, and create GitHub release — skips if nothing to release"
argument-hint: "<patch|minor|major|x.y.z>"
allowed-tools: ["Bash", "Read", "Edit", "Grep", "AskUserQuestion"]
---

# Release

One-step release: bump version, update changelog, commit, tag, push, and create a GitHub release. Skips everything if there's nothing to release.

**Bump argument:** $ARGUMENTS

## Instructions

### Step 1: Check for Unreleased Changes

Read `CHANGELOG.md` and find the `## [Unreleased]` section.

Check if there is any content between `## [Unreleased]` and the next `## [` heading (ignoring blank lines).

If the section is **empty** — print:

```
Nothing to release — [Unreleased] section in CHANGELOG.md is empty.
```

Then **stop**. Do not proceed.

### Step 2: Read Current State

Read these files in parallel:
- `plugin.json` (root of the plugin repo)
- `.claude-plugin/marketplace.json`

Extract the current version from `plugin.json` (`"version"` field). Verify the version in `.claude-plugin/marketplace.json` (inside `plugins[0].version`) matches. If they differ, STOP and warn the user about the mismatch before proceeding.

### Step 3: Calculate New Version

Parse the current version as `MAJOR.MINOR.PATCH`.

Based on `$ARGUMENTS`:
- **patch** → increment PATCH (e.g., 1.2.3 → 1.2.4)
- **minor** → increment MINOR, reset PATCH (e.g., 1.2.3 → 1.3.0)
- **major** → increment MAJOR, reset MINOR and PATCH (e.g., 1.2.3 → 2.0.0)
- **Explicit version (x.y.z)** → use as-is after validating it is greater than current
- **No argument / empty** → auto-detect from changelog content:
  - If `### Added` or `### Removed` entries exist → **minor**
  - If only `### Fixed` or `### Changed` entries exist → **patch**
  - Fallback → **patch**

### Step 4: Confirm

Show the user a summary and ask for confirmation:

```
RELEASE SUMMARY
===============
Version:    {current} → {new}
Changes:    {count of changelog bullet points} entries
Bump type:  {patch|minor|major}

Unreleased content:
{show the unreleased changelog content}

This will: bump version → commit → tag → push → create GitHub release.
Proceed?
```

Wait for user confirmation before continuing. If declined, stop.

### Step 5: Update Version Files

1. **plugin.json** — update the `"version"` field to the new version
2. **.claude-plugin/marketplace.json** — update `plugins[0].version` to the new version

### Step 6: Update CHANGELOG.md

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

For example, if bumping from 1.2.0 to 1.2.1:
```
[Unreleased]: https://github.com/joshtune/mx-workflow/compare/v1.2.1...HEAD
[1.2.1]: https://github.com/joshtune/mx-workflow/compare/v1.2.0...v1.2.1
```

### Step 7: Commit, Tag, Push, and Release

Run these sequentially:

```bash
git add plugin.json .claude-plugin/marketplace.json CHANGELOG.md
git commit -m "chore(release): bump version to {new_version}"
git tag -a "v{new_version}" -m "Release v{new_version}"
git push && git push --tags
```

Then create the GitHub release using the changelog content from the `[Unreleased]` section (captured in Step 1) as the release notes:

```bash
gh release create v{new_version} --title "v{new_version} — {short title summarizing changes}" --notes "{changelog content}"
```

The release title should be a concise summary of the most significant changes (e.g., "v1.2.0 — Documentation Site & Smart Pipeline Routing").

### Step 8: Done

Print:

```
RELEASED v{new_version}
=======================
Version:  {old} → {new}
Tag:      v{new_version}
Release:  {github release URL}
```
