# MARIOBOLA — FINAL BUILD

Website statis MarioBola dengan sumber pertandingan dari dua TXT harian. Tidak membutuhkan Football API atau VPS.

## Sumber data harian
- `input/jadwal.txt`
- `input/prediksi.txt`

Parser menghasilkan:
- `data/schedule.json`
- `data/predictions.json`
- `data/teams.json`

## Fitur
- Match Center / BIG MATCH rotation
- NEXT SCHEDULE
- status UPCOMING / LIVE / FINISHED berbasis WIB
- Match Preview seluruh jadwal
- Prediction Board seluruh jadwal + handicap + prediksi
- Team Registry + logo resolver + fallback inisial
- Live Center
- Featured Analysis / Fakta Global Sport
- WhatsApp, Instagram, Telegram, Facebook, X
- GitHub Actions untuk otomatisasi data
- Cloudflare Pages compatible

## Harian
Ganti dua file TXT di `input/`, lalu commit/push ke GitHub. Workflow akan memproses data dan commit JSON hasilnya. Cloudflare Pages yang terhubung ke repository akan melakukan deploy otomatis.

## Link permanen
Isi `data/site-config.json` untuk link login, analisis, live streaming, gambar live, dan semua sosial media. Link sosial yang kosong sengaja dinonaktifkan sampai URL asli diberikan.

## Catatan
Logo eksternal hanya di-resolve ketika GitHub Actions dapat mengakses dataset. Jika gagal, mapping lama dipertahankan dan website memakai fallback inisial sehingga tidak rusak.
