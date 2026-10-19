# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Today: the owner and his family, mostly on Android phones in the morning, plus an iPad (Safari, added to the Home Screen) and Windows browsers (Chrome or Edge, mouse and keyboard). The job: pick what to wear for the day's occasion and weather, then keep the closet in shape (owner, 2026-10-18).
- Design target: any adult who signs up. Wearcycle is meant to become a public app, so no screen or choice may make sense only to the owner's household. Onboarding, empty states and explanations must work for a stranger who starts with an empty closet (owner, 2026-10-18).
- Sign-ups are open with email confirmation; the sign-up consent confirms the person is 13 or older (v1.29).

## Product Purpose

Wearcycle helps a person get dressed from the clothes they already own and keep those clothes in use longer. It photographs pieces with the in-app camera (with on-device cut-outs), ranks and explains outfits for an occasion (Work, Going out, Formal, Sport, Home, Chores) and the day's weather, tracks wear, laundry, condition and repairs, says what to donate or recycle, and lists only purchases that fill a real gap. The welcome headline states the promise: "Get dressed in seconds." Success means the person picks today's outfit quickly, understands why it was picked, and wears, repairs and passes on clothes rather than buying more.

## Positioning

What Acloset and Whering (checked 2026-10-04) do not offer together, as chosen by the owner on 2026-10-18:

- Explained ranked outfits: ranked picks for the occasion and weather, each with a match label (Excellent, Great, Good, Fair, Weak) and the reasons behind it.
- The full clothing life cycle in one place: wear, laundry, condition checks, repair, donate and recycle.

Gap-based shopping and the detail rules (socks, belts, open shirts, accessories, dress codes) are real capabilities but not the positioning.

## Operating Context

- Morning: open the installed app, see today's outfit for the chosen occasion with the weather (Open-Meteo for the person's area), "Wear this", log it. The outfit diary and "What I wore" correct the log later.
- Laundry: pieces go "In the wash" and leave the outfit pools; a reminder asks after a chosen number of days whether they are clean.
- Work dress codes and a Formal occasion (interviews, weddings, graduations) shape the picks.
- Care moments: condition checks after a number of wears or months, repairs with a tailor or cobbler search, donation and textile recycling searches in Google Maps.
- Seven languages: English, Español, Français (fr-CA), Tagalog, हिन्दी, 日本語, 한국어. New users get the phone's language.
- Claude features are optional and need consent. With Claude off, the person sets each piece's category, colors and occasions by hand.

## Capabilities and Constraints

- Screens: Outfits (ranked outfits, swap, leave a piece out, Wear this, log, diary, share image, style row, holiday looks), Closet (camera, cut-outs, item editor, In the wash, stats), Care (repair, check, rotate, let go, donation and recycling), Shop (coming season, replace, more outfits from one purchase, gaps per occasion, build toward a style, ideas from Claude), Settings (install, appearance, style, weather, photos, holidays, work dress code, laundry, reminders, help, privacy and data, account).
- Technical: installable web app (PWA) in plain HTML, CSS and JavaScript with no build step, hosted on Cloudflare Pages at https://wearcycle.app/; Supabase for auth, data and private photos; one Edge Function calls Claude with per-person daily limits.
- During the redesign the outfit, care and shopping rules (logic.js), the data model and the Edge Function stay unchanged, and no feature is removed.
- Translations work by exact English text match, so visible copy changes are kept to a minimum and every change goes into all six dictionaries.
- Open decision: the revenue model is undecided. No paid features or paywalls are added in this redesign (owner, 2026-10-18).
- Not built or deferred: a native app or Google Play listing, virtual try-on, a tidy AI product picture, a morning push reminder.

## Brand Commitments

- Name Wearcycle. Logo: a t-shirt outline drawn as a cycle with two arrows and a coral hem accent (icons/logo-icon.svg). Tagline "WEAR · CARE · DONATE · BUY" on the sign-in screen only. Welcome headline "Get dressed in seconds."
- Keep the Ink & Coral identity: ink #1B2433, coral #FF7A59, neutral #F6F4F1, the warm cream garment canvas, the condensed display type, light and dark themes (owner, 2026-10-18). Coral is not a selected-state color (redesign decision 1, 2026-10-12).
- Clothes are the hero: the person's own garments (photos, cut-outs, color glyphs) lead every screen and the interface supports them (owner, 2026-10-18).
- Sustainable without cliches: wear longer, repair, donate and recycle; no eco slogans, no guilt, never encourage buying to fill a screen; when an occasion is covered, say so plainly (owner, 2026-10-18).
- Privacy and honesty: consent before anything is sent to Anthropic, Claude features can be turned off, data can be downloaded and deleted, PIPEDA is followed as good practice (not a legal opinion), and no claim, number or testimonial is invented (owner, 2026-10-18).
- Voice: plain language in sentence case.

## Evidence on Hand

- Real content: the owner's closet and a Supabase test account (about 20 pieces, being filled by the owner). Screenshots use the fixture closet in tools/fixtures/ (labelled sample data).
- Privacy notice: privacy.html; review notes: docs/privacy-review.md.
- Rule sources cited in the project decisions (for example WRAP 2015 on longer wear, Laitala and Klepp 2021 on condition checks, NHS advice on resting shoes).
- Translations were made by AI and checked automatically; a native-speaker review is still recommended, especially for Tagalog and Hindi.
- Absent, and must not be fabricated: testimonials, user counts, ratings, press, pricing, partner logos.

## Product Principles

1. Get dressed from what you own: today's outfit comes first; every other screen supports it.
2. Explain every pick in plain words and match labels, never raw scores.
3. Keep clothes in use: care, repair and passing on are core; buying is the last step and only for a real gap.
4. Work for a stranger: every screen makes sense to a new adult with an empty closet, in any of the seven languages.
5. Honest by default: consent, control over one's own data, no invented claims.

## Accessibility & Inclusion

- WCAG 2.2 AA: text 4.5:1, UI indicators 3:1; touch targets 44px (40px for small chips); keyboard reachable with visible focus; Escape closes sheets; prefers-reduced-motion respected; safe-area insets on fixed layers.
- Seven languages including Hindi, Japanese and Korean (system fonts). Longer translations must fit at 360px wide; translated labels are never truncated to hide overflow.
- Light and dark themes, Auto by default.
