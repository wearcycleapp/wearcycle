# Wearcycle

Installable web app (PWA) for managing your clothes: photograph them with the in-app camera, get scored outfits for work, going out, sport, home and chores, track wear and condition, and see what to donate or buy.

## Files

| Path | Purpose |
| --- | --- |
| `index.html`, `styles.css` | App shell and design |
| `app.js` | UI, in-app camera, Supabase storage, Claude calls |
| `logic.js` | Pure outfit, care and shopping rules (no DOM; testable with Node) |
| `config.js` | Optional: your Supabase URL and publishable key |
| `manifest.webmanifest`, `sw.js`, `icons/` | Install to home screen and offline app shell |
| `vendor/supabase.js` | supabase-js 2.117.2 browser build (MIT, see `vendor/supabase-LICENSE`) |
| `supabase/schema.sql` | Tables, row-level security, private photo bucket |
| `supabase/functions/claude/index.ts` | Edge Function that holds the Anthropic API key and calls Claude |

## Setup

Follow the "Wearcycle: setup guide" doc from the chat. In short: create a Supabase project and run `schema.sql`, upload this folder to a public GitHub repository and turn on Pages, set the Supabase Site URL, add `ANTHROPIC_API_KEY` as an Edge Function secret and deploy `functions/claude/index.ts` as a function named `claude`.

## Security model

- The browser only holds the Supabase publishable key; every table and the photo bucket are restricted to the signed-in owner by row-level security.
- The Anthropic key lives only in the Edge Function secrets. The function accepts three fixed tasks (`tag`, `check`, `ideas`), so it cannot be used as a general Claude proxy.
- After creating your account, turn off "Allow new users to sign up" in Supabase Authentication.
