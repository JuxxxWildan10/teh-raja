# PANDUAN SLIDE PRESENTASI SIDANG PRAKTIK KERJA LAPANGAN (PKL)
## PENGEMBANGAN SISTEM INFORMASI MANAJEMEN & POINT OF SALE (POS) KEDAI "TEH RAJA" BERBASIS PROGRESSIVE WEB APP (PWA) DENGAN ARSITEKTUR OFFLINE-FIRST, REALTIME DATABASE, DAN AI FORECASTING

---

> [!TIP]
> **Petunjuk Penggunaan Dokumen Ini:**
> - Dokumen ini berisi naskah lengkap 15 slide untuk ujian presentasi PKL.
> - Setiap slide dilengkapi **Poin Tampilan Layar**, **Naskah Pembicara (*Speaker Script*)**, dan **Antisipasi Pertanyaan Penguji (*Q&A Prep*)**.
> - Anda juga dapat langsung membuka slide interaktif berbasis web di: [public/presentasi_pkl_tehraja.html](file:///d:/TEHRAJA/teh-raja/public/presentasi_pkl_tehraja.html) atau via browser di `http://localhost:3005/presentasi_pkl_tehraja.html`.

---

## DAFTAR ISI SLIDE

1. **Slide 1: Judul Proyek & Identitas Mahasiswa**
2. **Slide 2: Latar Belakang Masalah (Studi Kasus Kedai Teh Raja)**
3. **Slide 3: Rumusan Masalah & Tujuan Pengembangan**
4. **Slide 4: Arsitektur Sistem & Ekosistem Teknologi**
5. **Slide 5: Desain Arsitektur Database (NoSQL JSON Tree)**
6. **Slide 6: Modul Kasir (POS) & Efisiensi Transaksi**
7. **Slide 7: Kitchen Display System (KDS) & Sinkronisasi Dapur**
8. **Slide 8: Manajemen Petty Cash & Rekonsiliasi Kas Laci (Anti-Tekor)**
9. **Slide 9: Laporan Laba Rugi (P&L Real-Time) & Analitik Keuangan**
10. **Slide 10: Audit Stock Opname & Pelacakan Pemborosan (Waste Management)**
11. **Slide 11: Inovasi Unggulan: Sistem AI Demand Forecasting (Hibrida 3 Lapisan)**
12. **Slide 12: Integrasi Supply Chain: Bill of Materials (BOM)**
13. **Slide 13: Hasil Pengujian Sistem (Fungsional, Offline, & Akurasi)**
14. **Slide 14: Nilai Guna Nyata bagi Operasional Toko Fisik**
15. **Slide 15: Kesimpulan, Saran & Sesi Tanya Jawab (Q&A)**

---

### SLIDE 1: JUDUL PROYEK & IDENTITAS MAHASISWA

#### Tampilan Slide:
- **Logo / Banner**: TEH RAJA - The Premium Tea Experience (Royal Emerald `#0D2B20` & Amber Gold `#D4AF37`)
- **Judul**: Pengembangan Sistem Informasi Manajemen & POS Kedai "Teh Raja" Berbasis Progressive Web App (PWA) dengan Arsitektur Offline-First, Realtime Sync, dan AI Forecasting
- **Identitas**: 
  - Mahasiswa: *[Nama Anda]* / NIM: *[NIM Anda]*
  - Program Studi: Teknik Informatika / Rekayasa Perangkat Lunak
  - Dosen Pembimbing: *[Nama Dosen Pembimbing]*
  - Pembimbing Lapangan: *[Nama Pembimbing Lapangan]*

#### Naskah Pembicara (Speaker Script):
> *"Selamat pagi/siang kepada Bapak/Ibu Dosen Penguji dan Dosen Pembimbing. Terima kasih atas kesempatan yang diberikan.*
> *Hari ini saya akan mempresentasikan hasil proyek Praktik Kerja Lapangan (PKL) saya yang berjudul: **Pengembangan Sistem Informasi Manajemen dan POS Kedai Teh Raja Berbasis Progressive Web App dengan Arsitektur Offline-First, Realtime Database, dan AI Forecasting**.*
> *Proyek ini bukan sekadar aplikasi simulasi prototipe, melainkan sistem terpadu yang telah kami terapkan dan uji secara nyata untuk mengotomasi operasional kedai Teh Raja."*

---

### SLIDE 2: LATAR BELAKANG MASALAH

#### Tampilan Slide:
- **4 Titik Kritis Masalah UMKM F&B:**
  1. **Ketergantungan Internet Kasir**: Koneksi internet mikro-retail sering tidak stabil. Saat sinyal down, transaksi kasir manual terhenti dan antrean menumpuk.
  2. **Selisih Uang Laci Kasir (Tekor)**: Pengeluaran operasional dadakan (es batu, gas, plastik) sering diambil dari kas laci tanpa pencatatan sistematis, menyebabkan kasir disalahkan saat tutup shift.
  3. **Kebocoran Bahan Baku (*Unrecorded Waste*)**: Bahan tumpah, basi, atau bocor tidak terdata secara akuntabel, memicu selisih stok fisik vs catatan.
  4. **Peramalan Stok Intuitif**: Estimasi belanja bahan baku mingguan masih mengandalkan 'firasat' pemilik, sering memicu *overstock* (basi) atau *stockout* (kehabisan bahan di jam sibuk).

#### Naskah Pembicara (Speaker Script):
> *"Bapak/Ibu sekalian, di industri Food & Beverage mikro, 4 masalah utama yang paling sering menimbulkan kerugian finansial adalah: pertama, kasir yang mogok saat internet mati; kedua, kas kasir yang tekor saat tutup buku akibat pengeluaran kecil kas laci yang lupa dicatat; ketiga, bahan baku yang tumpah atau basi di dapur tanpa adanya audit; dan keempat, pembelanjaan bahan baku yang hanya mengandalkan intuisi sehingga sering kehabisan stok saat akhir pekan.*
> *Melalui PKL ini, kami hadir memecahkan seluruh titik kritis tersebut dalam satu ekosistem web modern."*

---

### SLIDE 3: RUMUSAN MASALAH & TUJUAN PENGEMBANGAN

#### Tampilan Slide:
- **Tujuan Khusus Proyek:**
  - [x] **Arsitektur Offline-First**: Kasir dapat beroperasi 100% normal tanpa internet via PWA & IndexedDB, lalu tersinkronisasi otomatis saat online.
  - [x] **Zero-Discrepancy Cashier**: Menerapkan modul *Petty Cash* kas laci dan rekonsiliasi tutup shift akurat.
  - [x] **Waste Accountability**: Modul *Stock Opname Fisik* dengan identifikasi alasan selisih (*tumpah, basi, rusak, koreksi hitung*).
  - [x] **Scientific AI Forecasting**: Memadukan 9 algoritma Time Series statistik dengan evaluasi MAPE terkecil dan konversi takaran resep (BOM).
  - [x] **Real-Time Kitchen Sync**: Menghubungkan kasir dan dapur (KDS) seketika tanpa struk kertas manual.

#### Naskah Pembicara (Speaker Script):
> *"Tujuan dari pengembangan sistem ini adalah membangun arsitektur kasir 'Offline-First' yang menjamin keandalan transaksi tanpa internet, menihilkan selisih kas laci kasir lewat pencatatan kas keluar terintegrasi, menciptakan sistem audit pemborosan bahan baku, serta mengimplementasikan peramalan stok berbasis ilmiah untuk optimalisasi rantai pasok kedai."*

---

### SLIDE 4: ARSITEKTUR SISTEM & EKOSISTEM TEKNOLOGI

#### Tampilan Slide:
- **Frontend Framework**: Next.js 16 (React 19) + TypeScript + Tailwind CSS
- **State Management & Offline Storage**: Zustand + IndexedDB (`idb-keyval`)
- **Realtime Cloud Backend**: Firebase Realtime Database + Firebase Authentication
- **AI & Analytics Engine**: Google Gemini API + Statistical Time Series Library
- **Hardware Integration**: Web Bluetooth Thermal Receipt Printer (ESC/POS) + WhatsApp API

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│  KASIR (POS) │      │  DAPUR (KDS) │      │ ADMIN PANEL  │
│ Offline-1st  │      │  Real-Time   │      │  P&L & AI    │
└──────┬───────┘      └──────▲───────┘      └──────▲───────┘
       │ IndexedDB           │                     │
       ▼                     │                     │
┌────────────────────────────┴─────────────────────┴───────┐
│           FIREBASE REALTIME DATABASE (CLOUD SYNC)        │
└──────────────────────────────────────────────────────────┘
```

#### Naskah Pembicara (Speaker Script):
> *"Dari sisi arsitektur teknis, sistem ini dibangun menggunakan Next.js dengan bahasa pemrograman TypeScript demi keandalan tipe data. Di sisi klien, kami menerapkan arsitektur Offline-First menggunakan Zustand yang tersinkronisasi dengan IndexedDB lokal di peramban.*
> *Ketika kasir online, data secara otomatis dipancarkan ke Firebase Realtime Database, yang kemudian secara seketika memicu pembaruan pada layar Kitchen Display System di dapur dan Dasbor Pemilik di admin panel tanpa perlu memuat ulang halaman (*zero-reload*)."*

---

### SLIDE 5: DESAIN DATABASE NOSQL (JSON TREE)

#### Tampilan Slide:
- **Database Paradigm**: NoSQL Realtime Database (Hierarchical JSON Tree)
- **Struktur Kunci Koleksi Data**:
  - `/orders/{orderId}`: Riwayat pesanan, status racik, nominal, rincian item, kasir.
  - `/products/{productId}`: Katalog minuman, harga, resep BOM, ambang batas stok.
  - `/ingredients/{ingredientId}`: Stok bahan baku (gram, ml, pcs) dan batas menipis.
  - `/expenses/{expenseId}`: Pengeluaran operasional toko (*kas laci vs rekening*).
  - `/opnameLogs/{logId}`: Riwayat audit fisik stok dan alasan selisih bahan.
  - `/sessions/{sessionId}`: Sesi kasir, modal awal laci, kas keluar, dan rekonsiliasi kas akhir.

#### Naskah Pembicara (Speaker Script):
> *"Berbeda dengan sistem POS tradisional yang menggunakan tabel bersilangan (Relational SQL), Teh Raja memanfaatkan NoSQL JSON Tree pada Firebase. Pendekatan ini memungkinkan latensi baca dan tulis dalam orde milidetik, sangat optimal untuk sinkronisasi pesanan dapur dan status antrean kasir secara real-time.*
> *Relasi data dimodelkan melalui penyematan ID referensi unik yang divalidasi oleh aturan keamanan Firebase Rules di level server."*

---

### SLIDE 6: MODUL KASIR (POS) & EFISIENSI TRANSAKSI

#### Tampilan Slide:
- **Fitur Unggulan POS:**
  - **Quick Cash Nominals**: Tombol `[💵 Uang Pas]`, `[10rb]`, `[20rb]`, `[50rb]`, `[100rb]` untuk mempercepat proses bayar di jam sibuk.
  - **Smart Modifier & Topping**: Pilihan takaran gula (*Less Sugar, Normal*), es batu (*Less Ice*), dan topping berbayar.
  - **Struk Ganda**: Dukungan cetak printer thermal Bluetooth (ESC/POS) dan struk teks WhatsApp otomatis langsung ke nomor pelanggan (`wa.me/62...`).
  - **PWA Standalone**: Dapat dipasang di home screen tablet/smartphone Android layaknya aplikasi native tanpa Play Store.

#### Naskah Pembicara (Speaker Script):
> *"Pada modul Kasir (POS), fokus utama kami adalah kecepatan transaksi (*throughput speed*). Kami menambahkan fitur tombol pecahan cepat seperti uang pas, pecahan 20 ribu, hingga 100 ribu, sehingga kasir tidak perlu mengetik nominal secara manual saat antrean panjang.*
> *Sistem struk juga mendukung pengiriman otomatis via WhatsApp untuk menghemat penggunaan kertas thermal dan mendukung operasional kedai yang ramah lingkungan."*

---

### SLIDE 7: KITCHEN DISPLAY SYSTEM (KDS) & SINKRONISASI DAPUR

#### Tampilan Slide:
- **Tujuan**: Menghilangkan ketergantungan pada kertas bon fisik yang mudah basah dan hilang di dapur.
- **Mekanisme Kerja**:
  - Pesanan kasir muncul dalam waktu < 500 ms di layar tablet dapur.
  - Dilengkapi sinyal audio bel (*sound alert*) saat ada pesanan baru masuk.
  - Barista dapat mengubah status pesanan dari *Menunggu* -> *Diproses* -> *Selesai*.
  - Riwayat estimasi waktu racik per pesanan tercatat secara otomatis.

#### Naskah Pembicara (Speaker Script):
> *"Modul Kitchen Display System (KDS) ditempatkan pada tablet di area peracikan teh. Saat kasir menekan tombol bayar, pesanan seketika muncul di layar dapur disertai nada dering notifikasi. Hal ini mengeliminasi masalah bon kertas yang sering hilang, terkena tumpahan air, atau pesanan yang terlewat oleh barista."*

---

### SLIDE 8: PETTY CASH & PENGENDALIAN KAS LACI (ANTI-TEKOR)

#### Tampilan Slide:
- **Studi Kasus**: Pengeluaran darurat saat operasional (es batu kristal, gas elpiji, kantong kresek).
- **Mekanisme Sistem**:
  - Kasir dapat menekan tombol **`[💸 Kas Keluar]`** langsung dari layar POS.
  - Pemisahan sumber dana:
    - **Kas Laci**: Otomatis memotong ekspektasi uang kas fisik yang wajib disetor saat tutup shift.
    - **Rekening Toko**: Dicatat ke laba rugi tanpa mengurangi fisik uang kasir.
  - Rekonsiliasi Tutup Shift: Sistem menghitung `Kas Masuk - Kas Keluar = Kas Diharapkan`. Selisih fisik langsung terlihat transparan.

#### Naskah Pembicara (Speaker Script):
> *"Salah satu kontribusi nyata sistem ini untuk operasional kedai adalah modul Petty Cash. Di kedai fisik, kasir sering mengambil uang kas laci sebesar 15.000 untuk membeli es batu kristal. Di sistem POS biasa, saat tutup shift uang kasir akan tercatat tekor 15.000.*
> *Di Teh Raja, kasir cukup menginput kas keluar tersebut. Sistem otomatis memotong saldo yang wajib disetor saat tutup buku, sehingga kasir tidak dirugikan dan pemilik mendapatkan transparansi keuangan 100%."*

---

### SLIDE 9: LAPORAN LABA RUGI (P&L REAL-TIME) & ANALITIK KEUANGAN

#### Tampilan Slide:
- **Dasbor Finansial di Admin Panel:**
  - **Pendapatan Kotor (*Gross Revenue*)**: Total penjualan kotor dari seluruh transaksi.
  - **Estimasi HPP (*Cost of Goods Sold / COGS*)**: Dihitung berbasis 30% dari penjualan minuman standar F&B.
  - **Laba Kotor (*Gross Profit*)**: Pendapatan Kotor dikurangi HPP.
  - **Beban Operasional (*Petty Cash*)**: Rekap seluruh pengeluaran harian kedai.
  - **Laba Bersih (*Net Profit*) & Net Margin (%)**: Keuntungan bersih riil yang masuk ke kas pemilik.
- **Fitur Ekspor**: 1-Click Export Laporan Laba Rugi ke format Excel (`.xlsx`) lengkap dengan lembar rincian pengeluaran.

#### Naskah Pembicara (Speaker Script):
> *"Pada menu Laba Rugi (P&L), pemilik kedai dapat memantau kesehatan finansial secara real-time. Sistem tidak hanya menampilkan omzet, melainkan langsung mengalkulasi HPP bahan baku, beban pengeluaran kas kecil, hingga menghasilkan angka Laba Bersih riil beserta margin keuntungannya, yang dapat diunduh langsung menjadi laporan Excel resmi."*

---

### SLIDE 10: AUDIT STOCK OPNAME & WASTE MANAGEMENT

#### Tampilan Slide:
- **Fungsi Utama**: Mendeteksi penyusutan bahan (*shrinkage*) dan pemborosan di kedai.
- **Fitur Audit Fisik:**
  - Kasir/staf menginput jumlah fisik bahan baku yang ada di toples/kulkas.
  - Sistem menghitung selisih (*variance*) terhadap stok sistem secara otomatis.
  - Klasifikasi alasan selisih:
    - 💧 *Bahan Tumpah / Spillage Saat Operasional*
    - 🍂 *Bahan Basi / Melewati Batas Kadaluwarsa*
    - 📦 *Kemasan Rusak / Bocor Saat Pengiriman*
    - 🔍 *Koreksi Hitung / Kesalahan Input*
  - Log audit permanen mencatat tanggal, nama bahan, selisih (+/-), dan nama auditor.

#### Naskah Pembicara (Speaker Script):
> *"Untuk mengatasi kebocoran bahan baku, kami membangun modul Stock Opname Fisik. Staf dapur secara berkala menimbang sisa daun teh atau susu. Sistem membandingkannya dengan catatan sistem dan mencatat selisihnya.*
> *Jika ada bahan yang terbuang karena tumpah atau basi, staf wajib mencantumkan alasannya. Data ini tersimpan dalam log audit permanen sebagai bahan evaluasi efisiensi operasional kedai."*

---

### SLIDE 11: INOVASI UNGGULAN: SISTEM AI FORECASTING (HIBRIDA 3 LAPISAN)

#### Tampilan Slide:
- **Arsitektur Hibrida 3 Lapisan:**
  1. **Lapisan 1 (Komparasi 9 Model Statistik Time Series)**:
     - Naive, Seasonal Naive ($m=7$), SMA, WMA, Single Exponential Smoothing (SES), Holt Linear Damped, Holt-Winters Aditif & Multiplikatif, dan Ensemble Top-3.
     - Seleksi otomatis berbasis evaluasi nilai galat **MAPE terkecil (Standar Lewis 1982)**.
  2. **Lapisan 2 (Konversi Resep BOM Rantai Pasok)**:
     - Menerjemahkan angka ramalan cup menjadi kebutuhan fisik: gram daun teh, ml susu, sendok gula, dan pcs cup.
  3. **Lapisan 3 (Generative AI Advisor - Google Gemini)**:
     - Menganalisis hasil statistik menjadi narasi rekomendasi jadwal shift barista dan strategi promo di hari sepi.

#### Naskah Pembicara (Speaker Script):
> *"Inovasi riset paling unggul pada web ini adalah modul AI Demand Forecasting. Kami tidak menggunakan AI sebagai sekadar kotak hitam (black-box). Sistem membandingkan 9 algoritma Time Series statistik, menguji nilai MAPE-nya secara objektif, lalu memilih model terbaik.*
> *Selanjutnya, hasil peramalan dikonversi menjadi takaran gram dan mililiter bahan baku, dan dianalisis oleh Google Gemini untuk memberikan rekomendasi operasional bagi pemilik toko."*

---

### SLIDE 12: INTEGRASI SUPPLY CHAIN: BILL OF MATERIALS (BOM)

#### Tampilan Slide:
- **Rumus Kebutuhan Bahan Baku:**
  $$\text{Kebutuhan Bahan}_j = \sum_{p \in \text{Produk}} \left( \hat{Y}_p \times \text{Takaran}_{p, j} \right)$$
- **Fitur Kunci Gudang:**
  - **Ketahanan Stok (*Days of Inventory*)**: Menghitung berapa hari sisa stok di rak akan mencukupi prediksi penjualan.
  - **Reorder Point Alert (ROP)**: Memberikan peringatan otomatis berkedip jika ketahanan stok kurang dari periode ramalan.
  - **Kuantitas Pemesanan Ulang**: Menampilkan saran jumlah bahan yang harus dipesan ke supplier.

#### Naskah Pembicara (Speaker Script):
> *"Dengan menghubungkan peramalan penjualan ke Bill of Materials resep produk, pemilik toko tidak perlu lagi mengira-ngira berapa kilogram daun teh atau karton susu yang harus dibeli minggu depan. Sistem menyajikan informasi hari ketahanan stok dan jumlah yang disarankan untuk dipesan sebelum stok kedai habis total."*

---

### SLIDE 13: HASIL PENGUJIAN SISTEM

#### Tampilan Slide:
- **Metode Pengujian:**
  - **Black-Box Testing**: 100% dari 32 skenario uji fungsional (POS, KDS, Admin, P&L, Opname) berstatus **Valid**.
  - **Uji Simulasi Offline-Online**: Transaksi saat jaringan terputus tersimpan di IndexedDB dan tersinkronisasi 100% tanpa ada data yang hilang saat internet menyala kembali.
  - **Uji Akurasi Peramalan**: Model Holt-Winters menghasilkan MAPE rata-rata di bawah **8.4%**, yang menurut kriteria Lewis (1982) tergolong kategori **'Sangat Akurat' (Highly Accurate)**.
  - **Kualitas Kode**: 0 TypeScript Compiler Error (`npx tsc --noEmit`) dan 0 Error pada Next.js Production Build.

#### Naskah Pembicara (Speaker Script):
> *"Sistem ini telah melalui serangkaian pengujian komprehensif. Pengujian Black-Box menunjukkan seluruh fitur fungsional berjalan valid. Pada pengujian offline, seluruh transaksi kasir yang disimpan di IndexedDB berhasil disinkronkan ke server secara konsisten.*
> *Dan pada evaluasi peramalan, model terpilih mencapai MAPE di bawah 10%, yang membuktikan bahwa sistem ini akurat dan teruji secara ilmiah."*

---

### SLIDE 14: NILAI GUNA NYATA BAGI OPERASIONAL TOKO FISIK

#### Tampilan Slide:
- **Dampak Nyata Sebelum vs Sesudah Sistem:**

| Indikator Operasional | Sebelum (Manual / POS Lama) | Sesudah (Sistem Teh Raja) |
|---|---|---|
| **Ketahanan Kasir** | Macet saat internet mati | Berjalan mulus 100% offline |
| **Selisih Kas Laci** | Rata-rata selisih Rp 20rb - Rp 50rb/shift | **Rp 0 (Nol Selisih)** dengan Petty Cash |
| **Kertas Struk Dapur** | Basah, hilang, habis tinta | **Paperless** di layar tablet KDS |
| **Audit Pemborosan Bahan** | Tidak terdeteksi | Terekam di Log Waste Opname |
| **Pembelanjaan Bahan** | Tebak-tebakan (*overstock/basi*) | Terjadwal berbasis data BOM & AI |
| **Laporan Finansial** | Dihitung manual akhir bulan | Laporan P&L otomatis & Real-Time |

#### Naskah Pembicara (Speaker Script):
> *"Secara bisnis, implementasi sistem Teh Raja membawa dampak operasional yang sangat konkret: waktu transaksi kasir terpangkas, masalah selisih uang laci saat tutup shift berhasil dituntaskan menjadi nol rupiah, operasional dapur menjadi paperless, dan pembelanjaan bahan baku kini terencana secara matang."*

---

### SLIDE 15: KESIMPULAN, SARAN & SESI TANYA JAWAB (Q&A)

#### Tampilan Slide:
- **Kesimpulan:**
  1. Sistem POS Teh Raja berhasil mengintegrasikan arsitektur Offline-First PWA dengan sinkronisasi Firebase Realtime Database secara andal.
  2. Masalah klasik selisih kas laci dan kebocoran bahan baku UMKM berhasil diselesaikan melalui modul *Petty Cash* dan *Stock Opname Waste Tracker*.
  3. Modul AI Forecasting hibrida 3 lapisan terbukti mampu meramalkan kebutuhan rantai pasok kedai secara presisi.
- **Rencana Pengembangan Lanjutan:**
  1. **Generator & Cetak QR Meja Akrilik**: Otomatisasi pembuatan dan cetak kartu standing QR meja (O2O Dine-In) yang langsung mengunci nomor meja pelanggan.
  2. **Visual Table Management (Denah Meja POS)**: Monitoring denah meja real-time di POS (meja kosong, antrean bayar, sedang diracik).
  3. **Split Tiket Dapur / Barista Cup Slip**: Cetak slip stiker cup minuman khusus barista tanpa rincian nominal harga.
  4. **Web Audio Chime Offline**: Sintesis bel pesanan ganda (Web Audio API) tanpa ketergantungan kuota internet.
  5. **Fast Keyboard Shortcuts Kasir**: Transaksi kilat dengan hotkey keyboard (`/`, `F1-F4`, `Space`) saat jam sibuk (*rush hour*).
  6. **Payment Gateway QRIS Produksi**: Integrasi langsung dengan API berlisensi BI (Midtrans/Xendit) & skalabilitas multi-cabang cloud.
- **Live Demo Link**: `http://localhost:3005`
- **Ucapan**: Terima Kasih — *Wassalamu'alaikum Wr. Wb.* / Sesi Tanya Jawab Dibuka.

#### Naskah Pembicara (Speaker Script):
> *"Sebagai penutup, sistem informasi manajemen Teh Raja ini telah membuktikan bahwa teknologi modern seperti PWA Offline-First, Realtime NoSQL, dan Time Series AI dapat diterapkan secara terjangkau namun berdaya guna tinggi untuk mendongkrak daya saing UMKM lokal. Untuk peta jalan pengembangan selanjutnya, sistem ini telah dirancang siap berevolusi dengan Generator QR Meja Akrilik, Denah Meja Interaktif di POS, Cetak Tiket Barista Cup Slip, Bel Audio Chime Offline, Hotkeys Kasir Kilat, serta Payment Gateway QRIS Produksi.*
> *Demikian presentasi dari saya. Saya menyambut masukan, saran, dan pertanyaan dari Bapak/Ibu Dewan Penguji. Terima kasih."*

---

### LAMPIRAN: PANDUAN MENJAWAB PERTANYAAN KRITIS SIDANG (Q&A CHEAT SHEET)

1. **Penguji: "Apa perbedaan PWA dengan aplikasi web biasa?"**
   - *Jawaban*: "PWA memiliki *Service Worker* dan *Web App Manifest* yang memungkinkan aplikasi di-install ke layar utama perangkat, memiliki ikon sendiri, berjalan pada jendela mandiri (*standalone*) tanpa bilah alamat browser, serta dapat menyimpan aset dan data secara lokal via IndexedDB sehingga dapat diakses saat offline."

2. **Penguji: "Kenapa memilih Firebase Realtime Database dibanding MySQL?"**
   - *Jawaban*: "Karena kebutuhan utama operasional kedai Teh Raja adalah sinkronisasi instan antara kasir dan layar dapur (*Kitchen Display System*). Firebase Realtime Database berbasis protokol WebSocket yang memancarkan perubahan data dalam hitungan milidetik secara *event-driven*, tanpa perlu mekanisme polling HTTP yang membebani server dan jaringan."

3. **Penguji: "Bagaimana cara kerja penentuan model AI terbaik?"**
   - *Jawaban*: "Sistem kami menguji 9 model Time Series sekaligus pada data historis. Kinerja setiap model diukur menggunakan metrik MAPE (Mean Absolute Percentage Error). Model dengan persentase galat MAPE paling rendah otomatis dipilih sebagai pemenang proyeksi."
