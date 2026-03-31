# Examples

Sample files demonstrating common accessibility violations and their correct counterparts. Use these to test the plugin and learn accessible patterns.

## Quick start

```bash
# Audit a file with violations -- see what the plugin catches
/a11y-audit examples/violations-form.html

# Audit the correct version -- see a clean report
/a11y-audit examples/passing-form.html

# Audit all examples at once
/a11y-audit examples/

# Fix the violation files
/a11y-fix
```

## Files with violations

### violations-form.html (14 violations)

Plain HTML login form. Covers the most common accessibility mistakes.

| Violation | Line | Check ID | Severity |
| --- | --- | --- | --- |
| `<html>` missing `lang` | 2 | page-structure-the-page-language-001 | CRITICAL |
| No `<title>` element | -- | page-structure-each-page-has-001 | CRITICAL |
| No skip link or `<main>` landmark | -- | page-structure-repeated-content-can-001 | CRITICAL |
| `<div class="nav">` instead of `<nav>` | 8 | page-structure-semantic-html-is-001 | MAJOR |
| Heading jumps h1 to h3 | 15 | page-structure-headings-reflect-the-001 | MAJOR |
| `<input type="email">` has no label | 18 | forms-and-validation-every-form-control-001 | CRITICAL |
| `<input type="password">` has no label | 19 | forms-and-validation-every-form-control-001 | CRITICAL |
| Placeholder is the only label | 18-19 | forms-and-validation-placeholder-text-is-001 | CRITICAL |
| Error div uses color only | 20 | forms-and-validation-errors-are-described-001 | CRITICAL |
| `<div onclick>` instead of `<button>` | 21 | links-buttons-and-controls-links-are-used-001 | MAJOR |
| `<div onclick>` has no keyboard handler | 21, 24 | keyboard-and-focus-all-functionality-works-001 | CRITICAL |
| Icon button has no accessible name | 24 | links-buttons-and-controls-icon-only-controls-001 | CRITICAL |
| `<img>` missing `alt` attribute | 28 | images-icons-and-tables-informative-images-have-001 | CRITICAL |
| Decorative image has verbose alt text | 29 | images-icons-and-tables-decorative-images-are-001 | MINOR |
| `<table>` has no `<th>` headers | 31 | images-icons-and-tables-data-tables-use-001 | CRITICAL |

### violations-vue.vue (7 violations)

Vue SFC user profile form with missing labels, non-semantic buttons, and an unlabeled dialog.

| Violation | Line | Check ID | Severity |
| --- | --- | --- | --- |
| Heading jumps h1 to h3 | 4 | page-structure-headings-reflect-the-001 | MAJOR |
| `<input>` elements have no labels | 7-8 | forms-and-validation-every-form-control-001 | CRITICAL |
| `<select>` has no label | 10 | forms-and-validation-every-form-control-001 | CRITICAL |
| Error uses color only, no `role="alert"` | 14-16 | forms-and-validation-errors-are-described-001 | CRITICAL |
| `<div @click>` with no `@keydown` | 19 | keyboard-and-focus-all-functionality-works-001 | CRITICAL |
| Icon-only `<div>` has no accessible name | 22-24 | links-buttons-and-controls-icon-only-controls-001 | CRITICAL |
| `<dialog>` has no `aria-label` or `aria-labelledby` | 26 | components-and-dynamic-ui-dialogs-have-an-001 | CRITICAL |

### violations-react.tsx (7 violations)

React TypeScript login form with the same patterns expressed in JSX.

| Violation | Line | Check ID | Severity |
| --- | --- | --- | --- |
| Heading jumps h1 to h3 | 12 | page-structure-headings-reflect-the-001 | MAJOR |
| `<input>` elements have no labels | 15-24 | forms-and-validation-every-form-control-001 | CRITICAL |
| Error uses color only, no `role="alert"` | 27 | forms-and-validation-errors-are-described-001 | CRITICAL |
| `<div onClick>` with no `onKeyDown` | 29-31 | keyboard-and-focus-all-functionality-works-001 | CRITICAL |
| Icon-only `<div>` has no accessible name or keyboard handler | 34-37 | links-buttons-and-controls-icon-only-controls-001 | CRITICAL |
| `<img>` missing `alt` attribute | 44 | images-icons-and-tables-informative-images-have-001 | CRITICAL |
| `<table>` has no `<th>` headers | 46-55 | images-icons-and-tables-data-tables-use-001 | CRITICAL |

### browser-test-server.html

A self-contained HTML page designed to test browser-based verification. Serve locally with `python3 -m http.server 8080` and run `/a11y-audit --browser http://localhost:8080/browser-test-server.html`.

| Violation | Element | Check group | Expected result |
| --- | --- | --- | --- |
| Low contrast text (2.85:1) | `p.low-contrast` | Contrast | FAIL |
| Small target (16x16px) | `button.small-target` | Contrast | FAIL |
| No focus indicator | `a.no-focus-ring` | Keyboard | FAIL |
| Horizontal overflow at 320px | `div.fixed-width` | Viewport | FAIL |
| Text clipped at 200% zoom | `div.fixed-height` | Viewport | FAIL |
| Focus trap (no Escape) | `#modal` | Keyboard | FAIL |
| Sticky header obscures focus | `.sticky-header` | Keyboard | FAIL |
| No keyboard access | `div[onclick]` | Keyboard | FAIL |

Elements that should PASS:
- Sufficient contrast text (`#767676` on white = 4.54:1)
- Normal sized button (default padding)
- Link with default focus ring
- Labeled form with autocomplete

## Files with correct patterns

Each passing file mirrors the corresponding violation file with all issues resolved. Auditing these should produce zero failures (some `manual_review` items will appear for checks that require browser testing).

### passing-form.html

| Pattern | Implementation |
| --- | --- |
| Language declaration | `<html lang="en">` |
| Page title | `<title>Login - MyApp</title>` |
| Skip link | `<a href="#main" class="skip-link">Skip to content</a>` |
| Semantic landmarks | `<header>`, `<nav aria-label="Main navigation">`, `<main id="main">` |
| Heading hierarchy | h1 followed by h2 (no skips) |
| Labeled form fields | `<label for="email">` paired with `<input id="email">` |
| Autocomplete hints | `autocomplete="email"`, `autocomplete="current-password"` |
| Required field semantics | `required` + `aria-required="true"` |
| Live error region | `<div role="alert" aria-live="assertive">` |
| Native submit button | `<button type="submit">Sign in</button>` |
| Icon button with name | `<button aria-label="Settings">` wrapping `<svg aria-hidden="true">` |
| Informative image alt | `alt="Team collaborating in a bright modern office"` |
| Decorative image | `alt="" role="presentation"` |
| Table headers | `<th scope="col">` inside `<thead>` with `<caption>` |

### passing-vue.vue

| Pattern | Implementation |
| --- | --- |
| Heading hierarchy | h1 followed by h2 |
| Labeled form fields | `<label for="name">` paired with `<input id="name">` |
| Labeled select | `<label for="country">` paired with `<select id="country">` |
| Autocomplete hints | `autocomplete="name"`, `autocomplete="email"`, `autocomplete="country-name"` |
| Error with role + icon | `<div role="alert" aria-live="assertive">` with text (not color-only) |
| Native button | `<button type="submit">Save Changes</button>` |
| Icon button with name | `<button aria-label="Settings">` with `<svg aria-hidden="true">` |
| Dialog with accessible name | `<dialog aria-labelledby="dialog-title">` with `<h2 id="dialog-title">` |
| Focus management | `showModal()` for focus trapping; `triggerElement.focus()` on close |

### passing-react.tsx

| Pattern | Implementation |
| --- | --- |
| Heading hierarchy | h1 followed by h2 |
| Labeled form fields | `<label htmlFor="email">` paired with `<input id="email">` |
| Autocomplete hints | `autoComplete="email"`, `autoComplete="current-password"` |
| Required semantics | `required` + `aria-required="true"` |
| Error with role | `<div role="alert" aria-live="assertive">` |
| Native button | `<button type="submit">Sign In</button>` |
| Icon button with name | `<button aria-label="Help">` with `<svg aria-hidden="true">` |
| Dialog with accessible name | `<dialog aria-labelledby="dialog-heading">` with `<h2 id="dialog-heading">` |
| Focus management | `showModal()` for trapping; `triggerRef.current.focus()` on close |
| Informative image alt | `alt="Welcome illustration showing a secure login screen"` |
| Table structure | `<caption>`, `<thead>`, `<th scope="col">`, `<tbody>` |

## Side-by-side comparison

The best way to learn the patterns is to diff the violation and passing versions:

```bash
diff examples/violations-form.html examples/passing-form.html
diff examples/violations-vue.vue examples/passing-vue.vue
diff examples/violations-react.tsx examples/passing-react.tsx
```
