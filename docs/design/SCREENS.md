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

Not chosen yet. Phase 6 builds 2 or 3 static mockups in docs/design/direction/; the owner picks one (or a mix) on his phone, the iPad and a Windows browser, and the choice and its rules are recorded here before any screen is coded.

## Navigation shell (Phase 7)

Rules: DESIGN.md Layout and the plan's Phase 7 (700 to 959px, Settings at the bottom of the rail from 960px, a wider labelled rail from 1280px, hover only with a mouse, mouse-reachable rows, keyboard order, dvh with a vh fallback).

### Known issues to fix in this phase
- The header lost `position:sticky` in v1.38: the holiday-badge rule `header.top{position:relative}` overrode it (Phase 5 merged both into one rule, styles.css:97, so today it reads `position:relative`). Decide whether the header sticks again.
- With `position:relative`, `top:env(safe-area-inset-top,0px)` moves the header down by the inset, on top of `:root`'s `padding-top` with the same inset (index.html sets `viewport-fit=cover`), so in the installed app on a phone with a notch the header may sit one inset lower than intended. Not verified on a device.
- Overridden declarations (2): `.version` font-family and letter-spacing (styles.css:274), always replaced by the `!important` typography rule (styles.css:489).

## Outfits (EDITORIAL)

Phone order:

1. Greeting, weather and diary (one row).
2. Occasion selector (typographic tabs).
3. Style row (only when 2 or more styles are picked).
4. Hero outfit: rank, match label, style, flat-lay board, palette, Wear this, Why this outfit.
5. Wearing today strip: thumbnails and Edit, one line.
6. More looks as a lookbook: 02, 03 and so on, each with image, label and match.

- Banners, laundry and holiday notices stay below the greeting row in a compact form and never push the hero below the first screen at 390px.
- Occasion selector: text tabs (Work, Going out, Formal, Sport, Home, Chores) that scroll sideways; selected is ink, heavier, with a 2px ink underline; aria-pressed kept; each target at least 40px tall; reachable with a mouse from 960px (wrap or arrow buttons).
- Keep: tap a piece to preview, Swap for another, Back to suggestion, leave a piece out, Wear this, share, log, diary, weather, style row, holiday chip.
- "Wear this" is visible without scrolling at 390 x 844.
- Wide: hero left (sticky), alternatives right, as in v1.41; refine spacing and type, not structure.
- Code: renderOutfits (app.js:804) with heroCard, flatlay, paletteStrip, altRow, tile and todayLine.

### Known issues to fix in this phase
- Overridden declarations (47), each always beaten by a later rule for the same selector: `.greet` font-size 28px and 26px (final 24px); `.todaybar` gap; `.wxpill` height and padding; `.worn-ok` color; `.alts-h` align-items; `.tile .cap .k` (5: mono font, size, letter-spacing, uppercase, color); `.withbelt>.tile` height; `.withbelt .tile .swap` top 58px and 62px; `.beltband` (8: the absolute position, offsets, heights, border, shadow of v1.8 before v1.8.1); `.beltband .bimg` width; `.beltband .blab` font-size and white-space; `.beltband .blab .k` (5); `.flatlay` the v1.9 striped background; `.fl` padding 0 and 3% (final 8px); `.fl.small` padding 6%; `.fl img` radius and shadow; `.fl img.cut` filter; `.fl svg.glyph` width and height; `.fl.fold img.cut` (4); `.layerseg .lab` (3).
- Unused rules: no element in the markup carries these classes (checked against the 766 class attributes in app.js and index.html, 2026-10-25): the old card board `.fits`, `.board`, `.main`, `.pair`, `.pair.two`, `.fit-meta` and `.fit.hero .fit-meta`; `.score`, `.score .num`, `.score .lbl`, `.score .btn`, `.score .lbl b`; the v1.5 weather card `.wxcard`, `.wxcard.setup`, `.wxic`, `.wxtxt` and its children, `.wxwhere`, `.advice`, `.wxcard .advice`, `.wxcard>.btn`; `.layerseg`, `.layerseg .lab`, `.layerseg .chip`; the v1.5 alternatives list `.alt`, `.alt .rank`, `.strip`, `.alt-l`, `.alt-l .bars i`; `.hint.center`; `.altgrid`; `.logother`; `.viewsw` and `.viewsw .chip`; `.fl.fold`, `.fl.fold img.cut`, `.fl.fold.iscut::after`. Also take `.layerseg .lab` and `.wxwhere` out of the typography rule's selector list and `.viewsw .chip` out of `.presets .chip,.viewsw .chip`.
- `.side` (old board column, styles.css:163) also matches the camera's side buttons (`.cam .side`); check the camera before removing it.
- Detector side-tab warning: `.askcard` (the laundry reminder and the dress-code question) has a 3px coral left border; the other flagged rule, `.advice`, is unused.


## Closet (GALLERY)

- Tile: image, name (Figtree), one line with the condition word and the wear count.
- Flags (Review, Example, In the wash, needs repair, needs attention) become one small mark on the image corner, with a text label for screen readers. Occasions move to the piece preview.
- Filters: typographic category tabs with counts, for example "All 47, Tops 18, Bottoms 8, Outerwear 8, Shoes 8".
- "In the wash" stays a separate control with its count.
- Wide: 4 or 5 columns where width allows. Opening a tile keeps opening the editor. Stats stays reachable.
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
- Garments lead each row; text explains why.
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
