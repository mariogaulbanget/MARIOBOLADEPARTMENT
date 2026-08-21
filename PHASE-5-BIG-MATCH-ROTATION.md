# MARIOBOLA PHASE 5 — BIG MATCH ROTATION

## Implemented
- Match Center chooses a LIVE match first.
- If no match is LIVE, it chooses the next `featured: true` UPCOMING match.
- If no featured upcoming match exists, it chooses the earliest UPCOMING match.
- When the current match becomes FINISHED, the next active match automatically takes over on the next refresh.
- NEXT SCHEDULE shows the next three active matches after the current BIG MATCH.
- Match Center now displays HANDICAP and PREDICTION without exposing `data/schedule.json`.
- Dynamic status is recalculated in the browser every 60 seconds using Asia/Jakarta time.
- No external football-score API is required for the rotation logic.

## Important
The TXT remains the authoritative source for schedule, handicap and prediction. The `featured` flag is generated in the data pipeline; after the initial featured match finishes, the rotation falls back automatically to the next upcoming match.
