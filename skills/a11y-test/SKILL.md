---
name: a11y-test
description: Run the a11y plugin test suite to validate all 71 checks against known fixtures. Use /a11y-test.
---

# A11y Test

Run the plugin's self-validation test suite. This tests all 71 WCAG checks against known input files and expected outputs.

## Usage

- `/a11y-test` — run all tests (golden-file + regression)
- `/a11y-test --fixtures` — run golden-file tests only
- `/a11y-test --regression` — run regression tests only

## Dispatch

**Always dispatch the test agent. Never run tests yourself.**

### Step 1: Validate test infrastructure

1. Check `tests/fixtures/` exists and contains `.expected.json` files. If not: "Test fixtures not found at tests/fixtures/. Is the plugin installed correctly?" and stop.
2. Check `tests/regression/` exists and contains `.html` files. If not: "Regression tests not found at tests/regression/. Is the plugin installed correctly?" and stop.

### Step 2: Dispatch the test agent

Invoke the `a11y-test-agent` agent using the Agent tool with `subagent_type: "a11y-test-agent"`.

Pass the prompt:
```
Mode: test
Scope: [all / fixtures / regression]
```

### Step 3: Stop

The test agent handles everything.

## Rules

1. **Never evaluate files yourself.** Always dispatch the test agent.
2. **Read-only.** Tests never modify any files.
