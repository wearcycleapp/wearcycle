# Wearcycle check

Fixed clock 2026-10-14T08:30:00-04:00. Auth: stub (WEARCYCLE_TEST_EMAIL / WEARCYCLE_TEST_PASSWORD not set). 261 s.

| Status | Check | Detail |
| --- | --- | --- |
| PASS | APP_VERSION equals the sw.js VERSION | 1.49.1 |
| PASS | sw.js is non-empty and every shell file exists | 31 files |
| PASS | Sign-in | stub: WEARCYCLE_TEST_EMAIL / WEARCYCLE_TEST_PASSWORD not set |
| PASS | Every tab opens | outfits, closet, care, shop |
| PASS | Occasion change re-renders the outfits | work to out and back |
| PASS | Piece preview, Swap and Back to suggestion | "White oxford shirt" swapped for "Burgundy hoodie", then restored |
| PASS | Each sheet opens and closes | 12 sheets (Escape), plus the close button |
| PASS | Theme switches (Settings, Appearance) | dark rgb(18, 22, 30), light rgb(246, 244, 241) |
| PASS | Language switches (Settings, Language) | fr "Tenues", back to en |
| PASS | Every view captured | 98 screenshots |
| PASS | Cut-outs loaded before each screenshot | all views |
| PASS | No horizontal overflow | all views |
| PASS | No console errors |  |
| PASS | Network stays local (Supabase, Open-Meteo stubbed) | 0 writes and 0 function calls answered locally |
| REVIEW | "Wear this" visible at 390x844 without scrolling | button at 950-998px, viewport 844px, covered or off screen (not yet: Phase 8 target) |
| REVIEW | axe-core: no serious or critical issues | 142 (no baseline yet: recorded for Phase 4) |
| REVIEW | No English left in French and Japanese | 2 (no baseline yet: recorded for Phase 4) |
| REVIEW | No app text cut off or spilling (all languages) | 12 (no baseline yet: recorded for Phase 4) |
| INFO | Piece names cut with an ellipsis | 9 (user-typed names may be truncated; listed per view in summary.json) |
| REVIEW | Detector warnings (npx impeccable@4.5.2 detect) | 15 (index.html + styles.css 4, screen snapshots 11) (no baseline yet: recorded for Phase 4). Rules: detector.json |
| INFO | Detector advisories (recorded, not gated) | 149 (index.html + styles.css 95, screen snapshots 54; 122 hidden elements left out of the snapshots) |

## Per view

| View | Overflow | App text cut | Spilling | Names cut | English left | axe serious |
| --- | --- | --- | --- | --- | --- | --- |
| phone-360-light-en-outfits |  | 0 | 0 | 0 | 0 | 4 |
| phone-360-light-en-closet |  | 0 | 0 | 1 | 0 | 3 |
| phone-360-light-en-care |  | 0 | 0 | 0 | 0 | 0 |
| phone-360-light-en-shop |  | 0 | 0 | 0 | 0 | 4 |
| phone-360-light-en-preview |  | 0 | 0 | 0 | 0 | 0 |
| phone-360-light-en-editor |  | 0 | 0 | 0 | 0 | 0 |
| phone-360-light-en-settings |  | 0 | 0 | 1 | 0 | 0 |
| phone-360-dark-en-outfits |  | 0 | 0 | 0 | 0 | 4 |
| phone-360-dark-en-closet |  | 0 | 0 | 1 | 0 | 1 |
| phone-360-dark-en-care |  | 0 | 0 | 0 | 0 | 0 |
| phone-360-dark-en-shop |  | 0 | 0 | 0 | 0 | 4 |
| phone-360-dark-en-preview |  | 0 | 0 | 0 | 0 | 0 |
| phone-360-dark-en-editor |  | 0 | 0 | 0 | 0 | 0 |
| phone-360-dark-en-settings |  | 0 | 0 | 1 | 0 | 0 |
| phone-390-light-en-outfits |  | 0 | 0 | 0 | 0 | 4 |
| phone-390-light-en-closet |  | 0 | 0 | 0 | 0 | 3 |
| phone-390-light-en-care |  | 0 | 0 | 0 | 0 | 0 |
| phone-390-light-en-shop |  | 0 | 0 | 0 | 0 | 4 |
| phone-390-light-en-preview |  | 0 | 0 | 0 | 0 | 0 |
| phone-390-light-en-editor |  | 0 | 0 | 0 | 0 | 0 |
| phone-390-light-en-settings |  | 0 | 0 | 1 | 0 | 0 |
| phone-390-dark-en-outfits |  | 0 | 0 | 0 | 0 | 4 |
| phone-390-dark-en-closet |  | 0 | 0 | 0 | 0 | 1 |
| phone-390-dark-en-care |  | 0 | 0 | 0 | 0 | 0 |
| phone-390-dark-en-shop |  | 0 | 0 | 0 | 0 | 4 |
| phone-390-dark-en-preview |  | 0 | 0 | 0 | 0 | 0 |
| phone-390-dark-en-editor |  | 0 | 0 | 0 | 0 | 0 |
| phone-390-dark-en-settings |  | 0 | 0 | 1 | 0 | 0 |
| ipad-820-light-en-outfits |  | 0 | 0 | 0 | 0 | 4 |
| ipad-820-light-en-closet |  | 0 | 0 | 0 | 0 | 3 |
| ipad-820-light-en-care |  | 0 | 0 | 0 | 0 | 0 |
| ipad-820-light-en-shop |  | 0 | 0 | 0 | 0 | 4 |
| ipad-820-light-en-preview |  | 0 | 0 | 0 | 0 | 0 |
| ipad-820-light-en-editor |  | 0 | 0 | 0 | 0 | 0 |
| ipad-820-light-en-settings |  | 0 | 0 | 0 | 0 | 0 |
| ipad-820-dark-en-outfits |  | 0 | 0 | 0 | 0 | 4 |
| ipad-820-dark-en-closet |  | 0 | 0 | 0 | 0 | 1 |
| ipad-820-dark-en-care |  | 0 | 0 | 0 | 0 | 0 |
| ipad-820-dark-en-shop |  | 0 | 0 | 0 | 0 | 4 |
| ipad-820-dark-en-preview |  | 0 | 0 | 0 | 0 | 0 |
| ipad-820-dark-en-editor |  | 0 | 0 | 0 | 0 | 0 |
| ipad-820-dark-en-settings |  | 0 | 0 | 0 | 0 | 0 |
| ipad-1180-light-en-outfits |  | 0 | 0 | 0 | 0 | 4 |
| ipad-1180-light-en-closet |  | 0 | 0 | 0 | 0 | 3 |
| ipad-1180-light-en-care |  | 0 | 0 | 0 | 0 | 0 |
| ipad-1180-light-en-shop |  | 0 | 0 | 0 | 0 | 4 |
| ipad-1180-light-en-preview |  | 0 | 0 | 0 | 0 | 0 |
| ipad-1180-light-en-editor |  | 0 | 0 | 0 | 0 | 0 |
| ipad-1180-light-en-settings |  | 0 | 0 | 0 | 0 | 0 |
| ipad-1180-dark-en-outfits |  | 0 | 0 | 0 | 0 | 4 |
| ipad-1180-dark-en-closet |  | 0 | 0 | 0 | 0 | 1 |
| ipad-1180-dark-en-care |  | 0 | 0 | 0 | 0 | 0 |
| ipad-1180-dark-en-shop |  | 0 | 0 | 0 | 0 | 4 |
| ipad-1180-dark-en-preview |  | 0 | 0 | 0 | 0 | 0 |
| ipad-1180-dark-en-editor |  | 0 | 0 | 0 | 0 | 0 |
| ipad-1180-dark-en-settings |  | 0 | 0 | 0 | 0 | 0 |
| win-1366-light-en-outfits |  | 0 | 0 | 0 | 0 | 4 |
| win-1366-light-en-closet |  | 0 | 0 | 0 | 0 | 3 |
| win-1366-light-en-care |  | 0 | 0 | 0 | 0 | 0 |
| win-1366-light-en-shop |  | 0 | 0 | 0 | 0 | 4 |
| win-1366-light-en-preview |  | 0 | 0 | 0 | 0 | 0 |
| win-1366-light-en-editor |  | 0 | 0 | 0 | 0 | 0 |
| win-1366-light-en-settings |  | 0 | 0 | 0 | 0 | 0 |
| win-1366-dark-en-outfits |  | 0 | 0 | 0 | 0 | 4 |
| win-1366-dark-en-closet |  | 0 | 0 | 0 | 0 | 1 |
| win-1366-dark-en-care |  | 0 | 0 | 0 | 0 | 0 |
| win-1366-dark-en-shop |  | 0 | 0 | 0 | 0 | 4 |
| win-1366-dark-en-preview |  | 0 | 0 | 0 | 0 | 0 |
| win-1366-dark-en-editor |  | 0 | 0 | 0 | 0 | 0 |
| win-1366-dark-en-settings |  | 0 | 0 | 0 | 0 | 0 |
| win-1920-light-en-outfits |  | 0 | 0 | 0 | 0 | 4 |
| win-1920-light-en-closet |  | 0 | 0 | 0 | 0 | 3 |
| win-1920-light-en-care |  | 0 | 0 | 0 | 0 | 0 |
| win-1920-light-en-shop |  | 0 | 0 | 0 | 0 | 4 |
| win-1920-light-en-preview |  | 0 | 0 | 0 | 0 | 0 |
| win-1920-light-en-editor |  | 0 | 0 | 0 | 0 | 0 |
| win-1920-light-en-settings |  | 0 | 0 | 0 | 0 | 0 |
| win-1920-dark-en-outfits |  | 0 | 0 | 0 | 0 | 4 |
| win-1920-dark-en-closet |  | 0 | 0 | 0 | 0 | 1 |
| win-1920-dark-en-care |  | 0 | 0 | 0 | 0 | 0 |
| win-1920-dark-en-shop |  | 0 | 0 | 0 | 0 | 4 |
| win-1920-dark-en-preview |  | 0 | 0 | 0 | 0 | 0 |
| win-1920-dark-en-editor |  | 0 | 0 | 0 | 0 | 0 |
| win-1920-dark-en-settings |  | 0 | 0 | 0 | 0 | 0 |
| phone-360-light-fr-outfits |  | 3 | 0 | 0 | 0 | 4 |
| phone-360-light-fr-closet |  | 4 | 0 | 1 | 0 | 3 |
| phone-360-light-fr-care |  | 0 | 0 | 0 | 0 | 0 |
| phone-360-light-fr-shop |  | 1 | 0 | 0 | 0 | 4 |
| phone-360-light-fr-preview |  | 0 | 0 | 0 | 0 | 0 |
| phone-360-light-fr-editor |  | 0 | 0 | 0 | 0 | 0 |
| phone-360-light-fr-settings |  | 1 | 0 | 0 | 1 | 0 |
| phone-360-light-ja-outfits |  | 0 | 0 | 0 | 0 | 4 |
| phone-360-light-ja-closet |  | 3 | 0 | 1 | 0 | 3 |
| phone-360-light-ja-care |  | 0 | 0 | 0 | 0 | 0 |
| phone-360-light-ja-shop |  | 0 | 0 | 0 | 0 | 4 |
| phone-360-light-ja-preview |  | 0 | 0 | 0 | 0 | 0 |
| phone-360-light-ja-editor |  | 0 | 0 | 0 | 0 | 0 |
| phone-360-light-ja-settings |  | 0 | 0 | 1 | 1 | 0 |
