---
description: "Catch invented APIs, fabricated signatures, and non-existent imports — cross-referenced against your actually-installed dependencies"
argument-hint: "[--staged | --commit <sha> | --branch <name>] [--scope <path>]"
allowed-tools: ["Bash", "Glob", "Grep", "Read"]
---

# Hallucination Check

AI generators confidently invent things that don't exist: methods that were never on the library, function signatures with the wrong arguments, type imports for symbols that aren't exported, whole packages that aren't installed. This command hunts those down by cross-referencing every external reference in your changes against the code that is **actually installed and present**.

It is **read-only** and **evidence-based** — every flag must point at a real lookup ("`parseAsync` is not an export of `zod@3.23.8`"), not a vibe.

**Options:** $ARGUMENTS

## Flags

| Flag | Effect |
|------|--------|
| (none) | Check everything differing from trunk (committed + uncommitted + untracked) |
| `--staged` | Only staged changes |
| `--commit <sha>` | A single commit's diff |
| `--branch <name>` | Compare against an explicit base branch |
| `--scope <path>` | Limit to a directory or file |

## Step 1: Determine Scope

Resolve the review set exactly as `/mx:review` does: detect trunk (`main`/`master`), `BASE=$(git merge-base HEAD <trunk>)`, then the set is `git diff --name-only $BASE` plus untracked files (`git ls-files --others --exclude-standard`), filtered by `--scope`. The flags override as in `/mx:review`. If empty, say so and stop.

## Step 2: Detect the Dependency Surface

Determine what "installed" means for this project so lookups are grounded in reality, not registries:

| Ecosystem | Manifest | Installed truth |
|-----------|----------|-----------------|
| JS/TS | `package.json` | `node_modules/<pkg>` — `package.json` `exports`/`main`, `.d.ts` type defs |
| Python | `pyproject.toml` / `requirements.txt` | `pip show <pkg>`, site-packages, `__init__.py` exports |
| Go | `go.mod` | `go list -m all`, module cache |
| Rust | `Cargo.toml` | `cargo metadata`, `~/.cargo` registry src |

Read the manifest for declared deps and versions. Prefer the **installed** copy (lockfile version, `node_modules`, site-packages) over assumptions — a hallucination check that guesses is itself hallucinating.

## Step 3: Extract External & Internal References from the Diff

From the changed lines only, collect:

1. **Imports** — module/package being imported and the named symbols (`import { x, y } from 'pkg'`, `from pkg import x`, `use crate::x`).
2. **Member access on imported modules** — `pkg.method(...)`, `client.someCall(...)` where the receiver traces back to an import.
3. **Type references** — imported types used in annotations/generics.
4. **Internal references** — calls to functions/classes/types that should be defined *within this repo*.

## Step 4: Verify Each Reference

For every collected reference, attempt a concrete lookup and assign a verdict:

- **Package exists?** Is the imported package in the manifest AND present in `node_modules`/site-packages? A package imported but absent from both is a likely hallucination (or a missing-install) — flag it and say which.
- **Symbol exported?** Grep the installed package's entry/type defs for the named export. If `{ foo }` is imported but `foo` is not exported by the installed version, flag it.
- **Method/attribute exists?** For `pkg.method(...)`, check the installed package's type defs or source for that member. Missing → flag.
- **Signature plausible?** When type defs are available, sanity-check argument count/shape against the call. Mismatch → flag (lower confidence than a missing symbol).
- **Internal symbol defined?** For internal references, grep the repo for the definition. Called-but-never-defined → flag.

When you genuinely cannot resolve a reference (no type defs, dynamic export), say **UNVERIFIED** rather than guessing — do not report it as a hallucination.

## Step 5: Report

Group findings by confidence. For each, give the evidence and the lookup that produced it.

```
HALLUCINATION CHECK
===================
Scope:    <e.g. branch vs main>
Deps:     <N> packages resolved · <M> references checked

VERDICT:  CLEAN / SUSPECT (<n> likely, <u> unverified)

LIKELY HALLUCINATIONS
─────────────────────
[HIGH]   src/auth.ts:12 — `verifyJwt` is not an export of `jose@5.2.0`
                          (installed exports: jwtVerify, SignJWT, …). Did you mean `jwtVerify`?
[HIGH]   src/db.ts:40   — package `pg-promise` imported but not in package.json or node_modules
[MEDIUM] src/api.ts:88  — `client.batchGet(...)` — no `batchGet` member on `@aws-sdk/client-dynamodb@3.x` type defs

UNVERIFIED (could not resolve — review manually)
────────────────────────────────────────────────
[ ? ]    src/x.ts:5 — `plugin.run` — dynamic export, no type defs available

INTERNAL
────────
[HIGH]   src/checkout.ts:30 — `calculateTax(...)` called but not defined anywhere in repo
```

Report **CLEAN** only when every resolvable reference checked out. Always separate confident hallucinations from UNVERIFIED ones — never inflate the count.
