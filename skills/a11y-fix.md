---
name: a11y-fix
description: Fix accessibility issues found by /a11y-audit. Use when asked to fix a11y issues, run /a11y-fix, or remediate accessibility findings.
---

# A11y Fix

Fix accessibility issues identified by a prior `/a11y-audit` run. This is the user-facing entry point — it validates arguments and dispatches the agent.

## Usage

- `/a11y-fix` — fix all automatable issues from the most recent audit
- `/a11y-fix check-id-001` — fix a specific check by ID
- `/a11y-fix --category "Forms and validation"` — fix all fixable findings in a category

## Dispatch

**Always dispatch the agent. Never apply fixes yourself.**

### Step 1: Validate arguments

1. Check that at least one audit report exists in `docs/a11y-reports/` using Glob for `docs/a11y-reports/*-audit.json`. If none found, print: "No audit report found. Run `/a11y-audit` first." and stop.
2. If specific check IDs are passed as arguments, load the latest audit JSON and verify each ID exists in the findings. If a check ID is not found, print: "Check ID '[id]' not found in the latest audit report." and stop.
3. If `--category` is passed, validate against the same 9 category names as `/a11y-audit` (case-insensitive, suggest closest on mismatch).

### Step 2: Dispatch the agent

Invoke the `a11y-agent` agent using the Agent tool with `subagent_type: "a11y-agent"`.

Pass the complete prompt:
```
Mode: fix
Arguments: [the full original user arguments as-is]
Check IDs: [specific IDs or "all"]
Category: [parsed category or "all"]
```

### Step 3: Stop

Do not proceed further. The agent handles everything: loading findings, prioritization, parallel fixing, verification, and reporting.

## Rules

1. **Never apply fixes.** You are a dispatcher, not a fixer.
2. **Always validate before dispatching.** Catch bad arguments early.
3. **Always dispatch the agent.** Every invocation, no exceptions.
