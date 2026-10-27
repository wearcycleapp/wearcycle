# Wearcycle screen rules

Screen-level rules for the redesign, from Sections 7.9 to 7.16 of the redesign plan v2.2 and its errata (Project doc claude/redesign-plan-v2.2.md). Tokens, type, layout bands and motion live in DESIGN.md; product truth in PRODUCT.md. Impeccable does not rewrite this file. Code references are to main at a4159ed (v1.48.2); the "Known issues to fix in this phase" lists were added in Phase 6 from the Phase 5 report and cite styles.css at v1.51.3 (main 1cc8cd5), so their line numbers move as screens are rewritten.

Every screen must work for a stranger with an empty closet, in all seven languages, in light and dark (PRODUCT.md).

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
- Where the condition does not apply: the wide rail also needs 1280px; sheets keep centring from 700px wide (Phase 12); the screen rules that switch at 960px (Care and Shop in two columns, larger Closet tiles) stay on width until their phases move them to the B condition; Outfits follows the B condition since Phase 8.
- Header: scrolls with the page (not sticky, as since v1.38), 59px tall with or without the Settings button. The holiday badge is placed by CSS (`header.top .holibadge`) in every layout.
- Current tab: Accent text at weight 700 on Accent-soft, coral icon, aria-current="page". The Care count is 12px Accent-ink on Bad (6.47:1 light, 5.23:1 dark).
- Order in the page: header, navigation (tabs, then the rail's Settings), Add clothes, then the screen. A focused control scrolls above the bar or Add clothes (`scroll-padding-bottom`).
- Mouse, only inside `(hover: hover) and (pointer: fine)`: tabs and Settings get an ink tint and ink label, the header's Settings border turns ink, Add clothes darkens; the occasion, style and category rows wrap at every width (touch keeps the sideways swipe). Hover on other buttons and chips comes with each screen's phase.
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

- Tile: image, name (Figtree), one line with the condition word and the wear count, at every width (owner, 2026-10-25).
- Flags (Review, Example, In the wash, needs repair, needs attention) become one small mark on the image corner: the same short words at every width, no icons (owner, 2026-10-25). Occasions move to the piece preview.
- Filters: categories with counts, for example "All 47, Tops 18, Bottoms 8, Outerwear 8, Shoes 8": chips that wrap in A, text tabs in B.
- "In the wash" stays a separate control with its count.
- A: square tiles, 2 columns. B: 4:5 tiles, 3 columns, 5 from 1200px wide. Opening a tile keeps opening the editor. Stats stays reachable.
- Image source by rendered size (Phase 9): the 256px thumbnail only where rendered width x DPR is 256 or less; otherwise the cut-out or the photo, lazy-loaded. Report bytes downloaded per screen before and after.
- Code: renderCloset (app.js:926).

### Known issues to fix in this phase
- Overridden declarations (17): `.tag` (8: the v1.0 mono, uppercase, bordered condition tag, replaced by the typography rules; condTag is shown only on Closet cards); `.ex` (6: the Example and In the wash marks); `.card .vis img` width and height; `.card .vis img.cover` object-fit.


## Garment detail (PRODUCT EDITORIAL)

- Piece preview (openPiece, app.js:1739), item editor (openEditor, app.js:1063) and zoom viewer (openViewer).
- Phone: bottom sheet, image first. Wide: centred sheet with about 60% image and 40% details and actions.
- Keep every editor field and action; In the wash, Review and Example states stay clear. Long-press stays rejected (v1.24).

### Known issues to fix in this phase
- Hard-coded `#f3f0ea` behind cut-outs in the zoom viewer (`.vstage img.cut`, styles.css:706), the same in both themes; use the canvas tokens (or a new token with a dark value in both dark blocks).


## Care (LIFECYCLE)

Sections map to groups in renderCare and careFlags. Added on 2026-10-27 (owner, v1.54.0): "Give them a rest" (shoeLoad in logic.js: shoes worn on 16 or more of the last 30 days) and four more actions on "Moved down a level".

| Section | Existing groups | Actions kept |
| --- | --- | --- |
| Repair | To repair | Fixed, Find a tailor / cobbler / watch repair, Open |
| Check | Condition check due; Moved down a level | Check, Recheck; on Moved down also Repair, Home and chores, Mark donated, Mark recycled |
| Rotate | Not getting picked; Give them a rest | See outfits with this, Open |
| Let go | Donate or recycle; Donated or recycled (history); drop-off guidance | Mark donated, Mark recycled, Donation drop-offs, Textile recycling, Open |

- Show only sections that have items; when nothing needs attention, say so in one calm line.
- Garments lead each row; text explains why. A: a compact row, 56px picture, name, reason and small action buttons. B: a 160px picture, an 18px name and the section title in the display face.
- "In the wash" stays in Closet.
- Wide: sections composed side by side instead of wide stacked panels.

### Known issues to fix in this phase
- Overridden declarations (2): `.panel-h .count` font-family and font-size (styles.css:206). Panels are also used in Shop (coming season, holidays), the Closet "In the wash" panel and Closet stats; the first phase that rewrites `.panel` removes them.


## Shop (STYLIST INTELLIGENCE)

Built in v1.55.0 (Phase 11 brought forward; proposal "Wearcycle Shop redesign" approved by the owner on 2026-10-27; critique .impeccable/critique/2026-10-27T19-10-00Z__app-js.md). This replaces erratum 2's order (versatility first, owner 13 October 2026).

- One answer first: a summary line ("{0} buys would help most." with the covered occasions, or "Nothing to buy right now. Every occasion is covered."), then Buy next with at most three cards.
- Buy next, in order, from needs the app already computes (never an invented need): pieces on the Replace list (condition 1, or below the work or going-out bar where that occasion is short of their kind); Work and Going out gaps from gaps() (with the shoe rotation), each with its best color; the top versatility() pick; other occasions' gaps. One card per kind and color. Each card: a 56px garment glyph in the suggested color on the cream canvas, why (Worn out in Bad, the occasion and count, or Most new pairings), the name, "+N outfits" in the display face, the reason lines (tired shoes, Replaces ...), the owned pieces it pairs with as small cut-outs, and Shop. The rest of the versatility list sits under "N more ideas". With no need at all, Buy next is not shown and the versatility list is one folded row.
- By occasion: one row per occasion; a covered one is one line; a gap row opens the details in place (meters, reason lines, colors with +N outfits, shop links).
- Coming up: the season row (date, "N of M ready", "N to add") opens the missing items, one "Ready: ..." line, the two preview outfits and the bring-out and storage lines; the holidays row opens each holiday with its tip, owned colors and See outfits.
- Build toward a style: per style a row with "have of total" and "N to add" or Complete, then only the pieces to add; "Show the N you own" opens the owned essentials (each opens the piece).
- Ideas from Claude and the department question unchanged.
- Rows that open are buttons with aria-expanded (44px or taller); the open state is kept for the session (S.shopOpen). One column below 700x600; from 700x600 two columns: left the summary and Buy next and By occasion, right Coming up, Build toward a style and Ideas from Claude. The 960px columns rule no longer applies to Shop.
- Measured with the fixture closet: phone 4,710px (5.6 screens) to about 2.3 screens folded; French at 360px 6.3 to 2.6; 820 4.0 to 1.1; 1366x768 3.3 to 1.6.

### Known issues to fix in this phase
- Overridden declarations (2): `.opt em` font-family and font-size (styles.css:227).


## Settings and other sheets (QUIET UTILITY)

- Group headings, aligned rows, whitespace, restrained dividers. No cards inside cards.
- Keep every group: Install, Appearance, Style, Weather, Photos, Holidays, Work dress code, Laundry, Reminders, Help, Privacy and your data, account (openSettings, app.js:1269).
- Same treatment for: Add clothes, Adjust, Condition check, Your style, Style palette, Weather, What I wore, Outfit diary, Closet stats, How Wearcycle decides, Delete my data, Choose a new password, What is this?, consent. All open through openSheet (app.js:1051).

### Known issues to fix in this phase
- Hard-coded `#ece8e2` behind the style pictures (`.stylecard .styleart`, styles.css:615): the light Board value, which does not change in dark mode; use `--board` or another token with a dark value.


## Full-screen and fixed layers

- Sign-in and welcome: the brand moment (logo, tagline, headline "Get dressed in seconds.").
- Camera, zoom viewer, job bar, toasts: functional, high contrast, safe-area aware, above the tab bar or rail. The flashlight button stays hidden where the camera reports no torch.
- The share image (canvas in shareOutfit, app.js) and privacy.html are redesigned separately in Phase 14.

## Every screen

- Each screen phase removes its own overridden declarations and unused rules (the lists above: 70 overridden declarations in total, 2 + 47 + 17 + 2 + 2, plus the unused Outfits rules). Removing them changes nothing on screen; prove it with `node tools/check.mjs --css-pixels --compare <before> --exact` on a before captured in the same session.

## Anti-patterns

Do not generate: dashboard grids, generic stat cards, endless pill rows, endless rounded cards, cards inside cards, decorative gradients, purple or blue AI styling, glassmorphism, neon, meaningless badges, unneeded progress bars, icon-heavy headings, hover-only information, or large unused desktop space caused by a phone max-width.

Before adding a card, ask: can scale, type, spacing or alignment do it?
