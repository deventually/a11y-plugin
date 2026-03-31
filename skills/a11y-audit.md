---
name: a11y-audit
description: Audit source files for WCAG 2.2 accessibility issues. Use when asked to review accessibility, check a11y, audit components, or run /a11y-audit.
---

# A11y Audit

Audit source files for WCAG 2.2 accessibility conformance. This is the user-facing entry point — it validates arguments and dispatches the agent.

## Usage

- `/a11y-audit path/to/file.vue` — audit a specific file
- `/a11y-audit path/to/directory/` — audit all supported files in a directory
- `/a11y-audit --changed` — audit git-changed files (staged + unstaged)
- `/a11y-audit --level AAA` — override conformance level (default: AA)
- `/a11y-audit --category "Forms and validation"` — restrict to one category
- `/a11y-audit --browser http://localhost:3000` — add browser verification
- `/a11y-audit --no-cache` — skip cache, audit all scoped files
- `/a11y-audit` — defaults to changed files, level AA

## Dispatch

**Always dispatch the agent. Never evaluate files yourself.**

### Step 1: Validate arguments

Parse the user's input and validate:

1. `--level` must be `A`, `AA`, or `AAA`. If invalid, print: "Invalid level '[value]'. Use A, AA, or AAA." and stop.
2. `--category` must match one of these 9 names (case-insensitive):
   - Page structure
   - Keyboard and focus
   - Links, buttons, and controls
   - Text and visual presentation
   - Images, icons, and tables
   - Forms and validation
   - Components and dynamic UI
   - Media, motion, and timing
   - Consistency and compatibility
   If no exact match, find the closest match and suggest: "Unknown category '[value]'. Did you mean '[closest]'?" and stop.
3. `--browser` URLs must start with `http://` or `https://`. If invalid, print: "Invalid URL '[value]'. URLs must start with http:// or https://." and stop.
4. File/directory arguments: check they exist using Glob. If not found, print: "Path not found: '[value]'." and stop.

### Step 2: Dispatch the agent

Invoke the `a11y-agent` agent using the Agent tool with `subagent_type: "a11y-agent"`.

Pass the complete prompt:
```
Mode: audit
Arguments: [the full original user arguments as-is]
Level: [parsed level, default AA]
Category: [parsed category or "all"]
Browser URLs: [parsed URLs or "none"]
File targets: [parsed file/directory paths or "--changed" or "default --changed"]
No-cache: [true/false]
```

### Step 3: Stop

Do not proceed further. The agent handles everything: scoping, classification, parallel evaluation, aggregation, caching, and reporting.

## Rules

1. **Never evaluate files.** You are a dispatcher, not an evaluator.
2. **Always validate before dispatching.** Catch bad arguments early.
3. **Always dispatch the agent.** Every invocation, no exceptions.
