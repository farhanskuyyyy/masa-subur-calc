# 🌸 Kalkulator Masa Subur & Pelacak Siklus Menstruasi

Aplikasi web modern berbasis **React 19**, **TypeScript**, **Vite**, dan **Tailwind CSS** untuk menghitung masa subur, memperkirakan hari ovulasi, masa relatif aman, proyeksi siklus, serta visualisasi **Kalender 3 Bulan**. Dilengkapi sistem autentikasi aman dengan **Supabase Auth** dan mode **Akun Demo** untuk pengujian langsung.

---

## ✨ Fitur Utama

- 🥚 **Perhitungan Hari Perkiraan Ovulasi**: Menghitung hari ovulasi dengan formula klinis `cycleLength - 14`.
- 🌟 **Jendela Subur Akurat**: Menentukan 6 hari masa subur optimal (`ovulation - 5` hingga `ovulation + 1`).
- 🛡️ **Masa Kurang Subur (Relatif Aman)**: Estimasi periode sebelum masa subur (setelah haid selesai) dan pasca jendela subur hingga siklus berikutnya.
- 📅 **Proyeksi 3 Siklus ke Depan**: Rangkuman tanggal haid dan ovulasi untuk perencanaan acara, liburan, atau program hamil (promil).
- 🗓️ **Kalender Visual 3 Bulan**: Menampilkan 3 bulan berturut-turut dengan penanda warna semantik:
  - 🩸 **Haid (Menstruasi)**: Merah muda / Rose
  - 🌟 **Subur (Fertile Window)**: Kuning keemasan / Amber
  - 🥚 **Ovulasi Puncak**: Rose menyala dengan animasi glow
  - 🛡️ **Kurang Subur**: Abu-abu netral / Aman
- 🧬 **Literasi Biologis Tubuh**: Klik tanggal manapun pada kalender untuk melihat status fase hormonal, karakteristik lendir serviks (tipe putih telur mentah), dan perubahan suhu basal tubuh (BBT).
- ⭕ **Flo Cycle Dial Centerpiece**: Indikator lingkaran progres siklus harian interaktif dan estimasi peluang kehamilan hari ini.
- 🔒 **Privasi 100% Terjaga**: Seluruh perhitungan siklus dihitung langsung di browser (client-side). Data pribadi Anda tidak dipantau atau disalahgunakan.
- 🔐 **Autentikasi Supabase & Mode Demo**:
  - Halaman terproteksi (`/dashboard`) dengan route guard `ProtectedRoute`.
  - Terintegrasi dengan Supabase Auth (Sign Up, Sign In, Sign Out).
  - Dukungan **Akun Demo** instan jika Supabase belum dikonfigurasi.

---

## 🛠️ Tech Stack

- **Framework**: React 19 + TypeScript
- **Bundler**: Vite
- **Styling**: Tailwind CSS (Desain feminin terinspirasi Flo: rose, petal, amber, emerald, violet)
- **Routing**: React Router DOM (v7)
- **Backend / Auth**: Supabase JS Client (`@supabase/supabase-js`)
- **Linter**: Oxlint

---

## 📐 Rumus & Dasar Metodologi Klinis

Aplikasi ini mengacu pada kaidah kalendar klinis **Ogino-Knaus** dan konsensus **Wilcox**:

1. **Hari Ovulasi**:
   $$\text{Ovulasi} = \text{Panjang Siklus} - 14$$
   *(Contoh: Pada siklus 28 hari, ovulasi terjadi pada hari ke-14 setelah HPHT).*

2. **Jendela Subur (Fertile Window)**:
   $$\text{Jendela Subur} = [\text{Ovulasi} - 5\text{ hari}] \text{ s/d } [\text{Ovulasi} + 1\text{ hari}]$$
   *(Sperma dapat bertahan hidup hingga 5 hari di saluran reproduksi wanita, dan sel telur bertahan 12–24 jam).*

3. **Masa Kurang Subur**:
   - Fase Folikular Awal: Setelah selesai pendarahan haid sampai 1 hari sebelum jendela subur.
   - Fase Luteal: 1 hari setelah jendela subur berakhir sampai sebelum menstruasi berikutnya.

4. **Siklus Bervariasi (Ogino-Knaus)**:
   - Hari awal subur: $\text{Siklus Terpendek} - 18$
   - Hari akhir subur: $\text{Siklus Terpanjang} - 11$

---

## 🚀 Panduan Instalasi & Menjalankan Aplikasi

### 1. Prasyarat
Pastikan Anda telah menginstal:
- [Node.js](https://nodejs.org/) versi 18 atau lebih baru
- `npm` atau `pnpm` / `yarn`

### 2. Kloning Repositori
```bash
git clone https://github.com/farhanskuyyyy/farhanskuyyyy.github.io.git
cd farhanskuyyyy.github.io
# atau navigasikan ke direktori proyek kalkulator masa subur
```

### 3. Instal Dependensi
```bash
npm install
```

### 4. Konfigurasi Variabel Lingkungan (.env)
Salin berkas `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```

Buka berkas `.env` dan sesuaikan nilainya dengan kredensial proyek Supabase Anda:
```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

> 💡 **Catatan**: Jika Anda belum memiliki akun Supabase, aplikasi tetap dapat dijalankan dan diuji menggunakan tombol **"Masuk sebagai Akun Demo"** di halaman login.

### 5. Jalankan Development Server
```bash
npm run dev
```
Buka peramban di `http://localhost:5173`.

### 6. Build untuk Produksi
Untuk memeriksa tipe TypeScript dan mem-bundle aset produksi:
```bash
npm run build
```

Untuk melihat hasil build lokal:
```bash
npm run preview
```

---

## 🔑 Pengaturan Supabase Auth

1. Buat akun gratis di [Supabase](https://supabase.com/).
2. Buat proyek baru (*New Project*).
3. Di dashboard Supabase, buka menu **Project Settings** > **API**.
4. Salin **Project URL** ke `VITE_SUPABASE_URL` di `.env`.
5. Salin **anon public key** ke `VITE_SUPABASE_ANON_KEY` di `.env`.
6. Buka menu **Authentication** > **Providers** > pastikan provider **Email** aktif.
7. Di bagian **Authentication** > **URL Configuration**, pastikan `Site URL` mengarah ke URL web Anda (contoh: `http://localhost:5173` saat lokal).

---

## 📂 Struktur Direktori

```text
├── .env.example               # Contoh variabel lingkungan Supabase
├── index.html                 # Template HTML utama
├── package.json               # Konfigurasi dependensi & npm scripts
├── src/
│   ├── App.tsx                # Konfigurasi rute & provider aplikasi
│   ├── main.tsx               # Titik masuk React (createRoot)
│   ├── index.css              # Styling Tailwind CSS & animasi
│   ├── components/
│   │   ├── Navbar.tsx         # Navigasi atas dengan status login
│   │   ├── Footer.tsx         # Footer dengan tautan & catatan privasi
│   │   ├── ProtectedRoute.tsx # Route guard untuk halaman terproteksi
│   │   └── InfoModal.tsx      # Modal penjelasan metodologi klinis
│   ├── context/
│   │   └── AuthContext.tsx    # Context autentikasi Supabase & Demo user
│   ├── lib/
│   │   └── supabase.ts        # Inisialisasi Supabase client
│   ├── pages/
│   │   ├── LandingPage.tsx    # Halaman depan (Hero & 3 info cards)
│   │   ├── LoginPage.tsx      # Formulir login
│   │   ├── RegisterPage.tsx   # Formulir registrasi
│   │   └── DashboardPage.tsx  # Dashboard kalkulator siklus & kalender 3 bulan
│   ├── types/
│   │   └── calculator.ts      # Definisi interface & type TypeScript
│   └── utils/
│       └── calculator.ts      # Fungsi matematika & kalender
└── README.md
```

---

## ⚠️ Pemberitahuan Medis

Kalkulator ini dirancang sebagai alat bantu edukasi dan estimasi statistik berbasis kalendar. Kalkulator ini **bukan merupakan alat kontrasepsi medis mutlak** dan **bukan pengganti konsultasi dengan dokter spesialis obstetri dan ginekologi (Sp.OG)**. Variasi hormon individual, stres, dan kondisi medis tertentu dapat memengaruhi tanggal ovulasi sebenarnya.
