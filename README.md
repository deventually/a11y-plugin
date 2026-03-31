# WCAG 2.2 Accessibility Plugin for Claude Code

Audit, fix, and advise on web accessibility conformance with WCAG 2.2 (levels A, AA, AAA) directly in Claude Code. Version 2.0.0 embeds 71 deterministic checks across 9 categories, runs evaluations in parallel across files, caches results incrementally, and tracks progress across audits.

## Install

```bash
claude plugin add <git-repo-url>
```

After installing, run `/a11y-audit` in any project to start auditing.

## Architecture

```
/a11y-audit or /a11y-fix          /a11y-test
        |                                |
        v                                v
  +-----------+                   +-----------+
  |   Skill   |  Entry point      |   Skill   |  Entry point
  |  Validates|  Dispatches       |  Validates|  Dispatches
  |  args     |  agent            |  infra    |  test agent
  +-----+-----+                   +-----+-----+
        |                               |
        v                               v
  +-----------+                   +-----------+
  | a11y-agent|  Orchestrator     |a11y-test- |  Test runner
  |  - Scope  |  Coordinates      |  agent    |  Fixtures +
  |  - Cache  |  all work         |           |  regression
  |  - Route  |                   +-----------+
  |  - Agg    |
  |  - Report |
  +-----+-----+
        |
        | parallel subagents
        v
  +-----+-----+-----+
  |     |     |     |
  v     v     v     v
[eval][eval][eval][browser]
  |
  v
a11y-evaluate skill (per file)
a11y-apply skill (fix mode)
a11y-browser skill (--browser)
```

The **entry point skill** validates arguments and dispatches the **agent**. The agent orchestrates: it scopes files, checks the cache, classifies content, and launches **parallel subagents** — one per batch of files, one for browser verification. Subagents call the internal skills (`a11y-evaluate`, `a11y-apply`, `a11y-browser`). Results are aggregated, merged with cached findings, and written to reports. This flow is the same whether you audit one file or fifty.

## Components

| Component | File | Role |
| --- | --- | --- |
| Audit skill | `skills/a11y-audit/SKILL.md` | User-facing entry point for `/a11y-audit` — validates args, dispatches agent |
| Fix skill | `skills/a11y-fix/SKILL.md` | User-facing entry point for `/a11y-fix` — validates args, dispatches agent |
| Test skill | `skills/a11y-test/SKILL.md` | User-facing entry point for `/a11y-test` — validates test infra, dispatches test agent |
| Evaluate skill | `skills/a11y-evaluate/SKILL.md` | Internal: per-file rule evaluator (71 checks embedded) |
| Apply skill | `skills/a11y-apply/SKILL.md` | Internal: per-file fix applicator |
| Browser skill | `skills/a11y-browser/SKILL.md` | Internal: browser-based verification via Playwright MCP |
| Agent | `agents/a11y-agent.md` | Orchestrator: scoping, caching, classification, parallel dispatch, aggregation, reporting |
| Test agent | `agents/a11y-test-agent.md` | Test runner: golden-file and regression test execution |

## Commands

### `/a11y-audit` -- Review code for accessibility issues

```bash
/a11y-audit src/components/LoginForm.vue     # audit a specific file
/a11y-audit src/components/                   # audit all supported files in a directory
/a11y-audit --changed                         # audit git-changed files (staged + unstaged)
/a11y-audit --level AAA                       # override conformance level (default: AA)
/a11y-audit --category "Forms and validation" # restrict to one category
/a11y-audit --no-cache                        # skip cache, force re-audit of all files
/a11y-audit                                   # defaults to changed files, level AA
```

Audit mode is **read-only**. No files are modified.

#### `--no-cache` flag

By default, `/a11y-audit` skips unchanged files using incremental caching (see [Performance](#performance)). Use `--no-cache` to bypass the cache and re-audit all scoped files. Useful when you've updated the checklist or want a clean baseline.

**Output** (every audit produces all three):

1. **Inline summary** -- printed to the conversation with pass/fail/manual counts and top priorities
2. **JSON report** -- `docs/a11y-reports/YYYY-MM-DD-audit.json` (machine-readable, used by `/a11y-fix`)
3. **Markdown report** -- `docs/a11y-reports/YYYY-MM-DD-audit.md` (human-readable, grouped by severity)

### `/a11y-fix` -- Fix automatable issues

```bash
/a11y-fix                                               # fix all AUTO/PARTIAL findings from latest audit
/a11y-fix forms-and-validation-every-form-control-001   # fix a specific check by ID
/a11y-fix --category "Forms and validation"             # fix all fixable findings in a category
```

Requires a prior `/a11y-audit`. After applying fixes, the agent re-runs the audit on modified files and reports what resolved and what remains.

**What it will fix:**
- `[AUTO]` findings -- deterministic fixes (missing labels, missing alt, missing lang)
- `[PARTIAL]` findings -- fixes the detectable part (adds aria-describedby, adds role attributes)

**What it will NOT fix:**
- `[MANUAL]` findings -- provides guidance text only (alt text quality, reading order, contrast)

### `/a11y-test` -- Run the plugin's self-validation suite

```bash
/a11y-test             # run all tests (golden-file + regression)
/a11y-test --fixtures  # run golden-file tests only
/a11y-test --regression # run regression tests only
```

Tests all 71 WCAG checks against known fixture files and expected outputs. Read-only — no files are modified.

**Golden-file tests:** Each file in `tests/fixtures/` has a paired `.expected.json`. The test agent invokes `a11y-evaluate` on each fixture and diffs the output against expected results.

**Regression tests:** Runs a full audit over files in `tests/regression/` to catch unexpected changes in check behavior across versions.

## Browser verification (optional)

Static analysis catches most issues but cannot verify runtime behavior. Add `--browser` with one or more URLs to verify 20 additional checks in a real browser:

```bash
# Static + browser on local dev server
/a11y-audit --browser http://localhost:3000 src/components/

# Multiple pages
/a11y-audit --browser http://localhost:3000 http://localhost:3000/login src/

# Browser-only on remote (no source files needed)
/a11y-audit --browser https://staging.myapp.com

# Browser at AAA level
/a11y-audit --browser http://localhost:3000 --level AAA src/
```

### What browser verification adds

| Without --browser | With --browser |
| --- | --- |
| 51 static checks, 20 as manual_review | 51 static checks + 20 browser-verified checks |
| "Contrast might be OK but needs manual check" | "Contrast ratio is 2.8:1 on p.subtitle (FAIL)" |
| "Focus trapping code exists" | "Tab cycles within modal correctly (PASS)" |
| "Cannot verify reflow" | "Horizontal overflow detected at 320px (FAIL)" |

### Setup

Add `@playwright/mcp` to your Claude Code settings:

```json
// .claude/settings.json or ~/.claude/settings.json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

No other installation needed. If the MCP server is not configured, `/a11y-audit --browser` falls back to static-only analysis with a message explaining how to set it up.

### Browser-verified checks (20)

| Group | Checks | What it verifies |
| --- | --- | --- |
| Keyboard interaction | 9 | Tab order, focus traps, dialog focus, widget navigation |
| Computed styles | 6 | Color contrast ratios, non-text contrast, target sizes |
| Viewport and layout | 3 | Reflow at 320px, text resize to 200%, text spacing |
| Media analysis | 2 | Flash detection, live captions (best-effort) |

### Testing browser verification

```bash
# Serve the test page
cd examples && python3 -m http.server 8080

# Run browser audit (in another terminal)
/a11y-audit --browser http://localhost:8080/browser-test-server.html
```

## Performance

v2.0.0 introduces two mechanisms that make large-codebase audits practical: parallel execution and incremental caching.

### Parallel execution

The agent dispatches multiple subagents simultaneously — one per batch of files, plus one for browser verification. Batch sizing is adaptive:

| Files to audit | Strategy |
| --- | --- |
| 1 | Single subagent |
| 2–10 | One subagent per file |
| 11–50 | Batches of 5 files per subagent |
| 51+ | Batches of 10 files per subagent |

Hard cap: never more than 15 concurrent subagents. If a batch fails, the agent retries automatically before skipping.

### Incremental caching

After each audit, results are cached to `docs/a11y-reports/.a11y-cache.json`. On subsequent runs, unchanged files are skipped:

- **Cache hit:** file fingerprint matches + checklist version matches + requested level is same or lower
- **Cache miss:** file has changed, checklist version changed, or `--no-cache` was passed
- **Always re-audited:** files matched by `--changed` (they are known to have changed)

The cache status is printed at the start of each run: `Cached: 12 files (unchanged) | To audit: 3 files`.

## Progress tracking

The plugin tracks audit history across runs, enabling delta comparisons between audits.

### Audit history

Each audit appends a summary entry to `docs/a11y-reports/audit-history.json`:

```json
{
  "date": "2026-03-30",
  "level": "AA",
  "files": 15,
  "pass": 42,
  "fail": 8,
  "manual": 11
}
```

### Delta summaries

When a previous audit exists, the inline summary includes a delta line:

```
vs. last audit (2026-03-28): FAIL -3, PASS +3  ✓ improving
```

This makes it easy to confirm that a fix run moved the needle, or to catch regressions introduced during development.

## What it checks

71 WCAG 2.2 conformance checks across 9 categories:

| Category | Checks | Examples |
| --- | --- | --- |
| Page structure | 7 | Title, lang, heading hierarchy, landmarks, skip link |
| Keyboard and focus | 6 | Keyboard access, focus traps, focus order, focus visible |
| Links, buttons, and controls | 6 | Semantic roles, link text, icon names, target size |
| Text and visual presentation | 9 | Color contrast, text resize, reflow, images of text |
| Images, icons, and tables | 6 | Alt text, decorative images, table headers |
| Forms and validation | 11 | Labels, required fields, error messages, autocomplete |
| Components and dynamic UI | 10 | Dialog focus, ARIA states, live regions |
| Media, motion, and timing | 12 | Captions, transcripts, autoplay, dragging alternatives |
| Consistency and compatibility | 4 | Consistent navigation, ARIA state updates |

### Classification

| Classification | Count | Meaning |
| --- | --- | --- |
| **AUTO** | 11 (29 with browser) | Fully automatable -- definitive pass/fail |
| **PARTIAL** | 44 (28 with browser) | Partially automatable -- clear violations flagged |
| **MANUAL** | 16 (14 with browser) | Requires human judgment |

The agent only runs checks relevant to each file's content:

| Content detected in file | Categories activated |
| --- | --- |
| `<form>`, `<input>`, `<select>`, `<textarea>` | Forms and validation |
| `<dialog>`, `role="dialog"` | Components and dynamic UI (dialog checks) |
| `<img>`, `<svg>`, `<picture>` | Images, icons, and tables |
| `<video>`, `<audio>`, `<track>` | Media, motion, and timing |
| `<table>` | Table checks |
| Always | Page structure, Keyboard, Text, Links/buttons, Consistency |

## Supported file types

| Extension | Framework | Analysis scope |
| --- | --- | --- |
| `.html` | Plain HTML | Entire file |
| `.vue` | Vue SFC | `<template>` for markup; `<script>` for event handlers and focus management |
| `.jsx` / `.tsx` | React | JSX in return statements; event handlers |
| `.svelte` | Svelte | Template markup only (v2.0 — script analysis planned for v2.1) |
| `.astro` | Astro | Template markup only (v2.0 — frontmatter analysis planned for v2.1) |

## Finding statuses

| Status | Meaning |
| --- | --- |
| `pass` | Check passes based on static analysis |
| `fail` | Clear violation found -- includes code evidence and line number |
| `manual_review` | Cannot be determined from source code alone -- includes specific instructions |

## Severity levels

| Severity | Meaning | Examples |
| --- | --- | --- |
| **CRITICAL** | Blocks users from completing tasks | Missing form labels, keyboard traps, missing alt on functional images |
| **MAJOR** | Significantly degrades the experience | Poor contrast, broken heading hierarchy, missing ARIA states |
| **MINOR** | Best practice violation | Missing landmarks, suboptimal target size, decorative image with alt text |

## Example: full audit-fix-verify workflow

```bash
# 1. Audit your current work
/a11y-audit --changed

# 2. Review the generated report
# (open docs/a11y-reports/2026-03-30-audit.md in your editor)

# 3. Fix automatable issues
/a11y-fix

# 4. Address manual review items from the report
# These need browser testing: contrast, focus indicators, screen reader flow

# 5. Commit when satisfied
git add -A && git commit -m "fix: resolve accessibility issues"
```

### Example audit output

```
/a11y-audit examples/violations-form.html
```

```
## A11y Audit Summary

Target: WCAG 2.2 AA | 1 file reviewed | 32 checks applied
Cached: 0 files (unchanged) | To audit: 1 file

  PASS     9
  FAIL    14  (5 critical, 6 major, 3 minor)
  MANUAL   9

vs. last audit (2026-03-28): FAIL -2, PASS +2  ✓ improving

### Critical failures
- [page-structure-the-page-language-001] Line 2: <html> has no lang attribute
- [page-structure-repeated-content-can-001] Line 1: No skip link or <main> landmark
- [forms-and-validation-every-form-control-001] Line 18: <input type="email"> has no label
- [forms-and-validation-placeholder-text-is-001] Line 18: Placeholder "Email" is the only label
- [links-buttons-and-controls-icon-only-controls-001] Line 25: Icon button has no aria-label

### Major failures
- [page-structure-headings-reflect-the-001] Line 15: Heading jumps from h1 to h3
- [page-structure-semantic-html-is-001] Line 7: <div class="nav"> should be <nav>
- [keyboard-and-focus-all-functionality-works-001] Line 21: <div onclick> has no keyboard handler
- [forms-and-validation-errors-are-described-001] Line 20: Error uses color only (style="color: red")
- [images-icons-and-tables-informative-images-have-001] Line 29: <img src="hero.jpg"> missing alt
- [images-icons-and-tables-data-tables-use-001] Line 32: <table> has no <th> headers

### Minor failures
- [images-icons-and-tables-decorative-images-are-001] Line 30: Decorative image has verbose alt
- [links-buttons-and-controls-pointer-targets-are-001] Line 21: Check target size of <div> submit
- [forms-and-validation-input-purpose-is-001] Line 18: Email input missing autocomplete="email"

### Conformance
- Level A: FAIL (9 of 14 checks pass)
- Level AA: FAIL (additional 0 of 18 checks evaluated)
```

### Example fix output

```
/a11y-fix
```

```
## A11y Fix Summary

### Fixed (8)
- [page-structure-the-page-language-001] violations-form.html:2 -- added lang="en" to <html>
- [page-structure-repeated-content-can-001] violations-form.html:7 -- added <a href="#main">Skip to content</a>
- [forms-and-validation-every-form-control-001] violations-form.html:18 -- added <label for="email">Email</label>
- [forms-and-validation-placeholder-text-is-001] violations-form.html:18 -- resolved by label addition
- [images-icons-and-tables-informative-images-have-001] violations-form.html:29 -- added alt=""
- [images-icons-and-tables-decorative-images-are-001] violations-form.html:30 -- changed alt to ""
- [images-icons-and-tables-data-tables-use-001] violations-form.html:32 -- added <th scope="col">
- [forms-and-validation-input-purpose-is-001] violations-form.html:18 -- added autocomplete="email"

### Verified
Re-ran audit: 17 checks now pass, 6 still fail, 9 require manual review.

### Still needs attention
#### Could not auto-fix
- [page-structure-semantic-html-is-001] violations-form.html:7 -- <div class="nav"> should be <nav>;
  requires understanding page structure to refactor safely
- [keyboard-and-focus-all-functionality-works-001] violations-form.html:21 -- <div onclick> needs
  keyboard handler; replace with <button> or add tabindex="0" + onkeydown

#### Requires manual review
- [page-structure-information-and-instructions-001] -- check instructions don't rely on color/shape alone
- [text-and-visual-presentation-normal-text-contrast-001] -- test text contrast ratios in browser
- ... 7 more (see full report)
```

## What is automatable vs. what needs manual review

### Reliably detected by static analysis

- Missing or empty `alt` attributes on `<img>`
- `<input>`, `<select>`, `<textarea>` without an associated `<label>`, `aria-label`, or `aria-labelledby`
- `<html>` missing `lang` attribute
- Heading hierarchy skips (h1 followed by h3)
- Interactive `<div>`/`<span>` with click handlers but no keyboard handler
- `<button>` or `<a>` with no text and no `aria-label` (icon-only controls)
- `<table>` without `<th>` header cells
- `<dialog>` without `aria-label` or `aria-labelledby`
- Placeholder as the only label (no `<label>` element)
- Missing `autocomplete` on personal data fields
- Missing `aria-expanded`/`aria-selected` on stateful components
- Error containers without `role="alert"` or `aria-live`

### Requires browser or human verification

- Color contrast ratios (needs computed style resolution)
- Whether a focus indicator is actually visible (CSS `outline: none` detected, but custom focus styles may exist)
- Screen reader announcement order
- Whether `alt` text is meaningful (presence detected, quality cannot be assessed)
- Whether animations respect `prefers-reduced-motion`
- Whether timeout warnings are sufficient
- Reading level and cognitive load of error messages
- Whether drag alternatives actually work
- Focus trapping behavior in modals (code patterns detected, runtime behavior unverifiable)

These are returned as `manual_review` with specific instructions for what to test.

## Updating the checklist

The 71 checks are embedded directly in `skills/a11y-evaluate.md` for portability. The source data and tooling are included for regeneration:

- `checklist/wcag22-checklist.json` -- full structured JSON (generated from xlsx)
- `scripts/export-checklist.py` -- converts the xlsx to JSON with enrichment data

To update after modifying the xlsx:

```bash
# 1. Regenerate the JSON
python3 scripts/export-checklist.py

# 2. Regenerate the embedded checklist in the skill
#    (the export script output needs to be copied into skills/a11y-evaluate.md)

# 3. Invalidate the cache for all users
#    (bump the checklist version in the agent — cache entries keyed to old version will miss)
```

## Future plans

Future enhancements are tracked separately from this public distribution.

## License

This plugin is provided as-is for accessibility auditing purposes.
