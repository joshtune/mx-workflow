---
description: "Generate CLAUDE.md from codebase analysis"
allowed-tools: ["Read", "Glob", "Grep", "Bash", "Write"]
---

# Create Global Rules (CLAUDE.md)

Generate a CLAUDE.md file by analyzing the codebase and extracting patterns, conventions, and key context.

## Instructions

### Phase 1: DISCOVER — Identify Project Type

Determine what kind of project this is by checking for indicator files:

| Type | Indicators |
|------|------------|
| Web App (Full-stack) | Separate client/server dirs, API routes, frontend + backend code |
| Web App (Frontend) | React/Vue/Svelte/Angular, no server code |
| API/Backend | Express/Fastify/Django/Rails/ASP.NET, no frontend |
| Library/Package | `main`/`exports` in package.json, publishable |
| CLI Tool | `bin` in package.json, command-line interface |
| Monorepo | Multiple packages, workspaces config |
| .NET Application | `*.sln`, `*.csproj`, C# source files |
| Rust Project | `Cargo.toml`, `src/main.rs` or `src/lib.rs` |
| Go Project | `go.mod`, `main.go` |
| Python Project | `pyproject.toml`, `setup.py`, `requirements.txt` |
| Mixed/Hybrid | Multiple stacks (e.g., .NET backend + JS frontend) |

### Phase 2: ANALYZE — Extract Patterns

#### 2a: Configuration

Read root configuration files that exist:
- `package.json` → scripts, dependencies, type
- `tsconfig.json` → TypeScript settings
- `*.sln` / `*.csproj` → .NET project structure
- `Cargo.toml` / `go.mod` / `pyproject.toml` → language config
- `vite.config.*` / `webpack.config.*` → build tools
- `biome.json` / `.eslintrc*` / `eslint.config.*` → linting
- `.prettierrc*` / `.editorconfig` → formatting
- `Makefile` / `Justfile` / `Taskfile.yml` → task runners
- `docker-compose.yml` / `Dockerfile` → containerization
- `.gitlab-ci.yml` / `.github/workflows/*` → CI/CD

#### 2b: Directory Structure

Map the codebase layout:
- Where does source code live?
- Where are tests?
- Any shared/common code?
- Configuration locations?
- Documentation locations?

#### 2c: Code Patterns

Study 5-10 representative source files to identify:
- **Naming**: How are files, functions, classes, variables named?
- **Structure**: How is code organized within files?
- **Errors**: How are errors created and handled?
- **Types**: How are types/interfaces defined and shared?
- **Tests**: How are tests structured? What framework is used?
- **Imports**: Absolute vs relative? Path aliases?

#### 2d: Key Files

Identify the most important files for understanding the project:
- Entry points
- Core business logic
- Shared utilities and types
- Database schemas or models
- API route definitions

### Phase 3: GENERATE — Write CLAUDE.md

**Output path**: `CLAUDE.md` (project root)

If a `CLAUDE.md` already exists, read it first and ask the user whether to overwrite or merge before proceeding.

**Structure the file with these sections** (include only what's relevant):

```markdown
# CLAUDE.md

## Development Commands

{Build, dev, test, lint commands — extracted from package.json scripts, Makefile, etc.}

## Architecture Overview

{What this project is, what it does, how it's organized}

### Tech Stack
{Languages, frameworks, databases, infrastructure}

### Directory Structure
{Key directories and what they contain}

## Development Guidelines

### Code Quality
{Linting, formatting, type checking rules}

### Patterns and Conventions
{Naming, structure, error handling, testing patterns}

### Key Files
{Important files to understand}

## Common Tasks

### Adding New Features
{Step-by-step for common workflows}

### Running Tests
{How to run tests, test patterns}

## Self-Correction Workflow
{Quality check commands to run after changes}
```

**Adapt to the project:**
- Remove sections that don't apply
- Add sections specific to the project type (e.g., "API Endpoints" for backends, "Component Patterns" for frontends, "Database Migrations" for apps with DBs)
- Keep it concise — focus on what's useful for an AI assistant working on the code
- Don't duplicate info that's in other docs — link instead

### Phase 4: OUTPUT — Report Results

```markdown
## Global Rules Created

**File**: `CLAUDE.md`

### Project Type
{Detected project type}

### Tech Stack Summary
{Key technologies detected}

### Sections Included
{List of sections generated}

### Next Steps
1. Review the generated `CLAUDE.md`
2. Add any project-specific notes or tribal knowledge
3. Remove any sections that don't apply
4. Consider adding on-demand context references for large subsystems
```

## Tips

- Keep CLAUDE.md focused and scannable — it's read at the start of every conversation
- Don't exhaustively document everything — focus on patterns and gotchas
- Include the actual commands (copy-pasteable), not just descriptions
- Link to detailed docs rather than duplicating them
- Update it as the project evolves
