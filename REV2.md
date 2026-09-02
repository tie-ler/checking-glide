# Checking Glide — Rev 2 (locked 2026-09-02)

Rev 1 was dollars vs an EOY linear $10k line.
Rev 2 is a daily available-spend number. Paycheck timing does not move the hero.

## Formula

available_spend = daily_income - daily_fixed - daily_path - disc_mtd

Each calendar day with $0 discretionary:
available_{t+1} = available_t + nominal_spend
where nominal_spend = daily_income - daily_fixed - daily_path

## Frozen rates until 2026-10-01

- daily_income  181.04   biweekly ~$2140 + $400, jump-filtered (not August four-check pile)
- daily_fixed   102.02   12-month annuals + 90d grocery/MONEYLINE
- daily_path     24.39   ($8000 - control) / 121 days
- nominal_spend  54.63
- floor          8000    operating
- eoy_goal      10000    still a goal, not the widget hero

## Policy

- CONTROL = X Money checking. Chase = buffer only.
- MONEYLINE = fixed, not spend.
- Card charges count when they hit the card. Autopays from checking do not.
- Fixed labels: rent, Upgrade loan, MONEYLINE, City of Austin, GEICO, supplements, typical groceries, typical bike maint.
- Jumps excluded: bank-switch months, one-off shop/travel, bike shop > $500, transfers, account seeding.
- Rates recalculate on the 1st unless labels change.

## Snapshot 2026-09-02 evening

- control 5048.50
- disc_mtd 54.27  (McD 3.24 + Domino's 41.03 + Pluckers 10.00)
- available_spend 0.36
