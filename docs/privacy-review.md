# Wearcycle privacy review (PIPEDA)

Reviewed October 7, 2026, for v1.29.0. This is an engineering review against public guidance, not legal advice.

## 1. Where the data goes

| Data | Stored / processed by | Where | When |
|---|---|---|---|
| Email, hashed password, sign-in logs (IP) | Supabase Auth | Project region (owner to confirm, see 4.2); Supabase, Inc. is a US company | Always |
| Items (JSON incl. 256 px thumbnail), outfit log, settings, consent record | Supabase Postgres, row-level security per user | Same | Always |
| Full photos and cut-outs | Supabase Storage, private bucket `photos`, folder per user id | Same | When you add photos |
| Daily Claude request counts | `ai_usage` table, no client access | Same | When Claude is used |
| Photo or text list of clothes | Anthropic API via the `claude` Edge Function | United States; deleted within 30 days, no training | Only with Claude features on |
| Rounded coordinates / postal code | Open-Meteo, Zippopotam.us | Third-party servers | Only with weather on |
| Sign-in emails | Gmail SMTP | Google | Sign-up, password reset |
| IP and browser details (access logs) | GitHub Pages | GitHub | Every app open |
| Search text | Google Maps | Google | Only when a "find a place" link is tapped |
| Cut-out processing, scoring, fonts | On the phone / served by Wearcycle | Device | Always |

Fonts used to load from Google Fonts on every open. Since v1.29 they are served from `fonts/` (Fontsource packages, SIL Open Font License), so Google no longer receives a request each time the app opens.

## 2. The ten PIPEDA principles

| Principle | Status after v1.29 |
|---|---|
| 1. Accountability | The owner is named as responsible, with contact wearcycle.app@gmail.com and a 30-day answer commitment. Processors are listed. **Gap:** sign the vendor data processing terms (4.3). |
| 2. Identifying purposes | The notice has a table pairing each piece of data with its purpose. |
| 3. Consent | **New.** A required checkbox at sign-up names Supabase and Anthropic (US) and confirms the user is 13 or older. Existing accounts see a one-time summary with "I agree" or "Agree, but turn Claude off". The record is stored in settings (`consent: {v, at, how}`), and the notice version (`PRIVACY_V`) asks again when it changes. |
| 4. Limiting collection | Only clothing data, the log, settings and optional approximate location are collected. Location is rounded to about 1 km, and Canadian postal codes are cut to the first 3 characters. There is no analytics or ad tracking. |
| 5. Limiting use, disclosure, retention | Data is not sold or shared. It is kept while the account exists. **New:** account deletion removes everything. Look photos are not stored. |
| 6. Accuracy | Everything can be edited in the app. Claude's guesses are flagged "Review" until the user confirms them. |
| 7. Safeguards | HTTPS everywhere; per-user row-level security on every table and on storage; server keys only in the Edge Function; daily Claude limits. |
| 8. Openness | The privacy notice was rewritten and is linked from sign-up, the consent sheet and Settings. |
| 9. Individual access | **New:** "Download my data" produces a .zip with a JSON file (all items, the full outfit log and settings) plus every photo and cut-out. |
| 10. Challenging compliance | The complaint route is the owner first, then the Office of the Privacy Commissioner of Canada. |

**Cross-border transfers.** OPC guidance treats a transfer to a processor as a "use", not a disclosure. The organization stays accountable, must protect the data through contracts, and must tell people that their data may be processed abroad and accessed by foreign authorities. The notice, the consent sheet and the Settings row now say this.

**Breaches.** A breach that creates a real risk of significant harm must be reported to the OPC and to the people affected. Every breach must be recorded, and the record kept for 24 months (SOR/2018-64).

## 3. What changed in the app (v1.29.0)

- **Sign-up:** a consent checkbox is required. It links to the privacy notice, names Supabase and Anthropic (US), and states 13 or older.
- **Existing users:** a one-time privacy summary appears. It records consent and offers to turn Claude off.
- **Settings › Privacy and your data:**
  - privacy notice link;
  - Claude features switch (off means nothing is sent to Anthropic, and photos are added without auto-fill);
  - Download my data;
  - Delete my data and account.
- **Account deletion:** a new `delete_account` task in the `claude` Edge Function.
  - It verifies the caller.
  - It lists and removes every file under `photos/<user id>/`, including files that no item references.
  - It then deletes the Auth user. The rows in items, wears, settings and ai_usage are removed with it through `on delete cascade`.
  - If any step fails, the app says so and points to the email address.
- **Sign out:** clears the offline copy and cached cut-outs on the phone.
- **Fonts:** self-hosted.
- **privacy.html:** rewritten.

## 4. Owner actions (cannot be done from code)

1. **Redeploy the `claude` function** with the new `supabase/functions/claude/index.ts`.
   - Until then, "Delete my data and account" deletes the data, but closing the account falls back to the email message.
   - The function reads `SUPABASE_SECRET_KEYS`, falling back to the legacy `SUPABASE_SERVICE_ROLE_KEY`. Supabase provides both to Edge Functions automatically, so no secret needs to be added.
2. **Check the database region:** Supabase dashboard › Project Settings › General.
   - If it is a US region, the notice already covers it.
   - Supabase offers Canada (Central) `ca-central-1` for new projects. Moving would mean creating a new project and migrating the data.
   - PIPEDA does not require data to stay in Canada. Quebec's Law 25 has stricter rules for transfers outside Quebec, and it was not assessed here.
3. **Data processing terms:** confirm the Supabase DPA and Anthropic's commercial terms and DPA are accepted for the accounts used.
4. **Breach log:** keep a simple dated log (what, when, who was affected, risk assessment, actions taken) for at least 24 months, even when nothing has to be reported.
5. **Whether PIPEDA applies:** PIPEDA covers personal information collected in the course of commercial activity. A free app for friends may fall outside it. These measures are good practice either way, and they matter if Wearcycle is ever opened to the public or charges money.

## 5. Known limits

- The privacy notice page is in English only. The consent sheet and the Settings texts are translated into all seven app languages.
- The 256 px thumbnail lives inside each item's JSON, so it is exported in the JSON file and not as a separate photo.
- Supabase and Anthropic backups and logs are removed on their own schedules.

## Sources

- OPC, PIPEDA fair information principles: https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/p_principle/
- OPC, Guidelines for processing personal data across borders: https://www.priv.gc.ca/en/privacy-topics/airports-and-borders/gl_dab_090127/
- OPC consent guidelines (key elements, under-13 parental consent, applied from January 1, 2019), summarized by the Canadian Marketing Association: https://thecma.ca/topic/articles/2018/07/11/opc-s-new-consent-guidelines-and-what-they-mean-to-your-business
- Breach of Security Safeguards Regulations, SOR/2018-64: https://laws-lois.justice.gc.ca/eng/regulations/SOR-2018-64/
- Anthropic, API data retention (30 days; flagged content up to 2 years): https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data
- Anthropic, no training on commercial/API data by default: https://privacy.claude.com/en/articles/7996868-is-my-data-used-for-model-training
- Supabase regions (Canada Central, ca-central-1): https://supabase.com/docs/guides/platform/regions
- Supabase Edge Function default secrets (`SUPABASE_SECRET_KEYS`, `SUPABASE_SERVICE_ROLE_KEY`): https://supabase.com/docs/guides/functions/secrets
- Supabase, new API keys go on the `apikey` header only: https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys
