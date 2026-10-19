# Wearcycle visual review checklist

From Section 8 of the redesign plan v2.2. Capture with `node tools/check.mjs` (fixed clock, stubbed weather, the fixture closet; see tools/check.mjs and CLAUDE.md, "Checks"):

- 360 and 390 (Android, touch, DPR 3), 820 and 1180 (iPad, touch, DPR 2), 1366 and 1920 (Windows, mouse, DPR 1); light and dark; English.
- 360px in French and Japanese for every changed screen.
- Photos, cut-outs and glyph-only items; an empty closet; the worst-case fixture (`node tools/check.mjs --worst-case`).
- Compare with the Phase 4 baseline: `node tools/check.mjs --compare docs/design/baseline --baseline docs/design/baseline/summary.json` (add `--css-pixels` if the baseline was captured with it). `--baseline` turns the review counts (axe, English left, text cut off, detector warnings) into pass or fail against the baseline.

Chromium at iPad sizes shows layout, not WebKit rendering: the real iPad decides at milestones.

## Definition of done (every screen, before release)

- The main action shows without scrolling: "Wear this" at 390 x 844 on Outfits; each screen's primary content at 360 x 800.
- No horizontal scroll at any review width; no text overflow in French or Japanese at 360px.
- No English text left in the French and Japanese screenshots, apart from user content such as piece names.
- axe-core: no serious or critical issues.
- Detector findings at or below the Phase 4 baseline, or each one explained.
- Light and dark reviewed.
- The owner passed it on his Android phone; at milestones also on the iPad and in a Windows browser.
- At most two refinement rounds.

## Ask

- What does the eye notice first? Is that right?
- Is clothing dominant where it should be? Are garment images sharp at their size?
- Unneeded containers, pills, borders or badges?
- Does anything look like a library default or AI-generated?
- At 1366 and 1920: is the width used on purpose? With a mouse, can every option be reached and does hover respond?
- Do light and dark both keep garments prominent?
- Does it feel like Wearcycle without the logo?
- Would a stranger with an empty closet understand this screen (PRODUCT.md)?

## Tools

- /impeccable critique before proposing (read-only for app code; it writes a snapshot to .impeccable/critique/).
- After implementing: /impeccable harden, then break-ui with the worst-case fixture; review-animations only if motion changed; mobile-native in Phases 7, 13 and 15.
- A clean detector run is evidence, not proof; screenshots and real devices decide.
