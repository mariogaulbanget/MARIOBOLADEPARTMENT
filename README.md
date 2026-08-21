[README-FINAL.txt](https://github.com/user-attachments/files/31322068/README-FINAL.txt)
MARIOBOLA FINAL PACKAGE

1. Upload/replace the project files in your GitHub repository.
2. Keep your daily TXT files in input/. The parser auto-detects names containing jadwal/schedule and prediksi/prediction. If there is only one TXT, it is treated as the schedule.
3. Recommended TXT schedule format:
   ENGLISH PREMIER LEAGUE
   18/08 02:00 Team A VS Team B 0:1/4

   Prediction format:
   ENGLISH PREMIER LEAGUE
   18/08 02:00 Team A VS Team B 2:1

4. GitHub Actions runs on TXT upload and every 30 minutes for standings.
5. Standings use the 10 configured leagues and preserve the last known table if a source is temporarily unavailable.
6. The logo database is downloaded automatically and its logoUrl values point to assets.football-logos.cc.
7. Live image: if you have assets/live/live-mariobola.jpg, keep/upload it. If missing, the website falls back to live-placeholder.svg.
