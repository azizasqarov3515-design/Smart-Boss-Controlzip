---
name: Metro stale cache + Uzbek apostrophe syntax pitfall
description: Why a fixed syntax error keeps crashing the Expo app, and the apostrophe pattern that causes it.
---

# Phantom "SyntaxError" after the source is already fixed

Symptom: the smartboss Expo app crashes with a Babel `SyntaxError: Unexpected token,
expected "}"` pointing at a `.ts` file/line, but reading that line (sed/od) shows valid
code, the ground-truth `@babel/parser` (typescript+jsx plugins) parses the whole file
cleanly, and `git status` is clean. The Babel code frame in the log shows a *different*
version of the line than what is on disk.

Cause: **Metro's transform cache held the OLD broken transform.** On Replit, Metro keeps
TWO cache dirs and clearing only one is not enough:
- `/tmp/metro-cache`
- `/mnt/scratch/tmp/metro-cache`

Fix: stop the workflow, `rm -rf` BOTH metro-cache dirs (plus `artifacts/<app>/.expo` and
`node_modules/.cache` for good measure), then restart the Expo workflow. A full
re-bundle (thousands of ms, full module count) confirms the cache was truly empty. Note:
lazily-imported modules (e.g. a PDF/receipt screen) are only re-transformed when that
route is navigated to, so the phantom error can reappear in logs once per stale client
that re-requests the chunk; the browser bundle also caches, so a hard reload may be
needed on the client side. There is no watchman binary in this environment, so watchman
is not the culprit.

# The apostrophe pattern that originally broke it

**Why:** Uzbek text is full of apostrophes — `To'lov`, `o'`, `g'`, `To'langan`. Putting
such text in a **single-quoted** JS string (`'✓ To'langan'`) ends the string early at the
apostrophe and throws "Unexpected token". This is easy to introduce inside HTML template
strings in `utils/pdfTemplates.ts` and similar.

**How to apply:** for any Uzbek literal containing an apostrophe, use double quotes
(`"✓ To'langan"`) or a template literal — never a single-quoted string. When a syntax
error names a line that looks fine, suspect a stale Metro cache before re-editing the line.
