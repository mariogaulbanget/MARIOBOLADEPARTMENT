# MARIOBOLA FINAL — PHASE 1–10

## Sudah termasuk
- TXT jadwal + prediksi parser
- 81/81 matching dari sample input
- Team Registry + alias/fallback
- logo resolution pipeline
- Match Preview semua pertandingan
- Prediction Board semua pertandingan
- BIG MATCH rotation + NEXT SCHEDULE
- status UPCOMING/LIVE/FINISHED berbasis WIB
- Live Center + placeholder image + global streaming link
- Official Channels: WhatsApp, Instagram, Telegram, Facebook, X
- Featured Analysis dari `data/news.json`
- optional automatic Fakta Global Sport RSS refresh
- GitHub Actions automation
- Cloudflare Pages-compatible static build

## Deployment
1. Upload the contents of this folder to the GitHub repository (not the ZIP itself).
2. Keep `input/jadwal.txt` and `input/prediksi.txt` as the only daily data inputs.
3. Commit/push after replacing the two TXT files.
4. GitHub Actions parses the TXT, updates JSON, resolves logos when the logo dataset is reachable, refreshes Fakta Global Sport news when the feed is reachable, and commits generated data.
5. Connect Cloudflare Pages to the same GitHub repository. Future pushes trigger the Cloudflare deployment.

## Important
- No Football API key is required.
- Do not upload the Phase ZIP files one by one. Use this final project once.
- Permanent social/live/analysis links are centralized in `data/site-config.json`.
- The supplied live image placeholder can be replaced later by the image you provide, without changing the layout.
