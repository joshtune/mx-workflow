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

## Example Project Configurations

The generic mappings above work as a starting point. Below are tailored examples for common project types. Copy the relevant table into this file and adjust the patterns to match your codebase.

### Frontend SPA (React / Vue / Angular)

| File pattern | Scope |
|---|---|
| `src/components/*` | components |
| `src/hooks/*` or `src/composables/*` | hooks |
| `src/pages/*` or `src/views/*` | pages |
| `src/store/*` or `src/state/*` | state |
| `src/api/*` or `src/services/*` | api |
| `src/styles/*` or `*.css` or `*.scss` | styles |
| `src/utils/*` or `src/helpers/*` | utils |
| `src/i18n/*` or `src/locales/*` | i18n |
| `public/*` or `static/*` | assets |
| `e2e/*` or `cypress/*` or `playwright/*` | e2e |
| `*.test.*` or `*.spec.*` | tests |
| `vite.config.*` or `webpack.config.*` | build |
| Default | general |

### Backend API (Express / FastAPI / Rails)

| File pattern | Scope |
|---|---|
| `*controllers*` or `*routes*` or `*endpoints*` | routes |
| `*models*` or `*entities*` or `*schemas*` | models |
| `*middleware*` | middleware |
| `*migrations*` | migrations |
| `*services*` | services |
| `*repositories*` or `*dal*` | data-access |
| `*validators*` or `*serializers*` | validation |
| `*jobs*` or `*workers*` or `*tasks*` | workers |
| `*auth*` | auth |
| `*test*` or `*spec*` | tests |
| `docker*` or `*.yml` | infra |
| Default | general |

### Monorepo (Turborepo / Nx / Lerna)

| File pattern | Scope |
|---|---|
| `packages/<name>/*` or `apps/<name>/*` | Use the package/app name as scope |
| `packages/ui/*` | ui |
| `packages/shared/*` or `packages/common/*` | shared |
| `packages/api/*` or `apps/api/*` | api |
| `packages/web/*` or `apps/web/*` | web |
| `packages/mobile/*` or `apps/mobile/*` | mobile |
| `libs/*` | libs |
| `tooling/*` or `.changeset/*` | tooling |
| `turbo.json` or `nx.json` or `lerna.json` | build |
| Root `package.json` or `tsconfig.json` | config |
| Default | general |

**Tip:** In a monorepo, prefix the scope with the package name for clarity (e.g., `feat(web): add login page`). You can automate this by checking which `packages/` or `apps/` directory contains the majority of changes.

### CLI Tool

| File pattern | Scope |
|---|---|
| `src/commands/*` or `commands/*` | commands |
| `src/cli.*` or `bin/*` | cli |
| `src/prompts/*` or `src/inquirer/*` | prompts |
| `src/output/*` or `src/formatters/*` | output |
| `src/config/*` or `src/options/*` | config |
| `src/utils/*` or `src/helpers/*` | utils |
| `man/*` or `docs/*` | docs |
| `completions/*` or `autocomplete/*` | completions |
| `*test*` or `*spec*` | tests |
| `package.json` or `Cargo.toml` or `go.mod` | deps |
| Default | general |
