# mx-workflow Plugin Development Guidelines

## Philosophy

The mx-workflow plugin empowers developers to move faster through automation, guidance, and multi-agent collaboration. Every command should save time, reduce cognitive load, or improve code quality.

## Architecture

### Structure
- **Commands** (`/commands`): User-facing slash commands (Markdown frontmatter + instructions)
- **Agents** (`/agents`): Specialized analyzers for code review, testing, debugging
- **References** (`/references`): Configuration and mappings (scope mappings, agent browser)

## Commands at a Glance

Type `/mx:help` to see a quick reference card for all available commands.

### Command Format

Each command is a Markdown file with YAML frontmatter:

```markdown
---
description: "One-line description"
allowed-tools: [Bash, Read, Grep]
---

Your instruction prompt here...
```

## Adding New Commands

1. Create `commands/my-command.md`
2. Use `/mx:create-command <name> <purpose>` to scaffold
3. Define clear inputs, outputs, and which tools are needed
4. Test with `/my-command` in Claude Code

## Adding New Agents

1. Create `agents/mx-my-analyzer.md`
2. Start with a focused purpose (e.g., code review, performance analysis)
3. Keep agents reusable across multiple commands
4. Document expected inputs and outputs

## Configuration

- **Environment variables** in `.env.example`
- **Scope mappings** in `references/scope-mappings.md`
- Use sensible defaults; override sparingly

## Testing

- Use Claude Code's built-in tools to test commands locally
- For agents, invoke via Task tool to verify behavior
- Update README if adding new commands or significant changes

## Version Management

Bump version in:
- `.claude-plugin/plugin.json` (`version` field)
- `.claude-plugin/marketplace.json` (`version` field)
- Git tag releases as `v{version}`

## Documentation

- **README.md**: Installation, usage, configuration
- **Inline help**: Commands have built-in descriptions
- **Frontmatter**: `description` field appears in autocomplete

## Quality Standards

- Commands should run in under 2 minutes for common paths
- Error messages should guide users toward solutions
- Avoid hardcoding assumptions; use environment variables
- All agents should fail gracefully with actionable feedback
- Keep commands focused; break complex workflows into steps
