# Wearcycle screen rules

Screen-level rules for the redesign, from Sections 7.9 to 7.16 of the redesign plan v2.2 and its errata (Project doc claude/redesign-plan-v2.2.md). Tokens, type, layout bands and motion live in DESIGN.md; product truth in PRODUCT.md. Impeccable does not rewrite this file. Code references are to main at a4159ed (v1.48.2).

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

## Closet (GALLERY)

- Tile: image, name (Figtree), one line with the condition word and the wear count.
- Flags (Review, Example, In the wash, needs repair, needs attention) become one small mark on the image corner, with a text label for screen readers. Occasions move to the piece preview.
- Filters: typographic category tabs with counts, for example "All 47, Tops 18, Bottoms 8, Outerwear 8, Shoes 8".
- "In the wash" stays a separate control with its count.
- Wide: 4 or 5 columns where width allows. Opening a tile keeps opening the editor. Stats stays reachable.
- Image source by rendered size (Phase 9): the 256px thumbnail only where rendered width x DPR is 256 or less; otherwise the cut-out or the photo, lazy-loaded. Report bytes downloaded per screen before and after.
- Code: renderCloset (app.js:926).

## Garment detail (PRODUCT EDITORIAL)

- Piece preview (openPiece, app.js:1739), item editor (openEditor, app.js:1063) and zoom viewer (openViewer).
- Phone: bottom sheet, image first. Wide: centred sheet with about 60% image and 40% details and actions.
- Keep every editor field and action; In the wash, Review and Example states stay clear. Long-press stays rejected (v1.24).

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

## Shop (STYLIST INTELLIGENCE)

Erratum 2 applies (owner decision, 13 October 2026).

- Order (as built in renderShop, app.js:1027): department question if unset, coming season, replace, more outfits from one purchase (versaPanel, app.js:1030; v1.48), gaps per occasion, build toward a style, ideas from Claude.
- Lead element: versatility() from v1.48.0 (logic.js:477): new color pairings as the large number, plus the owned pieces each purchase pairs with. Per-occasion gaps from gaps() go below.
- For each gap: what is missing, why (have X of Y), the best color with "+N outfits" as the large element, then the shop link.
- Shop values equal main exactly, for the versatility() list as well as for gaps(). logic.js stays untouched.
- No "works with" counts; Care has no "Ready again".
- Covered occasions: one calm line, for example "Covered: 5 tops, 3 bottoms, 2 shoes".
- Never invent a purchase need; never encourage buying to fill the screen.

## Settings and other sheets (QUIET UTILITY)

- Group headings, aligned rows, whitespace, restrained dividers. No cards inside cards.
- Keep every group: Install, Appearance, Style, Weather, Photos, Holidays, Work dress code, Laundry, Reminders, Help, Privacy and your data, account (openSettings, app.js:1269).
- Same treatment for: Add clothes, Adjust, Condition check, Your style, Style palette, Weather, What I wore, Outfit diary, Closet stats, How Wearcycle decides, Delete my data, Choose a new password, What is this?, consent. All open through openSheet (app.js:1051).

## Full-screen and fixed layers

- Sign-in and welcome: the brand moment (logo, tagline, headline "Get dressed in seconds.").
- Camera, zoom viewer, job bar, toasts: functional, high contrast, safe-area aware, above the tab bar or rail. The flashlight button stays hidden where the camera reports no torch.
- The share image (canvas in shareOutfit, app.js) and privacy.html are redesigned separately in Phase 14.

## Anti-patterns

Do not generate: dashboard grids, generic stat cards, endless pill rows, endless rounded cards, cards inside cards, decorative gradients, purple or blue AI styling, glassmorphism, neon, meaningless badges, unneeded progress bars, icon-heavy headings, hover-only information, or large unused desktop space caused by a phone max-width.

Before adding a card, ask: can scale, type, spacing or alignment do it?
