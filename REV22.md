# Checking Glide — Rev 22 (locked 2026-10-08)

Working copy after this is Rev 23.

Both widgets: no hardcoded FALLBACK numbers. Fetch fails with no cache: every value is —, tag NO DATA.
Both widgets: last good feed cached per widget (checking-glide-main-cache.json, checking-glide-drip-cache.json), FIELDS only.
Both widgets: read only their FIELDS list (no control, ledger, disc_mtd, or f_* lines). Null or missing shows —, never $0.
Both widgets: token from Keychain "checking_glide_token" -> GitHub contents API (raw). No token -> public raw URL.
Tags: STALE Nd (1d only after 9 AM local), OFFLINE, BAD FEED (200 but bad JSON or no as_of, orange), NO DATA, NO TOKEN (no token, raw 404), AUTH (token, 401/403/404), RATE (403 with x-ratelimit-remaining 0, or 429).
Status is read in the catch too, so a load that throws on 4xx is still classified.
Money rounds before the sign: -0.4 shows $0 (TODAY color too). Drip money keeps the minus sign.
Main widget: hero AVAILABLE (RUNNING). TODAY +$N from available_today (omitted if missing). CASH 30D = control_avg. TARGET = floor.
Main widget: nominal_spend null = no BASE line or label, all bars grey. NO DATA = no chart. Left column pinned to chart height (78). clockNow and localToday removed.
Drip widget: AS OF on the title row (9pt, one line, scales down). DRIP total — if any drip is missing.
New: checking-glide-set-token.js saves the token to Keychain (empty removes it).
Feed: spend.json. Both widgets read it.
