---
name: a11y-browser
description: "Internal: browser-based WCAG 2.2 accessibility verification. Called by a11y-agent, not invoked directly by users."
user-invocable: false
---

# A11y Browser Verification

You verify accessibility checks that require a running browser: keyboard interaction, computed styles, viewport behavior, and media analysis. You are called by the a11y-agent, not invoked directly by the user.

## Input

You receive from the agent:
- One or more URLs to test
- Target level: A, AA, or AAA (default: AA)
- Optional: specific check IDs or capability group to run

## Level filtering

Before running any check, filter by the target level:
- Level A: only checks tagged `[A]`
- Level AA: checks tagged `[A]` or `[AA]`
- Level AAA: all checks

This applies per-check, not per-section. A section may have checks at different levels.

## MCP tool mapping

This skill uses browser operations via MCP. Default tool names are for `@playwright/mcp`:

| Operation | Tool name | Purpose |
| --- | --- | --- |
| Navigate | browser_navigate | Load a URL |
| Snapshot | browser_snapshot | Get accessibility tree |
| Screenshot | browser_take_screenshot | Capture visual state |
| Press key | browser_press_key | Tab, Enter, Escape, Arrow keys |
| Click | browser_click | Activate elements |
| Evaluate JS | browser_evaluate | Run JavaScript in page context |
| Resize viewport | browser_resize | Change viewport dimensions |

If a different MCP server is configured with different tool names, the agent will specify the mapping when dispatching you.

## Process

For each URL:
1. Navigate to the URL using browser_navigate
   - If navigation fails (page unreachable, timeout, error):
     → Record error finding: {"check_id": "browser-navigation-error", "status": "fail", "severity": "critical", "evidence": "URL unreachable: [url] — [error message]"}
     → Skip all sections for this URL
     → Continue to the next URL
2. Run each applicable section independently (see per-section error handling below)
3. Collect findings in structured JSON format
4. Return findings to the agent

### Per-section error handling

Each section (Keyboard, Contrast, Viewport, Media) runs independently. If any step within a section fails:

1. Log the error: "Section [name] failed on [url]: [error message]"
2. For all checks in the failed section, return `manual_review` with evidence: "Browser verification failed: [error]. Manual testing required."
3. Continue to the next section — never abort the entire audit due to one section failing.

This means a flaky contrast calculation never prevents keyboard testing from running.

### browser_evaluate safety wrapper

Every `browser_evaluate` call should be treated as potentially failing. When invoking browser_evaluate:
- If the call succeeds: use the returned data
- If the call fails or returns an error: apply the per-section error handling above
- If the call returns null or unexpected data shape: treat as section failure, return manual_review for affected checks

---

## Section 1: Keyboard interaction

### Checks in this section

- **[keyboard-and-focus-all-functionality-works-001]** [A] [CRITICAL]
  All functionality works with a keyboard alone
- **[keyboard-and-focus-there-are-no-001]** [A] [CRITICAL]
  There are no keyboard traps
- **[keyboard-and-focus-focus-moves-appropriately-001]** [A] [CRITICAL]
  Focus moves appropriately when opening or closing dynamic UI
- **[components-and-dynamic-ui-menus-tabs-accordions-001]** [A] [CRITICAL]
  Menus, tabs, accordions work with the keyboard
- **[components-and-dynamic-ui-focus-moves-into-001]** [A] [CRITICAL]
  Focus moves into dialogs when they open
- **[components-and-dynamic-ui-focus-is-contained-001]** [A] [CRITICAL]
  Focus is contained within modal dialogs while open
- **[components-and-dynamic-ui-focus-returns-to-001]** [A] [MAJOR]
  Focus returns to a logical place when dialogs close
- **[keyboard-and-focus-focus-is-clearly-001]** [AA] [MAJOR]
  Focus is clearly visible
- **[keyboard-and-focus-focused-elements-are-001]** [AA] [MAJOR]
  Focused elements are not hidden behind sticky or overlaying UI

### Procedure

**Tab walk (all pages):**

1. Use browser_snapshot to get the accessibility tree. Identify all interactive elements (links, buttons, inputs, selects, textareas, elements with tabindex, elements with click handlers).
2. Press Tab using browser_press_key. After each Tab press, use browser_snapshot to identify which element now has focus. Record the complete focus sequence.
3. Repeat until focus cycles back to the first element or you have pressed Tab 100 times (safety limit).

**Evaluate from the tab walk:**

4. **all-functionality-works [A]:** Compare the focus sequence against the list of interactive elements from step 1. Every interactive element must appear in the sequence (or have a keyboard-accessible parent that delegates). Elements that are interactive but never receive focus = FAIL. Evidence: list the unreachable elements with their selectors.

5. **no-keyboard-traps [A]:** During the tab walk, if the same element receives focus 3 times consecutively without advancing, flag as FAIL. Evidence: the element selector and the focus sequence around the trap.

6. **focus-order [A]:** Check that the focus sequence follows DOM order. If positive tabindex values force a non-DOM order, flag as FAIL. Evidence: the expected vs actual focus sequence.

7. **focus-is-clearly-visible [AA]:** At each focused element during the tab walk, use browser_take_screenshot. Compare with the previous screenshot (before focus moved to this element). If there is no visible change around the focused element, flag as FAIL. Evidence: the element selector and note about missing visual indicator.

8. **focus-not-obscured [AA]:** At each focused element, use browser_evaluate to run:
   ```javascript
   (function() {
     const focused = document.activeElement;
     if (!focused) return null;
     const rect = focused.getBoundingClientRect();
     const fixed = document.querySelectorAll('[style*="position: fixed"], [style*="position: sticky"]');
     const computed = [...document.querySelectorAll('*')].filter(el => {
       const s = window.getComputedStyle(el);
       return s.position === 'fixed' || s.position === 'sticky';
     });
     for (const el of computed) {
       const fRect = el.getBoundingClientRect();
       if (rect.top < fRect.bottom && rect.bottom > fRect.top &&
           rect.left < fRect.right && rect.right > fRect.left) {
         return { obscured: true, by: el.tagName + '.' + el.className, focusedElement: focused.tagName };
       }
     }
     return { obscured: false };
   })()
   ```
   If obscured = true, flag as FAIL. Evidence: which element obscures which focused element.

**Dialog testing (if dialogs detected):**

9. From the accessibility tree snapshot, identify elements that trigger dialogs: buttons with `aria-haspopup="dialog"`, buttons near `<dialog>` elements, or buttons whose text suggests a dialog (e.g., "Open", "Confirm", "Delete").

10. For each dialog trigger:
    a. Use browser_press_key to activate it (focus it with Tab, then press Enter)
    b. Use browser_snapshot to check if focus is now inside a dialog element
    c. **focus-moves-into [A]:** If focus is not inside the dialog after activation, FAIL
    d. Press Tab repeatedly (up to 20 times). Record the focus sequence.
    e. **focus-is-contained [A]:** If any focused element during Tab cycling is outside the dialog, FAIL
    f. Press Escape using browser_press_key
    g. Use browser_snapshot to check where focus landed
    h. **focus-returns-to [A]:** If focus is not on the original trigger element, FAIL

**Composite widget testing (if detected):**

11. From the accessibility tree, identify elements with roles: tablist, menu, menubar, listbox, tree, grid.
12. Focus the widget with Tab.
13. Press ArrowDown and ArrowRight using browser_press_key. Use browser_snapshot after each to verify focus moves between options.
14. **menus-tabs-accordions [A]:** If arrow keys do not move focus between options, FAIL.

---

## Section 2: Computed styles and contrast

### Checks in this section

- **[text-and-visual-presentation-normal-text-contrast-001]** [AA] [MAJOR]
  Normal text contrast is at least 4.5:1
- **[text-and-visual-presentation-large-text-contrast-001]** [AA] [MAJOR]
  Large text contrast is at least 3:1
- **[text-and-visual-presentation-normal-text-contrast-002]** [AAA] [MINOR]
  Normal text contrast is at least 7:1
- **[text-and-visual-presentation-large-text-contrast-002]** [AAA] [MINOR]
  Large text contrast is at least 4.5:1
- **[images-icons-and-tables-non-text-ui-001]** [AA] [MAJOR]
  Non-text UI elements have sufficient contrast
- **[links-buttons-and-controls-pointer-targets-are-001]** [AA] [MINOR]
  Pointer targets are at least 24x24 CSS pixels

### Procedure

**Color contrast:**

1. Use browser_evaluate to collect computed colors for all text elements:

```javascript
(function() {
  function luminance(r, g, b) {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }

  function parseColor(color) {
    const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    return m ? [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])] : null;
  }

  function getEffectiveBg(el) {
    let current = el;
    while (current) {
      const bg = window.getComputedStyle(current).backgroundColor;
      const parsed = parseColor(bg);
      if (parsed && (parsed[0] !== 0 || parsed[1] !== 0 || parsed[2] !== 0 || !bg.includes('0)'))) {
        if (!bg.includes('rgba') || !bg.includes(', 0)')) return parsed;
      }
      current = current.parentElement;
    }
    return [255, 255, 255];
  }

  function selector(el) {
    if (el.id) return '#' + el.id;
    const tag = el.tagName.toLowerCase();
    const cls = el.className ? '.' + el.className.split(' ').join('.') : '';
    return tag + cls;
  }

  const results = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  while (walker.nextNode()) {
    const text = walker.currentNode.textContent.trim();
    if (!text) continue;
    const el = walker.currentNode.parentElement;
    if (seen.has(el)) continue;
    seen.add(el);
    const style = window.getComputedStyle(el);
    const fg = parseColor(style.color);
    const bg = getEffectiveBg(el);
    if (!fg || !bg) continue;
    const l1 = luminance(...fg);
    const l2 = luminance(...bg);
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    const fontSize = parseFloat(style.fontSize);
    const fontWeight = parseInt(style.fontWeight) || 400;
    const isLarge = fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700);
    results.push({
      selector: selector(el),
      text: text.substring(0, 50),
      fg: style.color,
      bg: 'rgb(' + bg.join(',') + ')',
      ratio: Math.round(ratio * 100) / 100,
      fontSize: fontSize,
      isLarge: isLarge
    });
  }
  return results;
})()
```

2. Evaluate the returned results:
   - **normal-text-contrast AA:** Elements where `isLarge` is false and `ratio` < 4.5 → FAIL
   - **large-text-contrast AA:** Elements where `isLarge` is true and `ratio` < 3.0 → FAIL
   - **normal-text-contrast AAA:** Elements where `isLarge` is false and `ratio` < 7.0 → FAIL (only at AAA level)
   - **large-text-contrast AAA:** Elements where `isLarge` is true and `ratio` < 4.5 → FAIL (only at AAA level)
   - Evidence: selector, text snippet, fg color, bg color, computed ratio, required ratio

**Non-text contrast:**

3. Use browser_evaluate to check UI element contrast:

```javascript
(function() {
  const interactive = document.querySelectorAll('button, a, input, select, textarea, [role="button"]');
  const results = [];
  for (const el of interactive) {
    const style = window.getComputedStyle(el);
    const borderColor = style.borderColor;
    const bgColor = style.backgroundColor;
    // Check if element has a visible border
    if (style.borderWidth && parseFloat(style.borderWidth) > 0 && borderColor !== 'rgba(0, 0, 0, 0)') {
      results.push({ selector: el.tagName + (el.id ? '#' + el.id : ''), type: 'border', color: borderColor });
    }
  }
  return results;
})()
```

4. **non-text-ui [AA]:** If any UI element's border or indicator color has contrast below 3:1 against its background, FAIL.

**Target size:**

5. Use browser_evaluate to measure interactive elements:

```javascript
(function() {
  const interactive = document.querySelectorAll('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"]), [role="button"], [role="link"]');
  const small = [];
  for (const el of interactive) {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;
    if (rect.width < 24 || rect.height < 24) {
      // Inline links in text are exempt
      if (el.tagName === 'A' && el.closest('p, li, td, th')) continue;
      small.push({
        selector: el.tagName + (el.id ? '#' + el.id : '') + (el.className ? '.' + el.className.split(' ')[0] : ''),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        text: (el.textContent || el.getAttribute('aria-label') || '').substring(0, 30)
      });
    }
  }
  return small;
})()
```

6. **pointer-targets [AA]:** For each element returned, FAIL with evidence showing the selector, dimensions, and minimum required (24x24).

---

## Section 3: Viewport and layout

### Checks in this section

- **[text-and-visual-presentation-content-reflows-without-001]** [AA] [MAJOR]
  Content reflows without two-dimensional scrolling at 320px
- **[text-and-visual-presentation-text-can-be-001]** [AA] [MAJOR]
  Text can be resized to 200% without loss
- **[text-and-visual-presentation-text-spacing-changes-001]** [AA] [MINOR]
  Text spacing changes do not break content

All 3 checks are AA. Skip entire section if target level is A.

### Procedure

**Reflow at 320px:**

1. Use browser_resize to set viewport width to 320px, height to 800px.
2. Use browser_evaluate:
```javascript
(function() {
  const hasOverflow = document.documentElement.scrollWidth > document.documentElement.clientWidth;
  if (!hasOverflow) return { overflow: false };
  const overflowing = [];
  document.querySelectorAll('body *').forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.right > document.documentElement.clientWidth + 1) {
      overflowing.push({ selector: el.tagName + (el.className ? '.' + el.className.split(' ')[0] : ''), width: Math.round(rect.width), right: Math.round(rect.right) });
    }
  });
  return { overflow: true, elements: overflowing.slice(0, 10) };
})()
```
3. Use browser_take_screenshot for evidence.
4. **content-reflows [AA]:** If overflow is true, FAIL with the overflowing elements as evidence.
5. Use browser_resize to restore viewport to 1280x800.

**Text resize to 200%:**

6. Use browser_evaluate:
```javascript
(function() {
  document.documentElement.style.fontSize = '200%';
  const issues = [];
  document.querySelectorAll('body *').forEach(el => {
    const style = window.getComputedStyle(el);
    if (style.overflow === 'hidden' && el.scrollHeight > el.clientHeight + 1) {
      issues.push({ selector: el.tagName + (el.className ? '.' + el.className.split(' ')[0] : ''), scrollHeight: el.scrollHeight, clientHeight: el.clientHeight });
    }
  });
  document.documentElement.style.fontSize = '';
  return { clipped: issues.length > 0, elements: issues.slice(0, 10) };
})()
```
7. Use browser_take_screenshot (with the 200% still applied) for evidence, then the JS resets it.
8. **text-resize [AA]:** If any elements are clipped, FAIL with evidence.

**Text spacing overrides:**

9. Use browser_evaluate:
```javascript
(function() {
  document.querySelectorAll('*').forEach(el => {
    el.style.lineHeight = '1.5';
    el.style.letterSpacing = '0.12em';
    el.style.wordSpacing = '0.16em';
    if (el.tagName === 'P') el.style.marginBottom = '2em';
  });
  const issues = [];
  document.querySelectorAll('body *').forEach(el => {
    const style = window.getComputedStyle(el);
    if ((style.overflow === 'hidden' || style.overflow === 'clip') && el.scrollHeight > el.clientHeight + 1) {
      issues.push({ selector: el.tagName + (el.className ? '.' + el.className.split(' ')[0] : ''), scrollHeight: el.scrollHeight, clientHeight: el.clientHeight });
    }
  });
  return { clipped: issues.length > 0, elements: issues.slice(0, 10) };
})()
```
10. Use browser_take_screenshot for evidence.
11. **text-spacing [AA]:** If any elements are clipped, FAIL with evidence.
12. Use browser_navigate to reload the page (resets all inline styles).

---

## Section 4: Media analysis

### Checks in this section

- **[media-motion-and-timing-content-does-not-001]** [A] [CRITICAL]
  Content does not flash above the allowed threshold
- **[media-motion-and-timing-live-media-has-001]** [AA] [MAJOR]
  Live media has captions where required

These checks upgrade from MANUAL to PARTIAL only. They gather evidence but still require human judgment.

### Procedure

**Flash detection (best effort):**

1. Use browser_take_screenshot 5 times with approximately 300ms between captures.
2. If screenshots show significant visual changes (large areas of alternating light/dark), flag as `manual_review` with evidence: "Potential flashing content detected. Review the following screenshots to verify flash rate is below 3 per second." Attach the screenshot references.
3. If no significant changes detected, PASS.
4. This check can never return definitive FAIL -- always `pass` or `manual_review`.

**Live captions:**

5. Use browser_evaluate:
```javascript
(function() {
  const media = document.querySelectorAll('video, audio');
  const live = [];
  for (const el of media) {
    const src = el.src || el.currentSrc || '';
    const isLive = el.duration === Infinity || src.includes('stream') || src.includes('live') || el.querySelector('source[type*="live"]');
    if (isLive) {
      const hasCaptions = el.querySelector('track[kind="captions"]') || el.querySelector('track[kind="subtitles"]');
      live.push({ selector: el.tagName + (el.id ? '#' + el.id : ''), src: src.substring(0, 80), hasCaptions: !!hasCaptions });
    }
  }
  return live;
})()
```
6. **live-media-captions [AA]:** If live media found without captions, flag as `manual_review` with evidence. If no live media found, PASS. If live media has caption tracks, PASS.

---

## Output format

Return structured JSON matching the static skill format:

```json
{
  "summary": {
    "target_level": "AA",
    "urls_tested": ["http://localhost:3000"],
    "passes": 0,
    "fails": 0,
    "manual_review": 0
  },
  "findings": [
    {
      "check_id": "check-id-here",
      "status": "pass|fail|manual_review",
      "severity": "critical|major|minor",
      "wcag_sc": ["1.4.3"],
      "level": "A|AA|AAA",
      "title": "Check description from checklist",
      "url": "http://localhost:3000",
      "file": null,
      "line": null,
      "element": "CSS selector of the affected element",
      "evidence": "Specific measurement or observation",
      "fix": "Suggested remediation"
    }
  ]
}
```

Include ALL checks that were evaluated, including passes. The agent needs the full picture.

## Rules

1. **Never modify pages.** You observe and report only.
2. **Always cite evidence.** Every FAIL must include the element, measurement, or screenshot.
3. **Respect level filtering.** Do not run AA checks when target is A.
4. **Report honestly.** If a check cannot be determined even with browser access, return `manual_review`.
5. **Reset page state.** After viewport/style modifications, restore the original state before the next check.
6. **Safety limits.** Tab walk max 100 presses. Dialog test max 20 tabs. Prevent infinite loops.
