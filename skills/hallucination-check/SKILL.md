---
name: hallucination-check
description: Catch invented APIs, fabricated function signatures, made-up library methods, non-existent imports, and uninstalled packages in code — cross-referenced against the dependencies that are actually installed. Use after an AI assistant generates or edits code that calls external libraries, to verify every reference is real before trusting it.
---

<!-- Standalone Skill derived from the mx-workflow plugin command `commands/hallucination-check.md`
     (github.com/joshtune/mx-workflow). If you maintain both, keep them in sync. -->

# Hallucination Check

AI generators confidently invent things that don't exist: methods that were never on a library, signatures with the wrong arguments, type imports for symbols that aren't exported, whole packages that aren't installed. This skill hunts those down by cross-referencing every external reference against the code that is **actually installed and present**.

It is **read-only** and **evidence-based** — every flag must point at a real lookup ("`parseAsync` is not an export of `zod@3.23.8`"), never a guess.

## 1. Scope the code to check

Default to the changes under review: the working-tree diff plus untracked new files (new files are where hallucinated code most often hides). If the user names files or a diff, use that. Check the changed lines, not the whole repo.

## 2. Establish the dependency surface

Ground every lookup in what's actually installed, not in registry knowledge:

| Ecosystem | Manifest | Installed truth |
|-----------|----------|-----------------|
| JS/TS | `package.json` | `node_modules/<pkg>` — `exports`/`main`, `.d.ts` type defs |
| Python | `pyproject.toml` / `requirements.txt` | `pip show <pkg>`, site-packages, `__init__.py` |
| Go | `go.mod` | `go list -m all`, module cache |
| Rust | `Cargo.toml` | `cargo metadata`, registry src |

Prefer the installed copy (lockfile version, `node_modules`, site-packages) over assumptions. A hallucination check that guesses is itself hallucinating.

## 3. Extract references from the code

Collect, from the changed lines: **imports** (module + named symbols), **member access on imported modules** (`pkg.method(...)`), **type references** from imports, and **internal references** (calls to functions/classes/types that should be defined in this repo).

## 4. Verify each reference

- **Package exists?** In the manifest AND present in `node_modules`/site-packages? Imported-but-absent → flag (and say whether it's a hallucination vs a missing install).
- **Symbol exported?** Grep the installed package's entry/type defs for the named export. `{ foo }` imported but not exported → flag.
- **Method/attribute exists?** For `pkg.method(...)`, check the installed type defs/source for the member. Missing → flag.
- **Signature plausible?** Where type defs exist, sanity-check arg count/shape; mismatch → flag (lower confidence than a missing symbol).
- **Internal symbol defined?** Grep the repo for the definition; called-but-never-defined → flag.

When a reference genuinely can't be resolved (no type defs, dynamic export), report it **UNVERIFIED** — do not call it a hallucination.

## 5. Report

```
HALLUCINATION CHECK
===================
Deps: <N> packages resolved · <M> references checked
VERDICT: CLEAN / SUSPECT (<n> likely, <u> unverified)

LIKELY HALLUCINATIONS
[HIGH]   src/auth.ts:12 — `verifyJwt` is not an export of `jose@5.2.0`
                          (installed exports: jwtVerify, SignJWT, …). Did you mean `jwtVerify`?
[HIGH]   src/db.ts:40   — package `pg-promise` imported but not in package.json or node_modules
[MEDIUM] src/api.ts:88  — `client.batchGet(...)` — no `batchGet` on @aws-sdk/client-dynamodb@3.x

UNVERIFIED (resolve manually)
[ ? ]    src/x.ts:5 — `plugin.run` — dynamic export, no type defs

INTERNAL
[HIGH]   src/checkout.ts:30 — `calculateTax(...)` called but not defined anywhere in repo
```

Report **CLEAN** only when every resolvable reference checked out. Always separate confident hallucinations from UNVERIFIED ones — never inflate the count.
