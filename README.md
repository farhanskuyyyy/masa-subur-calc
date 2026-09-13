# 🌸 Luna - Kalkulator Masa Subur & Siklus Menstruasi (Flo Style)

Aplikasi kalkulator masa subur dan pelacak siklus menstruasi berbasis web yang dirancang dengan estetika feminin terinspirasi dari aplikasi Flo, dilengkapi akurasi perhitungan klinis kalendar (Ogino-Knaus & Konsensus Wilcox). Seluruh komputasi berjalan 100% di browser tanpa mengirim data pengguna ke server luar.

## Fitur Utama

- ⭕ **Flo Daily Cycle Dial (Lingkaran Siklus Interaktif)**: Visualisasi status fase siklus harian, hari ke-berapa dalam siklus, dan peluang hamil hari ini (Peak, High, Medium, Low).
- 🗓️ **Kalender Siklus Interaktif**: Kalender bulanan dengan navigasi bulan yang dapat diklik per hari untuk melihat rincian biologis tanggal tersebut.
- 💧 **Literasi Tubuh & Gejala (Body Literacy)**: Panduan perubahan tekstur lendir serviks (kering, creamy, hingga tipe putih telur mentah/egg-white) dan kenaikan suhu basal tubuh (BBT).
- 🧬 **Akurasi Perhitungan Klinis**:
  - Pilihan **Siklus Teratur** maupun **Siklus Bervariasi** (metode Ogino-Knaus untuk siklus yang tidak selalu tetap).
  - Opsi pengaturan medis lanjutan untuk **Panjang Fase Luteal** (rentang normal 11 - 16 hari).
  - Probabilitas konsepsi harian berbasis penelitian klinis Wilcox et al. (NEJM).
  - Tanggal paling akurat untuk tes kehamilan mandiri (14 DPO / hari perkiraan haid berikutnya).
- 🔮 **Proyeksi 6 Siklus ke Depan**: Jadwal perkiraan menstruasi, jendela subur, dan ovulasi untuk 6 siklus mendatang.
- 📱 **Mobile-First & Responsif**: Mengutamakan kenyamanan sentuhan di smartphone dengan target tap minimal 48px dan layout bebas overflow horizontal.
- 📋 **Fitur Ekspor & Berbagi**: Tombol salin ringkasan teks untuk catatan pribadi dan tombol cetak/simpan PDF.
- 🔒 **Privasi 100% Terjaga**: Berjalan sepenuhnya di sisi klien (client-side).

## Tech Stack

- HTML5 (Semantik & Aksesibel WCAG AA)
- Tailwind CSS (CDN) dengan palet warna feminin khusus (Petal, Rose, Amber, Warm)
- Vanilla JavaScript (Tanpa dependensi eksternal yang berat)
- Google Fonts (Outfit & Plus Jakarta Sans)

## Cara Menggunakan

1. Buka file `index.html` langsung di browser desktop maupun ponsel.
2. Masukkan tanggal hari pertama haid terakhir (HPHT) atau gunakan tombol cepat (Hari ini, 3 hari lalu, dll).
3. Pilih pola siklus (Teratur atau Bervariasi) dan tentukan panjang siklus serta durasi pendarahan haid.
4. Klik **Analisis Siklus & Masa Subur** untuk menampilkan dashboard lengkap gaya Flo.
5. Ketuk tanggal manapun di kalender untuk melihat status fertilitas dan sinyal tubuh pada hari tersebut.

## Dasar Metodologi Medis

1. **Jendela Subur Biologis (Fertile Window)**:
   - Sperma dapat bertahan hidup hingga 5 hari di dalam lendir serviks subur.
   - Sel telur matang bertahan selama 12 hingga 24 jam setelah ovulasi.
   - Jendela subur mencakup 5 hari sebelum ovulasi ditambah hari ovulasi itu sendiri (total 6 hari).
2. **Metode Ogino-Knaus untuk Siklus Bervariasi**:
   - Hari awal subur = Siklus terpendek - 18 hari
   - Hari akhir subur = Siklus terpanjang - 11 hari

> ⚠️ **Catatan Medis**: Hasil yang ditampilkan adalah estimasi berbasis metode kalendar statistik dan bukan pengganti diagnosis medis dari dokter spesialis obstetri dan ginekologi (Sp.OG).

## Lisensi

MIT
