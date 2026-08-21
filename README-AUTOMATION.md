# MARIOBOLA AUTOMATION

## Setiap hari
1. Ganti `input/jadwal.txt` dengan TXT jadwal terbaru.
2. Ganti `input/prediksi.txt` dengan TXT prediksi terbaru.
3. Push/commit ke GitHub.

GitHub Actions akan:
- membaca 2 TXT;
- mencocokkan jadwal + prediksi;
- memperbarui status UPCOMING/LIVE/FINISHED berdasarkan waktu WIB;
- memilih BIG MATCH aktif;
- mencocokkan nama tim ke registry;
- mengisi URL logo dari dataset logo;
- menghasilkan `data/schedule.json` dan `data/predictions.json`;
- commit hasil kembali ke repository.

Cloudflare Pages yang terhubung ke repository kemudian melakukan deployment dari commit tersebut.

Catatan: jika nama tim baru tidak ditemukan di dataset, kartu tetap tampil dengan inisial tim; website tidak rusak.
