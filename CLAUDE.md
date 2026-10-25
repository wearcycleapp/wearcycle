# Wearcycle: project instructions

Wearcycle is an installable web app (PWA) for managing your own clothes:
ranked, explained outfits for an occasion and the weather; wear, laundry,
condition and repair tracking; donate and shopping lists. Live at
https://wearcycle.app/. Users today: the owner's family; design for any
adult who signs up (public app planned; revenue model undecided, so no paid
features or paywalls in the redesign). Product truth: PRODUCT.md.

## Platforms (all supported)
- Android phones: Chrome, app installed from the browser. Main use.
- iPad: Safari (WebKit), Home Screen app; portrait 744 to 1032px, landscape 1133 to 1376.
- Windows: Chrome or Edge, mouse and keyboard; common widths 1366, 1536, 1920.
- Claude's container has Chromium only. iPad screenshots there show
  layout, not WebKit rendering: check WebKit on a real iPad.

## Stack (hard constraints)
- Plain HTML, CSS and vanilla JavaScript. No framework, bundler,
  package.json or build step in the app. Files are served as they are.
- Hosting: Cloudflare Pages. Production branch main, output is the
  repository root. Pushing to main publishes.
- Backend: Supabase (Postgres with row-level security, auth, private
  "photos" bucket) and one Edge Function "claude".
- index.html: shell, header, tab bar, theme-color metas (theme.js sets the theme before paint).
- styles.css: all styling. app.js: all UI (string templates with
  innerHTML), sheets (openSheet), camera, Supabase, Claude calls,
  canvas share image. logic.js: pure rules, no DOM.
- privacy.html has its own inline CSS. manifest.webmanifest and the
  theme-color metas carry colors too.
- _headers (Cloudflare) sets the security headers and, on the HTML pages,
  the Content-Security-Policy. No inline <script> in index.html (theme.js
  and swreg.js); a new outside service must be added to connect-src or
  img-src there, or the app blocks it.
- The whole repository root is public. Never commit credentials. Never add
  tools/, docs/, .claude/ or .impeccable/ to the SHELL list in sw.js.

## Release model
- All work (features, fixes, redesign phases) goes on one permanent
  branch, preview. Cloudflare previews it at preview.wearcycle.pages.dev.
  Never delete it (Claude's session cannot delete branches). Before work,
  check preview equals main or only adds commits on top of it.
- Release = fast-forward main to preview (git merge --ff-only), so the
  two are identical afterwards. Never force-push either branch.
- Every phase ends with a release to main. Users may see new and old
  screens side by side until the redesign is finished.
- Urgent fixes while a phase is unfinished on preview: commit on main,
  release, then merge main into preview. Fast-forward main only when the
  whole phase is done.
- Screen freeze: while a screen is being redesigned, no feature work on
  that screen. Bug fixes and outfit-rule changes in logic.js continue.

## Release routine (every merge to main)
1. The definition of done in docs/design/UI_REVIEW.md is met.
2. node --check passes for every JS file; node tools/check.mjs passes.
3. Claude tests every release itself; the owner is not a tester (his
   decision, 2026-10-19 and 2026-10-22). Real-data test: the live check
   (tools/live-check.mjs in GitHub Actions) on the preview deploy, signed
   in with the test account. Release only when it passes, or say plainly
   in the release note which checks could not run and why.
4. APP_VERSION in app.js and VERSION in sw.js bumped to the same value
   (app changes only); sw.js non-empty and lists every shell file.
5. Fast-forward main to preview; log it in Project doc claude/wardrobe-app-decisions.md.

## Checks (Claude's container)
- `for f in *.js i18n/*.js tools/*.mjs; do node --check "$f"; done`
- `node tools/check.mjs` with WEARCYCLE_TEST_EMAIL and WEARCYCLE_TEST_PASSWORD in the
  environment (test account only, never in a file); flags at the top of tools/check.mjs.
  Fixed clock, stubbed weather, fixture closet (tools/fixtures/). Supabase calls are answered
  locally, sign-in too when Supabase is unreachable, as from Claude's container (the report
  says so). Test packages: outside, tools/deps.mjs; set WEARCYCLE_PLAYWRIGHT=1.63.0 to match
  the container's Chromium (build 1243 since 2026-10-25).
- Screenshots go outside the repo, except the Phase 4 baseline in docs/design/
  baseline/: always --css-pixels (else refused; --compare needs the same flag).
- Detector: only warnings gate a release (against the baseline);
  advisories are recorded, not gated. Hidden elements are left out.

## Translations
- i18n.js translates each text node by exact English match. Changing
  markup (splitting or joining text) changes what is matched, even with
  no copy change. tools/check.mjs lists English left in fr and ja.
- Any new or changed visible English string goes into i18n/es.js, fr.js,
  tl.js, hi.js, ja.js and ko.js in the same commit, with {0} and {a}
  placeholders kept. Keep copy changes to a minimum.
- Sentence case in source strings; uppercase only with CSS.

## Do not change without explicit approval
- logic.js (scoring, ranking, care rules, shopping calculations).
- The data model (items.body, settings.body, wears) and the Edge Function.
  When items.body or settings.body gains a field, update
  tools/fixtures/closet.json in the same commit.
- Brand: name, logo, Ink & Coral palette (ink #1B2433, coral #FF7A59,
  neutral #F6F4F1). Coral is not a selected-state color.
- Existing features. Never remove one to simplify a layout.

## Design work
- Before any UI change, read DESIGN.md, PRODUCT.md and
  docs/design/SCREENS.md (it records the chosen direction).
- Use the existing tokens in styles.css. No second token set.
- Mouse and keyboard: hover styles only inside @media (hover: hover) and
  (pointer: fine); horizontal rows usable with a mouse; every control
  reachable by keyboard.
- Pick images by rendered size: 256px thumbnails only where the image is
  shown small; cut-outs or photos for large tiles and the hero.

## Design skills (.claude/skills): Wearcycle rules win
- Pinned: Impeccable 4.5.2 (tag skill-v4.5.2), mobile-native, break-ui,
  review-animations (emilkowalski/skills 2d22863). Never run
  `npx impeccable install` or `update`; never install skills globally.
- Impeccable: Wearcycle is an established world. Inherit and refine it;
  never run it as a Redesign that replaces the visual world. The cream
  garment canvas is a brand trait, not a cliche to rework.
- Allowed without asking: critique, audit, harden, layout, typeset,
  quieter, distill, adapt, clarify, polish. Ask first: craft, shape,
  bolder, colorize, delight, overdrive, animate, live, generate.
- If Impeccable regenerates DESIGN.md, restore any rule it dropped.
- No frameworks, npm packages or CDN libraries in shipped code, even when
  a skill suggests one (overdrive does).
- break-ui: worst-case data lives in tools/fixtures/ and enters through
  tools/check.mjs. Never add a demo-data switch to app code.
- harden: never truncate translated labels to hide overflow.
- distill and quieter: never remove a feature, action or font family.
- Type and motion come from DESIGN.md, not skill defaults: body stays 15px
  (the skills assume 16px); animations only inside
  prefers-reduced-motion: no-preference, editorial motion up to 450ms.
- critique writes .impeccable/critique/*.md (tracked); it never edits app
  code. Run it degraded (single context) unless the owner asks for agents.
- live and generate insert a localhost script into index.html. Run
  `live-server stop` and confirm index.html has no live.js before commit.
- Network: .impeccable/config.json "updateCheck": false; .claude/settings.json
  sets DO_NOT_TRACK and IMPECCABLE_NO_TELEMETRY (4.5.2 ignores "telemetry":
  false). impeccable.style is blocked in Claude's cloud: concept-seed is degraded.

## Workflow for UI work
1. Run /impeccable critique (read-only) and read the code.
2. Propose phone, iPad and desktop layouts, the strings that change and
   the image sources. Wait for approval.
3. Implement on preview.
4. Run /impeccable harden, break-ui with the fixture, and
   review-animations if motion changed.
5. Run node --check and node tools/check.mjs.
6. Fix the three highest-impact problems. At most two rounds.
7. Release routine.

## Accessibility (adopted; keep)
- Touch targets 44px (40px for small chips).
- Text contrast 4.5:1; UI indicators 3:1 (WCAG 2.2, 1.4.3, 1.4.11).
- :focus-visible outline; aria-pressed and aria-current on toggles and
  tabs; aria-label on icon buttons; Escape closes sheets (exists).
- Safe-area insets on fixed layers; prefers-reduced-motion respected.
