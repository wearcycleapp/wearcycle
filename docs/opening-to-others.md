# Opening Wearcycle to other people: checklist

Already done in the app (v1.15):
- Welcome screen with Create account / Sign in, password reset, link to the privacy page.
- Privacy page: `privacy.html`.
- Settings > Delete my data (clothes, photos, cut-outs, outfit log, settings).
- Server settings hidden because `config.js` fixes the server.
- Claude function enforces daily limits per person once `supabase/limits.sql` is installed:
  tag 80, box 80, check 30, ideas 10 per day (edit `DAILY_LIMIT` in `supabase/functions/claude/index.ts`).

Steps that need the owner (in this order):
1. Supabase > SQL Editor: run `supabase/limits.sql`.
2. Supabase > Edge Functions > claude > Code: paste the latest `supabase/functions/claude/index.ts`, Deploy.
3. Anthropic Console: set a monthly spend limit on the API key's workspace, so costs stay capped even if limits change.
4. Supabase > Authentication > Sign In / Providers: turn "Allow new users to sign up" back ON.
5. Supabase > Authentication > URL Configuration: keep Site URL and Redirect URL set to https://wearcycleapp.github.io/wearcycle/ (needed for confirmation and password-reset emails).
6. Supabase free plan sends a small number of auth emails per hour with its built-in mailer; for real users, connect a custom SMTP provider (Authentication > Emails > SMTP Settings).

Google Play (optional, later):
- Package the PWA as a Trusted Web Activity with Bubblewrap.
- The Digital Asset Links file must be served from the domain root: https://<domain>/.well-known/assetlinks.json.
  The app lives in a subfolder (wearcycleapp.github.io/wearcycle), so either create a repository named
  `wearcycleapp.github.io` that serves `.well-known/assetlinks.json`, or move the app to a custom domain.
- New personal Play developer accounts must run a closed test with 12 testers for 14 days before production.
- Play requires a privacy policy URL: https://wearcycleapp.github.io/wearcycle/privacy.html
