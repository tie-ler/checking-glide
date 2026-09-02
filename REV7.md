# Checking Glide — Rev 7 (locked 2026-09-02 18:52 CDT)

Working copy after this is Rev 8. UI remains Rev 6.

## Rates (recomputed every 7am / tap)
- I = 90d jump-filtered inflows / 90
- F = 365d labeled fixed / 365
- PATH = max(0, (10000 − spot) / 182) until 2026-10-01, then 30d avg
- BASE = I − F − PATH
- AVAILABLE = BASE − disc_mtd

## Snapshot 2026-09-02
I $176.07  F $95.32  PATH $27.21  BASE $53.54  USED $54.27  AVAILABLE -$0.73
