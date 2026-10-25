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

Owner's choice, 2026-10-25 (Phase 6): **direction A, "Kit", on phones and direction B, "Lookbook", from 700px** (iPad and Windows). Mockups: docs/design/direction/ (a.html and b.html; index.html compares the three directions). The switch is at 700px, where the navigation shell's rail band starts (Phase 7): phones in portrait get A; the iPad (744px and wider) and Windows get B. Where an older rule in the screen sections said otherwise (occasion tabs and a lookbook on phones, v1.41's hero-left layout on wide screens), this choice replaces it, and those sections are updated below.

Both keep the brand and the decided rules: ink, the cream garment canvas and the condensed display type; coral only where DESIGN.md puts it (Wear this, the #1 rank, the active tab icon, the active pager dot, progress); selected states in ink (a fill or a 2px underline) with aria-pressed; flat containers. The shell (tab bar, rail) stays as today until Phase 7.

| | Phones, below 700px (A) | From 700px (B) |
| --- | --- | --- |
| Type | Compact: day 22px and screen titles 26px in the display face (as every h2), labels 13 to 15px, rank and option numbers in the display face | Editorial: day 52px (56px from 1100px); occasions in the display face, 20px, uppercase by CSS; look numbers 28px |
| Day row | Day, weather and greeting; style as a menu button ("Style: All my styles"); diary | Day, greeting and weather; diary; style as text tabs under the occasions (beside them from 1100px) |
| Occasion selector | All six at once: a segmented grid, 3 by 2, ink fill when selected | Text tabs, selected in ink with a 2px ink underline; the row scrolls sideways when it does not fit |
| Outfit | The kit: top and bottom as 4:5 pictures with category and name, then shoes and accessories in one row, every piece named | The flat-lay board, square, one look per page |
| Reasons | The first reason, then "N more reasons" | "Why this outfit?" with every reason, below the looks |
| Other options | An index: one row per option with its number, small pictures, piece names and match | Looks as pages you turn (swipe, arrows, dots, "1 of 4"), the next one peeking; from 1100px all looks side by side, today's pick largest |
| Closet | Category chips with counts that wrap (all visible); square tiles, 2 columns; a flag is a short text mark on the picture | Category text tabs with counts; 4:5 tiles, 3 columns (5 from 1200px); a flag is a round icon mark with a screen-reader label |
| Care | Compact row: 56px picture, name, reason, small action buttons | The garment leads: 160px picture, 18px name, section title in the display face |

Measured on the mockups in Chromium (2026-10-25): "Wear this" shows without scrolling at 360x800, 390x844 and 412x915 (A), and at 744x1133, 820x1180, 1024x1366, 1133x744, 1180x820, 1366x1024, 1366x768, 1536x864 and 1920x1080 (B). That needed one change to B as first shown: the side-by-side spread starts at 1100px instead of 1200px, because at 1200px the page-turn layout put "Wear this" 258px and 209px below the visible area on iPad landscape (1133x744 and 1180x820). b.html is updated.

To settle in each screen's proposal (workflow step 2):
- Two compositions per screen. Where they can, phone and wide share markup (the occasion selector is the same group of six aria-pressed buttons in A and B, so that switch is CSS only); the kit and the board, and the index and the page-turn rail, are different layouts of the same outfit data. Every existing action works in both: tap a piece, Swap for another, Back to suggestion, leave a piece out, Wear this, share, log.
- Phones in landscape are 700px wide or more (844x390, 915x412) and so get B, where "Wear this" ends at 850px on a screen 390 to 412px tall; the installed app allows any orientation (manifest.webmanifest, "orientation": "any"). A at 844x390 shows it at 197 to 245px. Decide whether B also needs a minimum height (for example: A below 700px wide or below 600px tall).
- Closet tiles keep the wear count at every width (Closet rule below); B's mockup tile shows the condition only.
- Closet flags: A shows words, B an icon. Consider the same visible words at every width, so no flag has to be learned.
- On Windows the viewport is shorter than the screen (browser bars and taskbar), so at a 1366x768 screen "Wear this" (ending at 713px) may need a short scroll: measure in the Outfits phase.
- New strings in the mockups (for example "4 more reasons") are translated when their screen is built.

## Navigation shell (Phase 7)

Rules: DESIGN.md Layout and the plan's Phase 7 (700 to 959px, Settings at the bottom of the rail from 960px, a wider labelled rail from 1280px, hover only with a mouse, mouse-reachable rows, keyboard order, dvh with a vh fallback).

### Known issues to fix in this phase
- The header lost `position:sticky` in v1.38: the holiday-badge rule `header.top{position:relative}` overrode it (Phase 5 merged both into one rule, styles.css:97, so today it reads `position:relative`). Decide whether the header sticks again.
- With `position:relative`, `top:env(safe-area-inset-top,0px)` moves the header down by the inset, on top of `:root`'s `padding-top` with the same inset (index.html sets `viewport-fit=cover`), so in the installed app on a phone with a notch the header may sit one inset lower than intended. Not verified on a device.
- Overridden declarations (2): `.version` font-family and letter-spacing (styles.css:274), always replaced by the `!important` typography rule (styles.css:489).
- Dark mode: the Care tab's count badge (`nav.tabs .badge`, styles.css:114) is white on `--bad` #f2668b, 2.98:1, below 4.5:1 for text (light: white on #b4233c, 6.47:1; ink on #f2668b would be 5.23:1). Found on the Phase 6 mockups, which use today's shell; tools/check.mjs takes detector snapshots in light at 390px only (tools/check.mjs:592), so its reports did not show it.

## Outfits (EDITORIAL)

Phone order (below 700px, direction A; see Chosen direction):

1. Day, weather, greeting and diary in one row, with the style menu (only when 2 or more styles are picked).
2. Occasion selector (all six at once).
3. Hero outfit: rank, match label, style, the kit, Wear this and share, the first reason with "N more reasons", palette.
4. Wearing today strip: thumbnails and Edit, one line.
5. More options as an index: 02, 03 and so on, each with small pictures, piece names and match.

- Banners, laundry and holiday notices stay below the greeting row in a compact form and never push the hero below the first screen at 390px.
- Occasion selector (Work, Going out, Formal, Sport, Home, Chores): aria-pressed kept; each target at least 40px tall. Phones: a 3 by 2 grid, selected is an ink fill; long translations wrap inside their cell. From 700px: text tabs in the display face that scroll sideways when they do not fit, selected is ink with a 2px ink underline; usable with a mouse (wrap or arrow buttons).
- Keep: tap a piece to preview, Swap for another, Back to suggestion, leave a piece out, Wear this, share, log, diary, weather, style row, holiday chip.
- "Wear this" is visible without scrolling at 390 x 844, and on the iPad and Windows sizes measured under Chosen direction.
- Wide (from 700px, direction B): the looks as pages, today's pick first and the next one peeking, with arrows, dots and a count; from 1100px all looks side by side, today's pick largest; Wear this under today's pick; Why this outfit below. This replaces v1.41's hero-left, alternatives-right layout.
- Code: renderOutfits (app.js:804) with heroCard, flatlay, paletteStrip, altRow, tile and todayLine.

### Known issues to fix in this phase
- Overridden declarations (47), each always beaten by a later rule for the same selector: `.greet` font-size 28px and 26px (final 24px); `.todaybar` gap; `.wxpill` height and padding; `.worn-ok` color; `.alts-h` align-items; `.tile .cap .k` (5: mono font, size, letter-spacing, uppercase, color); `.withbelt>.tile` height; `.withbelt .tile .swap` top 58px and 62px; `.beltband` (8: the absolute position, offsets, heights, border, shadow of v1.8 before v1.8.1); `.beltband .bimg` width; `.beltband .blab` font-size and white-space; `.beltband .blab .k` (5); `.flatlay` the v1.9 striped background; `.fl` padding 0 and 3% (final 8px); `.fl.small` padding 6%; `.fl img` radius and shadow; `.fl img.cut` filter; `.fl svg.glyph` width and height; `.fl.fold img.cut` (4); `.layerseg .lab` (3).
- Unused rules: no element in the markup carries these classes (checked against the 766 class attributes in app.js and index.html, 2026-10-25): the old card board `.fits`, `.board`, `.main`, `.pair`, `.pair.two`, `.fit-meta` and `.fit.hero .fit-meta`; `.score`, `.score .num`, `.score .lbl`, `.score .btn`, `.score .lbl b`; the v1.5 weather card `.wxcard`, `.wxcard.setup`, `.wxic`, `.wxtxt` and its children, `.wxwhere`, `.advice`, `.wxcard .advice`, `.wxcard>.btn`; `.layerseg`, `.layerseg .lab`, `.layerseg .chip`; the v1.5 alternatives list `.alt`, `.alt .rank`, `.strip`, `.alt-l`, `.alt-l .bars i`; `.hint.center`; `.altgrid`; `.logother`; `.viewsw` and `.viewsw .chip`; `.fl.fold`, `.fl.fold img.cut`, `.fl.fold.iscut::after`. Also take `.layerseg .lab` and `.wxwhere` out of the typography rule's selector list and `.viewsw .chip` out of `.presets .chip,.viewsw .chip`.
- `.side` (old board column, styles.css:163) also matches the camera's side buttons (`.cam .side`); check the camera before removing it.
- Detector side-tab warning: `.askcard` (the laundry reminder and the dress-code question) has a 3px coral left border; the other flagged rule, `.advice`, is unused.


## Closet (GALLERY)

- Tile: image, name (Figtree), one line with the condition word and the wear count.
- Flags (Review, Example, In the wash, needs repair, needs attention) become one small mark on the image corner: the words on phones (A); from 700px an icon with a text label for screen readers (B), unless the Closet proposal adopts the words at every width (open point under Chosen direction). Occasions move to the piece preview.
- Filters: categories with counts, for example "All 47, Tops 18, Bottoms 8, Outerwear 8, Shoes 8": chips that wrap on phones (A), text tabs from 700px (B).
- "In the wash" stays a separate control with its count.
- Phones: square tiles, 2 columns (A). Wide: 4:5 tiles, 3 columns from 700px and 5 from 1200px (B). Opening a tile keeps opening the editor. Stats stays reachable.
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

Sections map to groups that already exist in renderCare (app.js:980) and careFlags (logic.js:424). No new states.

| Section | Existing groups | Actions kept |
| --- | --- | --- |
| Repair | To repair | Fixed, Find a tailor / cobbler / watch repair, Open |
| Check | Condition check due; Moved down a level | Check, Recheck |
| Rotate | Not getting picked | See outfits with this, Open |
| Let go | Donate or recycle; Donated or recycled (history); drop-off guidance | Mark donated, Mark recycled, Donation drop-offs, Textile recycling, Open |

- Show only sections that have items; when nothing needs attention, say so in one calm line.
- Garments lead each row; text explains why. Phones: a compact row, 56px picture, name, reason and small action buttons (A). From 700px: a 160px picture, an 18px name and the section title in the display face (B).
- "In the wash" stays in Closet.
- Wide: sections composed side by side instead of wide stacked panels.

### Known issues to fix in this phase
- Overridden declarations (2): `.panel-h .count` font-family and font-size (styles.css:206). Panels are also used in Shop (coming season, holidays), the Closet "In the wash" panel and Closet stats; the first phase that rewrites `.panel` removes them.


## Shop (STYLIST INTELLIGENCE)

Erratum 2 applies (owner decision, 13 October 2026).

- Order (as built in renderShop, app.js:1027): department question if unset, coming season, replace, more outfits from one purchase (versaPanel, app.js:1030; v1.48), gaps per occasion, build toward a style, ideas from Claude.
- Lead element: versatility() from v1.48.0 (logic.js:477): new color pairings as the large number, plus the owned pieces each purchase pairs with. Per-occasion gaps from gaps() go below.
- For each gap: what is missing, why (have X of Y), the best color with "+N outfits" as the large element, then the shop link.
- Shop values equal main exactly, for the versatility() list as well as for gaps(). logic.js stays untouched.
- No "works with" counts; Care has no "Ready again".
- Covered occasions: one calm line, for example "Covered: 5 tops, 3 bottoms, 2 shoes".
- Never invent a purchase need; never encourage buying to fill the screen.

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
