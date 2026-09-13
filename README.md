# 🌸 Kalkulator Masa Subur & Pelacak Siklus Menstruasi

Aplikasi web modern berbasis **React 19**, **TypeScript**, **Vite**, dan **Tailwind CSS** untuk menghitung masa subur, memperkirakan hari ovulasi, masa relatif aman, proyeksi siklus, serta visualisasi **Kalender 3 Bulan**. Dilengkapi sistem autentikasi mandiri berbasis **Express + SQLite (better-sqlite3)** dengan enkripsi **bcrypt 12 rounds**, **JWT 7-day expiration**, **Helmet**, **CORS**, dan **Rate Limiting**, serta mode **Akun Demo** untuk pengujian langsung tanpa backend.

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
- 🔒 **Privasi 100% Terjaga**: Seluruh perhitungan siklus dihitung langsung di browser (client-side). Data sensitif Anda aman.
- 🔐 **Autentikasi Mandiri Express + SQLite & Mode Demo**:
  - Backend API lokal mandiri tanpa ketergantungan pihak ketiga (Supabase dihapus sepenuhnya).
  - Penyimpanan akun pengguna di database SQLite lokal (`better-sqlite3`) dengan kueri berparameter (*parameterized queries*).
  - Keamanan ketat: Enkripsi kata sandi menggunakan **bcrypt 12 rounds**, token **JWT berlaku 7 hari**, proteksi header **Helmet**, **CORS**, dan pencegahan *brute-force* via **express-rate-limit**.
  - Rute terproteksi di frontend (`/dashboard`) via `ProtectedRoute` guard.
  - Mode **Akun Demo** instan tetap tersedia untuk eksplorasi cepat.

---

## 🛠️ Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS (Palet tema Flo: rose, petal, amber, emerald, violet)
- **Routing**: React Router DOM (v7)
- **Backend**: Express (Node.js + TypeScript via `tsx`)
- **Database**: SQLite (`better-sqlite3` dengan WAL mode)
- **Keamanan & Autentikasi**:
  - `bcryptjs` (12 salt rounds)
  - `jsonwebtoken` (JWT masa aktif 7 hari)
  - `helmet` (HTTP security headers)
  - `cors` (Cross-Origin Resource Sharing)
  - `express-rate-limit` (Pembatasan laju permintaan)
- **Runner**: `concurrently` (menjalankan backend dan frontend secara bersamaan)
- **Linter**: Oxlint

---

## 📡 API Autentikasi (Express + SQLite)

Server backend berjalan di `http://localhost:3001` dengan endpoint:

| Metode | Endpoint | Deskripsi | Proteksi / Header |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Cek status server dan kesiapan database | Publik |
| `POST` | `/api/auth/register` | Mendaftarkan akun baru (email unik, kata sandi min. 6 karakter) | Rate Limited |
| `POST` | `/api/auth/login` | Masuk dan memperoleh token JWT 7 hari | Rate Limited |
| `GET` | `/api/auth/me` | Mengambil data pengguna yang sedang login | `Authorization: Bearer <token>` |

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
- `npm` (atau `pnpm` / `yarn`)

### 2. Kloning Repositori
```bash
git clone https://github.com/farhanskuyyyy/farhanskuyyyy.github.io.git
cd farhanskuyyyy.github.io
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

Contoh isi berkas `.env`:
```env
PORT=3001
JWT_SECRET=your-secure-random-jwt-secret-key-change-in-production
VITE_API_URL=http://localhost:3001
```

### 5. Menjalankan Aplikasi (Fullstack: Server + Client)
Jalankan backend Express dan frontend Vite sekaligus dalam satu perintah:
```bash
npm run dev
```

- **Frontend**: Akses peramban di `http://localhost:5173`
- **Backend API**: Berjalan di `http://localhost:3001`
- Berkas database SQLite otomatis dibuat di direktori `data/database.sqlite`.

Untuk menjalankan secara terpisah:
```bash
npm run server   # Menjalankan API backend Express saja
npm run client   # Menjalankan frontend Vite saja
```

### 6. Build untuk Produksi
Untuk memeriksa tipe TypeScript (server dan client) serta mem-bundle aset produksi:
```bash
npm run build
```

Untuk melihat hasil build lokal:
```bash
npm run preview
```

---

## 📂 Struktur Direktori

```text
├── data/                      # Direktori data lokal SQLite (.gitignore melindungi db)
│   ├── .gitignore
│   └── database.sqlite        # File database SQLite (dibuat otomatis)
├── server/                    # Backend API Express + SQLite
│   ├── index.ts               # Server Express, Helmet, CORS, port 3001
│   ├── db.ts                  # Inisialisasi better-sqlite3 & tabel users
│   ├── auth.ts                # Route registrasi, login, & me (bcrypt, JWT, rate limit)
│   └── middleware.ts          # Middleware verifikasi JWT Bearer token
├── src/                       # Frontend React + TypeScript
│   ├── App.tsx                # Konfigurasi rute & provider aplikasi
│   ├── main.tsx               # Titik masuk React (createRoot)
│   ├── index.css              # Styling Tailwind CSS & animasi
│   ├── components/
│   │   ├── Navbar.tsx         # Navigasi atas dengan status login
│   │   ├── Footer.tsx         # Footer dengan tautan & catatan privasi
│   │   ├── ProtectedRoute.tsx # Route guard untuk halaman terproteksi
│   │   └── InfoModal.tsx      # Modal penjelasan metodologi klinis
│   ├── context/
│   │   └── AuthContext.tsx    # Context autentikasi Express+SQLite & Demo user
│   ├── lib/
│   │   └── api.ts             # API client (fetch) untuk register, login, & me
│   ├── pages/
│   │   ├── LandingPage.tsx    # Halaman depan (Hero & 3 info cards)
│   │   ├── LoginPage.tsx      # Formulir login
│   │   ├── RegisterPage.tsx   # Formulir registrasi
│   │   └── DashboardPage.tsx  # Dashboard kalkulator siklus & kalender 3 bulan
│   ├── types/
│   │   └── calculator.ts      # Definisi interface & type TypeScript
│   └── utils/
│   │   └── calculator.ts      # Fungsi matematika & kalender
├── .env.example               # Contoh variabel lingkungan
├── package.json               # Konfigurasi dependensi & npm scripts
├── tsconfig.json              # Referensi konfigurasi TypeScript
├── tsconfig.app.json          # Konfigurasi TypeScript frontend
├── tsconfig.server.json       # Konfigurasi TypeScript backend Express
├── tsconfig.node.json         # Konfigurasi TypeScript Vite bundler
├── vite.config.ts             # Konfigurasi bundler Vite & API dev proxy
└── README.md
```

---

## ⚠️ Pemberitahuan Medis

Kalkulator ini dirancang sebagai alat bantu edukasi dan estimasi statistik berbasis kalendar. Kalkulator ini **bukan merupakan alat kontrasepsi medis mutlak** dan **bukan pengganti konsultasi dengan dokter spesialis obstetri dan ginekologi (Sp.OG)**. Variasi hormon individual, stres, dan kondisi medis tertentu dapat memengaruhi tanggal ovulasi sebenarnya.
