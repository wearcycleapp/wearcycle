---
name: Wearcycle
description: Your closet, outfits for every kind of day, wear and care tracking, and a shopping list.
colors:
  bg: "#f6f4f1"
  surface: "#fbfaf8"
  raised: "#ffffff"
  ink: "#1b2433"
  muted: "#5b6270"
  line: "#e2ded8"
  accent: "#1b2433"
  accent-ink: "#ffffff"
  accent-soft: "#e7e9ee"
  coral: "#ff7a59"
  coral-ink: "#1b2433"
  good: "#2b7a4c"
  good-soft: "#dcefe3"
  warn: "#8e6010"
  warn-soft: "#f5e8cc"
  bad: "#b4233c"
  bad-soft: "#f7dde1"
  board: "#ece8e2"
  canvas-1: "#f7f4ef"
  canvas-2: "#ebe4d9"
  board-mid: "#efe9e0"
  board-edge: "#e7dfd3"
  bg-dark: "#12161e"
  surface-dark: "#1a202b"
  raised-dark: "#212836"
  ink-dark: "#eceef2"
  muted-dark: "#9aa2b0"
  line-dark: "#2e3646"
  accent-dark: "#f1f2f5"
  accent-ink-dark: "#1b2433"
  accent-soft-dark: "#2a3242"
  coral-dark: "#ff8a6b"
  coral-ink-dark: "#1b2433"
  good-dark: "#6cc38e"
  good-soft-dark: "#1b3225"
  warn-dark: "#e2b45c"
  warn-soft-dark: "#382d17"
  bad-dark: "#f2668b"
  bad-soft-dark: "#3d1f29"
  board-dark: "#1c2230"
typography:
  display:
    fontFamily: "Big Shoulders Display, Arial Narrow, Impact, sans-serif"
    fontSize: "40px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.01em"
  headline:
    fontFamily: "Big Shoulders Display, Arial Narrow, Impact, sans-serif"
    fontSize: "30px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.01em"
  title:
    fontFamily: "Big Shoulders Display, Arial Narrow, Impact, sans-serif"
    fontSize: "24px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.01em"
  body:
    fontFamily: "Figtree, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "Figtree, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.3
  mono:
    fontFamily: "JetBrains Mono, ui-monospace, Menlo, Consolas, monospace"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.3
rounded:
  control: "8px"
  card: "10px"
  canvas: "12px"
  sheet: "20px"
  pill: "999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "6": "24px"
  "8": "32px"
  "12": "48px"
  "16": "64px"
  "24": "96px"
components:
  button:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 14px"
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.control}"
    padding: "10px 14px"
  button-cta:
    backgroundColor: "{colors.coral}"
    textColor: "{colors.coral-ink}"
    rounded: "{rounded.canvas}"
    height: "48px"
  chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.muted}"
    rounded: "{rounded.pill}"
    height: "44px"
    padding: "0 16px"
  chip-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.bg}"
    rounded: "{rounded.pill}"
    height: "44px"
  input:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
  nav-item-active:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent}"
    rounded: "{rounded.control}"
  sheet:
    backgroundColor: "{colors.bg}"
    rounded: "{rounded.sheet}"
    padding: "16px"
---

# Design System: Wearcycle

Merged on 2026-10-19 from `/impeccable document` (scan of styles.css, index.html and app.js at v1.48.2, main a4159ed) and Sections 7.1 to 7.8 of the redesign plan v2.2 with its errata. Screen rules live in docs/design/SCREENS.md. Where today's code and a plan rule differ, this file names both: "Today" is what ships, "Rule" is what every screen phase moves toward. The frontmatter records today's values.

## Overview

**Creative North Star: "The Wardrobe Editor"**

An editor curating what you own, laid out on cream like a stylist's board: what to wear today and why, what to mend, what to let go. The clothes are the page; the tools stay quiet around them (owner, 2026-10-19).

Wearcycle is personal and calm, editorial and fashion-aware, intelligent and practical, and sustainable without eco cliches. Its concept is personal fashion editorial plus wardrobe intelligence. The clothing is the protagonist and the interface supports it. On phones it feels like a personal stylist in your pocket; on wide screens it is a digital wardrobe workspace, not a widened phone. A screen should be recognisable as Wearcycle without the logo.

Hierarchy is built in this order: scale, typography, whitespace, alignment, contrast, color, divider, container. Cards are the last option. Different areas carry different personalities (docs/design/SCREENS.md) instead of one card pattern everywhere. Wearcycle is an established world: every change inherits and refines it, never replaces it.

**Key Characteristics:**
- Deep ink structure.
- Warm cream garment canvas behind cut-outs.
- Coral as the action accent.
- Condensed editorial display type.
- A subtle life-cycle (circular) movement language.

## Colors

Ink and cream with one coral signal; status colors only where they mean something.

### Primary
- **Ink** (#1b2433; dark theme #eceef2 as text): text, structure and every selected state. Also the logo, the manifest color and the share image.
- **Coral** (#ff7a59; dark #ff8a6b): the action signal only. It marks the main action ("Wear this"), the Add clothes button, the #1 rank, the active tab icon, the active pager dot and progress (job bar). Ink on coral is 6.07:1 (light) and 6.76:1 (dark).

### Neutral
- **Background** (#f6f4f1; dark #12161e): the page.
- **Surface** (#fbfaf8; dark #1a202b): quiet areas and inputs.
- **Raised** (#ffffff; dark #212836): sheets, the tab bar, tiles.
- **Muted** (#5b6270; dark #9aa2b0): secondary text, 5.58:1 on Background (dark 7.05:1).
- **Line** (#e2ded8; dark #2e3646): dividers and control borders.
- **Accent / accent-ink / accent-soft** (#1b2433 / #ffffff / #e7e9ee; dark #f1f2f5 / #1b2433 / #2a3242): primary buttons and soft fills. Accent is Ink in light mode.
- **Board** (#ece8e2; dark #1c2230): the outfit board behind tiles.
- **Cream canvas** (--canvas-1 #f7f4ef to --canvas-2 #ebe4d9, the same in both themes): the radial gradient behind cut-outs. The outfit board (.flatlay) uses three stops: --canvas-1, --board-mid #efe9e0, --board-edge #e7dfd3.

### Status
- **Good** (#2b7a4c, soft #dcefe3; dark #6cc38e, #1b3225), **Warn** (#8e6010, soft #f5e8cc; dark #e2b45c, #382d17; #9c6a12 until Phase 5), **Bad** (#b4233c, soft #f7dde1; dark #f2668b, #3d1f29).

### Today versus rule
- Done in Phase 5 (v1.51.3): the cream canvas in its four rules (.flatlay, .card .vis.studio, .photo .pv.studio, .piecebig.studio) uses --canvas-1, --canvas-2, --board-mid and --board-edge, with the same values in both dark blocks and no visible change. The viewer's cut-out background (#f3f0ea until v1.61.1) uses the canvas tokens since Phase 9 (v1.62.0). The style pictures in Your style used #ece8e2 (equal to Board) in both themes until Phase 12; since v1.64.0 they sit on the cream canvas (--canvas-1 to --canvas-2) like every garment picture (owner, 2026-11-03), so no beige is hard-coded any more.
- Done in Phase 5 (v1.51.3): --warn darkened from #9c6a12 to #8e6010 (same hue). Warn on Background 4.99:1 (was 4.27), on Surface 5.26:1, on Raised 5.48:1 and on Warn-soft 4.52:1 (was 3.86), so every place Warn is text (status, banner, condition tags, warning pills, In the wash marks) passes 4.5:1. The smallest change reaching 4.5:1 on Background alone, #976611, would have left Warn-soft at 4.09:1. Dark Warn is unchanged (#e2b45c, 9.42:1 on dark Background, 7.02:1 on dark Warn-soft).
- Today coral also marks weather icons and calendar dots. Since Phase 13 it no longer marks the sign-in perks (ink ticks) or the Outfits pin card's border (a hairline). The selections that used coral are ink since their phases: the holiday chip (Phase 8); style cards, palette options and the What I wore piece picks (Phase 12, v1.64.0: a 2px ink border, plus a drawn ink check on style cards and palette options, and the soft fill on piece picks).

### Named Rules
**The One Token System Rule.** Use the token names above. Add a token only when none fits, give it a dark value, and update both dark blocks (the prefers-color-scheme block and [data-theme="dark"]).

**The Signal Rule.** Coral is never text on light backgrounds (2.34:1 on Background) and never the only cue for a selected state. Selected states use ink: heavier weight plus a 2px ink underline, or an ink fill (today's chips).

**The Canvas Rule.** Cream is for the garment canvas. Do not make every panel cream.

**The Colors Outside CSS Rule.** When the palette changes, also update the theme-color metas in index.html (#f6f4f1 light, #12161e dark), manifest.webmanifest (#1b2433), the share image in app.js and privacy.html.

## Typography

**Display Font:** Big Shoulders Display 700/800 (with Arial Narrow, Impact)
**Body Font:** Figtree 400 to 700 (with system-ui)
**Label/Mono Font:** JetBrains Mono 500/600, sparingly

**Character:** A tall, condensed editorial display voice over a friendly, legible geometric sans. All three faces are self-hosted with Latin and Latin Extended subsets only; Hindi, Japanese and Korean fall back to system fonts, which is accepted. No typeface is added without approval.

### Hierarchy
- **Display** (800, line-height 1): page titles and large editorial moments. The welcome headline is 44px on phones and 48 to 64px from 900px wide (Phase 13; 40px before). Rule scale: Display XL 36 to 44px on phones, 48 to 64px on desktop; Display L 28 to 34px on phones, 32 to 40px on desktop.
- **Headline** (800, 30px, line-height 1): tab titles (h2). Also outfit and look numbers, ranks (26px, 20px) and large numbers such as +N.
- **Title** (800, 24px): sheet titles and the greeting. Rule: Heading 20 to 24px on phones, 22 to 26px on desktop.
- **Body** (400, 15px, line-height 1.45): descriptions and details; 15 to 16px on desktop. Prose up to about 62ch (.lede).
- **Label** (600, 13px): field labels, buttons (14px), chips (14px), garment names (14px).
- **Small** (13 to 14px) and **Micro** (12px minimum). Labels smaller than 12px are raised when their phase rewrites them: the header status, tab labels, the Care count and the version line are 12px since Phase 7; the Closet's chip counts, condition line and flag words since Phase 9 (12 to 14px).

### Named Rules
**The Right Face Rule.** Display type is for page titles, outfit and look numbers, large numbers (+N) and short editorial labels. Never for paragraphs, controls or user-typed garment names: those are Figtree, because names may be typed in any script.

**The Sentence Case Rule.** Strings are written in sentence case; uppercase only through CSS (text-transform), so the translation dictionaries keep matching.

**The No Shrinking Rule.** Do not solve crowding by shrinking text. Body text stays 15px; Impeccable's 16px body floor does not apply here. The one exception is form fields (input, select, textarea): 16px since Phase 12, because iOS Safari zooms into a focused field smaller than 16px.

## Layout

A single column on phones with 16px gutters and a fixed bottom tab bar; from 700px wide and 600px tall a left rail (with Settings) and a wider workspace; from 1280px a wider labelled rail that carries the wordmark.

- **Spacing:** 4px base: 4, 8, 12, 16, 24, 32, 48, 64, 96. Major sections 32 to 48px apart on phones, 48 to 80px on desktop. Today some gaps use 10px and 14px; screen phases move them onto the scale.
- **Breakpoints (today, erratum 4, Phase 7):** max-width 380px and 460px (small phones); min-width 700px (sheets centre); the shell and direction B at min-width 700px and min-height 600px, and the wide rail at min-width 1280px and min-height 600px; landscape with max-height 599.98px (the lower bar); min-width 960px (the page widens; no screen rule switches at 960px since Phase 10); min-width 700px with max-height 599.98px (Outfits A turned sideways: the kit beside Wear this, Phase 8); min-width 1200px with min-height 600px (5 Closet columns, Phase 9); the sign-in page at min-width 600px (one 560px column) and at min-width 900px, or min-width 700px with max-height 599.98px (welcome and form side by side, Phase 13); the camera's controls on the right in landscape with max-height 599.98px (Phase 13).
- **Wide layout (v1.41, 960px and up):** .app widens from 760px to 1180px; nothing else switches at 960px: Shop flows in two columns from 700x600 (v1.55.0), the Closet has 3 columns from 700x600 and 5 from 1200px (Phase 9), Care puts its sections side by side from 700x600 (Phase 10). Since Phase 7 the rail follows the shell condition and since Phase 8 Outfits follows its directions (A below 700px wide or 600px tall, B from 700x600, every look side by side from 1100px; docs/design/SCREENS.md).
- **Review widths (not breakpoints):** 360 and 390 (Android), 820 and 1180 (iPad portrait and landscape), 1366 and 1920 (Windows).

### Width bands (rule; the shell as built in Phase 7, docs/design/SCREENS.md Navigation shell)
- **Under 700px wide or under 600px tall**, Android phones (about 360 to 412px) in portrait and turned sideways, short windows: bottom tab bar (Outfits, Closet, Care, Shop); Settings from the header (44px button); Add clothes button above the bar; single column; sheets slide up (centred from 700px wide). Turned sideways (landscape, under 600px tall) the bar is lower, icon beside label.
- **700 to 1279px wide and at least 600px tall**, iPad portrait (744 to 1032px) and landscape (1133 to 1210px), small windows: 96px rail with icons over labels and Settings at the bottom of the rail; the header stays at the top of the page; content up to 1180px from 960px. No 760px column floating in empty space: grids gain columns; Outfits shows its looks as pages (side by side from 1100px).
- **1280px and up, at least 600px tall**, Windows browsers (1366, 1536, 1920px) and iPad Pro 13-inch landscape (1376px): a 208px rail with the logo, wordmark and status at its top (the header leaves the page), labels beside icons and Settings at the bottom; content 1180px today, gallery and editorial screens up to about 1280px when their phases decide; sheets up to about 720px.

Active rail item: Accent text at weight 700 on Accent-soft, coral icon. Tab names stay Outfits, Closet, Care, Shop (already translated); the rail's Settings uses the existing "Settings" string. Device sizes come from the PhotoPrism device table (iPad) and StatCounter Canada, September 2026 (Windows).

### Input and browsers
- Phones and the iPad are touch first; an iPad with a trackpad can hover. Windows is mouse and keyboard. Every :hover rule sits inside @media (hover: hover) and (pointer: fine) (Phase 7: the shell controls; each screen phase adds its own).
- Horizontal rows (.chips, occasion and style rows) hide their scrollbars. With a mouse they wrap at every width (Phase 7, owner 2026-10-25), so every option is reachable without Shift and the wheel; touch keeps the sideways swipe.
- Keyboard: logical Tab order (header, navigation, Add clothes, then the screen), visible focus, focused controls scrolled clear of the bar (scroll-padding-bottom), Escape closes sheets.
- iPad: every iPad browser in Canada uses WebKit. Viewport units (Phase 7): a vh line as the fallback, then dvh (the sticky outfit board on wide screens) or svh (the outfit board on phones turned sideways, the piece preview picture). -webkit-text-size-adjust: 100% stops iOS enlarging text in landscape. Install to the Home Screen: WebKit deletes a site's storage after 7 days of Safari use without a visit, and Home Screen apps keep their own count, which protects the offline copy and the cut-out model.
- Windows uses Chromium, the same engine as Claude's container, so automated screenshots are close (fonts and scrollbars differ). The app does no user-agent sniffing.

## Elevation & Depth

Rule (plan 7.4, confirmed by the owner 2026-10-19): flat by default. In light mode shadows belong only to overlays and floating elements: sheets, the Add clothes button and toasts. Dark mode conveys depth with contrast and borders. No glows.

Today the soft shadow also sits on panels and stat tiles; each screen phase removes it from its own containers (Outfits has no card since Phase 8, Closet tiles are flat since Phase 9, Care's sections sit on the page and Shop's panels have a 1px Line border instead of the shadow since Phase 10).

### Shadow Vocabulary
- **Soft** (`box-shadow: 0 1px 2px rgba(27,36,51,.08), 0 4px 14px rgba(27,36,51,.06)`; dark `0 1px 2px rgba(0,0,0,.4)`): the --shadow token; sheets and toasts.
- **Floating action** (`--shadow-float`: `0 6px 20px rgba(27,36,51,.25)`; dark `0 2px 8px rgba(0,0,0,.5)`): the Add clothes button. Until Phase 7 it was rgba(20,30,60,.25) in both themes, a faint blue halo on the dark page (detector dark-glow).
- **Garment** (`filter: drop-shadow(0 2px 2px rgba(50,35,20,.18)) drop-shadow(0 8px 10px rgba(50,35,20,.14))`): cut-outs on the cream canvas, so garments sit on the board rather than float.

### Named Rules
**The Flat-By-Default Rule.** A container earns a shadow only by floating above the page. Grouping is done with space and alignment.

## Shapes

Gently rounded, with the pill shape reserved for meaning.

- **Rule (plan 7.4):** controls 8px; garment canvas 12px; large compositions 12 to 16px; sheet top corners 20 to 24px. Pills (999px) only where the shape means something: a removable or toggle chip.
- **Today:** buttons, icon buttons, inputs and tiles 8px; panels, the garment canvas (kit pictures, outfit boards, Closet tile pictures and the garment sheet picture since Phase 9) and the main action 12px; piece preview and cards added after v1.24 14px; sheets 20px (Phase 12; 16px before); chips, weather pill and status pills 999px.
- **Icons:** inline SVG, 24px viewBox, stroke 1.8 to 2, currentColor, as today. Use them where they help recognition, not on every heading. Life-cycle icons (wear, wash, repair, rotate, donate, recycle) may be added with a consistent stroke and size.

## Components

Quiet and tactile: plain ink controls with clear pressed and selected states (ink, never coral alone); 44px touch targets (40px for small chips); hover feedback only with a mouse. Coral stays where it is decided (owner, 2026-10-19).

### Buttons
- **Shape:** gently rounded (8px); the main action 12px.
- **Default:** Raised background, 1px Line border, 600 weight, 14px, 10px by 14px padding.
- **Primary:** Ink fill with white text (accent and accent-ink).
- **Main action ("Wear this"):** Coral fill with Ink text, 48px tall, 700 weight, 15px. One per screen.
- **Danger / Ghost / Small:** Bad text and border; transparent; 40px minimum height, 44px inside sheets (Phase 12).
- **Hover / Focus:** hover only for mouse input (the shell since Phase 7; buttons and chips with their screens). Focus is a 2px accent outline offset 2px (:focus-visible).
- **Pressed (Phase 13, mobile-native):** the tap highlight is off, so every button, chip, icon button and link button shows its own pressed state: Accent-soft, or the fill mixed toward the page for primary and main-action buttons. A color change at once, with no transition, so nothing moves under reduced motion. Controls do not select their label on a long press (user-select: none on controls only) and do not wait for a double tap (touch-action: manipulation).

### Chips
- **Style:** Surface background, 1px Line border, Muted text, 600 weight, 44px minimum height (40px for small chips).
- **State:** selected is an Ink fill with Background text and aria-pressed="true". On Outfits (Phase 8) the occasions are a grid (phones) or text tabs with a 2px ink underline (from 700x600); holidays are not occasions there since v1.53.1: they sit in the reminders line, and the chosen one is an ink pill.

### Garment imagery (signature)
- Three kinds of image must all look right: phone photos, cut-outs on the cream canvas, and SVG glyphs filled with the piece's main color. Design for an empty closet too (a new user has 0 items).
- Do not cover garments with badges, shrink them to fit details, or surround them with chrome.
- Use 256px thumbnails only where the image is shown small (rendered width times device pixel ratio up to 256); full photos or cut-outs for large tiles, the hero, the preview and the viewer. Outfits (Phase 8): cut-outs, or a 1024px copy of the photo made on the device and kept with the cut-outs, where a piece is drawn large; thumbnails where they stay sharp. Closet and garment detail (Phase 9): the same rule by drawn size times pixel density, cut-out first, then the thumbnail, the 1024px copy or the full photo; Closet pictures load only near the screen (docs/design/SCREENS.md, Closet).

### Outfit board (signature)
- The flat-lay board (.flatlay) lays the outfit's pieces on the cream canvas with garment shadows; tapping a piece opens its preview. Square on the iPad and Windows (direction B, sized so "Wear this" stays in the window), 4:5 or as tall as the first screen allows on phones when chosen in Adjust. The rank badge, match label, palette strip and "Wear this" sit around the board, never on the garments.
- The kit (phones, direction A, Phase 8): the main garments as 4:5 pictures on the cream canvas with their category and name, then shoes, belt and accessories as small named squares. Garment names stay in Figtree.

### Intelligence and numbers
- Use the existing match labels (Excellent, Great, Good, Fair, Weak) rather than raw scores.
- Meaningful numbers may become major elements, such as "+12 outfits with what you own", set in the display face.
- When an occasion is covered, say so plainly. Never encourage buying to fill the screen.

### Cards / Containers
- **Corner Style:** 10 to 14px today (see Shapes).
- **Background:** Raised.
- **Shadow Strategy:** see Elevation & Depth (removed screen by screen).
- **Internal Padding:** 12 to 14px today.
- Before adding a card, ask whether scale, type, spacing or alignment can do the job. Never nest cards.

### Inputs / Fields
- **Style:** Raised background, 1px Line border, 8px radius, 10px by 12px padding, 16px text, at least 44px tall (Phase 12), labels 13px 600 in Ink.
- **Checkboxes and switches:** checkboxes are drawn in Accent (accent-color). In Settings the on/off rows use a switch (owner, 2026-11-03): the input stays a checkbox, drawn as a 44 by 26px track, Line when off and Accent when on; the whole row is the target.
- **Focus:** the global focus outline.
- **Error:** Bad text at 13.5px below the field.

### Navigation
- **Bar (under 700px wide or under 600px tall):** fixed bottom bar on Raised with a top border, four tabs, 22px icons over 12px labels (icon beside label in landscape); the active tab gets Accent text at weight 700 on Accent-soft and a coral icon (aria-current="page"); the Care tab carries a 12px count, Accent-ink on Bad. Settings is the header's 44px button.
- **Rail (700px wide and 600px tall):** a 96px left rail with 24px icons and Settings at its bottom; from 1280px a 208px rail with the logo, wordmark and status at its top, labels beside icons and the Care count at the end of its row.

### Sheets, toasts and job bar
- **Sheets:** one openSheet(html) for every sheet; slide up on phones, centre from 700px; Background fill; sticky action row; Escape closes. Since Phase 12: the dialog is named by its title and takes focus on open, the page behind is inert, a redraw keeps focus on the same control and closing gives focus back to the control that opened it; the sheet and the dimmed layer contain their scroll (overscroll-behavior); 44px close button and buttons; lists sit on the sheet with hairlines (no card inside the sheet). Settings from 1100px wide and 600px tall: a sheet up to 980px with an index of its groups on the left (docs/design/SCREENS.md).
- **Toasts:** Ink fill with Background text, 12px radius, above the tab bar and safe area. Since Phase 13 they sit above every layer (z-index 70: sheets 20, camera 40, zoom viewer 60); on phones they sit above Add clothes when it shows, never over it; in the camera, just under its top bar. #toastRoot and #jobRoot are status regions from page load, so screen readers announce each message.
- **Job bar:** Raised, with a spinner and the text at full width, wrapping to a second line rather than cutting a translation; progress is a 3px coral line along its lower edge (Phase 13; a 64px bar beside the text before).
- **Full-screen layers (camera, zoom viewer; Phase 13):** dark, functional, safe-area aware on every side. Like sheets since Phase 12, each takes focus when it opens (the camera's first action, the viewer's Close), keeps the app and any sheet behind it inert, and gives focus back to the control that opened it. Controls are 44px and drawn (no text characters as icons). The viewer's Photo / Cut-out switch is drawn for the dark layer: the chosen one is a white fill with dark text.
- **Sign-in and welcome (Phase 13):** the brand row with the language button at its end, the welcome headline, the promise beside an outfit laid out on the cream canvas with the garment glyphs (decorative, hidden from screen readers), then the form flat on a Raised panel with a hairline: ink-underlined text tabs for Create account and Sign in, the coral main action, confirmations in a Good-soft status note and errors in Bad. From 900px wide, and on phones turned sideways, the welcome and the form stand side by side; below that, one column up to 560px.

### Motion
- Motion follows wardrobe behaviour: an outfit swap, a piece going into the wash, a piece coming back, a sheet moving.
- Durations: fast 120 to 180ms; normal 200 to 280ms; editorial 300 to 450ms.
- Every animation sits inside @media (prefers-reduced-motion: no-preference). No continuous or decorative motion. These rules win over review-animations (which wants under 300ms and gentler motion under reduced motion) and over Impeccable's animate defaults.
- Today: toast entrance 0.2s ease-out, camera flash 0.25s, the outfit's piece press 0.12s (board and kit, scale .97 and .98, cubic-bezier(.23,1,.32,1)) and the job spinner sit inside the query; the Outfits reasons chevron turns in 0.15s inside it (Phase 8); the item editor's More details chevron turns in 0.15s inside it since Phase 12 (it was outside), and so does the knob of the Settings switches.

## Do's and Don'ts

### Do:
- **Do** let the garments lead: large images on the cream canvas, tools quiet around them.
- **Do** use Ink for every selected state: weight plus a 2px ink underline, or an ink fill.
- **Do** keep coral to the main action, Add clothes, the #1 rank, the active tab icon, the active pager dot and progress.
- **Do** keep text at 4.5:1 and indicators at 3:1 against their background, in both themes.
- **Do** keep 44px touch targets (40px for small chips) and a visible focus outline.
- **Do** design light and dark together; light is the primary presentation for design reviews and the default setting stays Auto.
- **Do** use the full width on purpose at 1366 and 1920px.

### Don't:
- **Don't** use coral as text on light backgrounds or as the only cue for a selection.
- **Don't** make every panel cream; cream is the garment canvas.
- **Don't** build dashboard grids, generic stat cards, endless pill rows, endless rounded cards or cards inside cards.
- **Don't** add decorative gradients, purple or blue AI styling, glassmorphism, neon or glows.
- **Don't** add meaningless badges, unneeded progress bars or icon-heavy headings.
- **Don't** hide information behind hover.
- **Don't** leave large unused desktop space caused by a phone max-width.
- **Don't** set user-typed garment names in the display face.
- **Don't** shrink text to solve crowding, or truncate translated labels to hide overflow.
- **Don't** add a colored side stripe thicker than 1px to a card or callout; the 3px coral borders on .advice and .askcard were removed in Phase 8, the 3px Bad and Warn stripes on Care rows in Phase 10.
