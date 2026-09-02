# Checking Glide — Rev 3 (locked 2026-09-02 17:41 CDT)

Rev 2 froze the math. Rev 3 freezes the widget chrome on top of that math.
Working copy after this file is Rev 4.

## Math (unchanged from Rev 2)

available_spend = daily_income - daily_fixed - daily_path - disc_mtd

Frozen until 2026-10-01:
- daily_income  181.04
- daily_fixed   102.02
- daily_path     24.39
- nominal_spend  54.63
- floor          8000

## Widget (locked)

- Header AVAILABLE SPEND, same green/red as the dollar
- No SPEND TODAY / SAVE TODAY verb
- Spark 140×60, USED vs BASE, not flush to the corner
- Padding 12 / 16 / 10 / 16
- Pills: INCOME, FIXED, PATH, CONTROL, FLOOR
- Footer AS OF YYYY-MM-DD  h:mm AM/PM
- Script: checking-glide-widget.js on main (commit e58c61d)

## Snapshot

- control 5048.50
- disc_mtd 54.27
- available_spend 0.36
- spark_used [3.24, 51.03]
