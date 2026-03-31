# Changelog

## 2.0.0 (2026-03-30)

### Breaking changes

- Skills split: `a11y-audit` and `a11y-fix` are now thin dispatchers. Evaluation logic moved to `a11y-evaluate`, fix logic moved to `a11y-apply`.
- Agent rewritten with new parallelism architecture.

### Features

- **Parallel execution:** Agent dispatches parallel subagents with adaptive batch sizing (1/file for <10, batches of 5 for 10-50, batches of 10 for 51+). Up to 15 concurrent workers.
- **Incremental caching:** File-hash cache (`docs/a11y-reports/.a11y-cache.json`) skips unchanged files on re-audit. Cache invalidation on content change, checklist version change, or level change. `--no-cache` flag to force full audit.
- **Progress tracking:** Delta summaries in inline output ("12 issues fixed since last audit"). Audit history in `docs/a11y-reports/audit-history.json` for trend analysis.
- **Svelte support:** `.svelte` files audited at template level (~80% of checks). Framework-specific patterns (event handlers, reactive blocks) deferred to v2.1.
- **Astro support:** `.astro` files audited at template level (~80% of checks). Framework-specific patterns (client directives, islands) deferred to v2.1.
- **Self-testing:** `/a11y-test` command runs golden-file tests (6 fixtures) and regression tests (71 snippets, one per check) with parallel execution.
- **Robust error handling:** Per-section browser fallbacks, subagent retry on failure, graceful degradation chain for all error scenarios.
- **Input validation:** Entry point skills validate arguments before dispatching (level, category, URLs, file paths).

### Architecture

- 6 skills (3 user-facing, 3 internal) + 2 agents (audit/fix orchestrator, test runner)
- Clean dispatch: entry points validate and dispatch, internal skills evaluate and apply. No dual-role ambiguity.
- Subagent failure handling: one retry, then graceful degradation.
- Safety limits: max 15 subagents, 200+ file warning, 500+ finding truncation.

### New commands

- `/a11y-test` — run the plugin self-validation suite
- `/a11y-test --fixtures` — golden-file tests only
- `/a11y-test --regression` — regression tests only

### New flags

- `--no-cache` — skip cache, force full audit

## 1.1.0 (2026-03-30)

### Features

- **Browser verification:** `--browser` flag for `/a11y-audit` verifies 20 checks in a real browser via `@playwright/mcp`
- New `a11y-browser` skill with 4 verification sections: keyboard interaction, computed styles/contrast, viewport/layout, media analysis
- 18 checks upgrade from PARTIAL to AUTO with browser, 3 from MANUAL to AUTO, 2 from MANUAL to PARTIAL
- Graceful fallback when browser MCP not configured (static-only with message)
- Support for remote URLs without source files (browser-only audit)
- Merged reporting: static + browser findings in one unified report
- Conformance statement notes which checks were browser-verified
- Browser test page (`examples/browser-test-server.html`) with deliberate violations

### Changes

- Agent now parses `--browser` argument and dispatches browser skill alongside static skill
- Fix skill handles browser findings (no source reference) with guidance output
- Report includes "Audit mode" section showing static vs browser coverage

## 1.0.0 (2026-03-29)

Initial release.

### Features

- `/a11y-audit` command for reviewing HTML, Vue, and React files against WCAG 2.2
- `/a11y-fix` command for applying automatable fixes from audit findings
- 71 WCAG 2.2 conformance checks across 9 categories
- Agent orchestrator for multi-file auditing with file classification, systemic issue detection, and conformance statements
- Three output formats: inline summary, JSON report, Markdown report
- Support for levels A, AA, and AAA (default: AA)
- Framework-specific pattern detection for Vue SFCs and React JSX/TSX
- Example files with violations and correct patterns for HTML, Vue, and React

### Architecture

- Skills are slash command entry points, always delegating to the agent
- Agent orchestrates: scoping, classification, per-file skill invocation, aggregation, reporting
- Checklist embedded in the audit skill for portability (no external file dependencies at runtime)

### Planned

- Phase 2: Browser-based verification via MCP server for runtime checks (contrast, focus trapping, keyboard navigation)
