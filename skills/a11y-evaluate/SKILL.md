---
name: a11y-evaluate
description: "Internal: per-file WCAG 2.2 evaluation. Called by a11y-agent, not invoked directly by users."
---

# A11y Evaluate (Internal)

Evaluate a single source file for WCAG 2.2 accessibility conformance. This skill is called by the a11y-agent for each file in scope. It reads the file, classifies it, applies the relevant checklist checks, and returns structured findings.

## Input

- **file**: Absolute path to the source file to evaluate
- **level**: Target conformance level — `A`, `AA`, or `AAA`
- **category** (optional): Restrict evaluation to one category (default: all)

## Process

### Step 1: Determine scope

Parse the `level` and `category` inputs:

- Level determines which checks are included:
  - `A` → include only Level A checks
  - `AA` → include Level A and AA checks
  - `AAA` → include all checks (A, AA, and AAA)
- Category filters which category group(s) to evaluate. If `all`, include every category.

### Step 2: Read and classify the file

Read the file at the given path. Detect the file type from the extension:

- `.html` → Plain HTML. Evaluate the full document.
- `.vue` → Vue SFC. Extract `<template>`, `<script>`, and `<style>` blocks. Focus on `<template>` for structural checks. Use `<script>` for event handling, ARIA bindings, and dynamic state. Use `<style>` for color and contrast indicators.
- `.jsx` / `.tsx` → React JSX/TSX. The entire file is treated as a component. JSX return value is the template. Evaluate attribute names in JSX form (`className`, `htmlFor`, `aria-*` are valid JSX).
- `.svelte` → Svelte. Evaluate the template portion (markup outside `<script>` and `<style>` blocks). Note: Svelte-specific directives (e.g. `on:click`, `bind:`) are template-only patterns — do not flag them as errors.
- `.astro` → Astro. Evaluate the template portion (markup below the frontmatter fence `---`). Note: Astro components are template-only at build time — do not flag missing runtime interactivity as errors unless the component has explicit `client:*` directives.

Determine applicable categories based on content patterns:

- If no `<form>`, `<input>`, `<select>`, `<textarea>` → skip "Forms and validation"
- If no `<img>`, `<svg>`, `<table>`, `<figure>` → skip "Images, icons, and tables"
- If no `<video>`, `<audio>`, `<canvas>`, `<iframe>` → skip "Media, motion, and timing"
- If no interactive components (dialogs, menus, tabs, accordions) → skip "Components and dynamic UI"
- Always include: "Page structure", "Keyboard and focus", "Links, buttons, and controls", "Text and visual presentation", "Consistency and compatibility"

### Step 3: Filter checklist by level

Apply the level filter determined in Step 1:

- Level A only: include checks tagged `[A]`
- Level AA: include checks tagged `[A]` and `[AA]`
- Level AAA: include all checks

Then apply any category filter.

### Step 4: Evaluate each check

For each check in the filtered set:

- `[AUTO]` checks → determine `pass` or `fail` by inspecting the source. These are deterministic.
- `[PARTIAL]` checks → attempt to determine `pass` or `fail`. If the file does not contain enough evidence to make a determination, return `manual_review`.
- `[MANUAL]` checks → always return `manual_review` with the manual instruction as the note.

When marking a finding `fail`, always include:
- `check_id`: the check identifier
- `severity`: from the check definition
- `evidence`: the exact line(s) or pattern from the source that triggered the failure
- `fix`: the fix suggestion from the check definition

When marking `manual_review`, include:
- `check_id`
- `note`: the manual instruction or reason why automation could not determine pass/fail

#### Framework-specific patterns

**Vue SFC**
- `:aria-*` and `v-bind:aria-*` are valid dynamic ARIA bindings — do not flag as missing
- `v-if` / `v-show` affect visibility; consider impact on focus management
- `$emit` and `@click` indicate interactivity — check for keyboard equivalents
- Scoped styles may hide color context; note when contrast cannot be determined

**React JSX/TSX**
- `aria-*` attributes are valid in JSX — do not flag as unknown attributes
- `htmlFor` is the JSX equivalent of `for` on `<label>` — treat as valid label association
- `className` is the JSX equivalent of `class` — treat as valid
- `onClick` on non-interactive elements (e.g. `<div onClick>`) is a keyboard accessibility concern — flag unless `onKeyDown`/`onKeyUp`/`role` is also present

**Plain HTML**
- Evaluate as-is. All standard HTML attributes apply.
- Inline `style` attributes may contain color information — parse when possible

**Svelte template-only (v2.0)**
- `on:click`, `on:keydown`, etc. are Svelte event directives — treat as equivalent to HTML event handlers
- `bind:value`, `bind:checked` are Svelte bindings — treat as equivalent to standard form bindings
- `{#if}`, `{#each}`, `{#await}` are Svelte template logic — consider in dynamic content checks

**Astro template-only (v2.0)**
- Astro components render to static HTML by default
- Do not flag missing client-side interactivity unless `client:*` directives are present
- `<slot />` indicates composition — note when slot content cannot be evaluated statically

### Step 5: Output

Return a structured JSON object:

```json
{
  "file": "/absolute/path/to/file.vue",
  "framework": "vue",
  "framework_note": null,
  "summary": {
    "checks_applied": 0,
    "passes": 0,
    "fails": 0,
    "manual_review": 0
  },
  "findings": [
    {
      "check_id": "check-id-here",
      "status": "fail",
      "severity": "critical",
      "wcag_sc": ["SC numbers"],
      "level": "A",
      "title": "check description",
      "file": "/absolute/path/to/file.vue",
      "line": null,
      "evidence": "line or snippet from the file",
      "fix": "fix suggestion"
    },
    {
      "check_id": "check-id-here",
      "status": "manual_review",
      "severity": "major",
      "wcag_sc": ["SC numbers"],
      "level": "A",
      "title": "check description",
      "file": "/absolute/path/to/file.vue",
      "line": null,
      "evidence": "manual instruction or reason",
      "fix": "fix suggestion"
    }
  ]
}
```

Only include checks that resulted in `fail` or `manual_review` in the `findings` array. Passed checks contribute to the `passes` count only.

## Rules

1. **Never modify the file.** This skill is read-only.
2. **Never guess.** If there is not enough evidence to determine pass or fail, return `manual_review`.
3. **Always cite evidence.** Every `fail` finding must include the exact source evidence.
4. **Use this checklist as the source of truth.** Do not invent checks or criteria not listed here.
5. **Report all checks.** Every check in the filtered set must be counted in the summary, even if it passed.
6. **Be honest about limitations.** If a check requires runtime behavior (e.g. focus management, contrast in dynamic themes), say so in the `note`.

## WCAG 2.2 Checklist

---

### Page structure

**[page-structure-each-page-has-001]** [A] [CRITICAL] [PARTIAL] SC 2.4.2
Each page has a unique, descriptive title
Pass: Document has a non-empty `<title>` element
Fail: No `<title>` element or `<title>` is empty
Fix: Add a descriptive `<title>` element in the `<head>`

---

**[page-structure-the-page-language-001]** [A] [CRITICAL] [AUTO] SC 3.1.1
Page language declared correctly
Pass: `<html>` element has a valid, non-empty `lang` attribute (e.g. `lang="en"`)
Fail: `<html>` element is missing `lang` or `lang` is empty
Fix: Add `lang="[language code]"` to the `<html>` element

---

**[page-structure-headings-reflect-the-001]** [A] [MAJOR] [PARTIAL] SC 1.3.1, 2.4.6
Headings reflect the content structure
Pass: Headings (`<h1>`–`<h6>`) are used in logical, hierarchical order without skipping levels; heading text is descriptive
Fail: Heading levels are skipped (e.g. `<h1>` followed by `<h3>`), headings are used for visual styling only, or heading text is non-descriptive (e.g. "Click here")
Fix: Use headings in hierarchical order; ensure heading text describes the section content

---

**[page-structure-semantic-html-is-001]** [A] [MAJOR] [PARTIAL] SC 1.3.1, 4.1.2
Semantic HTML used appropriately
Pass: Landmarks (`<main>`, `<nav>`, `<header>`, `<footer>`, `<aside>`, `<section>`) are used to identify page regions; interactive elements use native HTML (`<button>`, `<a>`, `<input>`) rather than generic elements with ARIA overrides
Fail: Generic elements (`<div>`, `<span>`) are used as interactive controls without appropriate role and keyboard support; landmark regions are absent; `<table>` used for layout
Fix: Replace generic elements with semantic HTML equivalents; add landmark regions; use `<button>` for clickable controls

---

**[page-structure-repeated-content-can-001]** [A] [CRITICAL] [AUTO] SC 2.4.1
Repeated content can be bypassed (skip link)
Pass: A skip navigation link (`<a href="#main">`) or equivalent mechanism is present, and its target (`id="main"`) exists in the document
Fail: No skip navigation link found, or skip link target does not exist in the document
Fix: Add `<a href="#main" class="skip-link">Skip to main content</a>` at the top of the `<body>`, and ensure `<main id="main">` exists

---

**[page-structure-information-and-instructions-001]** [A] [MAJOR] [MANUAL] SC 1.3.3, 1.4.1
Information and instructions are not conveyed by color, shape, position, or sound alone
Fix: Ensure any instruction that references color, shape, or position also includes a text alternative (e.g. "Click the red button" → "Click the Submit button (highlighted in red)")
Manual: Review the page visually. Check for instructions that use color alone (e.g. "required fields are in red"), shape alone (e.g. "click the round button"), or position alone (e.g. "use the menu on the left"). Verify a text label or alternative is always present.

---

**[page-structure-repeated-navigation-and-001]** [AA] [MINOR] [MANUAL] SC 3.2.3
Repeated navigation and UI components appear in a consistent order
Fix: Ensure navigation menus, headers, footers, and repeated UI patterns appear in the same relative order on every page
Manual: Compare this file to other page templates or layout files in the codebase. Verify that repeated navigation blocks (main nav, breadcrumb, footer links) appear in the same order across pages.

---

### Keyboard and focus

**[keyboard-and-focus-all-functionality-works-001]** [A] [CRITICAL] [PARTIAL] SC 2.1.1
All functionality is operable via keyboard
Pass: All interactive elements are natively focusable (or have `tabindex="0"`) and respond to keyboard events (`keydown`, `keyup`, `keypress`, `Enter`, `Space`)
Fail: `onClick` (or equivalent) is attached to a non-interactive element (`<div>`, `<span>`, `<li>`) without a keyboard event handler and without an appropriate `role`; interactive elements are hidden from keyboard via `tabindex="-1"` without programmatic focus management
Fix: Replace non-interactive elements with `<button>` or `<a>`, or add `role`, `tabindex="0"`, and keyboard event handlers

---

**[keyboard-and-focus-there-are-no-001]** [A] [CRITICAL] [PARTIAL] SC 2.1.2
There are no keyboard traps
Pass: No component programmatically traps focus without providing a documented way to escape (e.g. `Escape` key closes a modal)
Fail: A focus trap is implemented without an escape mechanism; `keydown` handler prevents default on all keys without allowing `Tab` or `Escape` to exit
Fix: Ensure all focus traps have an explicit escape mechanism; for modals, implement `Escape` key to close and return focus

---

**[keyboard-and-focus-focus-order-is-001]** [A] [MAJOR] [PARTIAL] SC 2.4.3
Focus order is logical and follows visual/content order
Pass: DOM order matches the expected reading and interaction order; no positive `tabindex` values (> 0) that disrupt natural tab order
Fail: Positive `tabindex` values are used; DOM order is significantly inconsistent with visual layout (e.g. CSS `order` or `position` creates a mismatch)
Fix: Remove positive `tabindex` values; reorder DOM to match visual reading order; avoid CSS techniques that visually reorder content inconsistently with DOM order

---

**[keyboard-and-focus-focus-moves-appropriately-001]** [A] [CRITICAL] [PARTIAL] SC 2.4.3, 3.2.1
Focus moves appropriately when UI changes
Pass: When dialogs open, focus moves into the dialog; when dialogs close, focus returns to the triggering element; focus is not moved unexpectedly on input or hover
Fail: A dialog or panel is shown without any focus management; `focus()` is called on an unrelated element on change events; focus moves to the top of the page without user action
Fix: On modal open, move focus to the first focusable element inside the modal; on close, return focus to the triggering control

---

**[keyboard-and-focus-focus-is-clearly-001]** [AA] [MAJOR] [PARTIAL] SC 2.4.7
Focus is clearly visible on interactive elements
Pass: No CSS rules using `outline: none` or `outline: 0` without a custom focus indicator replacement; custom focus styles are present for focused state
Fail: `outline: none` or `outline: 0` is applied globally or to interactive elements without a visible alternative focus style
Fix: Remove `outline: none`; if a custom focus style is needed, define `:focus-visible` with a visible outline or border that meets contrast requirements

---

**[keyboard-and-focus-focused-elements-are-001]** [AA] [MAJOR] [PARTIAL] SC 2.4.11
Focused elements are not entirely hidden
Pass: No focused interactive element is fully obscured by sticky headers, fixed banners, or other overlapping content
Fail: A sticky `position: fixed` header or footer overlaps focusable elements when they receive focus; `scroll-padding-top` or `scroll-margin-top` is not set to account for sticky elements
Fix: Add `scroll-padding-top` to the `html` element (or `scroll-margin-top` to focusable elements) equal to the height of any fixed header

---

### Links, buttons, and controls

**[links-buttons-and-controls-links-are-used-001]** [A] [MAJOR] [PARTIAL] SC 4.1.2
Links are used for navigation, buttons are used for actions
Pass: `<a href>` elements navigate to a URL or anchor; `<button>` elements perform actions (submit, toggle, open); no `<a>` without `href` used as a button
Fail: `<a>` without `href` is used as a button (click target with no navigation); `<button>` is used to navigate to a URL via `window.location` without `<a>`; `<div>` or `<span>` used as a link or button without role
Fix: Use `<a href="...">` for navigation; use `<button type="button">` for actions; do not use `<a>` without `href` as an interactive trigger

---

**[links-buttons-and-controls-link-purpose-is-001]** [A] [MAJOR] [PARTIAL] SC 2.4.4
Link purpose is clear from the link text or context
Pass: Link text is descriptive on its own, or the link has `aria-label` / `aria-labelledby` providing context; no generic link text without additional context
Fail: Links with generic text ("click here", "read more", "learn more", "here") without `aria-label` or visually hidden supplementary text; icon-only links without accessible name
Fix: Replace generic link text with descriptive text; add `aria-label="[descriptive label]"` to icon links or links where context cannot be embedded in visible text

---

**[links-buttons-and-controls-icon-only-controls-001]** [A] [CRITICAL] [AUTO] SC 4.1.2, 2.5.3
Icon-only controls have an accessible name
Pass: Every `<button>`, `<a>`, or interactive control that contains only an icon (SVG, `<img>`, `<i>`) has an `aria-label`, `aria-labelledby`, or visually hidden text
Fail: Icon-only button or link with no `aria-label`, no `aria-labelledby`, no `title`, and no visually hidden text child
Fix: Add `aria-label="[descriptive action]"` to icon-only controls; for SVG icons, add `aria-hidden="true"` to the SVG and provide the label on the parent control

---

**[links-buttons-and-controls-custom-controls-expose-001]** [A] [CRITICAL] [PARTIAL] SC 4.1.2
Custom controls expose name, role, and state to assistive technology
Pass: Custom interactive controls have an appropriate `role`, `aria-label` or `aria-labelledby`, and state attributes (`aria-expanded`, `aria-checked`, `aria-selected`, `aria-pressed`) that are updated dynamically
Fail: A custom control (e.g. a `<div>` acting as a button, checkbox, or tab) is missing `role`, accessible name, or state attributes; state attributes are static and not updated on interaction
Fix: Add `role="[appropriate role]"`, `aria-label="[name]"`, and relevant state attributes; update state attributes dynamically using JavaScript/framework reactivity

---

**[links-buttons-and-controls-controls-do-not-001]** [A] [MAJOR] [PARTIAL] SC 3.2.1, 3.2.2
Controls do not trigger unexpected context changes on focus or input
Pass: No `onChange` handler on a `<select>` or `<input>` that navigates the page or submits a form without user confirmation; no `onFocus` that triggers navigation or significant page change
Fail: `<select onChange>` triggers navigation; `<input onFocus>` opens a new page; form submits automatically on input without a submit button
Fix: Require explicit user action (e.g. a submit button) to trigger navigation or form submission; do not use `onChange` or `onFocus` for navigation

---

**[links-buttons-and-controls-pointer-targets-are-001]** [AA] [MINOR] [PARTIAL] SC 2.5.8
Pointer targets are at least 24×24 CSS pixels
Pass: Interactive elements have a minimum touch/click target size of 24×24 CSS pixels (width and height, including padding)
Fail: Small inline links, icon buttons, or controls have dimensions visually or explicitly set below 24×24 CSS pixels without adequate spacing from other targets
Fix: Increase padding or minimum dimensions so the clickable/touch area is at least 24×24 CSS pixels; use `min-width` and `min-height` or padding to enlarge the target

---

### Text and visual presentation

**[text-and-visual-presentation-color-is-not-001]** [A] [MAJOR] [PARTIAL] SC 1.4.1
Color is not the only visual means of conveying information
Pass: Where color is used to convey meaning (e.g. error state, status indicator), an additional visual cue (icon, pattern, text label, underline) is also present
Fail: Error state conveyed only by red text color without an error icon or label; status indicators that use only color (green/red dots) without a text or icon alternative
Fix: Add a non-color visual indicator alongside any color-coded meaning (e.g. an error icon next to red error text; a text label alongside a colored status dot)

---

**[text-and-visual-presentation-normal-text-contrast-001]** [AA] [MAJOR] [PARTIAL] SC 1.4.3
Normal text has at least 4.5:1 contrast ratio against its background
Pass: Text smaller than 18pt (or 14pt bold) has a contrast ratio of at least 4.5:1 against its background color
Fail: Text and background color combination has a contrast ratio below 4.5:1 (detectable from inline styles or CSS color declarations in the file)
Fix: Adjust text or background color to achieve at least 4.5:1 contrast ratio; use a contrast checker to verify

---

**[text-and-visual-presentation-large-text-contrast-001]** [AA] [MAJOR] [PARTIAL] SC 1.4.3
Large text has at least 3:1 contrast ratio against its background
Pass: Text at 18pt or larger (or 14pt bold or larger) has a contrast ratio of at least 3:1 against its background
Fail: Large text and background color combination has a contrast ratio below 3:1 (detectable from inline styles or CSS in the file)
Fix: Adjust text or background color for large text to achieve at least 3:1 contrast ratio

---

**[text-and-visual-presentation-text-can-be-001]** [AA] [MAJOR] [MANUAL] SC 1.4.4
Text can be resized up to 200% without loss of content or functionality
Fix: Avoid fixed pixel heights on text containers; use `rem`, `em`, or `%` for font sizes and container heights; do not clip or hide overflow text
Manual: Zoom the browser to 200% and verify that all text is still readable, no text is clipped or overlapping, and all functionality remains accessible.

---

**[text-and-visual-presentation-content-reflows-without-001]** [AA] [MAJOR] [MANUAL] SC 1.4.10
Content reflows without horizontal scrolling at 320px viewport width
Fix: Use responsive CSS (flexbox, grid, `max-width`, `min-width`) so content adapts to narrow viewports; avoid fixed-width layouts that require horizontal scrolling
Manual: Resize the browser viewport to 320px wide (or use browser dev tools). Verify that all content is visible without horizontal scrolling and that no content is lost.

---

**[text-and-visual-presentation-images-of-text-001]** [AA] [MINOR] [PARTIAL] SC 1.4.5
Images of text are not used where real text can achieve the same visual result
Pass: No `<img>` elements contain screenshots of text; no CSS `background-image` is used to display text content
Fail: `<img>` `alt` text or `src` filename suggests it is an image of text (e.g. "banner-text.png", "headline.jpg"); background images are used in place of real text
Fix: Replace images of text with real HTML text styled with CSS; logos and essential brand text are exempt

---

**[text-and-visual-presentation-text-spacing-changes-001]** [AA] [MINOR] [MANUAL] SC 1.4.12
Content remains functional when text spacing is increased
Fix: Avoid fixed-height containers for text; do not use `overflow: hidden` on text containers with fixed dimensions; use `min-height` instead of `height` for text-containing elements
Manual: Apply the WCAG text spacing bookmarklet (line-height: 1.5, letter-spacing: 0.12em, word-spacing: 0.16em, paragraph spacing: 2em). Verify that no content is clipped, truncated, or overlapping.

---

**[text-and-visual-presentation-normal-text-contrast-002]** [AAA] [MINOR] [PARTIAL] SC 1.4.6
Normal text has at least 7:1 contrast ratio against its background (AAA)
Pass: Text smaller than 18pt (or 14pt bold) has a contrast ratio of at least 7:1 against its background
Fail: Text and background color combination has a contrast ratio below 7:1 (detectable from inline styles or CSS in the file)
Fix: Adjust text or background color to achieve at least 7:1 contrast ratio for enhanced contrast conformance

---

**[text-and-visual-presentation-large-text-contrast-002]** [AAA] [MINOR] [PARTIAL] SC 1.4.6
Large text has at least 4.5:1 contrast ratio against its background (AAA)
Pass: Text at 18pt or larger (or 14pt bold or larger) has a contrast ratio of at least 4.5:1 against its background
Fail: Large text and background color combination has a contrast ratio below 4.5:1 (detectable from inline styles or CSS in the file)
Fix: Adjust text or background color for large text to achieve at least 4.5:1 contrast ratio for enhanced contrast conformance

---

### Images, icons, and tables

**[images-icons-and-tables-informative-images-have-001]** [A] [CRITICAL] [PARTIAL] SC 1.1.1
Informative images have meaningful alternative text
Pass: `<img>` elements that convey information have a non-empty `alt` attribute that describes the image content or function
Fail: `<img>` with no `alt` attribute; `<img>` with `alt=""` when the image is informative (not decorative); `alt` text that is filename-like (e.g. `alt="image123.png"`) or non-descriptive (e.g. `alt="photo"`)
Fix: Add descriptive `alt` text that conveys the same information as the image; for charts/graphs, describe the key data or trend

---

**[images-icons-and-tables-decorative-images-are-001]** [A] [MINOR] [AUTO] SC 1.1.1
Decorative images are hidden from assistive technology
Pass: Purely decorative `<img>` elements have `alt=""` and no `title`; decorative SVGs have `aria-hidden="true"`
Fail: Decorative `<img>` with no `alt` attribute (undefined, not empty string); decorative SVG without `aria-hidden="true"` and without a title that would be read by screen readers
Fix: Set `alt=""` on decorative images; add `aria-hidden="true"` on decorative SVGs

---

**[images-icons-and-tables-functional-images-describe-001]** [A] [CRITICAL] [PARTIAL] SC 1.1.1
Functional images describe their action or destination
Pass: Images used as buttons or links (inside `<button>` or `<a>`) have `alt` text that describes the action or destination (not the image appearance)
Fail: A linked or button image has `alt` text describing its appearance ("blue arrow") rather than its function ("Next page"); a logo image inside a link to the home page has `alt="logo"` instead of `alt="[Company name] home"`
Fix: Set `alt` to describe what the image does or where it navigates, not what it looks like

---

**[images-icons-and-tables-complex-graphics-have-001]** [A] [MAJOR] [PARTIAL] SC 1.1.1
Complex graphics have a detailed text alternative
Pass: Charts, graphs, diagrams, and infographics have either a long description in the adjacent text, a `<figure>` with `<figcaption>`, or `aria-describedby` pointing to a detailed description
Fail: A chart or graph `<img>` or `<svg>` has only a short `alt` (e.g. "Bar chart") without a detailed description of the data; `<canvas>` with no fallback text content
Fix: Provide a detailed text description of the data or information conveyed by the complex graphic; use `<figcaption>` or `aria-describedby` to link to the description

---

**[images-icons-and-tables-data-tables-use-001]** [A] [CRITICAL] [AUTO] SC 1.3.1
Data tables use proper markup
Pass: `<table>` elements used for data have `<th>` elements with `scope` attribute for column/row headers; complex tables use `id`/`headers` associations; `<caption>` is present
Fail: Data `<table>` has no `<th>` elements; `<th>` elements are missing `scope` attribute; `<table>` used for layout (no data relationship between cells)
Fix: Add `<th scope="col">` for column headers and `<th scope="row">` for row headers; add a `<caption>` describing the table; remove layout tables and use CSS instead

---

**[images-icons-and-tables-non-text-ui-001]** [AA] [MAJOR] [PARTIAL] SC 1.4.11
Non-text UI components and graphical objects have at least 3:1 contrast
Pass: UI component boundaries (borders of inputs, checkboxes, focus indicators) and informational graphics have at least 3:1 contrast against adjacent colors
Fail: Input borders, checkbox outlines, or icon strokes have a color contrast below 3:1 against their background (detectable from inline styles or CSS in the file)
Fix: Increase the contrast of UI component boundaries and informational icons to at least 3:1 against their background color

---

### Forms and validation

**[forms-and-validation-every-form-control-001]** [A] [CRITICAL] [AUTO] SC 1.3.1, 3.3.2
Every form control has a programmatically associated label
Pass: Every `<input>`, `<select>`, and `<textarea>` has an associated `<label>` (via `for`/`id` pairing or wrapping), or `aria-label`, or `aria-labelledby`
Fail: Form control with no `<label>`, no `aria-label`, and no `aria-labelledby`; `<label>` present but `for` attribute does not match any `id`; placeholder used as the only label
Fix: Add `<label for="[id]">` associated with the control's `id`; or add `aria-label="[label text]"` directly on the control

---

**[forms-and-validation-required-fields-are-001]** [A] [MAJOR] [PARTIAL] SC 3.3.2, 1.3.3
Required fields are clearly indicated
Pass: Required fields have `required` or `aria-required="true"` attribute; required state is also communicated visually (not by color alone)
Fail: Required field has no `required` or `aria-required` attribute; required state is communicated only by a color change or asterisk without a text explanation
Fix: Add `required` attribute to required inputs; add a text note (e.g. "* Required field") near the form; do not rely on color alone to indicate required state

---

**[forms-and-validation-placeholder-text-is-001]** [A] [CRITICAL] [AUTO] SC 3.3.2
Placeholder text is not used as a label replacement
Pass: All form controls have a `<label>` or `aria-label`; `placeholder` is used only for supplementary hints, not as the sole label
Fail: A form control has `placeholder` but no `<label>`, `aria-label`, or `aria-labelledby`; placeholder text describes the field purpose (acting as a label)
Fix: Add a proper label to every form control; if a placeholder hint is needed, keep it supplementary and keep the label visible

---

**[forms-and-validation-instructions-are-provided-001]** [A] [MINOR] [MANUAL] SC 3.3.2
Instructions are provided for inputs with format requirements
Fix: Provide visible format instructions near the input (e.g. "Date format: DD/MM/YYYY"); do not rely on placeholder alone for format hints
Manual: Review all form inputs that have format requirements (dates, phone numbers, postal codes, passwords). Verify that format instructions are visible near the input, not just in the placeholder or tooltip.

---

**[forms-and-validation-errors-are-described-001]** [A] [CRITICAL] [PARTIAL] SC 3.3.1, 1.4.1
Errors are described in text, not conveyed by color alone
Pass: Error messages are displayed as text; error state is not conveyed only by a color change; error messages are associated with the relevant field via `aria-describedby` or programmatic proximity
Fail: Error state communicated only by a red border color change with no text error message; error message is present but not associated with the field
Fix: Add a text error message visible near the errored field; use `aria-describedby` to associate the error message with the input; do not rely on color alone

---

**[forms-and-validation-users-can-identify-001]** [A] [MAJOR] [PARTIAL] SC 3.3.1
Users can identify which fields have errors
Pass: Error messages clearly indicate which field is in error; the field with the error has a visual indicator (border, icon) in addition to a text message
Fail: Error message appears at the top of the form without indicating which specific field is in error; multiple fields are in error but only a generic "Form has errors" message is shown
Fix: Associate each error message with the specific field it refers to; if a summary is shown at the top of the form, include links or references to the specific fields in error

---

**[forms-and-validation-error-messages-are-001]** [AA] [MAJOR] [AUTO] SC 3.3.1, 4.1.3
Error messages are announced to screen readers
Pass: Error messages are in an `aria-live` region (or `role="alert"`) or are associated with the field via `aria-describedby`; dynamic error messages use `aria-live="polite"` or `aria-live="assertive"`
Fail: Error messages are injected into the DOM dynamically but not in an `aria-live` region and not via `aria-describedby`; error messages are shown only in a tooltip
Fix: Wrap dynamically injected error messages in `role="alert"` or an `aria-live="polite"` region; or add `aria-describedby` on the input pointing to the error message element

---

**[forms-and-validation-input-purpose-is-001]** [AA] [MINOR] [AUTO] SC 1.3.5
Input purpose is identified using autocomplete attributes
Pass: Common form inputs (name, email, phone, address, password, etc.) have the appropriate `autocomplete` attribute value
Fail: `<input type="email">` without `autocomplete="email"`; `<input type="text">` for a name field without `autocomplete="name"`; `<input type="tel">` without `autocomplete="tel"`
Fix: Add the appropriate `autocomplete` attribute to all common personal information inputs; refer to the WCAG list of valid autocomplete tokens

---

**[forms-and-validation-authentication-does-not-001]** [AA] [MAJOR] [MANUAL] SC 3.3.8
Authentication does not rely on cognitive function tests
Fix: Avoid CAPTCHAs that require solving puzzles or transcribing distorted text; if a CAPTCHA is necessary, provide an accessible alternative; support password managers and paste in password fields
Manual: Review all authentication flows. Verify that login does not require solving a cognitive puzzle (e.g. CAPTCHA) without an accessible alternative, and that password fields allow paste and autocomplete.

---

**[forms-and-validation-important-submissions-support-001]** [AAA] [MINOR] [MANUAL] SC 3.3.4
Important submissions can be reviewed, corrected, or reversed
Fix: For significant transactions (financial, legal, account deletion), provide a review step or confirmation before final submission; provide a way to undo or cancel
Manual: Review forms that perform significant actions (purchases, account changes, data deletion). Verify there is a confirmation step, summary, or undo mechanism before or after submission.

---

**[forms-and-validation-error-suggestions-are-001]** [AAA] [MINOR] [MANUAL] SC 3.3.3
Error suggestions are provided when input errors are detected
Fix: When a validation error occurs, provide a specific suggestion for how to fix it (e.g. "Email must include @" not just "Invalid email")
Manual: Trigger validation errors on all form fields. Verify that error messages include specific, actionable suggestions for how to correct the input, not just that the input is wrong.

---

### Components and dynamic UI

**[components-and-dynamic-ui-menus-tabs-accordions-001]** [A] [CRITICAL] [PARTIAL] SC 2.1.1
Menus, tabs, accordions, and other composite widgets follow ARIA keyboard patterns
Pass: Interactive widgets implement the expected keyboard navigation pattern: arrow keys for tabs/menus, `Enter`/`Space` to activate, `Escape` to close/collapse
Fail: Tab component does not respond to arrow keys; menu does not close on `Escape`; accordion does not respond to `Enter` or `Space`; custom widget keyboard behavior is not documented or implemented
Fix: Implement keyboard interaction patterns per the ARIA Authoring Practices Guide (APG) for the specific widget type (tabs, menu, accordion, combobox, etc.)

---

**[components-and-dynamic-ui-expanded-collapsed-selected-001]** [A] [CRITICAL] [AUTO] SC 4.1.2
Expanded, collapsed, and selected states are exposed via ARIA
Pass: Expandable elements use `aria-expanded="true/false"`; selectable elements use `aria-selected="true/false"`; toggleable buttons use `aria-pressed="true/false"`
Fail: An accordion header that expands/collapses content has no `aria-expanded`; a tab that can be selected has no `aria-selected`; a toggle button has no `aria-pressed`; state attributes are hardcoded to one value and not updated dynamically
Fix: Add the appropriate ARIA state attribute to each interactive element and update its value dynamically when state changes

---

**[components-and-dynamic-ui-dialogs-have-an-001]** [A] [CRITICAL] [AUTO] SC 4.1.2
Dialogs have an accessible name and role
Pass: Modal dialogs have `role="dialog"` (or use `<dialog>`), `aria-modal="true"`, and `aria-labelledby` pointing to the dialog title or `aria-label`
Fail: A modal overlay has no `role="dialog"`; dialog has no accessible name (`aria-labelledby` or `aria-label`); `aria-modal` is missing
Fix: Add `role="dialog"`, `aria-modal="true"`, and `aria-labelledby="[dialog-title-id]"` to the dialog container element

---

**[components-and-dynamic-ui-focus-moves-into-001]** [A] [CRITICAL] [PARTIAL] SC 2.4.3
Focus moves into dialogs and dynamic panels when they open
Pass: When a dialog or panel opens, focus is programmatically moved to the first focusable element inside it (or a defined focus target)
Fail: A modal or drawer opens but focus remains on the triggering button; `focus()` is not called on any element inside the newly opened component
Fix: Call `focus()` on the first focusable element (or a focus sentinel) inside the dialog/panel immediately after it becomes visible

---

**[components-and-dynamic-ui-focus-is-contained-001]** [A] [CRITICAL] [PARTIAL] SC 2.1.2, 2.4.3
Focus is contained within modal dialogs while open
Pass: A focus trap is implemented for modal dialogs — `Tab` and `Shift+Tab` cycle only within the dialog while it is open; focus cannot escape to background content
Fail: Tab key allows focus to leave the dialog and reach background content; no focus trap logic is present in the dialog component
Fix: Implement a focus trap: intercept `Tab` and `Shift+Tab` keydown events within the dialog and wrap focus to the first/last focusable element; use a library like `focus-trap` or implement manually

---

**[components-and-dynamic-ui-focus-returns-to-001]** [A] [MAJOR] [PARTIAL] SC 2.4.3
Focus returns to the trigger element when dialogs close
Pass: When a dialog or panel closes, focus is returned to the element that triggered it
Fail: Dialog closes but focus moves to `<body>` or an unrelated element; the triggering element reference is not stored before opening the dialog
Fix: Store a reference to the triggering element before opening the dialog; call `focus()` on that element when the dialog closes

---

**[components-and-dynamic-ui-background-content-is-001]** [A] [MAJOR] [PARTIAL] SC 2.4.3, 4.1.2
Background content is hidden from assistive technology when a modal is open
Pass: When a modal is open, background content has `aria-hidden="true"` or `inert` applied to prevent screen reader access
Fail: Background content is visible to screen readers while a modal is open; no `aria-hidden` or `inert` is applied to the main content area when a dialog is active
Fix: When opening a modal, apply `aria-hidden="true"` (or `inert`) to the main content area; remove it when the modal closes

---

**[components-and-dynamic-ui-important-dynamic-updates-001]** [A] [MAJOR] [PARTIAL] SC 4.1.3
Important dynamic updates are announced to screen readers
Pass: Loading states, success messages, and error notifications injected dynamically are in an `aria-live` region or `role="alert"`/`role="status"`
Fail: A success notification or loading spinner appears in the DOM dynamically but has no `aria-live`, `role="alert"`, or `role="status"` attribute; toast notifications are not announced
Fix: Add `aria-live="polite"` (or `role="status"`) for non-urgent announcements; use `aria-live="assertive"` (or `role="alert"`) for urgent error messages; ensure the live region is in the DOM before content is injected

---

**[components-and-dynamic-ui-status-success-warning-001]** [A] [MAJOR] [PARTIAL] SC 4.1.3
Status, success, warning, and error notifications are announced
Pass: All status notifications (toast, banner, inline message) that appear after user action use `role="alert"` or `role="status"`, or are in an `aria-live` region
Fail: A notification component renders dynamically but has no role or `aria-live` attribute; alerts are conveyed only by visual styling (color, icon) without announcement
Fix: Add `role="alert"` for urgent notifications; use `role="status"` or `aria-live="polite"` for non-urgent status messages; ensure the live region exists in the DOM before content is injected into it

---

**[components-and-dynamic-ui-dynamic-updates-do-001]** [AA] [MINOR] [PARTIAL] SC 3.2.1
Dynamic updates do not cause unexpected context changes
Pass: Content that updates dynamically (infinite scroll, auto-refresh, live feeds) does not disrupt focus position or reading order; updates are appended or contained without moving focus
Fail: An auto-refreshing component moves focus to the top of the list on each update; content injected above the current focus position shifts the page scroll; live region is `assertive` for non-urgent status updates
Fix: Use `aria-live="polite"` for non-urgent updates; do not move focus programmatically in response to background content updates; append new content rather than replacing the container

---

### Media, motion, and timing

**[media-motion-and-timing-prerecorded-audio-has-001]** [A] [MAJOR] [PARTIAL] SC 1.2.1
Prerecorded audio-only content has a text transcript
Pass: `<audio>` elements or audio-only embeds have a link to a transcript or the transcript is provided in adjacent text
Fail: `<audio>` element with no associated transcript link or adjacent transcript text
Fix: Provide a text transcript for all prerecorded audio content; link to the transcript near the audio player

---

**[media-motion-and-timing-prerecorded-video-with-001]** [A] [CRITICAL] [PARTIAL] SC 1.2.2
Prerecorded video with audio has synchronized captions
Pass: `<video>` elements have a `<track kind="captions">` element pointing to a captions file
Fail: `<video>` with audio content and no `<track kind="captions">` element
Fix: Add `<track kind="captions" src="[captions.vtt]" srclang="en" label="English">` inside the `<video>` element

---

**[media-motion-and-timing-video-only-content-001]** [A] [MAJOR] [PARTIAL] SC 1.2.1
Video-only content has an audio track or text alternative
Pass: `<video>` elements that contain no audio have either an audio description track (`<track kind="descriptions">`) or an adjacent text alternative describing the video content
Fail: `<video>` with no audio and no `<track kind="descriptions">` and no adjacent text description
Fix: Add an audio description track or a text alternative adjacent to the video describing its content

---

**[media-motion-and-timing-auto-playing-audio-001]** [A] [CRITICAL] [PARTIAL] SC 1.4.2
Auto-playing audio can be stopped, paused, or muted
Pass: Audio that plays automatically for more than 3 seconds has a visible mechanism to stop, pause, or mute it at the top of the page
Fail: `<audio autoplay>` or `<video autoplay>` with audio and no visible stop/pause/mute control; background music that starts automatically with no controls
Fix: Add visible pause/stop/mute controls near the top of the page for any auto-playing audio; or do not auto-play audio

---

**[media-motion-and-timing-moving-or-auto-001]** [A] [MAJOR] [PARTIAL] SC 2.2.2
Moving or auto-updating content can be paused, stopped, or hidden
Pass: Carousels, animations, marquees, auto-scrolling content, and live feeds have a mechanism to pause, stop, or hide the motion
Fail: A carousel or animation plays continuously with no pause control; a ticker or marquee has no stop mechanism; CSS animation runs indefinitely on a content element with no pause control
Fix: Add a pause/stop button to any moving content that lasts more than 5 seconds; respect `prefers-reduced-motion` CSS media query by disabling or reducing animations

---

**[media-motion-and-timing-content-does-not-001]** [A] [CRITICAL] [MANUAL] SC 2.3.1
Content does not flash more than 3 times per second
Fix: Remove or replace any content that flashes more than 3 times per second; test with the Photosensitive Epilepsy Analysis Tool (PEAT) or equivalent
Manual: Review all animated content, video, and rapidly changing UI elements. Verify that nothing flashes more than 3 times per second. Use a tool like PEAT to test video content.

---

**[media-motion-and-timing-time-limits-can-001]** [A] [MAJOR] [MANUAL] SC 2.2.1
Time limits can be turned off, adjusted, or extended
Fix: Provide a way to extend or disable any session timeout or time limit before it expires; warn users at least 20 seconds before a timeout with an option to extend
Manual: Identify any time-limited interactions in this component (session timeouts, timed quizzes, auto-expiring carts). Verify that users can turn off, adjust, or extend the time limit before it expires.

---

**[media-motion-and-timing-dragging-interactions-have-001]** [A] [MAJOR] [PARTIAL] SC 2.5.7
Dragging interactions have a single-pointer alternative
Pass: Any drag-and-drop interaction also has an alternative that requires only a single tap/click (e.g. a button to move items up/down, or a click-to-select-then-click-to-place mechanism)
Fail: Drag-and-drop is the only way to reorder, resize, or rearrange items; no keyboard alternative or single-pointer alternative is available
Fix: Provide an alternative single-pointer mechanism (button controls) for any drag-and-drop interaction

---

**[media-motion-and-timing-pointer-actions-can-001]** [A] [MINOR] [PARTIAL] SC 2.5.2
Pointer actions can be cancelled or undone
Pass: Click/tap actions are triggered on the `pointerup` or `mouseup` event (not `mousedown`); drag actions have an abort mechanism (releasing outside the target cancels the action)
Fail: Critical actions (delete, purchase) trigger on `mousedown` or `pointerdown` with no cancel mechanism; there is no way to abort a drag-and-drop in progress
Fix: Trigger actions on `mouseup`/`pointerup` instead of `mousedown`/`pointerdown`; for drag-and-drop, allow the user to cancel by releasing outside the drop zone or pressing `Escape`

---

**[media-motion-and-timing-prerecorded-video-includes-001]** [AA] [MINOR] [PARTIAL] SC 1.2.5
Prerecorded video includes audio description
Pass: `<video>` elements have a `<track kind="descriptions">` audio description track, or the visual content is fully described in the main audio
Fail: `<video>` element has no `<track kind="descriptions">` and the visual content contains information not conveyed in the main audio track
Fix: Add `<track kind="descriptions" src="[descriptions.vtt]">` inside the `<video>` element; or provide a descriptive audio track that describes all visual information

---

**[media-motion-and-timing-live-media-has-001]** [AA] [MAJOR] [MANUAL] SC 1.2.4
Live media has real-time captions
Fix: Integrate a real-time captioning service for any live audio or video streams; ensure captions are synchronized with the live feed
Manual: Identify any live audio or video streams in this file. Verify that a real-time captions mechanism is implemented (e.g. a WebVTT-compatible caption service or embedded caption track for live streams).

---

**[media-motion-and-timing-motion-based-interaction-001]** [AA] [MINOR] [MANUAL] SC 2.5.4
Motion-based interactions have a non-motion alternative
Fix: Any feature triggered by device motion (shake, tilt, gyroscope) must also be operable via a UI control; provide a setting to disable motion-activated features
Manual: Identify any features in this component triggered by device orientation or motion (DeviceMotionEvent, DeviceOrientationEvent, accelerometer). Verify each has a UI control alternative and can be disabled.

---

### Consistency and compatibility

**[consistency-and-compatibility-navigation-patterns-are-001]** [AA] [MINOR] [MANUAL] SC 3.2.3
Navigation patterns are consistent across pages
Fix: Ensure navigation menus, breadcrumbs, and page-level controls appear in the same location and order on every page or view
Manual: Compare this component's navigation pattern to other pages or views in the application. Verify that shared navigation elements appear in the same relative order and position.

---

**[consistency-and-compatibility-components-with-the-001]** [AA] [MINOR] [MANUAL] SC 3.2.4
Components with the same function are identified consistently
Fix: Buttons, links, and icons that perform the same function across pages must have the same accessible name and visual label
Manual: Find other instances of this component across the codebase. Verify that functionally identical components have the same label, accessible name, and visual appearance.

---

**[consistency-and-compatibility-accessibility-apis-are-001]** [A] [CRITICAL] [PARTIAL] SC 4.1.2
Accessibility APIs are used correctly
Pass: ARIA roles, states, and properties are used correctly and only where native HTML semantics are insufficient; no invalid ARIA attribute values; no conflicting role/attribute combinations
Fail: Invalid ARIA role used (e.g. `role="button"` on a `<button>`); `aria-hidden="true"` on a focusable element; `aria-required` on a non-form element; `aria-expanded` on a non-expandable element; ARIA used to override native semantics incorrectly
Fix: Remove redundant ARIA roles from native elements; do not apply `aria-hidden` to focusable elements; use ARIA only to supplement missing semantics, not to replace correct native HTML

---

**[consistency-and-compatibility-accessibility-is-verified-001]** [AA] [MINOR] [MANUAL] SC N/A
Accessibility is verified with assistive technology
Fix: Test with a screen reader (NVDA+Firefox on Windows, VoiceOver+Safari on macOS/iOS, TalkBack on Android) as part of the development workflow
Manual: This check cannot be automated. Test the component with at least one screen reader to verify that all interactive elements, dynamic updates, and state changes are announced correctly.

---
