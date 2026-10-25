# Wearcycle visual review checklist

From Section 8 of the redesign plan v2.2. Capture with `node tools/check.mjs` (fixed clock, stubbed weather, the fixture closet; see tools/check.mjs and CLAUDE.md, "Checks"):

- 360 and 390 (Android, touch, DPR 3), 820 and 1180 (iPad, touch, DPR 2), 1366 and 1920 (Windows, mouse, DPR 1); light and dark; English.
- 360px in French and Japanese for every changed screen.
- Photos, cut-outs and glyph-only items; an empty closet; the worst-case fixture (`node tools/check.mjs --worst-case`).
- Compare with the Phase 4 baseline: `node tools/check.mjs --css-pixels --compare docs/design/baseline --baseline docs/design/baseline/summary.json`. The baseline is always captured with `--css-pixels` (the script refuses to write it otherwise, and `--compare` fails on a run at another scale). `--baseline` turns the review counts (axe, English left, text cut off, detector warnings) into pass or fail against the baseline; detector advisories are recorded but never gate.
- Prove that a change is invisible, or limited to what was meant: capture a before on the current code in the same session, then `node tools/check.mjs --css-pixels --compare <before> --exact`. It lists every changed pixel per screenshot (masks in the run's diff folder) and fails on any; it refuses a before from another Chromium build or launch flags, such as the Phase 4 baseline (Chromium 1194, partial raster). The default `--compare` (pixelmatch threshold 0.1) misses small color changes.

Chromium at iPad sizes shows layout, not WebKit rendering: the real iPad decides at milestones.

## Definition of done (every screen, before release)

- The main action shows without scrolling: "Wear this" at 390 x 844 on Outfits; each screen's primary content at 360 x 800.
- No horizontal scroll at any review width; no text overflow in French or Japanese at 360px.
- No English text left in the French and Japanese screenshots, apart from user content such as piece names.
- axe-core: no serious or critical issues.
- Detector warnings at or below the Phase 4 baseline, or each one explained. Advisories are recorded, not gated; elements hidden on screen are left out of the scan.
- Light and dark reviewed.
- The live check passed on the preview deploy (tools/live-check.mjs in GitHub Actions, signed in with the test account: Chromium at 390 and 1366, WebKit at 820). Claude's container cannot reach Supabase, so this is the real-data test; the owner no longer tests releases (his decision, 2026-10-19 and 2026-10-22). He reviews design choices, such as the Phase 6 direction, on his own devices.
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
