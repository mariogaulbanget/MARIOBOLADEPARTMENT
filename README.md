# MARIOBOLA ALTERNATIF LOGIN — Public Website V1

## File utama
- index.html
- style.css
- script.js

## Cara upload ke GitHub
1. Buka repository: mariobola-alternatif-login
2. Upload ketiga file utama ke folder paling atas (root) repository.
3. Jangan masukkan folder ZIP sebagai satu file.
4. Commit ke branch `main`.
5. Cloudflare Pages akan otomatis melakukan deployment.

## Setup API klasemen
Website memakai Cloudflare Pages Function di `functions/api/standings.js`.

1. Daftar token gratis di `football-data.org`.
2. Di Cloudflare Pages, buka **Settings > Variables and Secrets**.
3. Tambahkan secret production bernama `FOOTBALL_DATA_TOKEN`.
4. Isi dengan token dari football-data.org.
5. Deploy ulang project.

Klasemen dipanggil melalui `/api/standings?league=17` dan di-cache selama 5 menit.
Liga yang memakai kode `football-data.org`: Premier League, La Liga, Serie A, Ligue 1, Bundesliga, dan Eredivisie. Liga Indonesia serta Belgian Pro League memerlukan provider dengan cakupan tambahan bila kode tersebut tidak tersedia pada akun gratis.

## Update manual schedule dan berita
File yang diedit manual:
- `data/schedule.json` untuk pertandingan.
- `data/news.json` untuk berita bola.

Cara update:
1. Edit isi kedua file JSON tersebut.
2. Klik `update-data.cmd`.
3. Pastikan muncul pesan `Update selesai`.
4. Upload perubahan ke repository agar website ikut berubah.

Script Node juga bisa dijalankan dengan `npm run update` atau divalidasi dengan `npm run validate-data`.

## BIG MATCH harian
Section `02 / FEATURED MATCH` memakai `/api/matches?date=YYYY-MM-DD`.
Endpoint ini mengambil pertandingan dari katalog gratis yang diprioritaskan: liga top Eropa, Liga Champions, Europa League, Conference League, World Cup, Euro, dan Brasileirão. Endpoint memprioritaskan pertandingan live lalu pertandingan besar/terdekat dan di-cache selama 5 menit. Setelah pertandingan selesai, halaman akan mengambil pertandingan berikutnya secara otomatis.
