# Scope Mappings

Infer the commit/MR scope from the file paths that changed. Match against the first pattern that applies; fall back to `general` if nothing matches.

**Customize this file for your project's domain areas.**

## File Pattern → Scope

| File pattern | Scope |
|---|---|
| `*billing*` | billing |
| `*auth*` | auth |
| `*user*` | users |
| `*admin*` | admin |
| `*api*` | api |
| `*docs*` | docs |
| `*test*` | tests |
| `*scripts*` | scripts |
| `*config*` | config |
| Default | general |

## Type Inference

| Context | Type |
|---|---|
| Bug fix, "fix" in description | fix |
| New feature, "add" in description | feat |
| Restructuring, "refactor" | refactor |
| Performance improvement | perf |
| Text/copy changes only | copy |
| Config, deps, tooling | chore |
| Default | feat |
