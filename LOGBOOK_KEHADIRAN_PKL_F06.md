# FORMULIR F-06: LOGBOOK KEHADIRAN DAN KEGIATAN HARIAN PKL
## FAKULTAS ILMU KOMPUTER — UNIVERSITAS NAHDLATUL ULAMA CIREBON (TA 2026/2027)

### 1. Identitas Mahasiswa & Mitra PKL

| Komponen Identitas | Keterangan Resmi |
| :--- | :--- |
| **Nama Mahasiswa** | M. Yarzuq Wildani |
| **NIM** | `0402231058` |
| **Program Studi** | Teknik Informatika (`MTI36`) |
| **Fakultas / Universitas** | Fakultas Ilmu Komputer — Universitas Nahdlatul Ulama Cirebon |
| **Ketua Program Studi** | Teguh Arlovin, S.Kom., M.Kom. |
| **Nama Mitra PKL** | Kedai Istana Teh Raja |
| **Bidang Usaha & Unit Penempatan** | UMKM Kuliner & Minuman — Divisi Operasional |
| **Alamat Lengkap Mitra** | 2XVC+5Q3, Siandong, Kec. Larangan, Kabupaten Brebes, Jawa Tengah 52262 |
| **Pembimbing Lapangan (PL)** | Lavia Rosulia, S.H. (Kontak: `085328782341`) |
| **Periode Pelaksanaan PKL** | 9 November 2026 – 31 Desember 2026 |
| **Pola Kehadiran & Total Jam** | Paruh Waktu (6 Hari/Minggu: Senin – Sabtu) · **45 Hari Kerja Efektif / 150 Jam Kerja** *(Memenuhi Syarat Minimal 135 Jam pada F-03)* |
| **Judul Project PKL** | *Rancang Bangun Sistem Point of Sale (POS) dan Manajemen Inventori Bahan Baku Berbasis Bill of Materials (BOM) dengan Arsitektur Progressive Web App pada Kedai Teh Raja* |

---

### 2. Rekapitulasi Kehadiran Mingguan (Minggu I – VIII)

| Minggu | Rentang Tanggal | Jumlah Hari Hadir | Uraian Singkat Capaian Mingguan di Lokasi Mitra | Akumulasi Jam | Paraf PL (Lavia Rosulia, S.H.) |
| :---: | :--- | :---: | :--- | :---: | :---: |
| **I** | 9 – 14 Nov 2026 | 6 Hari (Sen–Sab) | Orientasi lingkungan kerja Kedai Istana Teh Raja, observasi alur kerja kasir merangkap *barista*, serta pengukuran takaran resep bahan baku (BOM) per *cup*. | 20 Jam | *Terverifikasi* |
| **II** | 16 – 21 Nov 2026 | 6 Hari (Sen–Sab) | Penandatanganan **Formulir F-05**, perancangan UML (*Use Case*, *Activity Diagram*, *Flowchart*), skema JSON Firebase RTDB, serta *Wireframe* UI/UX POS & BOM. | 20 Jam | *Terverifikasi* |
| **III** | 23 – 28 Nov 2026 | 6 Hari (Sen–Sab) | Inisialisasi Next.js 16 & TypeScript, implementasi `lib/store.ts` (Zustand + IndexedDB *Offline-First*), katalog menu, otentikasi staf, dan `VariantModal`. | 20 Jam | *Terverifikasi* |
| **IV** | 30 Nov – 5 Des 2026 | 6 Hari (Sen–Sab) | Implementasi mesin *Bill of Materials* (`useInventoryStore`): rumus pemotongan bahan otomatis per varian, *rollback* pembatalan, aturan kemasan kresek, dan validasi stok kritis. | 20 Jam | *Terverifikasi* |
| **V** | 7 – 12 Des 2026 | 6 Hari (Sen–Sab) | Pembangunan Terminal Kasir POS 1 layar (`/pos`), pembayaran Tunai/QRIS, Laci Antrean Racikan 3 Tab, Buka/Tutup *Shift*, Kas Kecil, dan cetak struk *Web Bluetooth* ESC/POS. | 20 Jam | *Terverifikasi* |
| **VI** | 14 – 19 Des 2026 | 6 Hari (Sen–Sab) | Pembangunan Panel Admin (`/admin`): *Dashboard* KPI, Editor Resep BOM, *Restock PO* Suplier, *Stock Opname* Fisik, Rekening Toko & Laba Rugi, serta `FirebaseSync` & PWA. | 20 Jam | *Terverifikasi* |
| **VII** | 21 – 26 Des 2026 | 5 Hari (Sen–Sab)* | Proteksi akses rahasia **Tap Logo 5x (`SecretStaffModal`)**, pengujian fungsional *Black-Box Testing* POS & BOM bersama kasir mitra, serta pelatihan staf (*User Training*). | 17 Jam | *Terverifikasi* |
| **VIII** | 28 – 31 Des 2026 | 4 Hari (Sen–Kam) | Penyusunan Buku Panduan Operasional (*User Manual*), verifikasi akhir **Formulir F-06**, evaluasi Pembimbing Lapangan, dan serah terima resmi luaran project (**F-08 & F-09**). | 13 Jam | *Terverifikasi* |
| **Total** | **9 Nov – 31 Des 2026** | **45 Hari Kerja** | **Seluruh target luaran F-05 tuntas 100% (Melampaui syarat minimum 135 jam PKL pada F-03)** | **150 Jam** | **Valid (100%)** |

*\*Catatan: Jumat, 25 Desember 2026 merupakan Hari Libur Nasional.*

---

### 3. Rincian Logbook Kehadiran dan Kegiatan Harian PKL (45 Hari Kerja / 150 Jam)

| Hari Ke | Mgg | Hari, Tanggal | Jam Hadir | Durasi | Tahapan | Uraian Kegiatan Harian & Bukti Luaran di Lokasi Mitra | Status | Paraf PL |
| :---: | :---: | :--- | :---: | :---: | :--- | :--- | :---: | :---: |
| **1** | I | Senin, 9 Nov 2026 | 09:00–13:00 | 4 Jam | Observasi & Analisis | Penerimaan resmi mahasiswa PKL oleh Pembimbing Lapangan (Ibu Lavia Rosulia, S.H.), pengenalan profil Kedai Istana Teh Raja, serta orientasi SOP operasional gerai. *(Luaran: Berita acara orientasi mitra)* | Hadir | ✓ Paraf |
| **2** | I | Selasa, 10 Nov 2026 | 09:00–12:00 | 3 Jam | Observasi & Analisis | Observasi langsung alur pelayanan staf kasir yang merangkap sebagai *barista* (*single operator*) saat melayani antrean pesanan dan peracikan minuman. *(Luaran: Catatan analisis workflow kasir-barista)* | Hadir | ✓ Paraf |
| **3** | I | Rabu, 11 Nov 2026 | 13:00–16:00 | 3 Jam | Observasi & Analisis | Mendampingi operasional jam sibuk (*rush hour*) siang-sore untuk mengidentifikasi kendala pencatatan manual kustomisasi varian minuman (ukuran *cup*, level gula, level es). *(Luaran: Daftar kendala pencatatan manual)* | Hadir | ✓ Paraf |
| **4** | I | Kamis, 12 Nov 2026 | 09:00–13:00 | 4 Jam | Observasi & Analisis | Inventarisasi seluruh daftar menu minuman Kedai Istana Teh Raja beserta harga jual ukuran Medium (`M`) dan Large (`L`) serta aturan paket *bundling*. *(Luaran: Tabel master menu & harga)* | Hadir | ✓ Paraf |
| **5** | I | Jumat, 13 Nov 2026 | 13:00–16:00 | 3 Jam | Observasi & Analisis | Pengukuran dan pencatatan takaran resep bahan baku mentah (*Bill of Materials*) per *cup* bersama *barista*: gramasi daun teh, ml gula, susu, es batu, *cup*, dan kantong kresek. *(Luaran: Dokumen standar resep BOM 9 bahan utama)* | Hadir | ✓ Paraf |
| **6** | I | Sabtu, 14 Nov 2026 | 09:00–12:00 | 3 Jam | Observasi & Analisis | Observasi proses pencatatan buku kas harian, modal awal laci kasir, pengeluaran kas kecil (*petty cash*), dan evaluasi selisih stok fisik akhir pekan. *(Luaran: Rekap masalah selisih stok & pembukuan kas)* | Hadir | ✓ Paraf |
| **7** | II | Senin, 16 Nov 2026 | 09:00–13:00 | 4 Jam | Perancangan Sistem | Diskusi perumusan solusi sistem POS & BOM bersama Pembimbing Lapangan serta penyusunan dan penandatanganan Lembar Kesepakatan Project (**Formulir F-05**). *(Luaran: Formulir F-05 disetujui PL)* | Hadir | ✓ Paraf |
| **8** | II | Selasa, 17 Nov 2026 | 09:00–12:00 | 3 Jam | Perancangan Sistem | Perancangan alur sistem (*Flowchart* POS & BOM), *Use Case Diagram*, dan *Activity Diagram* untuk aktor Kasir-Barista serta Administrator. *(Luaran: Diagram UML & Flowchart sistem)* | Hadir | ✓ Paraf |
| **9** | II | Rabu, 18 Nov 2026 | 13:00–16:00 | 3 Jam | Perancangan Sistem | Perancangan struktur basis data JSON NoSQL pada Firebase Realtime Database dan skema penyimpanan lokal IndexedDB untuk arsitektur *Offline-First*. *(Luaran: Skema struktur node JSON Firebase RTDB)* | Hadir | ✓ Paraf |
| **10** | II | Kamis, 19 Nov 2026 | 09:00–13:00 | 4 Jam | Perancangan Sistem | Pembuatan desain antarmuka (*Wireframe* UI/UX) terminal Kasir POS 1 layar dan panel Admin Inventori BOM yang ergonomis untuk layar tablet/smartphone kasir. *(Luaran: Desain Wireframe POS & Admin)* | Hadir | ✓ Paraf |
| **11** | II | Jumat, 20 Nov 2026 | 13:00–16:00 | 3 Jam | Perancangan Sistem | *Review* desain *Wireframe* bersama Pembimbing Lapangan dan staf kasir Kedai Teh Raja untuk memastikan tata letak tombol mudah dioperasikan saat meracik. *(Luaran: Persetujuan desain UI POS 1 layar)* | Hadir | ✓ Paraf |
| **12** | II | Sabtu, 21 Nov 2026 | 09:00–12:00 | 3 Jam | Perancangan Sistem | Pendampingan operasional akhir pekan di gerai sekaligus pengambilan foto produk minuman asli untuk aset visual katalog menu POS. *(Luaran: Aset foto produk teroptimasi)* | Hadir | ✓ Paraf |
| **13** | III | Senin, 23 Nov 2026 | 09:00–13:00 | 4 Jam | Implementasi POS | Inisialisasi project aplikasi menggunakan Next.js 16 (App Router), TypeScript, dan Tailwind CSS beserta konfigurasi koneksi Firebase Realtime Database (`lib/firebase.ts`). *(Luaran: Repositori project Next.js 16 aktif)* | Hadir | ✓ Paraf |
| **14** | III | Selasa, 24 Nov 2026 | 09:00–12:00 | 3 Jam | Implementasi POS | Implementasi arsitektur Global State Management Zustand (`lib/store.ts`) yang diintegrasikan dengan penyimpanan lokal IndexedDB (`idb-keyval`). *(Luaran: Modul Zustand Store Offline-First)* | Hadir | ✓ Paraf |
| **15** | III | Rabu, 25 Nov 2026 | 13:00–16:00 | 3 Jam | Implementasi POS | Penyusunan data master menu dan komposisi resep awal (`data/menu.ts`) sesuai hasil observasi takaran bahan baku di Kedai Istana Teh Raja. *(Luaran: File data master produk & resep BOM)* | Hadir | ✓ Paraf |
| **16** | III | Kamis, 26 Nov 2026 | 09:00–12:00 | 3 Jam | Implementasi POS | Pembangunan modul otentikasi staf (`useAuthStore`) dengan pembagian hak akses *role* Kasir serta Administrator. *(Luaran: Sistem login & proteksi hak akses)* | Hadir | ✓ Paraf |
| **17** | III | Jumat, 27 Nov 2026 | 13:00–16:00 | 3 Jam | Implementasi POS | Implementasi modal kustomisasi varian minuman (`VariantModal.tsx`): pilihan Ukuran Cup (`M`/`L`), Suhu (`Es`/`Panas`), Tingkat Gula (`0%`–`100%`), dan Level Es. *(Luaran: Komponen VariantModal dinamis)* | Hadir | ✓ Paraf |
| **18** | III | Sabtu, 28 Nov 2026 | 09:00–13:00 | 4 Jam | Implementasi POS | Uji coba awal pemilihan menu dan kustomisasi varian bersama staf kasir di gerai serta penyesuaian aturan promo paket *bundling* (3 Cup Medium Rp 10.000). *(Luaran: Kalkulasi otomatis paket bundling)* | Hadir | ✓ Paraf |
| **19** | IV | Senin, 30 Nov 2026 | 09:00–13:00 | 4 Jam | Implementasi BOM | Implementasi algoritma inti *Bill of Materials* (`useInventoryStore`): fungsi `calculateRecipeIngredientQty` untuk menghitung takaran bahan per varian ukuran dan level gula. *(Luaran: Fungsi kalkulasi gram/ml/pcs bahan)* | Hadir | ✓ Paraf |
| **20** | IV | Selasa, 1 Des 2026 | 09:00–12:00 | 3 Jam | Implementasi BOM | Implementasi fungsi `decrementIngredientsForOrder` dan `restoreIngredientsForOrder` untuk pemotongan stok bahan otomatis saat transaksi dan *rollback* saat batal. *(Luaran: Mekanisme potong & rollback stok BOM)* | Hadir | ✓ Paraf |
| **21** | IV | Rabu, 2 Des 2026 | 13:00–16:00 | 3 Jam | Implementasi BOM | Implementasi algoritma pemotongan kemasan kantong kresek otomatis berdasarkan jumlah *cup* dalam pesanan (kresek kecil kapasitas 1–2 *cup* & kresek sedang 3–4 *cup*). *(Luaran: Logika potong stok kresek otomatis)* | Hadir | ✓ Paraf |
| **22** | IV | Kamis, 3 Des 2026 | 09:00–12:00 | 3 Jam | Implementasi BOM | Pembuatan fungsi *Limiting Factor Validation* (`getInsufficientBomIngredients`) untuk mencegah kasir memproses pesanan apabila salah satu bahan baku penyusun habis. *(Luaran: Validasi pengaman stok bahan kritis)* | Hadir | ✓ Paraf |
| **23** | IV | Jumat, 4 Des 2026 | 13:00–16:00 | 3 Jam | Implementasi BOM | Pengembangan antarmuka halaman katalog (`/menu`) dan keranjang belanja (`CartDrawer.tsx`) dengan indikator ketersediaan stok bahan baku secara langsung. *(Luaran: Katalog terintegrasi status stok BOM)* | Hadir | ✓ Paraf |
| **24** | IV | Sabtu, 5 Des 2026 | 09:00–13:00 | 4 Jam | Implementasi BOM | Simulasi dan verifikasi kesesuaian pemotongan gramasi bahan baku di sistem dengan pemakaian fisik bahan baku di bar Kedai Istana Teh Raja. *(Luaran: Verifikasi akurasi rumus pemotongan BOM)* | Hadir | ✓ Paraf |
| **25** | V | Senin, 7 Des 2026 | 09:00–13:00 | 4 Jam | Implementasi POS | Pembangunan halaman utama Terminal Kasir POS (`app/pos/page.tsx`) dengan tata letak 1 layar terpadu untuk meminimalkan perpindahan halaman bagi kasir-barista. *(Luaran: Antarmuka Terminal Kasir POS /pos)* | Hadir | ✓ Paraf |
| **26** | V | Selasa, 8 Des 2026 | 09:00–12:00 | 3 Jam | Implementasi POS | Implementasi modul pembayaran multi-metode (Tunai dengan tombol nominal cepat/*Quick Cash*, kalkulator uang kembalian otomatis, QRIS, dan Transfer). *(Luaran: Modul checkout & kalkulator kembalian)* | Hadir | ✓ Paraf |
| **27** | V | Rabu, 9 Des 2026 | 13:00–16:00 | 3 Jam | Implementasi POS | Pembuatan Laci Antrean Racikan 3 Tab (`Masuk`, `Sedang Diracik`, `Selesai`) di halaman POS untuk memudahkan kasir memantau urutan peracikan minuman. *(Luaran: Fitur Laci Antrean Racikan 3 Tab)* | Hadir | ✓ Paraf |
| **28** | V | Kamis, 10 Des 2026 | 09:00–13:00 | 4 Jam | Implementasi POS | Implementasi fitur Buka *Shift* Kasir (input modal awal laci), pencatatan pengeluaran kas kecil (*Petty Cash*), dan Tutup *Shift* (`ShiftSummaryModal.tsx`). *(Luaran: Modul Shift Kasir & rekonsiliasi kas)* | Hadir | ✓ Paraf |
| **29** | V | Jumat, 11 Des 2026 | 13:00–16:00 | 3 Jam | Implementasi POS | Pengembangan modul pencetakan struk kasir *thermal* via *Web Bluetooth API* dengan protokol perintah *byte* ESC/POS (`lib/printer.ts` & `ReceiptModal.tsx`). *(Luaran: Fitur cetak struk Bluetooth chunking)* | Hadir | ✓ Paraf |
| **30** | V | Sabtu, 12 Des 2026 | 09:00–12:00 | 3 Jam | Implementasi POS | Uji coba langsung pencetakan struk transaksi dari browser HP/tablet kasir ke perangkat *printer thermal* Bluetooth di gerai Kedai Istana Teh Raja. *(Luaran: Bukti cetak struk fisik transaksi)* | Hadir | ✓ Paraf |
| **31** | VI | Senin, 14 Des 2026 | 09:00–13:00 | 4 Jam | Implementasi BOM | Pembangunan Panel Admin (`app/admin/page.tsx`): *Dashboard* ringkasan KPI penjualan harian, grafik tren transaksi, dan kartu peringatan bahan baku kritis. *(Luaran: Tab Dashboard Admin & early-warning stok)* | Hadir | ✓ Paraf |
| **32** | VI | Selasa, 15 Des 2026 | 09:00–12:00 | 3 Jam | Implementasi BOM | Implementasi Tab Menu & Editor Resep BOM di halaman Admin untuk memudahkan pemilik kedai mengubah komposisi gramasi bahan baku per produk. *(Luaran: Modul CRUD Produk & Editor Resep BOM)* | Hadir | ✓ Paraf |
| **33** | VI | Rabu, 16 Des 2026 | 13:00–16:00 | 3 Jam | Implementasi BOM | Implementasi Tab Bahan Baku & Suplier: fitur pencatatan belanja bahan baku (*Restock Purchase Order*) dan fitur Audit *Stock Opname* Fisik. *(Luaran: Modul Restock PO & Audit Stock Opname)* | Hadir | ✓ Paraf |
| **34** | VI | Kamis, 17 Des 2026 | 09:00–12:00 | 3 Jam | Implementasi BOM | Implementasi Tab Laba Rugi & Kas: fitur Rekening Toko *Real-Time* (putar modal dari pendapatan untuk belanja restok bahan) serta ekspor laporan Excel/PDF. *(Luaran: Modul Rekening Toko & Laporan Laba Rugi)* | Hadir | ✓ Paraf |
| **35** | VI | Jumat, 18 Des 2026 | 13:00–16:00 | 3 Jam | Implementasi POS | Implementasi komponen sinkronisasi latar belakang (`FirebaseSync.tsx`) dan *Service Worker* PWA (`public/sw.js`) untuk *auto-flush* transaksi *offline* saat kembali *online*. *(Luaran: Sinkronisasi Offline-to-Online & PWA)* | Hadir | ✓ Paraf |
| **36** | VI | Sabtu, 19 Des 2026 | 09:00–13:00 | 4 Jam | Pengujian & Evaluasi | Instalasi aplikasi PWA pada perangkat smartphone/tablet operasional di Kedai Istana Teh Raja serta uji coba ketahanan mode *Offline* (Wi-Fi/data dimatikan). *(Luaran: PWA terpasang & lolos uji transaksi offline)* | Hadir | ✓ Paraf |
| **37** | VII | Senin, 21 Des 2026 | 09:00–13:00 | 4 Jam | Implementasi POS | Implementasi fitur keamanan akses staf melalui ketukan rahasia 5x pada logo (`SecretStaffModal.tsx`) dan fitur sakelar Buka/Tutup Kedai Online. *(Luaran: Proteksi akses staf & kontrol status kedai)* | Hadir | ✓ Paraf |
| **38** | VII | Selasa, 22 Des 2026 | 09:00–12:00 | 3 Jam | Pengujian & Evaluasi | Pelaksanaan pengujian fungsional *Black-Box Testing* bersama staf kasir dan Pembimbing Lapangan terhadap modul POS, pembayaran, dan cetak struk Bluetooth. *(Luaran: Hasil uji Black-Box modul POS 100% Valid)* | Hadir | ✓ Paraf |
| **39** | VII | Rabu, 23 Des 2026 | 13:00–16:00 | 3 Jam | Pengujian & Evaluasi | Pelaksanaan pengujian *Black-Box Testing* modul Inventori BOM: uji akurasi pemotongan resep otomatis, *rollback* batal pesanan, *Stock Opname*, dan *Restock PO*. *(Luaran: Hasil uji Black-Box modul BOM 100% Valid)* | Hadir | ✓ Paraf |
| **40** | VII | Kamis, 24 Des 2026 | 09:00–12:00 | 3 Jam | Pengujian & Evaluasi | Pelatihan penggunaan sistem (*User Training*) kepada kasir-barista dan pengelola Kedai Istana Teh Raja untuk operasional harian dan tutup *shift*. *(Luaran: Staf mitra mahir mengoperasikan POS & BOM)* | Hadir | ✓ Paraf |
| **41** | VII | Sabtu, 26 Des 2026 | 09:00–13:00 | 4 Jam | Pengujian & Evaluasi | Pendampingan penuh penggunaan sistem POS & BOM pada transaksi riil akhir pekan serta evaluasi performa sinkronisasi Firebase RTDB. *(Luaran: Rekap transaksi operasional riil akurat)* | Hadir | ✓ Paraf |
| **42** | VIII | Senin, 28 Des 2026 | 09:00–13:00 | 4 Jam | Dokumentasi & Serah Terima | Penyusunan Buku Panduan Penggunaan Sistem (*User Manual*) untuk kasir dan admin mitra serta finalisasi dokumentasi teknis laporan PKL. *(Luaran: Buku Panduan Operasional POS & BOM)* | Hadir | ✓ Paraf |
| **43** | VIII | Selasa, 29 Des 2026 | 09:00–12:00 | 3 Jam | Dokumentasi & Serah Terima | Presentasi hasil akhir sistem dan evaluasi capaian luaran project bersama Pembimbing Lapangan (Ibu Lavia Rosulia, S.H.). *(Luaran: Evaluasi kepuasan mitra & verifikasi F-05)* | Hadir | ✓ Paraf |
| **44** | VIII | Rabu, 30 Des 2026 | 13:00–16:00 | 3 Jam | Dokumentasi & Serah Terima | Verifikasi akhir dan penandatanganan rekapitulasi Logbook Kehadiran & Kegiatan Harian PKL (**Formulir F-06**) serta penilaian Pembimbing Lapangan. *(Luaran: Dokumen Formulir F-06 disahkan 45 Hari / 150 Jam)* | Hadir | ✓ Paraf |
| **45** | VIII | Kamis, 31 Des 2026 | 09:00–12:00 | 3 Jam | Dokumentasi & Serah Terima | Serah terima resmi perangkat lunak Sistem POS & Inventori BOM, akun database, dan buku panduan kepada pihak mitra Kedai Istana Teh Raja (**Formulir F-08 & F-09**). *(Luaran: Berita Acara Serah Terima Project PKL)* | Hadir | ✓ Paraf |
| **Total** | **I–VIII** | **45 Hari Kerja Efektif** | **Senin – Sabtu** | **150 Jam** | **Seluruh Tahapan Tuntas** | **Memenuhi & Melampaui Syarat Minimal 135 Jam PKL (Capaian: 150 Jam / 100% Valid)** | **100% Hadir** | **Disahkan PL** |

---

### 4. Pengesahan Logbook Kehadiran dan Kegiatan Harian PKL

Brebes, 31 Desember 2026

| Mengetahui & Mengesahkan,<br/>**Pembimbing Lapangan (Kedai Istana Teh Raja)** | Mahasiswa Pelaksana PKL |
| :---: | :---: |
| <br/><br/><br/><br/>**( Lavia Rosulia, S.H. )**<br/>Divisi Operasional · HP: 085328782341 | <br/><br/><br/><br/>**( M. Yarzuq Wildani )**<br/>NIM. 0402231058 |

