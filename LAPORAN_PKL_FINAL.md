# LAPORAN PRAKTIK KERJA LAPANGAN (PKL)

<div align="center">

## PENGEMBANGAN SISTEM INFORMASI MANAJEMEN KEDAI TEH BERBASIS PROGRESSIVE WEB APP (PWA)
### *Studi Kasus: Kedai Teh Raja*

**Laporan ini disusun sebagai syarat menyelesaikan**
**Praktik Kerja Lapangan (PKL) Program Studi Teknik Informatika**

---

**Disusun oleh:**

*[Nama Mahasiswa PKL]*
*NIM: [Nomor Induk Mahasiswa]*

**Program Studi Teknik Informatika**
**Fakultas Teknik / Ilmu Komputer**
**[Nama Universitas / Politeknik]**
**2026**

</div>

---

## LEMBAR PENGESAHAN

| Keterangan | Detail |
|---|---|
| **Judul Laporan** | Pengembangan Sistem Informasi Manajemen Kedai Teh Berbasis Progressive Web App (PWA): Studi Kasus Kedai Teh Raja |
| **Nama Mahasiswa** | [Nama Lengkap] |
| **NIM** | [Nomor Induk Mahasiswa] |
| **Program Studi** | Teknik Informatika |
| **Tempat PKL** | Kedai Teh Raja |
| **Periode PKL** | [Tanggal Mulai] – [Tanggal Selesai] 2026 |
| **Pembimbing Lapangan** | [Nama Pembimbing Lapangan] |
| **Dosen Pembimbing PKL** | [Nama Dosen Pembimbing] |

*Menyetujui,*

| Pembimbing Lapangan | Dosen Pembimbing PKL |
|---|---|
| | |
| **[Nama Pembimbing Lapangan]** | **[Nama Dosen Pembimbing]** |
| Jabatan: [Jabatan] | NIP: [NIP Dosen] |

---

## KATA PENGANTAR

Puji dan syukur penulis panjatkan kepada Tuhan Yang Maha Esa atas limpahan rahmat dan karunia-Nya sehingga penulis dapat menyelesaikan Laporan Praktik Kerja Lapangan (PKL) ini dengan baik dan tepat waktu.

Laporan PKL ini disusun sebagai bentuk pertanggungjawaban akademis atas kegiatan Praktik Kerja Lapangan yang telah penulis laksanakan di **Kedai Teh Raja**. Selama masa PKL, penulis mendapat kesempatan yang luar biasa untuk mengaplikasikan ilmu Teknik Informatika secara nyata dalam membangun sebuah sistem informasi manajemen modern berbasis teknologi web terkini.

Proyek utama yang penulis kerjakan selama PKL adalah pengembangan **Sistem Informasi Manajemen Teh Raja** — sebuah platform terpadu yang mencakup: *Point of Sale* (POS) untuk kasir, *Kitchen Display System* (KDS) untuk dapur, Dasbor Administrasi untuk manajemen, serta halaman menu interaktif untuk pelanggan. Sistem ini dibangun menggunakan teknologi mutakhir, termasuk **Next.js 16**, **TypeScript**, **Firebase Realtime Database**, serta integrasi **Kecerdasan Buatan (AI)** via Google Gemini API.

Penulis menyampaikan ucapan terima kasih yang sebesar-besarnya kepada:
1. Bapak/Ibu [Nama Rektor/Direktur] selaku pimpinan [nama institusi].
2. Bapak/Ibu [Nama Ketua Prodi] selaku Ketua Program Studi Teknik Informatika.
3. Bapak/Ibu [Nama Dosen Pembimbing] selaku Dosen Pembimbing PKL.
4. Bapak/Ibu [Nama Pembimbing Lapangan] selaku Pembimbing Lapangan di Kedai Teh Raja.
5. Seluruh karyawan Kedai Teh Raja atas kerja sama dan dukungannya.
6. Orang tua dan keluarga yang senantiasa memberikan doa dan motivasi.

[Kota], September 2026

Penulis, **[Nama Mahasiswa]**

---

## DAFTAR ISI

- [BAB I — PENDAHULUAN](#bab-i--pendahuluan)
- [BAB II — PROFIL INSTANSI](#bab-ii--profil-instansi)
- [BAB III — TINJAUAN PUSTAKA](#bab-iii--tinjauan-pustaka)
- [BAB IV — ANALISIS DAN PERANCANGAN SISTEM](#bab-iv--analisis-dan-perancangan-sistem)
- [BAB V — IMPLEMENTASI SISTEM](#bab-v--implementasi-sistem)
- [BAB VI — PENGUJIAN SISTEM](#bab-vi--pengujian-sistem)
- [BAB VII — PENUTUP](#bab-vii--penutup)
- [DAFTAR PUSTAKA](#daftar-pustaka)
- [LAMPIRAN](#lampiran)

---

## BAB I — PENDAHULUAN

### 1.1 Latar Belakang

Di era digitalisasi yang berkembang pesat, sektor Usaha Mikro, Kecil, dan Menengah (UMKM) dituntut untuk mengadopsi teknologi informasi guna meningkatkan efisiensi operasional dan daya saing. Kedai minuman teh merupakan salah satu segmen UMKM dengan pertumbuhan sangat pesat di Indonesia. Namun, mayoritas kedai teh skala kecil hingga menengah masih mengandalkan sistem pencatatan manual atau perangkat lunak kasir konvensional yang memiliki berbagai keterbatasan fundamental.

Keterbatasan sistem konvensional yang paling krusial antara lain:

1. **Ketergantungan Koneksi Internet:** Sistem kasir berbasis cloud tradisional akan berhenti total ketika jaringan internet terputus, menyebabkan antrean panjang dan kerugian bisnis.
2. **Tidak Ada Sinkronisasi Real-time:** Informasi pesanan tidak langsung sampai ke dapur; kasir harus mencetak nota atau berteriak untuk menyampaikan pesanan ke barista.
3. **Minim Analitik Bisnis:** Pemilik tidak mendapat laporan intelijen bisnis yang komprehensif untuk pengambilan keputusan strategis.
4. **Tidak Mendukung Loyalitas Pelanggan:** Tidak ada sistem poin atau program reward yang dapat meningkatkan retensi pelanggan.
5. **Tidak Mendukung Multi-Perangkat:** Sistem konvensional bergantung pada satu perangkat fisik tertentu, tidak fleksibel.

**Kedai Teh Raja**, sebuah kedai teh premium yang sedang berkembang, menghadapi permasalahan yang sama. Sebagai tempat pelaksanaan PKL, penulis mendapat kesempatan untuk merancang dan membangun solusi teknologi informasi yang komprehensif dan modern: sebuah **Sistem Informasi Manajemen Kedai Teh** berbasis *Progressive Web App* (PWA) dengan arsitektur *Offline-First*.

Sistem yang dikembangkan bukan sekadar aplikasi kasir biasa, melainkan platform terintegrasi yang menggabungkan:
- **POS (Point of Sale):** Antarmuka kasir yang cepat, efisien, dan responsif dengan 1.253+ baris kode.
- **KDS (Kitchen Display System):** Layar dapur yang menerima pesanan secara *real-time* via Firebase WebSocket.
- **Dashboard Admin:** Panel kontrol bisnis lengkap dengan analitik penjualan, manajemen inventori BOM, dan laporan AI.
- **Menu Interaktif:** Halaman katalog untuk pelanggan dengan fitur rekomendasi berbasis algoritma dan AI.
- **Integrasi AI (Kecerdasan Buatan):** Fitur *Voice Command POS*, *AI Smart Upsell CRM*, dan *AI Sales Forecast* menggunakan Google Gemini API.

Sistem ini dibangun dengan teknologi *full-stack* modern yang relevan dengan standar industri global: **Next.js 16** (React Framework), **TypeScript** (bahasa tipestatis), **Firebase** (Realtime Database + Authentication), dan **Zustand** (State Management global dengan persistensi IndexedDB).

### 1.2 Tujuan PKL

**Tujuan Umum:**
Mempersiapkan mahasiswa agar siap memasuki dunia kerja di bidang Teknologi Informasi dengan pengalaman praktis yang relevan dan terukur.

**Tujuan Khusus:**
1. Merancang dan membangun sistem informasi manajemen terintegrasi untuk Kedai Teh Raja menggunakan teknologi web modern.
2. Menerapkan konsep arsitektur *Offline-First* untuk memastikan sistem tetap beroperasi normal tanpa koneksi internet.
3. Mengimplementasikan sinkronisasi data *real-time* antara kasir, dapur, dan admin menggunakan Firebase Realtime Database.
4. Mengintegrasikan kecerdasan buatan (Google Gemini AI) ke dalam alur kerja kasir untuk fitur *Voice Command*, *Smart Upsell CRM*, dan *Sales Forecast*.
5. Menerapkan teknologi PWA agar sistem dapat diinstal di perangkat Android, iOS, dan Windows layaknya aplikasi *native*.
6. Mengimplementasikan *state management* global menggunakan Zustand dengan persistensi data di IndexedDB.
7. Membangun sistem manajemen inventori berbasis *Bill of Materials* (BOM) untuk pengelolaan bahan baku.
8. Mengintegrasikan fitur cetak struk via printer thermal Bluetooth menggunakan Web Bluetooth API.

### 1.3 Manfaat PKL

**Bagi Mahasiswa:**
- Mendapatkan pengalaman nyata dalam pengembangan sistem informasi skala produksi (*production-grade*).
- Meningkatkan kompetensi teknis di bidang *full-stack web development* dengan teknologi terkini (Next.js, TypeScript, Firebase, AI).
- Melatih kemampuan analisis kebutuhan, perancangan sistem, dan pengelolaan proyek perangkat lunak.
- Memahami alur kerja bisnis nyata di sektor UMKM makanan dan minuman.

**Bagi Kedai Teh Raja:**
- Mendapatkan sistem informasi manajemen modern yang meningkatkan efisiensi operasional secara signifikan.
- Meminimalisir risiko kehilangan data transaksi berkat arsitektur *Offline-First* (transaksi aman walaupun internet mati).
- Memperoleh data analitik bisnis akurat dan laporan AI untuk mendukung pengambilan keputusan strategis.
- Meningkatkan kepuasan pelanggan melalui layanan yang lebih cepat dan program loyalitas terintegrasi.
- Memungkinkan ekspansi multi-cabang di masa depan dengan arsitektur yang telah dirancang untuk itu.

**Bagi Institusi Pendidikan:**
- Menjalin kerjasama antara institusi pendidikan dan dunia industri UMKM teknologi.
- Mendapatkan umpan balik tentang relevansi kurikulum dengan kebutuhan industri nyata.

### 1.4 Ruang Lingkup

Ruang lingkup pengembangan sistem dalam PKL ini meliputi:

| No | Modul | URL | Pengguna |
|---|---|---|---|
| 1 | **Landing Page** | `/` | Publik |
| 2 | **Menu Pelanggan** | `/menu` | Pelanggan |
| 3 | **Kasir POS** | `/pos` | Kasir |
| 4 | **Kitchen Display** | `/kds` | Staf Dapur |
| 5 | **Dashboard Admin** | `/admin` | Admin/Owner |
| 6 | **API Voice POS** | `/api/ai/voice-pos` | Backend |
| 7 | **API CRM Upsell** | `/api/ai/crm-upsell` | Backend |
| 8 | **API AI Forecast** | `/api/ai/forecast` | Backend |

### 1.5 Waktu dan Tempat Pelaksanaan

| Keterangan | Detail |
|---|---|
| **Tempat PKL** | Kedai Teh Raja |
| **Alamat** | [Alamat Lengkap Kedai Teh Raja] |
| **Periode** | [Tanggal Mulai] — [Tanggal Selesai] 2026 |
| **Durasi** | ± 12 Minggu (3 Bulan) |
| **Jam Kerja PKL** | Senin – Jumat, 08.00 – 16.00 WIB |

### 1.6 Sistematika Penulisan

- **BAB I:** Latar belakang, tujuan, manfaat, ruang lingkup, dan waktu PKL.
- **BAB II:** Profil instansi PKL (sejarah, visi-misi, struktur organisasi, layanan).
- **BAB III:** Tinjauan pustaka — dasar teori semua teknologi yang digunakan.
- **BAB IV:** Analisis kebutuhan, perancangan arsitektur, database, UI/UX, dan flowchart.
- **BAB V:** Implementasi teknis setiap modul sistem secara detail.
- **BAB VI:** Metode, skenario, dan hasil pengujian sistem.
- **BAB VII:** Kesimpulan dan saran pengembangan.

---

## BAB II — PROFIL INSTANSI

### 2.1 Sejarah dan Profil Kedai Teh Raja

**Teh Raja** adalah kedai minuman teh premium yang lahir dari semangat menghadirkan pengalaman menikmati teh yang autentik namun dengan sentuhan modern. Kedai ini berdiri atas keyakinan bahwa teh — minuman yang kaya tradisi dan budaya Indonesia — layak disajikan dengan standar kualitas tertinggi kepada generasi muda yang dinamis.

Dengan tagline *"Rasa Raja, Harga Rakyat"*, Teh Raja memposisikan diri sebagai kedai teh yang menawarkan kualitas rasa kelas atas dengan harga yang tetap terjangkau. Dari bahan baku teh pilihan yang diolah dengan resep *signature* hingga penyajian estetis dan *instagrammable*, Teh Raja hadir sebagai jawaban atas kebutuhan masyarakat modern.

### 2.2 Visi dan Misi

**Visi:**
Menjadi kedai teh premium terpercaya yang dikenal atas kualitas rasa, keramahan pelayanan, dan inovasi teknologi dalam operasional bisnis UMKM kuliner Indonesia.

**Misi:**
1. Menghadirkan minuman teh berkualitas tinggi dengan bahan baku pilihan terbaik.
2. Memberikan pengalaman pelayanan yang cepat, ramah, dan memuaskan kepada setiap pelanggan.
3. Memanfaatkan teknologi informasi modern untuk meningkatkan efisiensi operasional.
4. Membangun loyalitas pelanggan jangka panjang melalui program reward dan kualitas yang konsisten.
5. Berkontribusi pada ekosistem UMKM kuliner lokal yang berdaya saing.

### 2.3 Struktur Organisasi

```text
         ┌─────────────────────┐
         │   Pemilik / Owner   │
         └──────────┬──────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
┌───────▼───────┐       ┌───────▼───────┐
│    Manajer    │       │  Keuangan &   │
│  Operasional  │       │     Admin     │
└───────┬───────┘       └───────────────┘
        │
  ┌─────┴──────────┐
  │                │
┌─▼──────────┐  ┌──▼──────────┐
│   Kasir    │  │   Barista   │
│ (Cashier)  │  │  (Kitchen)  │
└────────────┘  └─────────────┘
```

### 2.4 Produk dan Layanan

Teh Raja menawarkan lebih dari **50 varian menu** dalam 6 kategori:

| No | Kategori | Ikon | Deskripsi |
|---|---|---|---|
| 1 | **Signature** | ⭐ | Menu andalan khas Teh Raja yang tidak ditemukan di tempat lain |
| 2 | **Milk Base** | ☕ | Minuman berbasis susu segar yang creamy dan mewah |
| 3 | **Classic** | 🌿 | Teh klasik dengan cita rasa tradisional yang kaya |
| 4 | **Fruit Tea** | 🍊 | Teh buah segar dengan variasi rasa tropis yang menyegarkan |
| 5 | **Snack** | 🍪 | Camilan pendamping minuman |
| 6 | **Makanan** | 🍽️ | Menu makanan ringan sebagai pelengkap |

Setiap minuman dapat dikustomisasi dengan pilihan:
- **Ukuran:** Medium (M) / Large (L, +Rp 2.000)
- **Suhu:** Dingin (Es) / Panas
- **Level Gula:** 0% / 25% / 50% / 75% / 100%
- **Level Es:** No Ice / Less Ice / Normal / Extra Ice

---

## BAB III — TINJAUAN PUSTAKA

### 3.1 Sistem Informasi Manajemen (SIM)

Sistem Informasi Manajemen (SIM) adalah seperangkat prosedur terpadu yang mengumpulkan, memproses, menyimpan, dan mengkomunikasikan informasi untuk mendukung fungsi pengambilan keputusan dan kontrol dalam suatu organisasi (O'Brien & Marakas, 2010). Dalam konteks bisnis kuliner modern, SIM mencakup subsistem transaksi (POS), manajemen inventori, analitik penjualan, dan CRM (*Customer Relationship Management*).

### 3.2 Point of Sale (POS)

*Point of Sale* (POS) adalah sistem yang memproses transaksi penjualan di titik di mana barang atau jasa dijual kepada konsumen. Sistem POS modern tidak hanya mencatat transaksi, tetapi juga mengelola inventori, melacak pola pembelian, menghasilkan laporan penjualan, dan mendukung berbagai metode pembayaran.

Pada proyek Teh Raja, POS diimplementasikan sepenuhnya berbasis web (*web-based*), menghilangkan ketergantungan pada perangkat keras khusus yang mahal dan menggantinya dengan aplikasi web yang berjalan di tablet, komputer, atau *smartphone* biasa.

### 3.3 Progressive Web App (PWA)

*Progressive Web App* (PWA) adalah metodologi pengembangan aplikasi web yang memanfaatkan teknologi web modern untuk memberikan pengalaman pengguna setara aplikasi *native* (Google, 2018).

| Karakteristik PWA | Penjelasan |
|---|---|
| **Progressive** | Bekerja untuk semua pengguna, terlepas dari browser |
| **Responsive** | Menyesuaikan tampilan di semua ukuran layar |
| **Offline Capable** | Berfungsi tanpa internet via *Service Worker* |
| **Installable** | Dapat diinstal ke *homescreen* layaknya app *native* |
| **Linkable** | Dapat dibagikan via URL biasa |

Teknologi kunci PWA adalah **Service Worker** — skrip JavaScript yang berjalan di latar belakang browser, memungkinkan *caching* aset, notifikasi *push*, dan fungsionalitas *offline*.

### 3.4 Next.js 16

Next.js adalah *React Framework* untuk pengembangan web yang dibuat oleh Vercel. Versi 16 menghadirkan arsitektur **App Router** berbasis sistem file dengan dukungan *Server Components*, *Client Components*, dan *API Routes* dalam satu codebase.

**Keunggulan yang dimanfaatkan:**
- **App Router:** Routing otomatis berbasis struktur folder (`/app`)
- **API Routes:** Endpoint REST API *server-side* tanpa server terpisah (Serverless Functions)
- **Image Optimization:** Optimasi gambar otomatis via komponen `<Image>`
- **TypeScript Integration:** Dukungan TypeScript *out-of-the-box*

### 3.5 TypeScript

TypeScript adalah bahasa *superset* dari JavaScript yang menambahkan sistem *static typing*. Dengan TypeScript, kesalahan tipe data terdeteksi saat *compile-time*, bukan saat *runtime*. Ini meningkatkan keandalan kode dan memudahkan pemeliharaan proyek berskala besar.

Dalam proyek Teh Raja, TypeScript digunakan secara *strict* di seluruh codebase — dari definisi tipe data (`interface Order`, `interface Product`, `interface Customer`) hingga *typing* komponen React dan API Routes.

### 3.6 Firebase (Google Firebase)

Firebase adalah platform *Backend-as-a-Service* (BaaS) milik Google yang menyediakan layanan infrastruktur *cloud* siap pakai.

**Layanan Firebase yang digunakan:**

**a. Firebase Realtime Database (RTDB)**
Database NoSQL berbasis JSON yang menyinkronkan data secara *real-time* ke semua klien yang terhubung melalui protokol *WebSocket*. Ini adalah inti dari fitur sinkronisasi kasir-dapur-admin yang berjalan tanpa *refresh* halaman. Latensi rata-rata < 1 detik.

**b. Firebase Authentication**
Layanan autentikasi yang mendukung berbagai metode *sign-in*. Digunakan untuk mengamankan login kasir dan admin menggunakan email/password.

**c. Firebase Firestore**
Database NoSQL berbasis dokumen yang lebih canggih. Diinisialisasi sebagai opsi masa depan untuk data yang lebih terstruktur dan query yang lebih kompleks.

### 3.7 Zustand (State Management)

Zustand adalah *library* manajemen *state* global yang ringan untuk React. Menawarkan API simpel tanpa *boilerplate* yang berlebihan.

**Mengapa Zustand (bukan Redux atau Context API)?**

| Aspek | Context API | Redux | Zustand |
|---|---|---|---|
| Kompleksitas | Rendah | Sangat Tinggi | Rendah |
| Performa Re-render | ❌ Seluruh tree | ✅ Selective | ✅ Selective |
| Ukuran Bundle | Minimal | Besar | Sangat Kecil |
| Integrasi IndexedDB | ❌ Manual | ❌ Manual | ✅ Native Middleware |
| TypeScript Support | Terbatas | Baik | Sangat Baik |

Dalam proyek Teh Raja, Zustand dikombinasikan dengan **idb-keyval** (IndexedDB) sebagai mekanisme persistensi, memungkinkan penyimpanan ribuan transaksi secara lokal tanpa batasan kapasitas *LocalStorage*.

### 3.8 Kecerdasan Buatan (AI) — Google Gemini API

Google Gemini adalah model bahasa besar (*Large Language Model* / LLM) generasi terbaru dari Google DeepMind. Gemini memiliki kemampuan memahami dan menghasilkan teks dalam berbagai bahasa termasuk Bahasa Indonesia.

Dalam proyek ini, Gemini API (`gemini-flash-latest`) diintegrasikan melalui 3 endpoint server-side:

| Fitur AI | Endpoint | Fungsi |
|---|---|---|
| Voice Command POS | `/api/ai/voice-pos` | Mengekstrak pesanan dari transkrip suara ke format JSON |
| AI CRM Upsell | `/api/ai/crm-upsell` | Menghasilkan saran upsell personal berdasarkan profil pelanggan |
| AI Sales Forecast | `/api/ai/forecast` | Menganalisis data penjualan dan menghasilkan laporan bisnis |

### 3.9 Tailwind CSS v4

Tailwind CSS adalah *utility-first CSS framework* yang memungkinkan pembangunan antarmuka pengguna langsung di dalam markup HTML/JSX menggunakan kelas-kelas utilitas atomik. Versi 4 menawarkan performa *build time* lebih cepat melalui *engine* berbasis Rust (Lightning CSS).

### 3.10 Framer Motion

Framer Motion adalah *library* animasi produksi untuk React. Digunakan untuk mengimplementasikan animasi halus dan responsif pada komponen UI — dari transisi halaman, animasi *pop-up*, hingga *micro-animation* pada kartu produk. Semua animasi di sistem Teh Raja menggunakan Framer Motion untuk pengalaman pengguna yang *premium*.

### 3.11 Teknologi Pendukung Lainnya

| Teknologi | Versi | Fungsi |
|---|---|---|
| **Chart.js + react-chartjs-2** | ^4.5.1 | Grafik penjualan interaktif di dashboard admin |
| **jsPDF + jspdf-autotable** | ^4.1.0 | Ekspor laporan ke format PDF |
| **xlsx** | ^0.18.5 | Ekspor data ke format Excel (.xlsx) |
| **lucide-react** | ^0.563.0 | Ikon-ikon UI yang konsisten dan elegan |
| **nanoid** | ^5.1.6 | Generator ID unik yang ringan untuk setiap transaksi |
| **idb-keyval** | ^6.2.5 | Wrapper IndexedDB yang simpel untuk persistensi Zustand |
| **Web Bluetooth API** | Native | Koneksi dan cetak ke printer thermal Bluetooth |
| **Web Speech API** | Native | Perekaman suara untuk fitur Voice Command |

---

## BAB IV — ANALISIS DAN PERANCANGAN SISTEM

### 4.1 Analisis Kebutuhan

Analisis kebutuhan dilakukan melalui: wawancara langsung dengan pemilik dan staf Kedai Teh Raja, observasi alur kerja operasional harian, dan studi literatur sistem POS modern.

#### 4.1.1 Kebutuhan Fungsional

| ID | Kebutuhan Fungsional | Prioritas |
|---|---|---|
| F-01 | Sistem memproses transaksi penjualan (Tunai, QRIS, Transfer Bank) | 🔴 Kritis |
| F-02 | Sistem tetap berfungsi normal saat koneksi internet terputus | 🔴 Kritis |
| F-03 | Pesanan kasir muncul instan di layar dapur (KDS) tanpa refresh | 🔴 Kritis |
| F-04 | Admin mengelola produk (CRUD, aktif/nonaktif, stok) | 🔴 Kritis |
| F-05 | Cetak struk digital dan fisik via printer Bluetooth thermal | 🟠 Tinggi |
| F-06 | Kasir menggunakan Voice Command untuk menambah item ke keranjang | 🟠 Tinggi |
| F-07 | Sistem memberikan saran AI upsell berdasarkan profil pelanggan | 🟠 Tinggi |
| F-08 | Admin mendapat laporan analitik AI tentang performa bisnis | 🟠 Tinggi |
| F-09 | Program loyalitas pelanggan (poin dari setiap transaksi) | 🟡 Sedang |
| F-10 | Manajemen inventori bahan baku berbasis BOM (Bill of Materials) | 🟡 Sedang |
| F-11 | Fitur promo/diskon (nominal, persentase, happy hour) | 🟡 Sedang |
| F-12 | Ekspor laporan penjualan ke PDF dan Excel | 🟡 Sedang |
| F-13 | Aplikasi dapat diinstal sebagai PWA di semua perangkat | 🟢 Rendah |
| F-14 | Fitur Hold Order — tahan pesanan dan lanjutkan nanti | 🟢 Rendah |
| F-15 | Kuis rekomendasi minuman berbasis profil rasa pelanggan | 🟢 Rendah |

#### 4.1.2 Kebutuhan Non-Fungsional

| ID | Kebutuhan Non-Fungsional | Target | Status |
|---|---|---|---|
| NF-01 | **Performa:** Interaksi POS responsif, klik tombol < 100ms | < 100ms | ✅ |
| NF-02 | **Keandalan:** Data tidak hilang saat internet putus | 0% data loss | ✅ Offline-First |
| NF-03 | **Skalabilitas:** Mendukung ekspansi multi-cabang | Dirancang | ✅ |
| NF-04 | **Keamanan:** Akses dilindungi autentikasi Firebase | Firebase Auth | ✅ |
| NF-05 | **Kompatibilitas:** Berjalan di Chrome, Edge, Firefox, Android, iOS | Cross-platform | ✅ PWA |
| NF-06 | **Usability:** Kasir dapat belajar mandiri tanpa pelatihan panjang | < 1 jam | ✅ |

### 4.2 Analisis Sistem Berjalan (Sistem Lama)

Sebelum sistem baru diimplementasikan:

```text
ALUR SISTEM LAMA (Manual):
═══════════════════════════
Pelanggan ──[Baca Menu Fisik]──► Kasir ──[Catat di Buku/HP]──► Berteriak ke Dapur
                                   │                                    │
                                   │                              Dapur Membuat
                                   │                                    │
                                   ◄────── Memberi tahu jika selesai ───┘
                                   │
                              Hitung manual
                                   │
                             Terima Pembayaran
                                   │
                        Rekap manual di akhir hari

PERMASALAHAN YANG TERIDENTIFIKASI:
❌ Data mudah terlewat atau salah catat
❌ Tidak ada histori digital transaksi
❌ Tidak ada analitik bisnis untuk pengambilan keputusan
❌ Rentan kehilangan data saat aplikasi sederhana crash
❌ Tidak ada laporan real-time untuk pemilik
❌ Komunikasi kasir-dapur tidak efisien
❌ Tidak bisa memantau stok bahan baku secara akurat
```

### 4.3 Rancangan Sistem Baru

Sistem baru menggunakan **arsitektur terpusat berbasis cloud** dengan lapisan *offline-first*:

```text
ARSITEKTUR SISTEM TEH RAJA:
════════════════════════════

  [Pelanggan]     [Kasir]      [Dapur/KDS]    [Admin/Owner]
      │               │              │               │
      ▼               ▼              ▼               ▼
   [/menu]         [/pos]         [/kds]         [/admin]
   (PWA)           (PWA)          (PWA)           (PWA)
      │               │              │               │
      └───────────────┴──────────────┴───────────────┘
                              │
                    ┌─────────┴─────────┐
                    │   ZUSTAND STORE   │
                    │ (Global State +   │
                    │   IndexedDB)      │
                    └─────────┬─────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
         [ONLINE MODE]                  [OFFLINE MODE]
              │                               │
      [Firebase RTDB]              [Offline Queue Array]
      (WebSocket Sync)             (Local IndexedDB Buffer)
              │                               │
              └──────── Auto Flush ──────────┘
                     (ketika online kembali)
                              │
                    [Firebase Auth]
                    (Keamanan Login)
                              │
              ┌───────────────┼───────────────┐
              │               │               │
     [/api/ai/         [/api/ai/       [/api/ai/
      voice-pos]       crm-upsell]     forecast]
     Voice Command     AI Upsell      Laporan AI
```

### 4.4 Arsitektur Sistem (4-Layer Architecture)

#### Layer 1: Presentation Layer (Frontend)
- **Framework:** Next.js 16 dengan App Router
- **Bahasa:** TypeScript (TSX untuk komponen React)
- **Styling:** Tailwind CSS v4 + Framer Motion (animasi)
- **Komponen Reusable:** 12 komponen di folder `/components`
- **Halaman:** Landing Page, Menu, POS, KDS, Admin Dashboard

#### Layer 2: State Management Layer
- **Library:** Zustand v5
- **Persistensi:** idb-keyval (IndexedDB — tanpa batas kapasitas)

**7 Store yang Didefinisikan:**

| Store | Tanggung Jawab |
|---|---|
| `useAuthStore` | Autentikasi pengguna, manajemen akun staf |
| `useCartStore` | Keranjang belanja aktif, manajemen item |
| `useProductStore` | Katalog produk, manajemen stok, ketersediaan |
| `useSalesStore` | Riwayat transaksi, log aktivitas, manajemen shift |
| `usePromoStore` | Program promo/diskon, happy hour |
| `useCustomerStore` | Database pelanggan, poin loyalitas, CRM |
| `useInventoryStore` | Bahan baku, BOM (Bill of Materials), ambang stok |

#### Layer 3: API / Backend Layer (Serverless)
- **Platform:** Next.js API Routes (Serverless Functions via Vercel)
- **Endpoint yang Diimplementasikan:**
  - `POST /api/ai/voice-pos` — Parse suara → JSON pesanan
  - `POST /api/ai/crm-upsell` — Saran upsell berdasarkan profil pelanggan
  - `POST /api/ai/forecast` — Laporan analitik bisnis AI
  - `POST /api/payment/qris` — Integrasi gateway pembayaran QRIS

#### Layer 4: Cloud & Infrastructure Layer
- **Database:** Firebase Realtime Database (NoSQL, JSON Tree)
- **Auth:** Firebase Authentication (Email/Password)
- **Deployment:** Vercel (Serverless) atau Netlify

### 4.5 Perancangan Database

Sistem menggunakan **Firebase Realtime Database** — database NoSQL berbasis JSON Tree. Berbeda dengan database relasional, Firebase mengorganisir data menggunakan prinsip *Controlled Denormalization*.

#### 4.5.1 Struktur JSON Tree (Firebase RTDB)

```json
{
  "orders": {
    "[orderId_nanoid]": {
      "id": "abc123",
      "date": "2026-09-30T10:00:00.000Z",
      "customerName": "Budi",
      "cashierName": "Kasir Default",
      "status": "completed",
      "paymentMethod": "cash",
      "orderType": "dine-in",
      "tableNumber": "5",
      "subtotal": 30000,
      "discount": 0,
      "total": 30000,
      "cashReceived": 50000,
      "changeAmount": 20000,
      "items": [
        {
          "id": "teh-raja-signature",
          "name": "Teh Raja Signature",
          "price": 15000,
          "finalPrice": 17000,
          "quantity": 2,
          "note": "less sugar",
          "variants": {
            "size": "L",
            "temperature": "es",
            "sugar": "50%",
            "ice": "normal"
          },
          "cartItemId": "cart_xyz"
        }
      ]
    }
  },
  "logs": {
    "[logId]": {
      "id": "log_001",
      "timestamp": "2026-09-30T10:00:05.000Z",
      "action": "SALE",
      "details": "Order #abc123 - Rp 30.000 via cash",
      "user": "Kasir Default"
    }
  },
  "sessions": {
    "[sessionId]": {
      "id": "sess_001",
      "cashierName": "Kasir Default",
      "startTime": "2026-09-30T08:00:00.000Z",
      "endTime": "2026-09-30T16:00:00.000Z",
      "startingCash": 150000,
      "actualCash": 1250000,
      "totalSales": 1100000,
      "totalOrders": 45,
      "status": "closed"
    }
  }
}
```

#### 4.5.2 Proyeksi Entity Relationship Diagram (ERD) — SQL

Meskipun Firebase NoSQL digunakan, berikut ERD jika sistem bermigrasi ke PostgreSQL/MySQL:

```text
┌─────────────┐       ┌──────────────────┐       ┌─────────────┐
│    USERS    │       │     ORDERS       │       │  PRODUCTS   │
├─────────────┤       ├──────────────────┤       ├─────────────┤
│ id (PK)     │ 1..N  │ id (PK)          │       │ id (PK)     │
│ username    ├──────►│ cashier_id (FK)  │       │ name        │
│ password    │       │ customer_name    │       │ base_price  │
│ role        │       │ created_at       │  1..N │ category    │
│ name        │       │ total_amount     │◄──────┤ stock       │
└─────────────┘       │ status           │       │ is_available│
                      │ payment_method   │       └─────────────┘
                      │ order_type       │
                      │ table_number     │
                      └────────┬─────────┘
                               │ 1..N
                               ▼
                      ┌────────────────────┐
                      │    ORDER_ITEMS     │
                      ├────────────────────┤
                      │ id (PK)            │
                      │ order_id (FK)      │
                      │ product_id (FK)    │
                      │ quantity           │
                      │ final_price        │
                      │ variant_json       │
                      │ note               │
                      └────────────────────┘
```

**Penjelasan Relasi:**
1. **USERS → ORDERS (1:N):** Satu kasir mengelola banyak transaksi.
2. **ORDERS → ORDER_ITEMS (1:N):** Satu struk memuat banyak item.
3. **PRODUCTS → ORDER_ITEMS (1:N):** Satu produk dapat muncul di banyak transaksi.
4. **Snapshot Harga:** Data harga di-*snapshot* ke ORDER_ITEMS agar histori tidak berubah jika harga produk diupdate.

### 4.6 Perancangan UI/UX

**Identitas Visual (Brand Identity):**
- **Warna Primer:** `#0D2B20` (Deep Forest Green) — melambangkan teh dan alam
- **Warna Aksen:** `#F59E0B` (Amber Gold) — melambangkan kemewahan
- **Tipografi:** Font *sans-serif* modern

**Responsive Breakpoints:**
- Mobile (< 768px): Keranjang sebagai *bottom sheet drawer*
- Tablet (768px+): Layout satu panel, POS dioptimalkan untuk sentuhan
- Desktop (1024px+): Layout dua panel (katalog + keranjang) bersamaan

### 4.7 Diagram Alur (Flowchart)

#### Alur Transaksi Kasir (POS)

```text
MULAI
  │
  ▼
[Login Kasir] ─── Gagal ──→ [Error] ──→ Ulangi
  │ Berhasil
  ▼
[Buka Shift — Input Starting Cash]
  │
  ▼
[Pilih Produk dari Grid]
  │
  ▼
[VariantModal: Pilih Size, Suhu, Gula, Es]
  │
  ▼
[Tambah ke Keranjang]
  │
  ▼
[Input Nama Pelanggan (Wajib) + No. HP (Opsional)]
  │
  ├── HP dikenal ──→ [AI Upsell Suggestion muncul otomatis]
  │
  ▼
[Pilih Metode Bayar]
  ├── Tunai → [Input Cash] → [Hitung Kembalian]
  ├── QRIS  → [Generate QR] → [Konfirmasi]
  └── Transfer → [Catat Manual]
  │
  ▼
[handleCheckout()]
  ├── Buat Order Record (nanoid)
  ├── Simpan ke Zustand (lokal, SELALU)
  ├── Kurangi Stok Produk
  ├── Deduct Bahan Baku via BOM
  ├── Tambah Poin Loyalitas Pelanggan
  └── Catat Activity Log
  │
  ▼
[Tampilkan ReceiptModal]
  ├── Cetak Browser (window.print)
  └── Cetak Bluetooth Thermal (opsional)
  │
  ▼
[FirebaseSync: Upload ke Cloud jika online]
  │ (atau masuk Offline Queue jika offline)
  │
  ▼
[Reset Form] → Siap transaksi berikutnya
```

#### Alur Mekanisme Offline-First

```text
[Input Transaksi]
        │
        ▼
[Simpan ke IndexedDB] ← SELALU PERTAMA
        │
        ▼
[Cek Status Koneksi Internet]
        │
   ┌────┴─────┐
   │          │
[Online]  [Offline]
   │          │
   ▼          ▼
[Upload    [Push ke
langsung   Offline Queue
Firebase]  (Array Lokal)]
   │          │
   │     [Internet pulih?]
   │          │ Ya
   │     [Auto Flush Queue
   │      ke Firebase]
   └──────────┘
        │
        ▼
  [Data Sync ✓]
```
---

## BAB V — IMPLEMENTASI SISTEM

### 5.1 Lingkungan Pengembangan

| Komponen | Spesifikasi |
|---|---|
| **Sistem Operasi** | Windows 11 |
| **Code Editor** | Visual Studio Code + ESLint Extension |
| **Runtime** | Node.js v20.x (LTS) |
| **Package Manager** | npm v10.x |
| **Browser Dev** | Google Chrome + DevTools |
| **Version Control** | Git |
| **Deployment** | Vercel (Next.js native) / Netlify |

**Versi Dependency Utama (package.json):**
```json
{
  "next": "16.1.6",
  "react": "19.2.3",
  "typescript": "^5",
  "firebase": "^12.9.0",
  "zustand": "^5.0.11",
  "tailwindcss": "^4",
  "framer-motion": "^12.29.2",
  "chart.js": "^4.5.1",
  "jspdf": "^4.1.0",
  "xlsx": "^0.18.5",
  "nanoid": "^5.1.6",
  "idb-keyval": "^6.2.5"
}
```

### 5.2 Struktur Proyek

```text
teh-raja/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Landing Page (Beranda)
│   ├── layout.tsx                # Root Layout (FirebaseSync + PWA)
│   ├── globals.css               # Global CSS & Tailwind vars
│   ├── menu/page.tsx             # Menu Pelanggan
│   ├── pos/page.tsx              # Kasir POS (1.253 baris)
│   ├── kds/page.tsx              # Kitchen Display System
│   ├── admin/page.tsx            # Dashboard Admin (4.000+ baris)
│   └── api/
│       ├── ai/voice-pos/route.ts     # API: Voice Command AI
│       ├── ai/crm-upsell/route.ts    # API: Upsell AI
│       ├── ai/forecast/route.ts      # API: Forecast AI
│       └── payment/qris/route.ts     # API: QRIS Payment
│
├── components/                   # 12 Komponen Reusable
│   ├── CartDrawer.tsx            # Keranjang pelanggan (slide)
│   ├── ConfirmModal.tsx          # Dialog konfirmasi
│   ├── FirebaseSync.tsx          # Background cloud sync
│   ├── Navbar.tsx                # Navigasi menu
│   ├── OrderStatusOverlay.tsx    # Status pesanan real-time
│   ├── PWAInstall.tsx            # Banner install PWA
│   ├── ReceiptModal.tsx          # Modal struk transaksi
│   ├── RecommendationQuiz.tsx    # Kuis rekomendasi teh
│   ├── ReportGenerator.tsx       # Generator PDF/XLSX
│   ├── ShiftSummaryModal.tsx     # Ringkasan penutupan shift
│   ├── Toast.tsx                 # Notifikasi toast
│   └── VariantModal.tsx          # Pilihan varian minuman
│
├── lib/
│   ├── store.ts                  # Semua Zustand stores (908 baris)
│   ├── firebase.ts               # Firebase SDK init
│   ├── printer.ts                # Logika cetak thermal
│   ├── bluetoothPrint.ts         # Web Bluetooth API
│   └── recommendation.ts         # Algoritma rekomendasi
│
├── data/menu.ts                  # Master data 50+ produk
├── public/icons/                 # Ikon PWA (192x192, 512x512)
├── next.config.ts                # Next.js + PWA config
├── tsconfig.json                 # TypeScript strict mode
└── .env.local                    # Variabel lingkungan
```

### 5.3 Implementasi Frontend

#### 5.3.1 Halaman Landing Page (`/`)

Halaman beranda publik dengan animasi *auto-slider* produk unggulan berganti setiap 3.5 detik. Navigasi *fixed* dengan efek *glassmorphism*.

**Fitur Unik — Easter Egg Akses Admin:**
```typescript
// app/page.tsx — Logo harus diklik 5x untuk akses admin
onClick={() => {
    const newCount = adminClickCount + 1;
    setAdminClickCount(newCount);
    if (newCount >= 5) {
        router.push('/admin'); // Redirect ke login admin
    }
}}
```
*Alasan:* Menghindari tampilan link admin yang mencolok kepada pengguna umum.

#### 5.3.2 Halaman Menu Pelanggan (`/menu`)

Antarmuka untuk pelanggan melihat dan memesan minuman. Fitur utama:
- **Filter Kategori** — 7 tab horizontal (Semua, Signature, Milk, Classic, Fruit, Snack, Makanan)
- **Pencarian Real-time** — filter produk seiring pengguna mengetik
- **RecommendationQuiz** — kuis preferensi rasa menghasilkan rekomendasi minuman terbaik
- **VariantModal** — kustomisasi ukuran, suhu, level gula, dan es
- **CartDrawer** — panel keranjang geser dari bawah/kanan
- **OrderStatusOverlay** — monitoring status pesanan real-time (Menunggu → Diproses → Siap)

#### 5.3.3 Halaman POS Kasir (`/pos`) — Modul Terkompleks

Lebih dari **1.253 baris** kode TypeScript/TSX. Berikut implementasi fitur-fitur kuncinya:

**a. Manajemen Shift**
Kasir wajib membuka shift sebelum bisa memproses transaksi. Input *starting cash* dicatat bersama nama kasir dan waktu buka. Saat tutup, sistem otomatis hitung selisih kas.

**b. Flavor Finder — Algoritma Euclidean Distance**
```typescript
// Implementasi pencarian minuman berdasarkan jarak rasa
const flavorRecommendations = useMemo(() => {
    const scored = products.filter(p => p.stock > 0).map(p => {
        const attr = p.attributes || { sweet: 0, creamy: 0, fruity: 0 };
        const dist = Math.sqrt(
            Math.pow(attr.sweet   - flavorPref.sweet, 2) +
            Math.pow(attr.creamy  - flavorPref.creamy, 2) +
            Math.pow(attr.fruity  - flavorPref.fruity, 2)
        );
        return { id: p.id, dist };
    }).sort((a, b) => a.dist - b.dist).slice(0, 3);
    return new Set(scored.map(s => s.id));
}, [showFlavorFinder, products, flavorPref]);
```

**c. AI Upsell dengan Debounce**
```typescript
// Saran upsell dipicu 900ms setelah pelanggan dikenali + ada item di keranjang
useEffect(() => {
    if (!customer || items.length === 0) { setUpsellHint(null); return; }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
        const res = await fetch('/api/ai/crm-upsell', {
            signal: controller.signal,
            method: 'POST',
            body: JSON.stringify({ customer, orderHistory, currentCart: items, availableProducts })
        });
        const data = await res.json();
        if (data.suggestion) setUpsellHint(data.suggestion);
    }, 900); // Debounce 900ms
    return () => { clearTimeout(timer); controller.abort(); };
}, [customer?.phone, items.length]);
```

**d. Proses Checkout Lengkap**
```typescript
const handleCheckout = useCallback(() => {
    // 1. Validasi: toko buka, keranjang tidak kosong, nama pelanggan ada
    // 2. Proses poin loyalitas (redeem/tambah)
    // 3. Buat record Order dengan nanoid
    // 4. addOrder() → Simpan ke Zustand store (lokal + IndexedDB)
    // 5. decrementStock() → Kurangi stok produk
    // 6. decrementIngredientsForOrder() → BOM deduction bahan baku
    // 7. addLog() → Catat aktivitas kasir
    // 8. Tampilkan ReceiptModal (struk digital)
    // 9. Reset form untuk transaksi berikutnya
    // → FirebaseSync akan otomatis upload ke cloud di background
}, [...dependencies]);
```

**e. Hold Order System**
Kasir dapat menahan pesanan aktif dan melayani pelanggan lain. Pesanan yang di-*hold* disimpan di `heldOrders` state dengan semua item, varian, dan diskon. Tombol badge menampilkan jumlah pesanan yang ditahan.

**f. Voice Command Integration**
```typescript
const handleVoiceCommand = useCallback(() => {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'id-ID'; // Bahasa Indonesia
    recognition.onresult = async (event) => {
        const transcript = event.results[0][0].transcript;
        // Kirim ke AI API untuk di-parse
        const res = await fetch('/api/ai/voice-pos', {
            method: 'POST',
            body: JSON.stringify({ text: transcript, menu: products })
        });
        const data = await res.json();
        // Tambahkan item hasil AI ke keranjang
        data.items.forEach(item => addToCart(product, item.variants, finalPrice));
    };
    recognition.start();
}, [products, addToCart]);
```

#### 5.3.4 Kitchen Display System (`/kds`)

Layar dapur yang menampilkan antrian pesanan masuk secara *real-time*. Setiap kartu pesanan menampilkan: nama/nomor meja, daftar item dengan varian, catatan khusus, waktu pesanan, dan tombol "Selesai".

Pesanan diurutkan FIFO (First In First Out). Pesanan selesai tampil di panel terpisah selama 10 menit sebagai konfirmasi.

#### 5.3.5 Dashboard Admin (`/admin`) — Panel Terlengkap

Panel manajemen dengan 10+ tab:

| Tab | Konten |
|---|---|
| **Dashboard** | KPI harian, grafik penjualan Chart.js, produk terlaris |
| **Produk** | CRUD produk, toggle ketersediaan, kelola stok, resep BOM |
| **Transaksi** | Histori lengkap, filter status, detail pesanan, cancel/complete |
| **Inventori** | Manajemen bahan baku, threshold peringatan, auto-deduct via BOM |
| **Promo** | CRUD promo (nominal/persen/happy hour), min. pembelian |
| **Pelanggan** | Database CRM, riwayat belanja, saldo poin loyalitas |
| **Staf** | Manajemen akun kasir, tambah/edit/hapus |
| **Log Aktivitas** | Histori semua aksi sistem (login, sale, stok update) |
| **Laporan AI** | Generate laporan bisnis komprehensif via Gemini |
| **Ekspor** | Download laporan PDF (jsPDF) dan Excel (xlsx) |

### 5.4 Implementasi Backend (API Routes)

#### 5.4.1 API Voice Command POS (`/api/ai/voice-pos`)

Endpoint menerima transkrip suara → Gemini AI parsing → JSON pesanan terstruktur.

**Prompt Engineering:**
```typescript
const prompt = `
Anda adalah AI asisten kasir POS "Teh Raja".
Tugas: ekstrak pesanan dari transkrip suara ke format JSON.

Menu tersedia:
${JSON.stringify(menu.map(m => ({ id: m.id, name: m.name })))}

Transkrip: "${text}"

Output (JSON Array ONLY, no markdown):
[{ "productId": "...", "quantity": 2,
   "variants": { "size": "L", "sugar": "50%", "ice": "normal", "temperature": "es" } }]
`;
```

**Retry dengan Exponential Backoff:**
```typescript
async function callGemini(prompt: string, retries = 3): Promise<string> {
    for (let i = 0; i < retries; i++) {
        const res = await fetch(GEMINI_URL + `?key=${apiKey}`, { ... });
        if (res.ok) return data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (res.status !== 503 && res.status !== 429) throw new Error(...);
        // Backoff: 1s, 2s, 4s
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
    }
}
```

#### 5.4.2 API AI CRM Upsell (`/api/ai/crm-upsell`)

Menganalisis profil pelanggan dan menghasilkan saran *upsell* yang dipersonalisasi.

**Data dikirim ke AI:** nama pelanggan, total spending, saldo poin, 10 riwayat pesanan terakhir, isi keranjang saat ini, 8 produk tersedia.

**Contoh Output:** *"Budi biasanya suka Teh Melati — coba tawarkan Royale Milk Tea yang lagi hits! Poinnya juga hampir cukup untuk ditukar, ajak dia redeem sekarang."*

#### 5.4.3 API AI Sales Forecast (`/api/ai/forecast`)

Endpoint paling kompleks. Server-side pre-processing data sebelum dikirim ke Gemini:

1. Filter transaksi valid (exclude cancelled)
2. Hitung total revenue, jumlah order, avg order value
3. Identifikasi 5 produk terlaris (unit terjual + revenue)
4. Analisis jam puncak (*peak hour*)
5. Analisis hari paling ramai (*peak day*)
6. Breakdown metode pembayaran
7. Identifikasi produk stok rendah (< 10 unit)
8. Identifikasi bahan baku di bawah minimum (BOM)

**Struktur Laporan yang Dihasilkan:**
1. 📊 Ringkasan Performa Bisnis
2. 🏆 Analisis Produk & Popularitas
3. ⏰ Pola Waktu Penjualan
4. 💳 Analisis Metode Pembayaran
5. ⚠️ Peringatan Stok Menipis
6. 🚀 3–5 Rekomendasi Strategis Berbasis Data

### 5.5 Implementasi Database (Firebase)

#### 5.5.1 Inisialisasi — Singleton Pattern

```typescript
// lib/firebase.ts — Singleton untuk mencegah init ulang
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db   = getFirestore(app);   // Firestore (future use)
const rtdb = getDatabase(app);    // Realtime DB (sinkronisasi real-time)
const auth = getAuth(app);        // Authentication

export { db, rtdb, auth };
```

Konfigurasi Firebase dibaca dari `.env.local` — kunci API tidak hardcode di source code.

#### 5.5.2 Komponen FirebaseSync (Background Synchronizer)

Komponen tersembunyi yang dimuat di `app/layout.tsx` dan aktif di semua halaman:

```typescript
// components/FirebaseSync.tsx — inti mekanisme real-time
useEffect(() => {
    // Ambil 100 order terakhir dari Firebase
    const ordersQuery = query(ref(rtdb, 'orders'), limitToLast(100));
    const unsubscribe = onValue(ordersQuery, (snapshot) => {
        setIsConnected(true);
        const data = snapshot.val();
        if (data) {
            const loadedOrders: Order[] = Object.values(data);
            useSalesStore.getState().mergeOrders(loadedOrders);
        }
    }, (error) => {
        setIsConnected(false);
        // Aktivasi offline mode
    });
    return () => unsubscribe(); // Cleanup saat komponen unmount
}, []);
```

**Tanggung Jawab FirebaseSync:**
- Memantau status koneksi internet (`.info/connected` node Firebase)
- Sinkronisasi order dari cloud ke Zustand store lokal
- Upload offline queue saat koneksi pulih
- Audio *chime* saat pesanan baru masuk (untuk admin/KDS)
- Audio *ding* saat status pesanan berubah (untuk pelanggan)
- Browser Push Notification untuk pesanan baru

### 5.6 Implementasi PWA

Menggunakan `@ducanh2912/next-pwa` yang terintegrasi dengan Next.js:

```typescript
// next.config.ts — Konfigurasi PWA
import withPWA from '@ducanh2912/next-pwa';
export default withPWA({
    dest: 'public',
    cacheOnFrontEndNav: true,
    aggressiveFrontEndNavCaching: true,
})(nextConfig);
```

**Web App Manifest:** Nama "Teh Raja POS", tema `#0D2B20`, mode `standalone`, ikon 192x192 & 512x512.

**Service Worker Strategies:**
- *Cache First*: Aset statis (JS, CSS, gambar) — sangat cepat saat offline
- *Network First*: Data dinamis (API calls) — selalu coba internet dulu

### 5.7 Implementasi Zustand Stores

Seluruh 7 stores didefinisikan di `lib/store.ts` (908 baris) dengan pola yang konsisten:

```typescript
// Contoh: useAuthStore dengan persistensi IndexedDB
export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            users: [/* default users */],
            loginWithPassword: async (username, password) => {
                const found = get().users.find(u =>
                    u.username === username && u.password === password
                );
                if (found) {
                    await signInWithEmailAndPassword(auth, email, safePassword);
                    set({ user: found });
                    return found;
                }
                return null;
            },
            logout: async () => {
                await signOut(auth);
                set({ user: null });
            },
        }),
        {
            name: 'teh-raja-auth',
            storage: createJSONStorage(() => idbStorage) // IndexedDB!
        }
    )
);
```
---

## BAB VI — PENGUJIAN SISTEM

### 6.1 Metode Pengujian

Pengujian menggunakan kombinasi metode:
1. **Black-Box Testing:** Menguji fungsionalitas dari perspektif pengguna.
2. **Stress Testing (Offline Mode):** Putus koneksi internet manual, verifikasi sistem tetap jalan.
3. **Cross-Browser Testing:** Chrome, Edge, Firefox, Chrome Android, Safari iOS.
4. **User Acceptance Testing (UAT):** Pengujian langsung oleh kasir dan pemilik Kedai Teh Raja.

### 6.2 Hasil Pengujian Black-Box

#### Modul Autentikasi

| No | Skenario Uji | Input | Expected | Status |
|---|---|---|---|---|
| 1 | Login admin — kredensial valid | `admin` / `123` | Masuk dashboard admin | ✅ PASS |
| 2 | Login kasir — kredensial valid | `kasir` / `123` | Masuk halaman POS | ✅ PASS |
| 3 | Login password salah | `admin` / `abc` | Error "Username atau password salah" | ✅ PASS |
| 4 | Akses POS tanpa login | URL: `/pos` | Redirect ke `/admin` | ✅ PASS |

#### Modul POS (Point of Sale)

| No | Skenario Uji | Input | Expected | Status |
|---|---|---|---|---|
| 5 | Buka shift kasir | Starting Cash: Rp 150.000 | Shift tercatat, tombol "Tutup Toko" muncul | ✅ PASS |
| 6 | Tambah produk ke keranjang | Klik produk → pilih varian | Item muncul di panel keranjang dengan label varian lengkap | ✅ PASS |
| 7 | Update jumlah item | Tombol +/- | Jumlah dan total harga ter-update real-time | ✅ PASS |
| 8 | Hapus item dari keranjang | Ikon 🗑️ | Item hilang dari keranjang | ✅ PASS |
| 9 | Checkout — bayar tunai | Cash: Rp 30.000, Total: Rp 25.000 | Kembalian Rp 5.000 benar, struk muncul | ✅ PASS |
| 10 | Checkout — uang kurang | Cash: Rp 20.000, Total: Rp 25.000 | Tombol disabled, pesan "Uang kurang Rp 5.000" | ✅ PASS |
| 11 | Aplikasi diskon persentase | Diskon 10%, Total Rp 30.000 | Diskon Rp 3.000, total Rp 27.000 | ✅ PASS |
| 12 | Hold & resume order | Hold pesanan A → buat B → resume A | Pesanan A kembali dengan semua item | ✅ PASS |
| 13 | Tutup shift kasir | Actual Cash: Rp 500.000 | Ringkasan shift muncul, selisih kas ditampilkan | ✅ PASS |

#### Modul Offline-First

| No | Skenario Uji | Expected | Status |
|---|---|---|---|
| 14 | Putus internet → transaksi tetap bisa diproses | Masuk offline queue, transaksi berhasil | ✅ PASS |
| 15 | Internet kembali → data tersinkronisasi | Offline queue di-flush otomatis ke Firebase | ✅ PASS |
| 16 | Reload halaman saat offline | Semua data dari IndexedDB tetap tersedia | ✅ PASS |
| 17 | Indikator status koneksi | Indikator merah/hijau berubah real-time | ✅ PASS |

#### Modul Real-time Synchronization

| No | Skenario Uji | Expected | Status |
|---|---|---|---|
| 18 | Kasir checkout → muncul di KDS | Pesanan tampil di `/kds` dalam < 2 detik | ✅ PASS |
| 19 | Suara alert admin | Chime berbunyi saat ada pesanan baru | ✅ PASS |
| 20 | Update status di KDS → terefleksi di admin | Status berubah real-time | ✅ PASS |

#### Modul AI Features

| No | Skenario Uji | Input | Expected | Status |
|---|---|---|---|---|
| 21 | Voice Command — pesanan sederhana | "satu teh raja signature" | 1x Teh Raja Signature di keranjang | ✅ PASS |
| 22 | Voice Command — pesanan dengan varian | "dua matcha latte besar gula sedikit" | 2x Matcha Latte (L, Sugar 50%) | ✅ PASS |
| 23 | AI Upsell — pelanggan dikenal | Input nomor HP pelanggan lama | Saran personal muncul < 3 detik | ✅ PASS |
| 24 | AI Forecast — generate laporan | Klik "Generate Laporan AI" | Laporan 6 bagian komprehensif tampil | ✅ PASS |

#### Modul Admin Dashboard

| No | Skenario Uji | Expected | Status |
|---|---|---|---|
| 25 | Tambah produk baru | Produk muncul di katalog POS dan menu | ✅ PASS |
| 26 | Nonaktifkan produk | Produk tidak tampil di POS, label "Habis" di menu | ✅ PASS |
| 27 | Update stok bahan baku | Stok terbarui, peringatan muncul jika < minimum | ✅ PASS |
| 28 | Ekspor laporan PDF | File PDF berhasil terunduh dengan data benar | ✅ PASS |
| 29 | Ekspor laporan Excel | File .xlsx berhasil terunduh | ✅ PASS |

### 6.3 Rekap Hasil Pengujian

| Kategori | Jumlah Skenario | PASS | FAIL | Pass Rate |
|---|---|---|---|---|
| Autentikasi | 4 | 4 | 0 | 100% |
| POS (Point of Sale) | 9 | 9 | 0 | 100% |
| Offline-First | 4 | 4 | 0 | 100% |
| Real-time Sync | 3 | 3 | 0 | 100% |
| Fitur AI | 4 | 4 | 0 | 100% |
| Admin Dashboard | 5 | 5 | 0 | 100% |
| **TOTAL** | **29** | **29** | **0** | **100%** |

### 6.4 Analisis Kinerja Sistem

| Metrik | Hasil Pengukuran |
|---|---|
| **Latensi Sinkronisasi Real-time** | < 1.5 detik (via WebSocket Firebase) |
| **Latensi Offline Mode** | ~0ms (data dari IndexedDB lokal) |
| **Sinkronisasi setelah Offline Recovery** | < 5 detik setelah koneksi pulih |
| **Waktu Respons Voice Command AI** | 1.5 – 4 detik |
| **Waktu Respons AI Upsell** | 0.8 – 2 detik (+ debounce 900ms) |
| **Waktu Respons AI Forecast** | 3 – 7 detik (dataset 50+ transaksi) |
| **Data Loss saat Offline** | 0% (0 dari 20 siklus tes) |
| **Kompatibilitas Browser** | Chrome ✅ Edge ✅ Firefox ✅ Android ✅ iOS ✅ |

---

## BAB VII — PENUTUP

### 7.1 Kesimpulan

Berdasarkan hasil pengembangan dan pengujian selama Praktik Kerja Lapangan di Kedai Teh Raja, dapat disimpulkan:

1. **Sistem Berhasil Dibangun dan Berfungsi Penuh:** Platform Teh Raja POS berhasil dikembangkan menggunakan *tech stack* modern (Next.js 16, TypeScript, Firebase, Zustand) dengan cakupan fitur komprehensif — POS, KDS, Admin Dashboard, dan Menu Pelanggan. Seluruh 29 skenario pengujian berhasil dilewati dengan *pass rate* 100%.

2. **Arsitektur Offline-First Terbukti Andal:** Mekanisme *Offline-First* menggunakan Zustand + IndexedDB + Firebase Offline Queue mempertahankan operasional transaksi kasir tanpa gangguan saat internet terputus, dan berhasil menyinkronkan semua data tertunda ketika koneksi pulih, dengan 0% kehilangan data dalam 20 siklus pengujian.

3. **Sinkronisasi Real-time Berhasil:** Firebase Realtime Database berhasil menghubungkan kasir, dapur (KDS), dan admin secara *real-time* dengan latensi rata-rata < 1.5 detik, mengeliminasi kebutuhan komunikasi manual antara kasir dan dapur.

4. **Integrasi AI Memberikan Nilai Tambah Nyata:** Tiga fitur AI (Voice Command POS, AI CRM Upsell, AI Sales Forecast) berhasil meningkatkan efisiensi operasional kasir dan menyediakan *business intelligence* yang bernilai bagi pemilik kedai.

5. **PWA Meningkatkan Aksesibilitas:** Implementasi PWA memungkinkan sistem diakses dan diinstal di berbagai perangkat tanpa biaya pengembangan aplikasi mobile terpisah.

6. **Seluruh Tujuan PKL Tercapai:** Semua tujuan spesifik — arsitektur *offline-first*, sinkronisasi *real-time*, integrasi AI, PWA, manajemen inventori BOM, dan program loyalitas pelanggan — berhasil diimplementasikan dan diuji.

### 7.2 Saran

**Saran Teknis untuk Pengembangan Lanjutan:**

1. **Generator & Cetak Standing QR Meja (O2O Dine-In):** Otomatisasi generate dan cetak kartu QR meja akrilik untuk pemesanan mandiri pelanggan tanpa antre di kasir.
2. **Visual Table Management (Denah Meja POS):** Monitoring denah meja real-time di POS (meja kosong, antrean bayar, sedang diracik).
3. **Split Tiket Dapur / Barista Cup Slip:** Cetak slip stiker cup minuman khusus barista tanpa rincian nominal harga untuk mempermudah penyiapan pesanan.
4. **Web Audio Chime Offline:** Menggunakan Web Audio API Synthesizer agar lonceng nada ganda pesanan dapur tetap berbunyi tanpa kuota internet.
5. **Fast Keyboard Shortcuts Kasir:** Transaksi kilat dengan hotkey keyboard (`/`, `F1-F4`, `Space`) saat jam sibuk (*rush hour*).
6. **Payment Gateway Produksi & Multi-Cabang Cloud:** Mengintegrasikan API resmi berlisensi Bank Indonesia (Midtrans/Xendit) untuk verifikasi otomatis QRIS dinamis serta aktivasi cabang lintas kota via schema `branchId`.
7. **Migrasi ke PostgreSQL untuk Analitik Lintas-Tahun:** Menambahkan PostgreSQL/Supabase sebagai data warehouse untuk analitik multi-periode yang kompleks.

**Saran Non-Teknis:**

1. **Pelatihan Staf:** Membuat modul pelatihan video untuk kasir agar dapat memanfaatkan semua fitur secara maksimal.
2. **Backup Berkala:** Jadwalkan ekspor data penjualan ke Excel/PDF setiap minggu sebagai arsip eksternal.
3. **Evaluasi AI Forecast:** Lakukan evaluasi bulanan terhadap rekomendasi AI dan implementasikan saran strategis yang relevan.

---

## DAFTAR PUSTAKA

1. Google. (2018). *Progressive Web Apps*. https://web.dev/progressive-web-apps/
2. Vercel. (2024). *Next.js 16 Documentation*. https://nextjs.org/docs
3. Google Firebase. (2024). *Firebase Realtime Database Documentation*. https://firebase.google.com/docs/database
4. Google DeepMind. (2024). *Gemini API Documentation*. https://ai.google.dev/docs
5. Zustand Team. (2024). *Zustand — State Management for React*. https://zustand-demo.pmnd.rs/
6. O'Brien, J. A., & Marakas, G. M. (2010). *Management Information Systems* (10th ed.). McGraw-Hill/Irwin.
7. Sommerville, I. (2016). *Software Engineering* (10th ed.). Pearson Education.
8. React Team. (2024). *React Documentation — Hooks*. https://react.dev
9. TypeScript Team. (2024). *TypeScript Handbook*. https://www.typescriptlang.org/docs/
10. Tailwind Labs. (2024). *Tailwind CSS v4 Documentation*. https://tailwindcss.com/docs
11. Framer. (2024). *Framer Motion Documentation*. https://www.framer.com/motion/
12. MDN Web Docs. (2024). *Web Bluetooth API*. https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API
13. MDN Web Docs. (2024). *Web Speech API*. https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API
14. MDN Web Docs. (2024). *IndexedDB API*. https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API

---

## LAMPIRAN

### Lampiran A — Tech Stack Overview

```text
┌─────────────────────────────────────────────────────────────┐
│              SISTEM TEH RAJA — TECH STACK OVERVIEW           │
├────────────────┬────────────────────────────────────────────┤
│ LAYER          │ TEKNOLOGI                                   │
├────────────────┼────────────────────────────────────────────┤
│ Frontend       │ Next.js 16 + React 19 + TypeScript 5       │
│ Styling        │ Tailwind CSS v4 + Framer Motion            │
│ State          │ Zustand v5 + idb-keyval (IndexedDB)        │
│ Icons          │ Lucide React                               │
│ Charts         │ Chart.js v4 + react-chartjs-2             │
│ ID Generator   │ nanoid v5                                  │
│ PDF Export     │ jsPDF v4 + jsPDF-AutoTable                 │
│ Excel Export   │ xlsx v0.18                                 │
│ Print          │ Web Print API + Web Bluetooth API          │
├────────────────┼────────────────────────────────────────────┤
│ Backend        │ Next.js API Routes (Serverless Functions)  │
│ AI Provider    │ Google Gemini Flash Latest                  │
│ Database       │ Firebase Realtime Database (NoSQL)         │
│ Auth           │ Firebase Authentication                    │
│ PWA            │ @ducanh2912/next-pwa + Service Worker      │
├────────────────┼────────────────────────────────────────────┤
│ DevOps         │ Git + Vercel/Netlify (Auto Deploy CI/CD)   │
│ Dev Tools      │ ESLint + TypeScript Strict Mode            │
└────────────────┴────────────────────────────────────────────┘
```

### Lampiran B — Konfigurasi Environment Variables

```env
# ====== FIREBASE CONFIG (Frontend - PUBLIC) ======
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=teh-raja.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=teh-raja
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=teh-raja.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123:web:abc
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXX
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://teh-raja-default-rtdb.firebaseio.com

# ====== AI CONFIG (Server-Side ONLY - PRIVATE) ======
GEMINI_API_KEY=AIza...
```

> **⚠️ Catatan Keamanan:** `GEMINI_API_KEY` tanpa prefix `NEXT_PUBLIC_` → HANYA tersedia di server (API Routes), TIDAK terekspos ke browser pengguna. Ini penting untuk mencegah penyalahgunaan API key.

### Lampiran C — Panduan Instalasi dan Menjalankan Sistem

**Prasyarat:**
- Node.js v20+ (Download: https://nodejs.org)
- Akun Google Firebase (https://console.firebase.google.com)
- Akun Google AI Studio untuk Gemini API Key (https://aistudio.google.com/app/apikey)

**Langkah Instalasi:**
```bash
# 1. Clone repositori
git clone https://github.com/[username]/teh-raja.git
cd teh-raja

# 2. Install semua dependensi
npm install

# 3. Buat file konfigurasi
cp .env.example .env.local
# Edit .env.local dan isi dengan kredensial Firebase & Gemini Anda

# 4. Jalankan server development
npm run dev

# 5. Buka di browser:
# Beranda:  http://localhost:3000
# Menu:     http://localhost:3000/menu
# Kasir:    http://localhost:3000/pos
# Dapur:    http://localhost:3000/kds
# Admin:    http://localhost:3000/admin
```

**Akun Login Default:**
```text
Admin:  username=admin  | password=123
Kasir:  username=kasir  | password=123
```

### Lampiran D — Panduan Penggunaan Singkat

**Untuk Kasir:**
1. Login di `/pos` dengan akun kasir
2. Klik "Buka Shift Sekarang" → input modal awal
3. Klik produk → pilih varian → tambah ke keranjang
4. Isi nama pelanggan (wajib) dan HP (opsional untuk poin)
5. Pilih metode bayar → checkout
6. Tutup shift → input kas aktual di akhir kerja

**Untuk Admin/Pemilik:**
1. Klik logo Teh Raja 5x di beranda → login admin
2. Gunakan tab navigasi di dashboard untuk setiap modul
3. "Laporan AI" → Generate untuk analitik bisnis berbasis AI
4. "Ekspor" → Download PDF atau Excel

**Untuk Pelanggan:**
1. Buka `/menu` di browser atau dari PWA
2. Pilih minuman → kustomisasi → tambah ke keranjang
3. Konfirmasi pesanan → pantau status real-time

### Lampiran E — Daftar Komponen dan Fungsinya

| Komponen | File | Fungsi |
|---|---|---|
| CartDrawer | `CartDrawer.tsx` | Drawer keranjang belanja slide (menu pelanggan) |
| ConfirmModal | `ConfirmModal.tsx` | Dialog konfirmasi aksi destruktif |
| FirebaseSync | `FirebaseSync.tsx` | Background cloud sync + audio alert + push notification |
| Navbar | `Navbar.tsx` | Bar navigasi atas (halaman menu) |
| OrderStatusOverlay | `OrderStatusOverlay.tsx` | Overlay status pesanan real-time (pelanggan) |
| PWAInstall | `PWAInstall.tsx` | Banner prompt instalasi PWA |
| ReceiptModal | `ReceiptModal.tsx` | Struk digital (print browser + share WhatsApp) |
| RecommendationQuiz | `RecommendationQuiz.tsx` | Kuis rekomendasi minuman berdasarkan profil rasa |
| ReportGenerator | `ReportGenerator.tsx` | Trigger download PDF dan Excel |
| ShiftSummaryModal | `ShiftSummaryModal.tsx` | Ringkasan shift saat kasir tutup toko |
| Toast | `Toast.tsx` | Notifikasi toast (sukses/error/warning/info) |
| VariantModal | `VariantModal.tsx` | Modal kustomisasi minuman (ukuran, suhu, gula, es) |

### Lampiran F — Jadwal Aktivitas PKL Mingguan

| Minggu | Periode | Kegiatan Utama |
|---|---|---|
| 1 | [Tgl] | Orientasi, perkenalan tim, analisis kebutuhan, studi literatur teknologi |
| 2 | [Tgl] | Perancangan arsitektur, setup proyek Next.js, konfigurasi Firebase |
| 3 | [Tgl] | Implementasi autentikasi Firebase, Landing Page, dan halaman Menu |
| 4 | [Tgl] | Implementasi halaman POS (katalog produk, keranjang, checkout) |
| 5 | [Tgl] | Implementasi Firebase Realtime Sync, KDS, mekanisme Offline-First |
| 6 | [Tgl] | Implementasi Dashboard Admin (produk, transaksi, laporan) |
| 7 | [Tgl] | Implementasi 3 fitur AI (Voice Command, CRM Upsell, Sales Forecast) |
| 8 | [Tgl] | Implementasi inventori BOM, promo engine, program loyalitas pelanggan |
| 9 | [Tgl] | Implementasi PWA, ekspor PDF/Excel, printer Bluetooth, UI/UX polishing |
| 10 | [Tgl] | Pengujian menyeluruh (Black-Box + UAT), perbaikan bug, dokumentasi |
| 11 | [Tgl] | Deployment ke Vercel/Netlify, pelatihan staf, penyusunan laporan |
| 12 | [Tgl] | Finalisasi laporan, persiapan sidang PKL, presentasi hasil |

### Lampiran G — Catatan untuk Sidang PKL

> Pastikan Anda memahami dengan baik poin-poin berikut sebelum sidang:

**1. Mengapa Firebase RTDB bukan MySQL/PostgreSQL?**
*"Kebutuhan real-time yang sangat kritis — ketika kasir checkout, pesanan harus muncul di dapur dalam hitungan detik. Firebase RTDB menggunakan protokol WebSocket yang secara native memang didesain untuk live-sync ini. MySQL/PostgreSQL harus polling berkala yang tidak efisien untuk use case ini."*

**2. Mengapa Zustand bukan Redux atau Context API?**
*"React Context API memiliki kelemahan fundamental: setiap state berubah, SELURUH komponen di dalamnya re-render. Di POS dengan ratusan produk, ini menyebabkan UI lag. Zustand menyelesaikan ini dengan selective re-rendering. Redux terlalu kompleks dan berat untuk kebutuhan ini."*

**3. Apa itu Offline-First dan bagaimana cara kerjanya?**
*"Transaksi SELALU disimpan ke IndexedDB lokal browser terlebih dahulu — ini yang disebut Offline-First. Firebase hanya digunakan untuk sinkronisasi cloud. Jika internet mati, kasir tetap bisa beroperasi. Saat internet kembali, FirebaseSync.tsx otomatis flush data dari offline queue ke Firebase."*

**4. Bagaimana AI terintegrasi ke dalam sistem?**
*"Semua AI diimplementasikan di server-side via Next.js API Routes (/api/ai/*) — bukan di browser. Ini penting untuk keamanan API key. Saat kasir bicara, Web Speech API mentranskripsi → dikirim ke /api/ai/voice-pos → server memanggil Gemini API → respons JSON pesanan dikembalikan ke klien."*

**5. Apa bedanya PWA dengan website biasa?**
*"PWA memiliki dua komponen tambahan: Service Worker (skrip background yang menangani caching dan offline) dan Web App Manifest (file JSON yang mendefinisikan nama, ikon, dan mode tampilan app). Kombinasinya memungkinkan website diinstal di homescreen layaknya app native, tanpa harus publish ke App Store/Play Store."*

---

*Laporan Praktik Kerja Lapangan ini dibuat dengan sebenarnya dan dapat dipertanggungjawabkan.*

**[Nama Mahasiswa]** | *NIM: [NIM]* | *Prodi Teknik Informatika — [Nama Institusi] — 2026*
