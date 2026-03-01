---
description: "List available agents and their purposes"
allowed-tools: [Glob, Read, Grep]
---

# List Available Agents

Scan the `agents/` directory and display a formatted table of all available agents, their purposes, and which commands reference them.

## Instructions

### Step 1: Discover Agents

Use Glob to find all `.md` files in the `agents/` directory.

### Step 2: Read Agent Details

For each agent file found, read the file and extract:
- **Name**: from the `name` field in YAML frontmatter (or derive from filename by removing `.md`)
- **Description/Purpose**: from the `description` field in YAML frontmatter. Summarize to one short sentence if the description is long.

### Step 3: Find Command References

Use Grep to search all files in the `commands/` directory for references to each agent name. Record which commands mention each agent.

### Step 4: Display Results

Output a formatted table like this:

```
AVAILABLE AGENTS
================

| Agent                    | Purpose                                              | Used By                        |
|--------------------------|------------------------------------------------------|--------------------------------|
| mx-code-reviewer         | Review code against guidelines and detect bugs       | /implement, /pr                |
| mx-code-simplifier       | Simplify code for clarity while preserving function  | /implement                     |
| ...                      | ...                                                  | ...                            |

Total: <N> agents

TIP: Agents run automatically via commands like /mx:implement and /mx:pr.
     They can also be invoked directly via the Task tool for standalone analysis.
```

Keep the purpose column concise — one short sentence, no more than 60 characters. If no commands reference an agent, show "standalone" in the Used By column.
