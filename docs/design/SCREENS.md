# Wearcycle screen rules

Screen-level rules for the redesign, from Sections 7.9 to 7.16 of the redesign plan v2.2 and its errata (Project doc claude/redesign-plan-v2.2.md). Tokens, type, layout bands and motion live in DESIGN.md; product truth in PRODUCT.md. Impeccable does not rewrite this file. Code references are to main at a4159ed (v1.48.2); the "Known issues to fix in this phase" lists were added in Phase 6 from the Phase 5 report and cite styles.css at v1.51.3 (main 1cc8cd5), so their line numbers move as screens are rewritten.

Every screen must work for a stranger with an empty closet, in all seven languages, in light and dark (PRODUCT.md).

## Phase status (2026-10-31)

Recorded at the start of Phase 9 (owner, 2026-10-31); Phase 9 row updated at its release, Phase 10 row when it opened and at its release (2026-11-01), Phase 12 row when it opened and at its release (2026-11-03), Phase 13 row when it opened and at its release (2026-11-03), Phase 14 row when it opened (2026-11-04) and at its release (2026-11-05), Phase 15 row at its release (2026-11-11). Release commits checked as ancestors of main 4210ff9 (v1.61.1). Phases 0, 1 and 3 changed no repository file, so they have no release commit.

| Phase | Status | Release on main |
| --- | --- | --- |
| 0 Reconcile documents | Done 2026-10-12 (plan v2.2) | none (Project docs only) |
| 1 Set up | Done 2026-10-13 | none (Project docs only) |
| 2 Tooling | Released 2026-10-19 | c5c281b |
| 3 Fresh-session check | Done 2026-10-19 | none (no file changed) |
| 4 Baseline | Released 2026-10-19 | 57acf2e |
| 5 Shared foundation | Released 2026-10-25, v1.51.3 | 1cc8cd5 |
| 6 Visual direction | Released 2026-10-25 | 0cba70e |
| 7 Navigation shell | Released 2026-10-25, v1.52.0 | 23ddab6 |
| 8 Outfits | Released 2026-10-26, v1.53.0 (follow-ups v1.53.1 to v1.53.4, v1.61.1) | 6a7869b |
| 9 Closet and garment detail | Released 2026-10-31, v1.62.0 | 2fdc070 (v1.62.0) |
| 10 Care | Released 2026-11-01, v1.63.0 (with it, Shop finished). Partly built before: v1.58.0 (2026-10-27) put the panels in urgency order, shows 3 pieces then "Show all N", and added the Decide sheet | 6a7e2a5 (v1.58.0); c8e8e4a (v1.63.0) |
| 11 Shop | Released early, 2026-10-27, v1.55.0 (follow-ups v1.56.0 to v1.61.0) | 4686467 |
| 12 Settings and other sheets | Released 2026-11-03, v1.64.0 | f99ad4d |
| 13 Full-screen and fixed layers | Released 2026-11-03, v1.65.0 | 0e4c1d4, 8a23253 |
| 14 Share image, privacy page, colors outside CSS | Released 2026-11-05, v1.66.0 (coverage tooling released first, main 86bcedd) | d43035a, ced4d1c |
| 15 Final audits | Released 2026-11-11, v1.68.0, built 2026-11-07 (step 0 tooling released first, 2026-11-07, main 809f4d1) | 809f4d1 (step 0); v1.68.0 in the Project log |

Screen freeze while Phase 9 was open (owner, 2026-10-31): no feature work on Closet, the piece preview, the item editor or the zoom viewer until Phase 9 was released. Lifted with the release of v1.62.0 (2026-10-31).

Screen freeze while Phase 10 was open (owner, 2026-11-01): no feature work on Care until Phase 10 was released. Lifted with the release of v1.63.0 (2026-11-01).

Between Phases 9 and 10, released on its own (owner, 2026-11-01): v1.62.1 stores a 1024px copy with each photo (items.body.med); see Closet, Pictures.

Between Phases 10 and 12, released on its own (owner, 2026-11-01): v1.63.1, Add clothes no longer covers the version line's What's new link on a short Closet page (main b3aa762, 2026-11-03).

Screen freeze while Phase 12 was open (owner, 2026-11-01): no feature work on Settings or any sheet until Phase 12 was released; other chats made bug fixes only. Lifted with the release of v1.64.0 (2026-11-03). Scope (owner): the Settings sheet and every other sheet, including the newer ones: Language, Change password, Share my list, saved ideas, Possible duplicates, Inspiration from a photo, and the What's new page.

Screen freeze while Phase 13 was open (owner, 2026-11-03): no feature work on these layers until Phase 13 was released; bug fixes continued. Lifted with the release of v1.65.0 (2026-11-03). Scope (owner): sign-in and welcome (the brand moment, and the first thing a new public user sees), the camera, the zoom viewer, the job bar, toasts, the "What is this?" step and the consent sheet, with a mobile-native pass (safe areas, input zoom, tap highlight). Also in this phase, found in Phase 12: the Outfits pin card and Closet's In the wash list show the floor photo instead of the cut-out.

Screen freeze while Phase 14 was open (owner, 2026-11-04): no feature work on the share image or privacy.html until Phase 14 was released; bug fixes continued. Lifted with the release of v1.66.0 (2026-11-05). Scope (owner): the share image in shareOutfit (new type and colors, the Phase 6 direction, every language, with and without cut-outs), privacy.html (the app's fonts and Light or Dark choice, no wording change), theme-color metas and manifest colors.

Every screen freeze is lifted with the release of v1.68.0 (owner's Phase 15 brief, 2026-11-07): the redesign phases are done and feature work may touch any screen. The rules in this file stay. Closing summary: "Redesign closing summary" below.

## Screen personalities

| Screen | Personality | Design intent |
| --- | --- | --- |
| Outfits | EDITORIAL | Personal stylist and lookbook. The outfit is dominant. |
| Closet | GALLERY | A visual wardrobe wall. Photography first, details second. |
| Garment detail (preview, editor, viewer) | PRODUCT EDITORIAL | The garment image dominates; actions are close to it. |
| Care | LIFECYCLE | Repair, check, rotate and let go, shown through the garments. |
| Shop | STYLIST INTELLIGENCE | Purchases that add the most outfits; calm when covered. |
| Settings and other sheets | QUIET UTILITY | Conventional, calm and clear. |
| Sign-in, camera, job bar, toasts | BRAND AND TOOL | Sign-in carries the brand; camera and job bar stay functional and unobtrusive. |

## Chosen direction

Owner's choice, 2026-10-25 (Phase 6): **direction A, "Kit", on phones and direction B, "Lookbook", from 700px** (iPad and Windows). Mockups: docs/design/direction/ (a.html and b.html; index.html compares the three directions). B applies only when the viewport is at least 700px wide and at least 600px tall, `@media (min-width:700px) and (min-height:600px)`; otherwise A (owner, 2026-10-25). Phones get A in portrait and in landscape; the iPad and Windows get B whenever their viewport meets both minimums; a browser window under 600px tall gets A at any width. Where an older rule in the screen sections said otherwise (occasion tabs and a lookbook on phones, v1.41's hero-left layout on wide screens), this choice replaces it, and those sections are updated below.

Both keep the brand and the decided rules: ink, the cream garment canvas and the condensed display type; coral only where DESIGN.md puts it (Wear this, the #1 rank, the active tab icon, the active pager dot, progress); selected states in ink (a fill or a 2px underline) with aria-pressed; flat containers. The shell follows the same condition since Phase 7: the bottom bar with A, the rail with B (Navigation shell below).

| | A: below 700px wide or below 600px tall (phones) | B: at least 700px wide and 600px tall |
| --- | --- | --- |
| Type | Compact: day 22px and screen titles 26px in the display face (as every h2), labels 13 to 15px, rank and option numbers in the display face | Editorial: day 52px (56px from 1100px); occasions in the display face, 20px, uppercase by CSS; look numbers 28px |
| Day row | Day, weather and greeting; style as a menu button ("Style: All my styles"); diary | Day, greeting and weather; diary; style as text tabs under the occasions (beside them from 1100px) |
| Occasion selector | All six at once: a segmented grid, 3 by 2, ink fill when selected | Text tabs, selected in ink with a 2px ink underline; the row scrolls sideways when it does not fit |
| Outfit | The kit: top and bottom as 4:5 pictures with category and name, then shoes and accessories in one row, every piece named | The flat-lay board, square, one look per page |
| Reasons | The first reason, then "N more reasons" | "Why this outfit?" with every reason, below the looks |
| Other options | An index: one row per option with its number, small pictures, piece names and match | Looks as pages you turn (swipe, arrows, dots, "1 of 4"), one look per page (v1.53.2; the next one peeked before); from 1100px all looks side by side, today's pick largest |
| Closet | Category chips with counts that wrap (all visible); square tiles, 2 columns; a flag is a short text mark on the picture; the tile keeps the wear count | Category text tabs with counts; 4:5 tiles, 3 columns (5 from 1200px); a flag is the same short word as in A, no icon; the tile keeps the wear count (owner, 2026-10-25) |
| Care | Compact row: 56px picture, name, reason, small action buttons | The garment leads: 160px picture, 18px name, section title in the display face |

Measured on the mockups in Chromium (2026-10-25): "Wear this" shows without scrolling at 360x800, 390x844 and 412x915 (A), and at 744x1133, 820x1180, 1024x1366, 1133x744, 1180x820, 1366x1024, 1366x768, 1536x864 and 1920x1080 (B). That needed one change to B as first shown: the side-by-side spread starts at 1100px instead of 1200px, because at 1200px the page-turn layout put "Wear this" 258px and 209px below the visible area on iPad landscape (1133x744 and 1180x820). b.html is updated.

Open points decided by the owner, 2026-10-25:
- Height. B applies only when the viewport is at least 700px wide and at least 600px tall; otherwise A. Phones in landscape (844x390, 915x412) get A, which at 844x390 showed "Wear this" at 197 to 245px on the mockups; B there ended it at 850px (the installed app allows any orientation, manifest.webmanifest "orientation": "any"). The navigation shell uses the same condition since Phase 7; the exceptions and why are under Navigation shell.
- Closet tiles keep the wear count at every width (Closet rule below). B's mockup tile showed the condition only; the B tile adds the count.
- Closet flags show the same short words at every width, no icons, so no flag has to be learned.
- Windows: "Wear this" shows without scrolling in a 1366x630 viewport (a 1366x768 screen minus browser bars and taskbar). On the B mockup at 1366x768 it ended at 713px, so B's board is sized by viewport height where needed. Measured in Phase 8 (Outfits).

To settle in each screen's proposal (workflow step 2):
- Two compositions per screen. Where they can, A and B share markup (the occasion selector is the same group of six aria-pressed buttons in A and B, so that switch is CSS only); the kit and the board, and the index and the page-turn rail, are different layouts of the same outfit data. Every existing action works in both: tap a piece, Swap for another, Back to suggestion, leave a piece out, Wear this, share, log.
- New strings in the mockups (for example "4 more reasons") are translated when their screen is built.

## Navigation shell (Phase 7)

Rules: DESIGN.md Layout and the plan's Phase 7. Built in Phase 7 (v1.52.0); proposal approved by the owner on 2026-10-25 with the four recommended options (landscape bar, header scrolls, hover on the shell only, rows wrap with a mouse at every width).

The shell follows the direction condition (Chosen direction), so a screen never mixes B with the phone bar:

| Viewport | Shell |
| --- | --- |
| Below 700px wide or below 600px tall | Bottom bar (Outfits, Closet, Care, Shop); Settings in the header, a 44px button; Add clothes above the bar (Closet only) |
| Landscape and below 600px tall (phones turned sideways, short windows) | The same bar, lower: icon beside label, 53px plus the bottom inset (was 66px) |
| At least 700px wide and 600px tall | 96px left rail, icons over labels, Settings at its bottom; the header (logo, wordmark, status) stays at the top of the page |
| Also at least 1280px wide | 208px rail; the header (logo, wordmark, status) sits at the top of the rail and leaves the page; labels beside icons; the Care count at the end of its row; Settings at the bottom |

- Why phones turned sideways keep a bar: the owner's condition gives them direction A, and both platforms do the same (Android shows a navigation bar when the window's width or height is compact, and compact height, under 480dp, covers 99.78% of phones in landscape: developer.android.com, adaptive navigation and window size classes; Apple's tab bar shows icon and title side by side in landscape: HIG, Tab bars).
- Where the condition does not apply: the wide rail also needs 1280px; sheets keep centring from 700px wide (Phase 12); no screen rule switches at 960px any more: Outfits (Phase 8), Closet (Phase 9), Care (Phase 10) and Shop (v1.55.0) follow the B condition; at 960px only the page widens to 1180px.
- Header: scrolls with the page (not sticky, as since v1.38), 59px tall with or without the Settings button. The holiday badge is placed by CSS (`header.top .holibadge`) in every layout.
- Current tab: Accent text at weight 700 on Accent-soft, coral icon, aria-current="page". The Care count is 12px Accent-ink on Bad (6.47:1 light, 5.23:1 dark).
- Order in the page: header, navigation (tabs, then the rail's Settings), Add clothes, then the screen. A focused control scrolls above the bar or Add clothes (`scroll-padding-bottom`).
- Mouse, only inside `(hover: hover) and (pointer: fine)`: tabs and Settings get an ink tint and ink label, the header's Settings border turns ink, Add clothes darkens; the occasion, style and category rows wrap at every width (touch keeps the sideways swipe). Hover on other buttons and chips comes with each screen's phase.
- Language (v1.57.0, owner 2026-10-27): a globe button with the current language in its own name (English, Español, 日本語) sits before Settings in the header (globe only below 380px wide), and above Settings in the rail. It opens the Language sheet (openLangs): one 48px row per language, the current one bold with a ✓. Settings opens with the Language row first. A suggestion banner, written in the phone's language, offers that language once to people who use the app in English while their phone is set to a supported language (i18n.js keeps English for existing users): "Use" switches, "Keep English" stores the choice; either stops the banner (wearcycle.langAsked).
- Safe areas: `:root` pads top and bottom, `body` pads left and right; the bar, rail, Add clothes, toasts and job bar add the insets on their own edges.
- Viewport units: a vh line stays as the fallback, then dvh where the element follows the visible height (the sticky outfit board on wide screens) or svh where it must fit the first screen (the outfit board on phones turned sideways, the piece preview picture).

### Known issues fixed in this phase (v1.52.0)
- The header lost `position:sticky` in v1.38 (the holiday-badge rule `header.top{position:relative}` overrode it). Owner, 2026-10-25: it keeps scrolling with the page.
- With `position:relative`, `top:env(safe-area-inset-top,0px)` moved the header down by the inset on top of `:root`'s padding with the same inset: with a 47px inset (Chromium's safe-area emulation) it was drawn at 94px and covered 29px of the day row. The offset is gone; the header now sits at 47px. Real inset values on devices are still to be seen on hardware.
- Overridden declarations (2): `.version` font-family and letter-spacing, removed (the version line is 12px).
- Dark mode: the Care count was white on #f2668b, 2.98:1; now Accent-ink (ink in dark), 5.23:1.
- Also found and fixed: Add clothes' shadow, rgba(20,30,60,.25), was a faint blue halo on the dark page (9 of the 11 detector warnings, dark-glow); it is now the token `--shadow-float` (ink at 25% in light, black in dark).

## Outfits (EDITORIAL)

Built in Phase 8 (v1.53.0). Proposal approved by the owner on 2026-10-26 with the four recommended options: build A and B as shown; clear the stored "Show outfits as" choice once; from 1100px the selected look is the largest, with Wear this under it; a piece without a cut-out drawn large uses its photo, downloaded once and kept at 1024px on the device.

Follow-up v1.53.1 (busy mornings), approved by the owner on 2026-10-26 with both recommended options: build the fold as shown; fold the holidays on wide screens too. The holiday bar, the holiday choices and the laundry reminder become one reminders line that opens the Reminders sheet.

Direction A (below 700px wide or below 600px tall), top to bottom:

1. Day row: the day (22px, display face); the weather (a button: temperatures, opens the weather settings) and the greeting on the line below; the style menu, a button "Style / All my styles" that opens a sheet with the choices (only when 2 or more styles are picked); the diary.
2. Occasions: all six at once in a 3 by 2 grid, the selected one an ink fill (aria-pressed), 40px targets; long translations wrap inside their cell. Holidays are not in the grid (v1.53.1).
2a. The reminders line (only when there is something to say), full width, 44px or taller: each holiday in the next 14 days with its icon and name (its greeting on the day itself; the chosen one an ink pill), then "In the wash" with the count when the laundry question is due, and a chevron. It wraps, never truncates (two rows at 360px in English). It opens Reminders: per holiday its date, its tip and a Themed outfits chip (pressed in ink when chosen); the laundry question with All clean, Choose and Not yet. An action closes the sheet; after Themed outfits or Not yet, focus returns to the line. Choosing an occasion leaves the holiday. The holiday tip under the occasions is shown on wide screens only.
3. The outfit: rank, title, style and match, Adjust (44px). The kit: the main garments (layer, top or dress, t-shirt underneath, bottom) as 4:5 pictures with their category and name; shoes, belt and accessories in one row of small squares with their names (a dress alone brings the shoes up to the main row). The flat-lay board instead when chosen in Adjust, as tall as the first screen allows.
4. Wear this and share, right under the outfit; then the tap hint or Back to suggestion; + Wear a t-shirt underneath, + Wear a belt; the first reason (a note first, if there is one) and "N more reasons" (every other reason and the ranking rule); the palette with the weather advice; the cut-out note; Wore something else? Log it.
5. Wearing today (after logging): one line, the label, up to 8 thumbnails and Edit.
6. More options: an index, one row per option (64px or taller): its number (02, 03...), small pictures of the top, bottom and shoes, the piece names and the match; New ideas in the heading.

Phones turned sideways (A, at least 700px wide and under 600px tall): the reminders line in the day row, between the day and the style menu; the occasions in one row of six; the kit on the left, sized by the screen height; the header, Wear this and the reasons on the right.

Upright phones (below 700px wide): when notes above the outfit (the reminders line, the offline banner, the dress-code question, outfits around one piece) would push Wear this under the bar, fitKit (app.js) makes the kit's main pictures shorter, down to 100px (the board down to 200px). Nothing changes when they fit.

Direction B (at least 700px wide and 600px tall):

- Day row: the day (52px; 56px from 1100px), "Good morning · weather" below, the reminders line (at most 55% of the row, 560px) and the diary on the right.
- Occasions as text tabs in the display face (20px, uppercase by CSS), the selected one in ink with a 2px ink underline; the row scrolls sideways when it does not fit (wraps with a mouse). Holidays are chosen from the reminders line, not the tabs: as tabs they wrapped the row with a mouse in Japanese and Tagalog (Wear this at 588 to 636px and 625 to 673px of 630). Style as text tabs under them, beside them from 1100px.
- The looks as square flat-lay pages (fitLooks in app.js sizes the selected board so Wear this ends inside the window, never under 240px). Below 1100px (v1.53.2, owner 2026-10-26): one look per page, the full width of the column, in a row that follows the finger and turns at most one page per swipe (v1.53.4: a release turns the page when the drag passed a fifth of the width or ended in a flick that way, otherwise it goes back; past the first or last look the row moves at a third of the finger's speed and goes back; vertical moves stay with the page, touch-action pan-y; a touchpad's sideways swipe turns one page per gesture); 44px arrows, dot buttons (24 by 44px with an 8px mark, the current one coral), "1 of 4" and the arrow keys slide there too. The dots and "1 of 4" follow the drag; the page turned to becomes the selected outfit (pagerPick) and Why this outfit follows, without redrawing the pages. Pages other than the selected one are inert. fitLooks keeps the arrows and dots in the first screen (with no peeking page they are the only sign of more looks); when the board, sized by the height, leaves a 300px column free (short windows), the outfit header, Wear this and the rest sit beside the board. Measured in Chromium at 800x1280 with injected touch events: v1.53.1 did not move under the finger and turned only on a swipe under 0.7 s, over 60px and within 50px of horizontal; v1.53.2 follows the finger. Phones keep their quick-swipe on the kit (owner: tablets only for now). From 1100px: every look side by side, the selected one first and largest (the others at most 80% of it); clicking one selects it. Only the selected page has pieces to tap, Adjust, Wear this and share; New ideas under the looks.
- Then Wearing today, then "Why this outfit?" (display face, 24px): every reason with the ranking rule; the palette, the weather advice and the cut-out note beside them; Wore something else? Log it.

Both: the holiday bar under the header is hidden on Outfits while the reminders line shows (CSS :has); Closet, Care and Shop keep it. Selected states in ink; coral only on Wear this, the #1 rank and the active pager dot; no card around the outfit (flat); the garment canvas stays cream in both themes. "Show outfits as" (Adjust): with no stored choice, A shows the kit and B the board; a choice is stored under wearcycle.outfitView (the pre-1.53 key wearcycle.view is cleared once, owner 2026-10-26).

Pictures: every piece with a cut-out shows it, large or small (the kit's main pictures and small squares, the selected board, other looks, index pictures and Wearing today; owner, 2026-10-27, so an outfit reads as one look). Without a cut-out, by drawn size times pixel density: the kit's main pictures and the selected board's large cells use the photo reduced on the device to 1024px and kept in the cut-out cache (downloaded only when the 256px thumbnail would be drawn more than 1.1x its size; sign-out clears the cache); small squares, index pictures and Wearing today use the thumbnail. One download per cut-out (requests in flight are shared; a file the server does not return is not asked for again in that session).

"Wear this" is visible without scrolling, with its top and bottom edges uncovered, at the 13 sizes under Chosen direction (tools/check.mjs fails otherwise) and on phones turned sideways. Measured on v1.53.0 in Chromium with the fixture closet: 695 to 743px at 390x844 (bar from 778px), 654 to 702px at 360x800 (bar from 734px), 566 to 614px at 1366x630, 277 to 325px at 844x390 (unchanged in v1.53.1).

Busy morning (v1.53.1; closet.json "busyMorning", 25 October 8:30: Halloween in 6 days, Diwali in 14, the holiday bar, a laundry reminder): tools/check.mjs fails unless Wear this is visible at 390x844 and 1366x630. Measured: 679 to 727px at 390x844, 566 to 614px at 1366x630, 677 to 725px at 360x800 (kit pictures 103px), 751 to 799px at 820x1180, 277 to 325px at 844x390; v1.53.0 had 907 to 955, 699 to 747, 905 to 953, 916 to 964 and 524 to 572. Offline, with the banner on top: 720 to 768px at 390x844 on a quiet morning and on a busy one (v1.53.0: 766 to 814 and 974 to 1022).

Code: renderOutfits, remLine and openReminders, fitKit (A), heroCard (A), optionIndex and optRow (A), lookbook, lookCur, lookAlt and fitLooks (B), whySection (B), kitHtml, kitPic, flatlay, cutNote, todayLine, renderStyleChips and openStyleMenu, hydrateCuts, hydratePhotos and medUrl (app.js).

### Known issues fixed in this phase (v1.53.0)
- Overridden declarations (47) and the unused rules listed in Phase 6: removed first, with no visible change (all 112 screenshots identical to the pixel). `.side` was checked against the camera: `.cam .side` sets display:grid and its buttons hold one grid item, so the removed flex-direction and gap never applied there.
- "Wear this" below the first screen at 12 of the 13 sizes (950 to 998px at 390x844, 761 to 809px at 1366x630): now visible at all 13.
- Pager dots of 8 by 8px (axe target-size, serious, on every Outfits view) and 36 by 32px arrows: replaced by the index on phones; 24 by 44px dot buttons and 44px arrows from 700x600.
- The coral side stripe on `.askcard` (detector side-tab warning) and the unused `.advice`: removed.
- Coral as a selected state (the selected option's pill, the selected holiday chip): now ink.
- The board's focus order (top, accessories, then trousers and shoes): now the reading order; focus stays on the pager control, dot or index row after a keyboard selection.
- Smooth scrolling on selecting an option ignored reduced motion: now instant when the system asks for reduced motion.
- The same cut-out downloaded up to 20 times when Outfits opened (cutUrl had no shared request): one download per cut-out; opening Outfits went from 478 KB in 87 files to 60 KB in 9 files on phones (43 KB in 8 files from 1100px), fixture closet.
- Pictures drawn up to 1.7x (2x at 820px) larger than their files: the large pictures now use the cut-out or the 1024px photo copy. The fixture's own files are small (560px photos, cut-outs about 230px wide once trimmed), so the check still reports up to 1.8x there.
- Also found and fixed: `.dot` and `.pcount` were generic names shared with the Closet and the piece sheet, so the pager rules are scoped to `.pgr`.

### Fixed in v1.53.1
- Busy mornings pushed Wear this off the first screen (above): the holiday bar, the holiday choices and the laundry card are folded into the reminders line.
- Resizing a window or turning an iPad while another tab was open left the board mis-sized (at 1366x768 resized to 1300x700: 1044px wide, Wear this at 1351px of 700). fitLooks now skips a hidden screen and goTab sizes it on return (346px, 653px, the same as a fresh open).
- The board was sized before i18n.js translated the page, so longer translated text could push Wear this down; it is sized again on the next frame.
- Settings > Holidays said "a chip on the Outfits screen"; it now says the Outfits screen suggests looks in the holiday's colors (six languages).

### Fixed in v1.53.2 (tablets: swipe the looks)
- Owner report (2026-10-26, Android tablet, 800x1280): sliding the outfits did not work, or not smoothly, and the second look cut off at the screen edge did not look professional. Measured on v1.53.1 at 800x1280 with injected touch events: the board moved 0px under the finger; a 0.35 s swipe changed the look only after the finger lifted, in one jump; a 1.2 s swipe, or a drag held before letting go, did nothing (the code took only swipes under 0.7 s, over 60px and within 50px of horizontal).
- Now (above, Direction B): one look per page in a scroll-snap row. Same touch test: the board followed the finger (347 to 353px of a 370px drag); quick and slow swipes both settled on option 2; a 40% drag held and released went back to option 1. Board at 800x1280 389 to 672px, 820x1180 401 to 678px, 744x1133 357 to 616px, 1024x1366 510 to 864px; the arrows and dots stay in the first screen. Short windows put the header and Wear this beside the board: at 1000x700 Wear this 636-684 to 338-386px and the dots 728-772 (below the window) to 640-684; at 700x600 Wear this 625-673 (below the window) to 338-386.
- Other pages load their large photos (pieces without a cut-out) only when turned to. The fixture's small test cut-outs are drawn up to 1.9x on the bigger board (ipad-820, first screen); real cut-outs are 1024px.
- tools/check.mjs and tools/live-check.mjs count only pictures inside the screen and outside inert pages (the pages beside the screen counted as shown).
- Motion (review-animations, by hand): the row follows the finger and the settle after release is the browser's own scroll snap; the arrows and dots slide (the browser's smooth scroll) only on a tap or click, and move at once from the keyboard or when the system asks for reduced motion.

### Fixed in v1.53.4 (tablets: one swipe, one look)
- Owner report (2026-10-27, Android tablet, on v1.53.3): it works better, but a mid-size swipe ran on to the last look, so he had to go back for the third; only very small swipes stopped at the next one. v1.53.2 relied on the browser's scroll snap with scroll-snap-stop: always, which should stop at every page. In Chromium 153 on Claude's computer it did, in every test (15 swipes of 25 to 85% of the page in 50 to 400 ms, and 4 pairs of swipes 80 to 600 ms apart); on the owner's tablet it did not. The engine on the tablet could not be tested from here.
- Now the row is moved by the app (pointer events and a CSS transform) and a release turns at most one page, whatever the browser. Measured at 800x1280 with injected touch events: 12 swipes from option 2 (10 to 95% of the page, 60 to 800 ms) all end on option 3, except slow drags under a fifth of the page, which go back to option 2; two swipes 60, 150 and 300 ms apart from option 1 end on option 3; the row follows a 300px drag to the pixel; the first look pulled right and the last pushed left go back; a vertical swipe on the board scrolls the page; a tap on a piece opens it and the end of a drag does not.
- Motion (review-animations): the drag is direct manipulation (no animation, also with reduced motion); after release, and on an arrow or dot, the row slides 0.3 s with the strong ease-out cubic-bezier(.23,1,.32,1), only when the system does not ask for reduced motion; from the keyboard it moves at once. A drag that starts mid-slide picks the row up where it is drawn.

## Closet (GALLERY)

Built in Phase 9 (v1.62.0). Proposal "Wearcycle Closet redesign" approved by the owner on 2026-10-31 with the four recommended options: build A and B as shown; phones turned sideways get as many 150px columns as fit; the garment sheet goes side by side from 700px wide; a piece without a cut-out downloads its photo once and keeps a 1024px copy. Critique: .impeccable/critique/2026-11-01T02-06-48Z__app-js.md (25/40).

- A (below 700px wide or 600px tall): category chips with counts that wrap, so every category is visible (40px small chips, counts 12px at full color); "In the wash N" is a separate toggle at the end of the row (pressing it again goes back to All). Square tiles, 2 columns on upright phones (auto-fill of 150px columns: 4 at 844x390).
- B (at least 700x600): category text tabs in the display face (20px, uppercase by CSS), the chosen one in ink with a 2px ink underline, counts in the body face; the row wraps at every input, so In the wash, right-aligned at its end, never leaves the screen. 4:5 tiles, 3 columns, 5 from 1200px wide.
- Tile (both, every width; owner 2026-10-25): the picture, the name in Figtree (up to 2 lines), then "condition · N wears" ("1 wear", "Never worn"). Flags as short words on the picture's top left: Example, Review (accent), In the wash (warn), Needs repair (bad), Needs attention (warn; bad when the piece is to be let go). Occasions are no longer on the tile; they stay in the editor. Tiles are flat (no card, no shadow); cut-outs and glyphs sit on the cream canvas; tile pictures have an empty alt, so each tile says its name once.
- Kept: Stats, Add clothes, Possible duplicates (v1.58.7), the Review line with Confirm all, the Example line with Remove examples, the In the wash list with Mark all clean and Clean, the empty closet; opening a tile opens the editor.
- Pictures (Phase 9 rule, also used by the garment sheets): a piece's cut-out wherever it has one; otherwise the thumbnail (256px; 320px when cropped to Claude's box, cropThumb) while drawn size x pixel density stays within 1.1x of the file, the 1024px copy of the photo (medUrl, kept on the device with the cut-outs; cropped to Claude's box when the thumbnail was; since v1.62.1 read from the copy stored with the piece, items.body.med, and from the full photo only when there is none or a box crop of it would be soft, after which the device stores the copy once) up to 4.4x the thumbnail, the full photo beyond that. Closet pictures load only when they come within half a screen (IntersectionObserver), so opening the app no longer downloads every cut-out in the closet.
- Measured with the fixture (Chromium, before 4210ff9, after the prototype): app open on phones 60 KB in 9 files to 51 KB in 8, then Closet +0 to +37 KB in 2 (the photos of the two visible photo-only tiles); at 1366 43 KB/8 to 35 KB/7, Closet +0. Closet pictures drawn larger than their file at 390: 3 of 3 (up to 2.0x) to 1 of 3 (1.3x, a fixture cut-out of 294px, the largest file it has); 1366: 0 of 8 to 0 of 6.
- Measured on real data (live check, test account, 22 pieces, first open of each screen; before: run 41266029199 on the old Closet, after: run 41268402119, app files of 2fdc070). Closet first screen, pictures drawn larger than their file: phone 390 (Chromium, DPR 3) 3 of 4 (up to 1.4x) to 0 of 4; iPad 820 (WebKit, DPR 2) 0 of 16 to 0 of 9; 1366 0 of 10 to 0 of 10; the editor 0 of 1 at all three. Closet bytes: phone +0 to +1,958 KB in 5 files, iPad 820 +0 to +4,006 KB in 10 files, 1366 +0 to +0: each file is a full photo read once to make the 1024px copy, which stays on the device (in the probe a reload read the copies from the device: +1 KB). Opening the app on Outfits: phone 877 KB in 5 files before, 774 to 877 KB in 5 after; iPad 875 KB in 5 both; 1366 116 KB in 3 both.
- Code: renderCloset, tileHtml, tileFlags, wearsWord, lazyPics, upPic, sharpen, picScale, medUrl and cropBlob (app.js).

### Known issues fixed in this phase (v1.62.0)
- Overridden declarations (17): `.tag`, `.card`, `.grid`, `.dot` and the condition colors `.c1` to `.c5` went with the old tile (condTag removed); `.ex` is one rule with no overrides (same computed style, so the Care and editor marks do not change). `.pgr .dot` now sets the border radius it used to get from the Closet's `.dot`.
- Chip counts: 11px at 75% opacity, 3.41:1 (light) and 4.19:1 (dark), now 12px at full color, 5.88:1 and 6.36:1. axe-core serious nodes on Closet 16 to 0.
- Condition tags (11.5px) and the tile marks (11px) are now 12px words (Warn on Warn-soft 4.52:1, dark 7.02:1; Bad on Bad-soft 5.05:1, dark 4.94:1).


## Garment detail (PRODUCT EDITORIAL)

Built in Phase 9 (v1.62.0, approved 2026-10-31, as above).

- Piece preview (openPiece) and item editor (drawEditor) share one frame: openSheet(html,'gsheet'). Phones: a bottom sheet with the picture first at full width (square, up to 48% of the screen height); the editor's Take photo, Choose photo, Fill in automatically and cut-out buttons right under it, then the fields; the preview's previous and next buttons under the picture, then the details.
- From 700px wide (where sheets centre; phones turned sideways too, owner 2026-10-31): a centred sheet up to 1040px wide, the picture on the left (about 60%, 4:5, sticky while the details scroll) and the details on the right (about 40%). Save, Cancel and Delete (editor) and Open item (preview) stay in the sheet's bottom bar.
- Every editor field and action is kept; In the wash, Review and Example states stay clear. The editor no longer downloads the full photo on open: the picture is chosen by its drawn size (the rule under Closet). The zoom viewer keeps the full photo for zooming. Long-press stays rejected (v1.24).
- Zoom viewer (openViewer): unchanged chrome (Phase 13 redesigns it); cut-outs sit on the cream canvas tokens.

### Known issues fixed in this phase (v1.62.0)
- The hard-coded `#f3f0ea` behind cut-outs in the zoom viewer is now the cream canvas gradient (--canvas-1 to --canvas-2, the same in both themes, as every garment canvas).
- The editor showed the piece at 110 by 110px at every width and downloaded the full photo for it.


## Care (LIFECYCLE)

Built in Phase 10 (v1.63.0). Proposal "Wearcycle Care redesign" approved by the owner on 2026-11-01 with the four recommended options: build A and B as shown; sections in the order Repair, Let go, Check, Rotate; Shop's panels get a 1px hairline instead of the shadow; a piece under repair is listed only in Repair. Critique: .impeccable/critique/2026-11-01T14-14-59Z__app-js.md (26/40).

| Section | Groups (titles kept) | Actions kept |
| --- | --- | --- |
| Repair | To repair | Fixed, Find a tailor / Find a cobbler / Find watch repair |
| Let go | Donate or recycle, with the drop-off guide; Donated or recycled (history) | Mark donated, Mark recycled, Open, Donation drop-offs, Textile recycling, Restore |
| Check | Condition check due; Moved down a level | Check; Recheck and Decide (Repair, Home and chores, Mark donated, Mark recycled) |
| Rotate | Give them a rest; Not getting picked | Open; See outfits, Open |

- Order: what to do first, the v1.58.0 order grouped (owner 2026-11-01); the history sits at the end of Let go. A section shows only when it has pieces; when none has, one calm line: "Nothing needs attention right now." Every group keeps its title, its explanation, the first 3 pieces then "Show all N" (S.careOpen, v1.58.0) and every action. Not getting picked leaves out pieces in the wash (v1.58.0) and pieces under repair (Phase 10).
- A (below 700px wide or 600px tall): compact rows, a 56px picture, the name (wraps, never cut; a person's own piece names are marked data-notr so they are never translated, example pieces still are), the reason, then the actions as 44px buttons with 13px type; a row with one action (Check, Open, Restore) puts it beside the text. Section titles in the display face, 24px, uppercase by CSS; group titles 15px in the body face.
- B (at least 700x600): sections side by side, two at most (grid, auto-fit); the garment leads with a 160px picture and an 18px name; section titles 32px in the display face. A section narrower than 420px (iPad portrait) puts the picture above the text; a section alone on its row lays its pieces out in two columns (container queries).
- Flat: sections sit on the page, rows are divided by hairlines; no cards, no shadows, no colored stripes (the state is in the reason text).
- Pictures: the cut-out on the cream canvas wherever there is one; otherwise the thumbnail, or the stored 1024px copy where the picture needs more (the Phase 9 rule; Care pictures load near the screen). The picture opens the zoom viewer by mouse, touch or keyboard (role button, tabindex 0, Enter or Space); Escape closes the viewer and focus returns to the picture (Phase 10, for every opener).
- The Decide sheet keeps its four explained choices; its piece row uses the same picture (56px at every width).
- Measured with the busy Care set (tools/fixtures/worst-case.json "care", Chromium): page height at 390x844 4.5 to 3.8 screens, French 360 5.2 to 4.6, Japanese 5.0 to 4.4, 844x390 8.8 to 7.7; on wide screens longer because of the 160px pictures (820 2.9 to 3.8, 1180 2.5 to 3.8, 1366 2.6 to 4.0, 1920 1.9 to 2.9); buttons under 44px 34 of 36 to 0; zoom pictures reachable by keyboard 0 of 11 to all.
- "In the wash" stays in Closet.
- With only the donated or recycled history and nothing to do, the calm line shows above Let go with the history (checked at 390x844 and 1366x768, no overflow or errors).
- Real data (live check, test account, preview run 41320695294 on c8e8e4a): Care opens on Chromium 390 and 1366 and WebKit 820 with no horizontal overflow, broken picture, blocked write or console error; +0 KB when opened after Closet, as on v1.62.1.
- Code: renderCare, carePic, cRow, cGroup, cSec, notPickedList, openDecide (app.js); the Care block in styles.css.

### Known issues fixed in this phase (v1.63.0)
- Overridden declarations (2): `.panel-h .count` is set once (13px, Muted, the body face it inherits); same computed style.
- The 3px Bad and Warn stripes on rows (`.stripe-retire`, `.stripe-down`), `.li.care` and the 960px two-column rule for Care are gone with the old layout.
- The pictures that open the zoom viewer were a div with role button and no tabindex (not keyboard reachable), and the viewer did not close with Escape.


## Shop (STYLIST INTELLIGENCE)

Built in v1.55.0 (Phase 11 brought forward; proposal "Wearcycle Shop redesign" approved by the owner on 2026-10-27; critique .impeccable/critique/2026-10-27T19-10-00Z__app-js.md). This replaces erratum 2's order (versatility first, owner 13 October 2026).

- One answer first: a summary line ("{0} buys would help most." with the covered occasions, or "Nothing to buy right now. Every occasion is covered."), then Buy next with at most three cards.
- Buy next, in order, from needs the app already computes (never an invented need): pieces on the Replace list (condition 1, or below the work or going-out bar where that occasion is short of their kind); Work and Going out gaps from gaps() (with the shoe rotation), each with its best color; the top versatility() pick; other occasions' gaps. One card per kind and color. Each card: a 56px garment glyph in the suggested color on the cream canvas, why (Worn out in Bad, the occasion and count, or Most new pairings), the name, "+N outfits" in the display face, the reason lines (tired shoes, Replaces ...), the owned pieces it pairs with as small cut-outs, and Shop. The rest of the versatility list sits under "N more ideas". With no need at all, Buy next is not shown and the versatility list is one folded row.
- Replace cards (v1.57.1, owner 2026-10-27): the picture is the person's own piece (cut-out, else its photo; the glyph only when it has neither), the title is its name, the label says "Worn out" at condition 1 or "Condition N of 5 · Below the work level" (or going-out) otherwise, and Shop searches its color, material and kind (material left out in other languages unless translated). The wish list shows the same picture and name. Cards for something not owned keep the glyph in the suggested color.
- Share my list (v1.57.2, owner 2026-10-27): a size is required for every ticked piece with a size field (Share and Copy stop with "Add a size for each ticked piece." and the empty fields marked); "Measurements (optional)" is a fold under the list with a cm / in switch and, per ticked kind, chest and sleeve length (tops, outerwear), waist, hip and inseam (bottoms), chest, waist and hip (one-piece), foot length (shoes), saved once per kind in settings.measures. The shared text adds them in brackets after the size.
- Share my list links (v1.58.1, owner 2026-10-28): "Include shop links" (on by default, remembered on the device in wearcycle.wlLinks) adds, on its own line under each item, the same Google Shopping search as that item's Shop button; apostrophes are sent as %27 so chat apps keep the whole link.
- Saved ideas against the closet (v1.61.0, owner 2026-10-31, after bought black sneakers stayed in Saved ideas): a saved idea matched by a piece added on or after the day it was saved (essentials rule: exact, then another material in the named color; "A or B" tried separately; one piece per idea) shows "✓ Bought: <piece>", muted, at the end of the list, unticked in Share my list. Tapping a saved idea opens Shop online, "I have one" (that type first, Show all pieces) and, when bought, "Not bought yet" (stops the automatic match). Kept in settings.haveFor.ideas[idea id] (item id or ''), cleared when the idea is removed.
- Style essentials, I have one (v1.60.0, owner 2026-10-31, after bought sneakers still showed as "to add"): a "to add" row opens a sheet named after the piece with Shop online and "I have one" (closet pieces of that type first, Show all pieces for the rest); the pick is kept in settings.haveFor[style][label] and the owned row says "Chosen by you" with an Undo button. Matching (logic.js essentials, approved): exact matches first, then a piece of another material whose main color is a color the description names.
- Buy next overflow and grouped Replace (v1.59.0, owner 2026-10-29, after shoes vanished from Buy next): Buy next still shows 3 cards, and needs past the third fold under "N more needs" (a row each: picture, title, reason, Shop link) and are offered unticked in Share my list; the top pairing pick stays in the ideas fold. Two or more pieces of one kind with the same reason (worn out, below work, below going out) make one "Replace N pieces" card naming up to 3 of them (+N); Share my list lists each piece. A work or going-out gap card is left out when the pieces on Replace cards fill that whole gap (By occasion still shows it).
- Share my list Select all (v1.58.9, owner 2026-10-29): a 44px "Select all" checkbox above the list ticks or clears every row; it shows checked when all rows are ticked, mixed (indeterminate) when some are, and follows row changes. Measurement groups follow the ticked kinds as before.
- Share my list text and picture (v1.58.8, owner 2026-10-29): "🎁 My wish list", then Sizes and Measurements once (only the ticked kinds), numbered items (English "White leather sneakers"; other languages "type · color" to avoid gender agreement; only the first of "A or B"), links as google.com/search?udm=28&q=a+b on their own line, the note, "Made with Wearcycle". "Include a picture of the list" (on, wearcycle.wlPic) shares a 1080px PNG of the same list (cream canvas, ink number badges, color swatches, logo) with the text where the phone can share files; "Save picture" downloads it.
- Inspiration from a photo (v1.58.3, owner 2026-10-28): from the Outfits style menu or row ("+ From a photo"), Shop's Build toward a style and Settings › Your style. Take a photo (camera, "Fit the whole outfit in the frame") or Choose a photo; Claude's look task; a result sheet with the look (name, summary, colors, close-to styles), In your closet (each piece matched to one of yours, with its picture), To complete it (Shop link and Add to wish list, which saves it as a saved idea), then Save as a new style, Update a style (merge into a photo style: shared pieces first, then new and old in turn, at most 10 pieces, 5 colors, 3 base styles) or Discard; after saving, See outfits in this style. Built-in styles are never changed.
- Ideas from Claude (v1.57.3, owner 2026-10-27): the last answer is kept in settings.ideas and shown again with "Suggested <date>" (Ask again replaces it); each idea has a Save toggle (aria-pressed, ink when saved); saved ideas sit on top under "Saved ideas" with a 44px ✕ to remove, kept in settings.savedIdeas (at most 40) and offered unticked in Share my list (no size field: ideas have no category).
- By occasion: one row per occasion; a covered one is one line; a gap row opens the details in place (meters, reason lines, colors with +N outfits, shop links).
- Coming up: the season row (date, "N of M ready", "N to add") opens the missing items, one "Ready: ..." line, the two preview outfits and the bring-out and storage lines; the holidays row opens each holiday with its tip, owned colors and See outfits.
- Build toward a style: per style a row with "have of total" and "N to add" or Complete, then only the pieces to add; "Show the N you own" opens the owned essentials (each opens the piece).
- Ideas from Claude and the department question unchanged.
- Share my list (v1.56.0, owner 2026-10-27): a button in the Buy next heading (or under the folded ideas row) opens a sheet with every Buy next piece ticked and the other ideas unticked, a size field per piece (one size per kind, saved in settings.sizes and filled in next time; fields of the same kind stay in step), and a note. Share uses the phone's share menu (plain text); without one, or for Copy, the text goes to the clipboard. Nothing is published; the text is written in the app's language.
- Rows that open are buttons with aria-expanded (44px or taller); the open state is kept for the session (S.shopOpen). One column below 700x600; from 700x600 two columns: left the summary and Buy next and By occasion, right Coming up, Build toward a style and Ideas from Claude. The 960px columns rule no longer applies to Shop.
- Measured with the fixture closet: phone 4,710px (5.6 screens) to about 2.3 screens folded; French at 360px 6.3 to 2.6; 820 4.0 to 1.1; 1366x768 3.3 to 1.6.

Definition of done, checked 2026-10-31 on preview 4210ff9 (v1.61.1): tools/check.mjs --css-pixels --baseline (22 pass, 0 fail, 0 to review) and its --worst-case run show, on all 16 Shop views and the worst-case Shop views, no horizontal overflow, no app text cut off or spilling, no English left in French or Japanese, no serious or critical axe-core node; detector warnings 0 (baseline 15); at 360x800 the summary line and the three Buy next cards sit at 186 to 670px, above the bar at 734px (measured with the same stubs, without the one-time "Wearcycle was updated" notice; with the notice the third card starts in the first screen and ends below the bar); light and dark screenshots reviewed; the live check passed on that commit (run 41252957943). Not recorded for v1.55.0: the number of refinement rounds.

Finished in Phase 10 (v1.63.0, owner 2026-11-01):
- Flat: Shop's panels lose the soft shadow and get a 1px hairline (--line), as the owner chose; DESIGN.md's Flat-By-Default Rule now holds on Shop.
- Harden (Chromium, 8 sizes from 360x800 to 1920x1080, en, es, fr, tl, hi, ja and ko at 360x800 and 1366x630, en, fr and ja at the other sizes, with every row opened): fixed 8 small buttons that were 40px tall (now 44px); the holiday color dots spilled 4px out of their row (the last dot's negative margin, now 0); in a narrow column (700x600, panel under 340px wide) a row's status was squeezed to 41px and broke word by word, so there the status goes on its own line under the title (container query). After the fixes: no horizontal overflow, no text spilling, no English left on Care, no button under 44px, no shadow, at every size and language.
- break-ui with tools/fixtures/worst-case.json (long names, empty closet, 200 pieces, the busy and calm Care sets): no horizontal overflow and no Shop text cut off or spilling; the only text cut in the run is the French Settings line "Recadrer les photos sur les vêtements" at 360px, which was there before this phase.

### Known issues fixed in this phase (v1.63.0)
- Overridden declarations (2): `.opt em` is set in one rule (12.5px, weight 600, Good, upright); same computed style.


## Settings and other sheets (QUIET UTILITY)

Built in Phase 12 (v1.64.0). Proposal "Wearcycle Settings redesign" (https://claude.ai/artifact/R5eMHtXfuGrf56m7Tbx6Gf) approved by the owner on 2026-11-03 with the four recommended options: build as shown; from 1100px wide a wider Settings with an index of its groups; the style pictures on the cream canvas in both themes; on/off settings as switches. Critique: .impeccable/critique/2026-11-03T13-43-26Z__app-js.md (26/40).

Every sheet (openSheet, app.js; 29 places open one):
- A named dialog: aria-labelledby points at its title (#sheet-title). Opening moves focus to the title; the page behind (#appRoot) is inert while it is open (no Tab, no taps, skipped by screen readers); a redraw of the same sheet keeps focus on the same control (matched by id or data attributes); closing gives focus back to the control that opened it, also when the sheet changed in between (Settings, then Your style).
- The sheet and the dimmed layer contain their scroll (overscroll-behavior: contain; the layer is overflow hidden). Chromium already kept the page still (the body is locked); the guard is for phones, where the owner saw the page move.
- 44px close button and buttons (40px small chips); form fields 16px and at least 44px tall, so iOS Safari does not zoom into them; checkboxes in Accent. Corners 20px.
- Lists sit on the sheet: a .panel inside a sheet is a list with hairlines above and below and between rows, no background, radius or shadow; back-to-back panels read as one list; a panel heading (.panel-h h3) is a group heading.

Settings (openSettings, the sheet class "settings"):
- "Changes save automatically." under the title (it also shows Saving and Saved). Then one list: Language and the account rows, then the groups in their order (Appearance, Style, Weather, Photos, Holidays, Work dress code, Laundry, Reminders, Help, Privacy and your data), each with a group heading (13px, uppercase by CSS, Muted) and rows of title (15px, 600, wraps; long emails break), explanation (13px Muted) and control at the right. The account row puts its buttons under the email when they do not fit beside it. Server settings and the version end the list.
- On/off rows (label.li) are switches: the input stays a checkbox, drawn as a 44 by 26px track (Line off, Accent on, a 20px knob); the whole row is the target. The knob moves 18px by transform in 0.15s (cubic-bezier(.23,1,.32,1)) only when motion is welcome.
- Steppers (Laundry and Reminders, inside their groups): one row, the label then minus, the value (15px, body face) and plus (44px each); the stepper drops under a label that needs the width; the four presets as 40px chips under it. Holiday, appearance, department and dress-code chips are 40px small chips.
- At least 1100px wide and 600px tall (iPad landscape, Windows): a sheet up to 980px with an index on the left (200px, sticky): one 44px button per group, using the group names (no new strings), the group in view marked aria-current (Accent on Accent-soft, as the rail). A button scrolls its group to the top of the sheet (instant from the keyboard or with reduced motion) and moves focus into the group. Below that width the index is hidden; it keeps tracking, so widening the window with Settings open shows the right group.
- Every setting and action is kept: the same 69 controls and 38 labels as v1.63.1 (compared by id and data attributes).

Other sheets:
- Your style: the style pictures on the cream canvas (--canvas-1 to --canvas-2) in both themes; a selected card has a 2px ink border and a drawn ink check at its bottom right, never over the pictures. Style palette: the same ink border and check.
- Closet stats: the three totals as numbers in the display face (34px) with labels, no cards; the rows use the Care picture (carePic: cut-out on the cream canvas, else the thumbnail; opens the zoom viewer by mouse, touch or keyboard); group headings as in Settings.
- What I wore: a selected pick has an ink border and the soft fill (was coral); the picks show a piece's cut-out on the cream canvas wherever it has one (they drew only the thumbnail), names 12px.
- What is this?: colour buttons 40px (were 34px), the order badge 12px. Outfit diary: arrows and day buttons 44px.
- Every other sheet (Language, Change password, Choose a new password, Add clothes, Adjust, Condition check, Custom palette, Weather, How Wearcycle decides, Delete my data, consent, Share my list, a saved idea, I have one, Possible duplicates, Inspiration from a photo and its result, Style today, Reminders, Decide, and the garment sheets' frame) changes only through the shared frame.
- The What's new page (whats-new.html): the app's fonts (fonts/fonts.css) and colors, follows the app's Light or Dark choice (theme.js, the same three-state rule as the app), the logo and wordmark link back to the app, 44px language links.
- Checked (Chromium build 1243, stubbed sign-in): tools/check.mjs against a v1.63.1 run in the same session, 23 pass and 1 expected fail (the exact diff: the 48 sheet views and the version line on Care at 1920); axe 0, English left 0, text cut 0, detector warnings 0. Worst case: text cut 0 (v1.63.1: the French Settings line twice). Harden: 381 sheet views in 7 languages at 360x800 and 1366x630 with a 73-character email, a 57-character place and 200 pieces, no overflow, cut text, small field or small control. Real data: live check on preview run 41654551979 (v1.64.0), success.

### Known issues fixed in this phase (v1.64.0)
- The hard-coded `#ece8e2` behind the style pictures: now the cream canvas tokens.
- Scrolling inside a sheet carrying on to the page behind: overscroll-behavior contain on the sheet and the dimmed layer (not reproducible in Chromium; to confirm on a phone).
- Form fields under 16px (iPhone and iPad zoom): 19 fields in 6 sheets and the Language select, now 16px.
- Also found and fixed: no sheet worked with a keyboard or had a name (focus stayed on the page; 10 of 40 Tab presses landed in Settings at 1366); 36px close buttons; coral selected states on Style palette (no second cue), Your style and What I wore; Settings row titles cut with an ellipsis (the email; French "Recadrer les photos sur les vêtements"); the Settings cut-out sentence had no translation ({0}, {1}, {2}, {3} keys, singular and plural, six languages); Closet stats used stat cards and pictures not reachable by keyboard; What I wore never showed cut-outs; the editor's More details chevron turned outside the reduced-motion query; What's new ignored the app's theme.

## Full-screen and fixed layers

- Camera, many photos (v1.58.2, owner 2026-10-28: his son could not tell how to finish): before the first batch on each device, and from Tips at the top, a "Before you start" screen (Good light, Plain background, The whole piece, One piece per photo; white "Start taking photos"); the camera starts only after it. Top line "Good light · plain background · whole piece". Done is a labelled button, "✓ Done (N)", white once there is a photo, with the last photo's thumbnail from 430px wide; a status line above the bar says "Photo N saved. Next piece, or tap Done to add them.". The bar is a 1fr auto 1fr grid so the shutter stays centered; long Done labels may take two lines, never cut.
- Sign-in and welcome (Phase 13, the brand moment and the first screen a new public user sees): the brand row (logo, wordmark, tagline "WEAR · CARE · DONATE · BUY") with the language button at its end, which opens the Language sheet; the headline "Get dressed in seconds." (44px on phones, 48 to 64px from 900px); the promise beside an outfit laid out on the cream canvas, drawn with the garment glyphs (glyph(), decorative, aria-hidden); the form on a Raised panel with a hairline: Create account and Sign in as text tabs with an ink underline (aria-pressed), fields, the consent checkbox, the coral main action, Forgot password; errors in an alert, confirmations ("Almost there…", the reset link) in a Good-soft status note; the version line at the panel's foot; the three perks with ink ticks after the form on phones. Below 600px one column (Email in the first screen at 360x800); from 600px one 560px column; from 900px wide, or 700px wide and under 600px tall, the welcome and the form side by side, filling the window up to 1200px. The page is the main landmark.
- Camera (Phase 13): the app and any sheet behind it are inert; focus goes to Start taking photos on the tips screen, then the shutter, and back to the opener when it closes. Tips, flashlight and switch camera are 44px; the tips use drawn icons. Cancel with photos taken asks "Delete N photos?" with Delete and Keep (focus on Keep; Escape asks, Escape again keeps); leaving the app still keeps them. Toasts show just under the top bar. On a phone turned sideways (landscape, under 600px tall) the controls stand in a 152px column on the right and the picture keeps the whole height. Side safe areas pad the top bar and the controls. The flashlight button stays hidden where the camera reports no torch.
- Zoom viewer (Phase 13): focus on Close when it opens, the app and any sheet inert, focus back to the picture that opened it; Close, zoom out and zoom in are 44px drawn icons, Fit 44px, the slider 44px tall; Photo / Cut-out drawn for the dark layer (chosen: white fill); the name takes up to two lines. Escape closes only the viewer.
- Job bar (Phase 13): the text takes the full width and wraps, never cut; progress is a 3px coral line along the lower edge. Toasts (Phase 13): above every layer; on phones above Add clothes when it shows; #toastRoot and #jobRoot are status regions from page load.
- What is this? (Phase 13): the piece first, as the Care picture (cut-out first; opens the zoom viewer), 120px beside the name on phones; from 700x600 the garment sheet's layout, the picture 4:5 on the left of a sheet up to 880px. The chosen colors are named under the swatches, in order. Consent sheet: what turning AI off costs comes before the two choices.
- Found in Phase 12, fixed in Phase 13: the Outfits pin card shows the piece's cut-out on the cream canvas (smallPic), with a hairline instead of the coral border; Closet's In the wash list uses the Care picture at 56px at every width (cut-out first, keyboard reachable).

## Share image and privacy page (Phase 14)

Built in Phase 14 (v1.66.0). Proposal "Wearcycle share image and privacy" (https://claude.ai/artifact/TdVUYCQXugbGzJXTR22UAn) approved by the owner on 2026-11-04 with the four recommended options: the kit with every piece named; the privacy page as shown, with theme-color metas on it and on What's new; the manifest stays ink; the found bugs fixed in this release. Critique: .impeccable/critique/2026-11-05T03-34-09Z__app-js.md (25/40).

- Share image (shareImage, shareKit, app.js): 1080 by 1920, always the light palette (SHARE, the tokens' values) because it leaves the app. An ink band holds the occasion (display face, 128px, smaller only to fit) and the date, with text starting at 276px, below the area social apps cover (third-party guides to Meta's Stories safe zone give about the top 14%, 269px). The kit of direction A follows: main garments as pictures on the cream canvas with their kind and name, then shoes and accessories, every piece named in ink (Phase 15; small names were muted). Then the palette with its reason, and a second ink band with the logo and wordmark.
- Text wraps at spaces, and inside a word only when it is wider than its column or the script has no spaces, by whole graphemes; a break between two letters gets a hyphen (after a hyphen the word already has, when one fits), with at least 2 letters on each side (v1.66.2, owner's WhatsApp screenshot of 2026-11-07: "Silver Chronog / raph…"). Translated text keeps every line; a name the person typed takes up to 4 lines, then "…" (v1.66.4, owner's second screenshot of 2026-11-07: "Grey / Quarter-Zip / Rates…"; v1.66.0 gave the main pieces 3). Japanese and other scripts without spaces follow the line-breaking rules: no line starts with closing punctuation or a small kana, none ends with an opening bracket (Phase 15: "トップス（ / 前開き）").
- Every text is 36px or more on the 1080px picture, 12px where it is seen 360px wide (owner, 2026-11-07): kinds 36px (were 30 and 34), names 36 to 40px (32), shoes and accessories 36px (32); the wish-list picture too (labels and numbers were 30px, lines 34px). Text is 4.5:1 or more against what is behind it, measured from the PNG; the wordmark 14.2:1.
- Shoes and accessories (Phase 15, owner's picture "Silver / Chrono- / graph / Watch"): one row while every word of their names fits a column (4 columns are 216px; "Chronograph" is 215px at 36px); otherwise two columns, each picture with its name beside it, pictures 124 to 168px, for which the main pictures give up height down to 1.3 times their width (1.1 with two). In the owner's two 10-piece outfits: main pictures 363 to about 275px tall, accessories 136px to 152px and 124px (owner chose this balance, 2026-11-07).
- Colors are named in words: a color key that is not a word shows as its name from logic.js COLOR_NAME ("light blue", v1.66.4), in the palette reason and everywhere else in the app; stored colors keep their keys. tools/check.mjs fails on a key shown as text, in a view or on the picture.
- Room the outfit does not need first makes the row of shoes and accessories larger, up to 288px and three quarters of a main picture's width (Phase 15, owner: the empty band used for larger accessories); what is left is shared above and below the outfit (v1.66.2; before, it all fell into one band above the palette line, 202px with the owner's 4 main pieces and 6 small ones). The names leave the app with the picture (owner accepted, 2026-11-04).
- The phone's share menu gets the picture and its title ("My outfit") and no message (v1.66.3, owner 2026-11-07: WhatsApp drew the message "Picked with Wearcycle" as a caption over the lower part of the picture, which also greyed the wordmark). tools/check.mjs checks what the share menu receives.
- Pictures: the cut-out wherever there is one; otherwise, drawn over 256px, the stored 1024px copy (medUrl, at most 4 per image, the first time only); otherwise the thumbnail, then the garment glyph. Fonts are waited for, at most 2 seconds. A failure clears "Preparing the image…" and says "Could not make the image."
- Privacy page (privacy.html): the treatment What's new got in Phase 12, with the wording unchanged (59 text elements and their links identical in 7 languages). Both pages have theme-color metas.
- Manifest colors stay ink #1b2433 (owner, 2026-11-04): a theme-specific manifest color exists only as a WICG proposal (user_preferences).
- tools/check.mjs: colors outside CSS compared with the tokens; the share image in 7 languages, 6 occasions and 3 closets (off the picture and above 269px fail); --worst-case draws hard outfits (a dress, one piece, 4 main and 6 small, hard names, missing files). tools/live-check.mjs draws it on real data on all three devices.

### Known issues fixed in this phase (v1.66.0)
- Found by the wider check (Phase 14 step 0): the camera's Delete in dark, 2.98:1, now Accent-ink, 5.23:1; "Outfits use the feels-like temperature…" in the Weather sheet was English in every language; stacked checkboxes in .field too close (axe target-size), now 44px rows; the sign-in tagline is the brand line, in English in every language (data-notr); the More details arrow's rotated box spilled 8px out of its row (nothing visible was cut).
- Done in Phase 15: the 11 detector cramped-padding warnings on added sheets reviewed one by one, all false positives (9 sheets: the detector reads calc(20px + env(safe-area-inset-bottom)) as 0; the language list and the Measurements box: 48px rows with centred text), recorded in tools/check.mjs DETECTOR_REVIEWED; the wish-list picture, the offline banner, the language suggestion, the install prompt and the added sheets with an empty closet are captured.

## Redesign closing summary (Phase 15, 2026-11-07)

From v1.47 (the last release before the redesign plan) to v1.68.0, measured against the Phase 4 baseline (docs/design/baseline, recorded on v1.49.1's app files, 2026-10-19) with tools/check.mjs on the same fixture closet, fixed clock and review sizes (the final run adds 390 sideways, 13 Wear this sizes and the added views):
| Measure | Phase 4 baseline | v1.68.0 |
| --- | --- | --- |
| axe serious or critical issues | 142 | 0 |
| English left in French and Japanese | 2 | 0 |
| App text cut or spilling | 12 | 0 |
| Piece names cut | 9 | 0 |
| Wear this in the first screen at 390x844 | no (950 to 998px of 844) | yes (695 to 743px), and at 13 of 13 sizes |
| Detector warnings, main screens | 15 (dark-glow 9, low-contrast 4, side-tab 2) | 0 |
| Detector advisories | 149 | 110 (font sizes 82: see below) |
| Screens captured | 98 | 838, plus 726 added first screens, 543 below them, 126 share pictures |
| Impeccable critique (whole app, degraded) | not run | 29/40 (.impeccable/critique/2026-11-08T02-26-48Z__app-js.md) |

What changed, by phase: the shared foundation (tokens, buttons, chips, sheets, navigation, toasts) and the Phase 6 direction (cream garment canvas, Big Shoulders headings, Ink & Coral with coral only for the main action); the navigation shell (bottom tabs on phones, a side rail from 1280px); Outfits (one pick per screen, numbered picks, the kit on the canvas, Wear this always in the first screen); Closet and the garment sheet (gallery tiles, cut-outs first, the zoom viewer); Care (urgency order, Repair, Let go, Check, Rotate, the Decide sheet); Shop (what to buy and why, the wish list and its picture); Settings and every sheet (one calm list, keyboard and screen-reader behaviour, 44px targets); full-screen layers (sign-in and welcome, camera, viewer, job bar, toasts); the share picture and the privacy page; and Phase 15's fixes above. Speed (phone profile, CPU 4x, 100 pieces): Wear this shown in about 0.1 s and saved in under 1 s (v1.66.0: 6 s), tabs and sheets under 0.25 s, Care's longest task under 0.1 s (was 2.2 s).

Not done, for later work (proposed in Phase 15): a type scale with a 12px floor in the app (styles.css has 25 font sizes, from 9px); WebKit on a real iPad and Android Chrome on a real phone are checked by the live check's WebKit and Chromium runs, not by hand.

## Every screen

- Each screen phase removes its own overridden declarations and unused rules (the lists above: 70 overridden declarations in total, 2 + 47 + 17 + 2 + 2, plus the unused Outfits rules). Removing them changes nothing on screen; prove it with `node tools/check.mjs --css-pixels --compare <before> --exact` on a before captured in the same session.

## Responsiveness (v1.66.1, owner 2026-11-05)
- Wear this: every piece is saved at once and the screen is drawn once (it was drawn again after each piece; with 97 pieces on a 4x slowed phone that froze the app 3 to 6 s per piece, about 28 s in all, with no visible change for the first 6 s). Now the button changes in about 0.1 s and everything is saved within about 0.5 s.
- Care and Shop are drawn only while open; when hidden they are marked stale and drawn on opening. Care draws first with "Checking…" (role=status) in Not getting picked; the list and its reasons come from a background worker (npworker.js, the same logic.js; Phase 15: on a phone profile slowed 4x the page was held 2.2 s, now its longest task is under 100 ms). The 3 rows on show get their reasons first ("Checking…" until then, data-wait), the rows behind Show all next; Care is drawn again as answers come, keeping the focused control. Without a worker (none, or it failed) the page works them out as in v1.66.1. tools/check.mjs checks that the worker's list and reasons equal the page's. The Shop season preview is worked out only while its row is open. Tools wait for the Checking lines to go before measuring Care.
- suggest() ranks a sample of 3,000 when an occasion has more combinations (about 100 pieces); the sample is seeded by the day unless the caller passes its own (Outfits does; New ideas changes it), so the same closet gives the same outfits and Care list all day (logic.js, owner approved 2026-11-07).
- Banners never above the outfit: the What's new notice (v1.58.5) and the install prompt (Phase 15: it pushed Wear this under the tab bar at 360 and 390) show on Closet, Care and Shop; Install stays in Settings. On phones (under 460px) the header's status never pushes Settings off the screen: offline, the banner says it and the label hides; while syncing, the label takes the language button's place (Language stays in Settings), with an 8px gap and no letter spacing under 380px for French and Spanish. The language suggestion puts its buttons under its sentence on phones.

## Naming the AI (v1.58.4, owner 2026-10-29)

- Everyday screens describe what a feature does, with "AI" where it matters (Fill in automatically, Shopping ideas, Check condition from the photo, Reading the photo, Filled in by AI, AI features). They do not say Claude.
- The provider is named only where the app explains where data goes: the AI features switch ("An AI service (Claude by Anthropic) …"), the consent sheet and sign-up checkbox, and privacy.html. Keep it there.

## Anti-patterns

Do not generate: dashboard grids, generic stat cards, endless pill rows, endless rounded cards, cards inside cards, decorative gradients, purple or blue AI styling, glassmorphism, neon, meaningless badges, unneeded progress bars, icon-heavy headings, hover-only information, or large unused desktop space caused by a phone max-width.

Before adding a card, ask: can scale, type, spacing or alignment do it?
