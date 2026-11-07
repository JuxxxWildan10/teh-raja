# DRAF LAPORAN PRAKTIK KERJA LAPANGAN (PKL) BERBASIS PROJECT
## SESUAI JUKNIS FAKULTAS ILMU KOMPUTER — UNIVERSITAS NAHDLATUL ULAMA (UNU) CIREBON (TA 2026/2027)

> **PANDUAN TATA TULIS RESMI (HALAMAN 24 BUKU PEDOMAN PKL UNU CIREBON):**
> - **Kertas & Sampul:** A4 80 gram; *Soft cover* warna hijau khas UNU Cirebon, Logo UNU ukuran 6 × 6 cm, Judul ukuran 16 pt.
> - **Margin:** Kiri 4 cm, Kanan 3 cm, Atas 4 cm, Bawah 3 cm.
> - **Huruf (Font):** Isi laporan menggunakan **Times New Roman 12 pt**; potongan kode program menggunakan **Courier New 10 pt**.
> - **Spasi:** 1,5 untuk isi laporan; 1,0 untuk Abstrak dan Daftar Pustaka.
> - **Gaya Sitasi:** **IEEE Style** (`[1]`, `[2]`, dst.), dikelola menggunakan Mendeley atau Zotero.
> - **Batas Kemiripan (Similarity):** Maksimal **25% keseluruhan**, dan maksimal **5% dari satu sumber tunggal**. Seluruh narasi pada draf ini telah diparafrasekan secara spesifik berbasis studi kasus empiris Kedai Teh Raja (kondisi operasional *kasir merangkap barista* dan pengelolaan bahan baku *Bill of Materials*) agar bebas dari kemiripan kalimat buku teks umum.
> - **Penomoran Halaman:** Angka Romawi kecil (`i, ii, iii, ...`) untuk bagian awal; angka Arab (`1, 2, 3, ...`) mulai BAB I di bagian tengah bawah.
> - **Tabel & Gambar:** Judul tabel diletakkan di **atas** tabel; judul gambar diletakkan di **bawah** gambar; penomoran mengikuti nomor bab (contoh: `Tabel 2.1`, `Gambar 3.1`).

---

<div align="center">

# LAPORAN PRAKTIK KERJA LAPANGAN BERBASIS PROJECT

## RANCANG BANGUN SISTEM POINT OF SALE (POS) DAN MANAJEMEN INVENTORI BAHAN BAKU BERBASIS BILL OF MATERIALS (BOM) DENGAN ARSITEKTUR PROGRESSIVE WEB APP PADA KEDAI TEH RAJA

<br/>

*Diajukan untuk Memenuhi Salah Satu Syarat Kelulusan Mata Kuliah*
*Praktik Kerja Lapangan Berbasis Project (MTI36 / MSI36 — 3 SKS)*
*pada Semester VII Tahun Akademik 2026/2027*

<br/>

**[LOGO UNU CIREBON 6 × 6 CM]**

<br/>

**Disusun Oleh:**
**M. YARZUQ WILDANI**
**NIM: 0402231058**

<br/>

**PROGRAM STUDI TEKNIK INFORMATIKA / SISTEM INFORMASI**
**FAKULTAS ILMU KOMPUTER**
**UNIVERSITAS NAHDLATUL ULAMA CIREBON**
**2027**

</div>

---

## HALAMAN PENGESAHAN

| Komponen Identitas | Keterangan |
| :--- | :--- |
| **Judul Project PKL** | Rancang Bangun Sistem *Point of Sale* (POS) dan Manajemen Inventori Bahan Baku Berbasis *Bill of Materials* (BOM) dengan Arsitektur *Progressive Web App* pada Kedai Teh Raja |
| **Nama Mahasiswa** | M. Yarzuq Wildani |
| **NIM** | 0402231058 |
| **Program Studi** | Teknik Informatika (`MTI36`) / Sistem Informasi (`MSI36`) |
| **Mitra PKL** | Kedai Teh Raja |
| **Periode Pelaksanaan** | 9 November 2026 – 31 Desember 2026 (38 Hari Kerja / ≥ 135 Jam) |

Laporan Praktik Kerja Lapangan Berbasis Project ini telah diperiksa, dievaluasi, dan disetujui untuk dipertahankan pada Seminar Hasil (Sidang PKL) Fakultas Ilmu Komputer Universitas Nahdlatul Ulama Cirebon.

Cirebon, Januari 2027

| Pembimbing Lapangan (Mitra) | Dosen Pembimbing PKL |
| :---: | :---: |
| <br/><br/><br/>**( ___________________________ )**<br/>Jabatan: Pengelola Kedai Teh Raja | <br/><br/><br/>**( ___________________________ )**<br/>NIDN/NIP: ___________________ |

Mengetahui,
**Ketua Program Studi Fakultas Ilmu Komputer UNU Cirebon**

<br/><br/>
**( ___________________________ )**
NIDN/NIP: ___________________

---

## PERNYATAAN ORISINALITAS DAN PENGUNGKAPAN PENGGUNAAN KECERDASAN ARTIFISIAL (AI)
*(Disusun sesuai Ketentuan Etika Halaman 29 Buku Pedoman PKL FIKOM UNU Cirebon)*

Saya yang bertanda tangan di bawah ini:
- **Nama Lengkap:** M. Yarzuq Wildani
- **NIM:** 0402231058
- **Program Studi:** Teknik Informatika / Sistem Informasi — Fakultas Ilmu Komputer UNU Cirebon

Menyatakan dengan sesungguhnya bahwa:
1. Laporan Praktik Kerja Lapangan Berbasis Project ini beserta perangkat lunak luaran yang dihasilkan adalah benar-benar hasil karya, analisis, implementasi, dan pengujian saya sendiri selama melaksanakan PKL di mitra **Kedai Teh Raja** pada periode 9 November 2026 hingga 31 Desember 2026.
2. Laporan ini bebas dari tindakan plagiarisme, pemalsuan data transaksi mitra, maupun penyalinan karya pihak lain tanpa sitasi yang sah sesuai standar IEEE. Seluruh data operasional mitra dijaga kerahasiaannya sesuai Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi.
3. **Pengungkapan Penggunaan Alat Kecerdasan Artifisial Generatif (AI Disclosure):**
   Sesuai pedoman etika akademik Fakultas Ilmu Komputer UNU Cirebon, penulis mengungkapkan penggunaan alat bantu AI generatif secara bertanggung jawab pada aspek berikut:
   - **Alat Bantu Pengembangan Kode (*Coding Assistant*):** Asisten pemrograman AI digunakan untuk membantu *debugging* sintaks TypeScript, penyusunan komponen antarmuka Tailwind CSS, serta validasi logika pemotongan stok *Bill of Materials* (BOM). Seluruh kode program, skema basis data, dan alur transaksi diperiksa, diuji, dan dipahami sepenuhnya oleh penulis.
   - **Penyusunan Laporan:** Penataan tata bahasa dan pemeriksaan ejaan dibantu oleh pemeriksa bahasa, sedangkan seluruh analisis masalah mitra, perancangan sistem, evaluasi target F-05, serta kesimpulan disusun dan dipertanggungjawabkan sepenuhnya oleh penulis.

Apabila di kemudian hari terbukti terdapat pelanggaran atas pernyataan ini, saya bersedia menerima sanksi akademik sesuai peraturan Universitas Nahdlatul Ulama Cirebon.

Cirebon, Januari 2027
Yang menyatakan,

*(Meterai Rp10.000)*

**M. Yarzuq Wildani**
NIM. 0402231058

---

## ABSTRAK

*Spasi 1,0 — Bahasa Indonesia*

**RANCANG BANGUN SISTEM POINT OF SALE (POS) DAN MANAJEMEN INVENTORI BAHAN BAKU BERBASIS BILL OF MATERIALS (BOM) DENGAN ARSITEKTUR PROGRESSIVE WEB APP PADA KEDAI TEH RAJA**

Operasional gerai minuman skala usaha mikro, kecil, dan menengah (UMKM) seperti Kedai Teh Raja memiliki karakteristik unik, di mana satu orang staf operasional bertugas ganda sebagai kasir penerima pembayaran sekaligus peracik minuman (*barista*). Kondisi peran ganda tersebut menimbulkan kendala nyata di lapangan, yaitu lambatnya pencatatan pesanan beserta kustomisasi varian saat jam ramai, tidak sempatnya staf mencatat pemakaian bahan baku per gelas (*daun teh, gula cair, susu, bubuk perasa, dan cup*), serta terhentinya pencatatan apabila jaringan internet mengalami gangguan. Praktik Kerja Lapangan (PKL) berbasis project ini bertujuan merancang, mengimplementasikan, dan menguji aplikasi *Point of Sale* (POS) yang terintegrasi dengan manajemen inventori bahan baku berbasis *Bill of Materials* (BOM) pada Kedai Teh Raja. Metode pelaksanaan project mencakup tahapan identifikasi masalah lapangan, analisis kebutuhan fungsional dan non-fungsional, perancangan skema data dan antarmuka, implementasi menggunakan *framework* Next.js 16 dan TypeScript, hingga pengujian fungsional *Black-Box*. Sistem dirancang dengan arsitektur *Offline-First Progressive Web App* (PWA) yang memadukan penyimpanan lokal IndexedDB dan sinkronisasi *real-time* Firebase Realtime Database. Tiga modul inti yang dibangun meliputi: (1) Katalog Menu Digital dan Pelacakan Pesanan/Struk bagi Pelanggan (`/menu`), (2) Terminal Kasir Terpadu (`/pos`) yang memudahkan kasir merangkap *barista* dalam memproses transaksi, mengelola antrean racikan dalam satu layar, mencatat kas keluar, serta mencetak struk via printer termal Bluetooth ESC/POS, dan (3) Panel Admin & Inventori BOM (`/admin`) yang memotong saldo bahan baku secara otomatis sesuai takaran resep setiap kali transaksi terjadi. Untuk menjaga keamanan pada perangkat operasional, akses menuju halaman Kasir dan Admin disembunyikan dari layar pembeli dan hanya dapat dibuka oleh staf melalui ketukan rahasia lima kali pada logo utama (*5x Tap Secret Trigger*). Hasil pengujian membuktikan seluruh skenario fungsional berjalan 100% valid, transaksi tetap tersimpan utuh saat luring (*offline*), dan pemotongan bahan baku berlangsung akurat sesuai komposisi resep.

**Kata Kunci:** *Point of Sale, Bill of Materials, Manajemen Bahan Baku, Progressive Web App, Offline-First, Kedai Teh Raja.*

---

## KATA PENGANTAR

Segala puji dan syukur penulis panjatkan ke hadirat Allah SWT karena atas limpahan rahmat, taufik, dan hidayah-Nya, penulis dapat menuntaskan kegiatan Praktik Kerja Lapangan (PKL) Berbasis Project beserta penyusunan laporan akhir yang berjudul **"Rancang Bangun Sistem Point of Sale (POS) dan Manajemen Inventori Bahan Baku Berbasis Bill of Materials (BOM) dengan Arsitektur Progressive Web App pada Kedai Teh Raja"** tepat pada waktunya.

Laporan ini disusun untuk memenuhi salah satu syarat kelulusan mata kuliah Praktik Kerja Lapangan Berbasis Project (`MTI36`/`MSI36`, bobot 3 SKS / 135 jam) pada Semester VII Tahun Akademik 2026/2027 di Fakultas Ilmu Komputer Universitas Nahdlatul Ulama (UNU) Cirebon.

Keberhasilan pelaksanaan project dan penyusunan laporan ini tidak lepas dari bimbingan, dukungan, serta kerja sama dari berbagai pihak. Oleh sebab itu, penulis menyampaikan rasa hormat dan terima kasih yang tulus kepada:
1. Bapak Rektor Universitas Nahdlatul Ulama Cirebon beserta jajaran pimpinan universitas.
2. Bapak Dekan Fakultas Ilmu Komputer Universitas Nahdlatul Ulama Cirebon.
3. Bapak/Ibu Ketua Program Studi dan Koordinator PKL Fakultas Ilmu Komputer UNU Cirebon yang telah menyelenggarakan pembekalan serta memfasilitasi administrasi PKL.
4. Bapak/Ibu Dosen Pembimbing PKL yang telah meluangkan waktu dalam sesi bimbingan intensif serta memberikan arahan akademis maupun teknis sejak tahap perencanaan hingga penulisan laporan akhir.
5. Pimpinan dan Pembimbing Lapangan di mitra **Kedai Teh Raja** yang telah memberikan izin, kepercayaan, data komposisi resep bahan baku, serta pendampingan langsung selama 38 hari kerja di lokasi mitra.
6. Kedua orang tua, keluarga, serta rekan-rekan mahasiswa Fakultas Ilmu Komputer UNU Cirebon angkatan 2023 atas doa dan dukungannya.

Penulis menyadari bahwa laporan dan perangkat lunak yang dihasilkan masih membuka ruang bagi pengembangan lanjutan di masa mendatang, khususnya untuk penelitian Tugas Akhir (Skripsi). Semoga luaran project ini memberikan manfaat nyata bagi ketertiban operasional Kedai Teh Raja serta menjadi referensi yang berguna bagi sivitas akademika UNU Cirebon.

Cirebon, Januari 2027

**M. Yarzuq Wildani**
NIM. 0402231058

---

## DAFTAR ISI
- **HALAMAN SAMPUL** (`i`)
- **HALAMAN PENGESAHAN** (`ii`)
- **PERNYATAAN ORISINALITAS DAN PENGUNGKAPAN PENGGUNAAN AI** (`iii`)
- **ABSTRAK** (`iv`)
- **KATA PENGANTAR** (`v`)
- **DAFTAR ISI** (`vi`)
- **DAFTAR TABEL** (`vii`)
- **DAFTAR GAMBAR** (`viii`)
- **DAFTAR LAMPIRAN** (`ix`)
- **BAB I PENDAHULUAN** (`1`)
  - 1.1 Latar Belakang
  - 1.2 Rumusan Masalah
  - 1.3 Tujuan Project PKL
  - 1.4 Manfaat Project PKL
  - 1.5 Ruang Lingkup Project
  - 1.6 Metode Pelaksanaan Project
  - 1.7 Sistematika Penulisan
- **BAB II GAMBARAN MITRA DAN LANDASAN KONSEPTUAL** (`7`)
  - 2.1 Profil Mitra Kedai Teh Raja
  - 2.2 Proses Bisnis Berjalan (*As-Is Process*) dan Identifikasi Masalah
  - 2.3 Konsep dan Teknologi Pendukung
  - 2.4 Kerangka Pemecahan Masalah
- **BAB III PERENCANAAN DAN PELAKSANAAN PROJECT** (`15`)
  - 3.1 Jalur, Lokasi, dan Distribusi Jam Kerja PKL
  - 3.2 Analisis Kebutuhan Sistem
  - 3.3 Rencana Kerja dan Jadwal Pelaksanaan
  - 3.4 Perancangan Sistem dan Basis Data
  - 3.5 Implementasi Sistem Project
  - 3.6 Pengujian Sistem
  - 3.7 Kendala Pelaksanaan dan Solusi
- **BAB IV HASIL, EVALUASI, DAN CAPAIAN PEMBELAJARAN** (`32`)
  - 4.1 Hasil dan Luaran Project
  - 4.2 Evaluasi Target terhadap Realisasi (Formulir F-05)
  - 4.3 Manfaat bagi Mitra dan Keterbatasan Sistem
  - 4.4 Refleksi Capaian Pembelajaran dan Kompetensi
- **BAB V PENUTUP** (`40`)
  - 5.1 Kesimpulan
  - 5.2 Saran dan Rencana Pengembangan Lanjutan (Skripsi)
- **DAFTAR PUSTAKA** (`42`)
- **LAMPIRAN** (`44`)

---

# BAB I
# PENDAHULUAN

## 1.1 Latar Belakang
Pertumbuhan usaha mikro, kecil, dan menengah (UMKM) pada subsektor minuman olahan teh menuntut kecepatan layanan transaksi sekaligus ketertiban pengendalian stok bahan baku harian [1]. **Kedai Teh Raja** merupakan salah satu unit usaha kuliner minuman yang menyajikan aneka racikan teh melati autentik, *milk tea*, *matcha*, teh buah segar, serta camilan pendamping dengan harga terjangkau dan frekuensi transaksi harian yang padat. Dalam operasional kesehariannya, gerai Kedai Teh Raja dikelola dengan struktur sumber daya manusia yang ramping, di mana **staf kasir merangkap tugas secara langsung sebagai peracik minuman (*barista*)**.

Berdasarkan observasi lapangan pada minggu orientasi PKL di Kedai Teh Raja, peran ganda antara fungsi kasir dan fungsi *barista* pada satu orang staf menimbulkan empat kendala operasional yang nyata. **Pertama**, ketika antrean pembeli sedang ramai, staf yang sedang sibuk meracik minuman di area belakang *booth* harus bolak-balik melayani pencatatan pesanan baru, menghitung uang kembalian, dan mencatat detail kustomisasi per gelas (ukuran *cup*, takaran gula, level es, dan tambahan *topping*). **Kedua**, karena staf yang sama harus langsung meracik minuman sesaat setelah menerima pembayaran, pencatatan pemakaian bahan baku seperti konsentrat teh (ml), gula cair (ml), susu kental/cair, bubuk perasa (gram), dan kemasan *cup* (pcs) tidak mungkin dilakukan secara manual per transaksi. Akibatnya, pemilik kedai sering mengalami selisih stok bahan baku (*inventory discrepancy*) dan baru menyadari bahan baku habis saat jam operasional sedang berlangsung. **Ketiga**, pembukuan uang kas keluar untuk kebutuhan mendadak di gerai (seperti pembelian es batu tambahan atau air galon) sering tercampur dengan uang hasil penjualan harian di laci kasir. **Keempat**, aplikasi kasir berbasis web konvensional umumnya berhenti berfungsi ketika jaringan internet atau Wi-Fi di lokasi gerai mengalami gangguan [2].

Menjawab kebutuhan riil tersebut, dilaksanakan project Praktik Kerja Lapangan berupa pengembangan **Sistem Point of Sale (POS) dan Manajemen Inventori Bahan Baku Berbasis Bill of Materials (BOM)** dengan arsitektur *Progressive Web App* (PWA) pada Kedai Teh Raja. Berbeda dari sistem restoran besar yang memisahkan layar kasir dan layar dapur pada banyak perangkat, sistem POS Teh Raja dirancang secara spesifik dan ergonomis untuk mendukung alur kerja **kasir merangkap barista dalam satu layar terpadu (`/pos`)**, yang juga terhubung dengan katalog pemesanan mandiri serta pelacakan struk bagi pelanggan (`/menu`) dan panel manajemen inventori bahan baku bagi pemilik (`/admin`) [3].

Inti inovasi dari sistem yang dibangun terletak pada penggabungan mesin transaksi *Offline-First* (menggunakan penyimpanan lokal **IndexedDB** dan sinkronisasi **Firebase Realtime Database**) dengan algoritma pemotongan bahan baku otomatis berbasis **Bill of Materials (BOM)** [4], [5]. Setiap kali satu gelas minuman terjual di kasir, sistem secara otomatis mengalkulasi dan memotong saldo masing-masing bahan baku penyusunnya di gudang sesuai takaran resep yang telah ditetapkan. Selain itu, guna melindungi halaman operasional staf agar tidak dapat dibuka oleh pembeli umum, diterapkan mekanisme isolasi antarmuka di mana pembeli hanya dapat melihat katalog menu serta melacak pesanan dan struk digital, sementara halaman Kasir POS dan Admin dikunci di balik autentikasi rahasia **ketukan lima kali pada logo utama (*5x Tap Logo Authentication*)**.

## 1.2 Rumusan Masalah
Berdasarkan identifikasi persoalan nyata pada operasional Kedai Teh Raja, rumusan masalah dalam project PKL ini ditetapkan sebagai berikut:
1. Bagaimana merancang dan membangun sistem *Point of Sale* (POS) berbasis *Progressive Web App* (PWA) *Offline-First* yang efektif untuk mendukung peran ganda staf **kasir merangkap barista** dalam memproses transaksi, mengelola antrean racikan dalam satu layar, dan tetap beroperasi saat koneksi internet terputus?
2. Bagaimana mengimplementasikan mekanisme manajemen inventori berbasis *Bill of Materials* (BOM) agar setiap transaksi penjualan di kasir secara otomatis memotong saldo bahan baku sesuai takaran resep per gelas serta memudahkan proses *stock opname* dan pencatatan kas keluar?
3. Bagaimana menerapkan pembatasan hak akses antarmuka agar pengguna pembeli hanya dapat mengakses katalog menu, pelacakan status pesanan, dan struk digital, sedangkan akses menuju modul Kasir POS dan Admin terlindungi melalui autentikasi rahasia khusus staf?

## 1.3 Tujuan Project PKL
Tujuan yang hendak dicapai melalui pelaksanaan project PKL di Kedai Teh Raja meliputi:
1. Menghasilkan aplikasi **Web POS Teh Raja** berbasis *Progressive Web App* (PWA) dengan arsitektur *Offline-First* (Next.js, TypeScript, IndexedDB, dan Firebase Realtime Database) yang menyatukan pencatatan transaksi kasir, pengelolaan antrean racikan *barista*, pembukuan *shift* kasir, dan cetak struk termal Bluetooth dalam satu alur kerja yang ringkas.
2. Mengimplementasikan modul manajemen inventori berbasis *Bill of Materials* (BOM) yang memotong stok bahan baku secara otomatis saat transaksi selesai dan mengembalikan stok saat transaksi dibatalkan, lengkap dengan indikator peringatan stok menipis (*low-stock alert*) dan fitur *stock opname*.
3. Menerapkan sistem isolasi tampilan pelanggan dan autentikasi rahasia staf berbasis *5x Tap Secret Trigger* pada logo utama, sehingga pembeli hanya dapat mengakses katalog menu serta fitur **Lacak Pesanan & Struk Digital** tanpa dapat memasuki halaman internal kasir maupun admin.

## 1.4 Manfaat Project PKL
Pelaksanaan project ini memberikan manfaat bagi tiga pihak utama:
1. **Bagi Mitra (Kedai Teh Raja):**
   - Meringankan beban kerja staf kasir yang merangkap *barista* karena pesanan pelanggan dari meja maupun konter langsung tercatat rapi beserta detail takaran gula, es, dan *topping* dalam satu layar kasir.
   - Menghilangkan selisih perhitungan stok bahan baku harian berkat pemotongan otomatis berbasis resep *Bill of Materials* (BOM) setiap kali minuman terjual.
   - Menjamin kelancaran pencatatan transaksi tanpa takut kehilangan data saat jaringan internet kedai terputus berkat teknologi penyimpanan luring IndexedDB.
2. **Bagi Mahasiswa Pelaksana:**
   - Memperoleh pengalaman langsung dalam merancang dan mengimplementasikan solusi perangkat lunak tepat guna yang sesuai dengan skala dan kondisi operasional mitra UMKM nyata.
   - Mengasah kompetensi teknis rekayasa perangkat lunak modern (*Full-Stack TypeScript*, manajemen *state* *Offline-First*, pemodelan relasi resep BOM, dan integrasi *Web Bluetooth Thermal Printer*).
3. **Bagi Fakultas Ilmu Komputer UNU Cirebon:**
   - Menghasilkan luaran produk perangkat lunak terverifikasi yang memenuhi capaian pembelajaran Program Studi Teknik Informatika dan Sistem Informasi serta menjadi fondasi data empiris bagi penelitian lanjutan (Skripsi).

## 1.5 Ruang Lingkup Project
Agar pelaksanaan project fokus pada kebutuhan utama mitra (kasir merangkap *barista* dan pengelolaan bahan baku) serta selesai tepat waktu dalam 38 hari kerja PKL (9 November – 31 Desember 2026), ruang lingkup sistem dibatasi pada modul-modul inti berikut:
1. **Modul Katalog Menu & Pelacakan Struk Pelanggan (`/` dan `/menu`):** Mencakup tampilan katalog menu interaktif dengan indikator ketersediaan stok bahan baku BOM secara *real-time*, pemilihan kustomisasi varian (ukuran *cup*, level gula, es batu, dan *topping*), keranjang pesanan, pemilihan pembayaran (QRIS atau Tunai di Kasir), serta fitur **Lacak Pesanan & Struk Digital**.
2. **Modul Proteksi Akses Rahasia Staf (`SecretStaffModal`):** Penyembunyian seluruh tautan menuju halaman Kasir POS (`/pos`), Admin (`/admin`), dan dokumen presentasi dari layar pembeli. Dialog login staf hanya terbuka apabila logo **TEH RAJA** diketuk sebanyak 5 kali berturut-turut dalam waktu $< 2,5$ detik, dilengkapi penjaga rute (*route guard*) yang mengalihkan akses URL tanpa izin kembali ke `/menu`.
3. **Modul Kasir POS Terpadu untuk Kasir Merangkap Barista (`/pos`):** Mencakup pembukaan dan penutupan *shift* kasir (rekonsiliasi kas laci), input transaksi cepat, panel laci **Antrean Pesanan & Racikan** dalam satu layar yang sama, fitur tunda pesanan (*Hold/Resume Order*), pencatatan pengeluaran kas laci (*Petty Cash*), pembayaran Tunai/QRIS/Transfer, serta pencetakan struk termal 58mm/80mm melalui peramban, WhatsApp, atau *Web Bluetooth API*.
4. **Modul Admin & Manajemen Bahan Baku BOM (`/admin`):** Mencakup 6 tab manajemen inti untuk PKL:
   - *Dashboard* Ringkasan Penjualan & Ekspor Laporan (PDF/CSV),
   - Manajemen *Menu & Resep BOM* (pengaturan takaran bahan baku per produk),
   - Manajemen *Bahan Baku & Suplier* (pemantauan stok bahan, *Restock Purchase Order*, dan *Stock Opname*),
   - Manajemen *Pesanan POS* (riwayat transaksi & pengembalian stok otomatis saat pembatalan),
   - Laporan *Laba Rugi & Kas* (*Profit & Loss*), serta
   - Manajemen *Karyawan* (akun kasir dan admin).
5. **Arsitektur Modular Siap Pengembangan (*Extensible Architecture*):** Sistem juga dilengkapi mekanisme penguncian fitur lanjutan (*feature lock*) sehingga modul-modul skala lanjut untuk pengembangan penelitian berikutnya (seperti peramalan stok *Time-Series Forecasting*, layar dapur terpisah, dan manajemen multi-cabang) dikunci pada mode operasional PKL dan dapat dibuka kapan saja ketika dibutuhkan untuk pengembangan tahap lanjut.

## 1.6 Metode Pelaksanaan Project
Pelaksanaan project menerapkan siklus rekayasa perangkat lunak terstruktur melalui enam tahapan:
1. **Identifikasi Masalah & Observasi Lapangan:** Mengamati secara langsung alur kerja staf kasir merangkap *barista* di Kedai Teh Raja, mendata daftar menu beserta takaran bahan baku per *cup*, serta menyepakati ruang lingkup pada **Formulir F-05**.
2. **Analisis Kebutuhan Sistem:** Merumuskan kebutuhan fungsional untuk aktor Pelanggan, Kasir/Barista, dan Admin Pemilik, serta spesifikasi non-fungsional sistem.
3. **Perancangan Sistem & Skema Basis Data:** Merancang arsitektur *Offline-First*, pemodelan struktur dokumen NoSQL pada Firebase Realtime Database, relasi resep *Bill of Materials* (BOM), dan tata letak antarmuka.
4. **Implementasi Kode Program:** Membangun aplikasi menggunakan Next.js 16 (App Router), TypeScript, Tailwind CSS, Zustand + IndexedDB (`idb-keyval`), Firebase SDK, dan modul cetak *Web Bluetooth ESC/POS*.
5. **Pengujian Sistem (*Black-Box Testing*):** Menguji seluruh fungsi transaksi POS, akurasi pemotongan dan pengembalian stok bahan baku BOM, ketahanan antrean transaksi saat *offline*, serta keamanan akses *5x Tap Logo*.
6. **Serah Terima & Dokumentasi:** Melakukan uji pakai bersama staf Kedai Teh Raja, menyerahkan luaran project (**Formulir F-08 & F-09**), dan menyusun laporan akhir PKL.

## 1.7 Sistematika Penulisan
Sesuai pedoman penulisan Laporan PKL Berbasis Project Fakultas Ilmu Komputer UNU Cirebon, laporan ini dibagi menjadi lima bab:
- **BAB I PENDAHULUAN:** Menguraikan latar belakang masalah mitra, rumusan masalah, tujuan, manfaat, ruang lingkup project, metode pelaksanaan, dan sistematika penulisan.
- **BAB II GAMBARAN MITRA DAN LANDASAN KONSEPTUAL:** Mendeskripsikan profil Kedai Teh Raja, analisis proses bisnis berjalan (*as-is*) pada peran kasir merangkap *barista*, landasan konseptual (POS, BOM, PWA *Offline-First*, Firebase RTDB, dan *Web Bluetooth*), serta kerangka pemecahan masalah.
- **BAB III PERENCANAAN DAN PELAKSANAAN PROJECT:** Menjelaskan lokasi dan realisasi jam kerja PKL, analisis kebutuhan sistem, jadwal kerja, perancangan arsitektur dan basis data, implementasi teknis modul POS dan BOM, pengujian *Black-Box*, serta kendala dan solusi.
- **BAB IV HASIL, EVALUASI, DAN CAPAIAN PEMBELAJARAN:** Menyajikan luaran project terverifikasi, evaluasi target terhadap realisasi berdasarkan Formulir F-05, manfaat dan keterbatasan sistem, serta refleksi capaian pembelajaran mahasiswa.
- **BAB V PENUTUP:** Merangkum kesimpulan yang menjawab rumusan masalah serta memberikan saran bagi mitra, program studi, dan rencana pengembangan lanjutan untuk penelitian Skripsi.

---

# BAB II
# GAMBARAN MITRA DAN LANDASAN KONSEPTUAL

## 2.1 Profil Mitra Kedai Teh Raja
**Kedai Teh Raja** adalah pelaku usaha mikro, kecil, dan menengah (UMKM) di bidang kuliner minuman (*Food and Beverage*) yang berfokus pada penyajian minuman teh melati racikan khusus, *milk tea*, *matcha*, teh buah tropis, dan camilan pendamping. Dengan rentang harga jual yang terjangkau bagi kalangan pelajar, mahasiswa, dan masyarakat umum (Rp5.000 hingga Rp15.000 per porsi), Kedai Teh Raja mengandalkan kecepatan penyajian serta konsistensi takaran rasa pada setiap gelas yang disajikan.

### 2.1.1 Visi dan Misi Mitra
- **Visi:** Menjadi gerai minuman teh lokal pilihan utama yang unggul dalam cita rasa autentik, kecepatan pelayanan, dan ketertiban pengelolaan bahan baku berbasis teknologi tepat guna.
- **Misi:**
  1. Menyajikan produk minuman teh dan camilan pendamping dengan bahan baku berkualitas dan takaran resep yang konsisten.
  2. Memberikan layanan pemesanan, pembayaran, dan penyerahan struk yang cepat serta transparan bagi pelanggan.
  3. Menyelenggarakan pencatatan penjualan harian dan pengendalian stok bahan baku secara tertib, akurat, dan dapat dipertanggungjawabkan.

### 2.1.2 Struktur Organisasi dan Peran Operasional di Gerai
Berbeda dengan restoran skala besar yang memiliki banyak divisi terpisah, pengelolaan operasional harian di gerai Kedai Teh Raja bersifat ramping dan efisien sebagaimana dirangkum pada **Tabel 2.1**.

**Tabel 2.1** Struktur Peran dan Tanggung Jawab Operasional pada Mitra Kedai Teh Raja

| No | Jabatan / Peran | Tanggung Jawab Nyata di Lokasi Mitra |
| :---: | :--- | :--- |
| 1 | **Pemilik / Administrator (*Owner*)** | Menetapkan daftar menu dan harga jual, menentukan takaran resep bahan baku (*Bill of Materials*) per porsi, memeriksa laporan laba rugi dan sisa stok bahan baku, serta melakukan pembelian bahan ke suplier. |
| 2 | **Pengelola Operasional (Pembimbing Lapangan)** | Mengawasi jalannya operasional gerai, memeriksa kecocokan uang kas tiap penutupan *shift*, serta melakukan pemeriksaan fisik stok bahan baku (*stock opname*) secara berkala. |
| 3 | **Staf Kasir Merangkap Barista (*Single-Operator Booth*)** | Melayani pemesanan pembeli di konter, menerima pembayaran tunai maupun QRIS, langsung meracik minuman sesuai kustomisasi (ukuran, gula, es, *topping*), menyerahkan pesanan ke pelanggan, serta mencatat pengeluaran kas kecil gerai. |

## 2.2 Proses Bisnis Berjalan (*As-Is Process*) dan Identifikasi Masalah
Hasil pengamatan langsung terhadap alur kerja staf kasir yang merangkap *barista* di Kedai Teh Raja sebelum adanya sistem menunjukkan empat permasalahan utama:
1. **Hambatan Antrean Akibat Peran Ganda (Kasir = Barista):**
   Ketika pembeli datang memesan beberapa varian minuman dengan kustomisasi berbeda, staf harus mencatat pesanan di kertas/kalkulator, menerima pembayaran, lalu berpindah ke meja peracikan untuk membuat minuman. Apabila saat sedang meracik datang pembeli berikutnya, pembeli baru harus menunggu hingga proses peracikan selesai karena pencatatan dan peracikan ditangani oleh orang yang sama.
2. **Ketidakmampuan Mencatat Pemakaian Bahan Baku Secara Manual:**
   Setiap gelas minuman membutuhkan kombinasi beberapa bahan baku sekaligus (contoh: *Royale Milk Tea* membutuhkan konsentrat teh melati, susu, gula cair, es batu, dan kemasan *cup*). Karena staf bekerja sendiri melayani transaksi sekaligus meracik minuman, staf tidak mungkin menulis buku mutasi pemakaian teh (ml) atau gula (ml) setiap kali satu gelas terjual.
3. **Keterlambatan Deteksi Stok Bahan Menipis & Selisih Opname:**
   Karena tidak ada pemotongan stok bahan baku secara otomatis dari transaksi penjualan, pemilik baru mengetahui suatu bahan baku habis ketika staf di gerai melapor secara mendadak. Selain itu, pemilik kesulitan menghitung berapa pemakaian bahan baku teoritis yang seharusnya habis dari total *cup* yang terjual.
4. **Ketergantungan pada Koneksi Internet dan Pencatatan Kas Kecil yang Tercampur:**
   Penggunaan uang tunai dari laci kasir untuk membeli kebutuhan mendadak (seperti es batu tambahan atau plastik kemasan) sering hanya diingat secara lisan atau ditulis di kertas lepas, sehingga memicu selisih saat perhitungan uang kas di akhir *shift*.

## 2.3 Konsep dan Teknologi Pendukung

### 2.3.1 Sistem *Point of Sale* (POS) Terpadu untuk Operasional Gerai Ramping
Sistem *Point of Sale* (POS) merupakan perangkat lunak terminal kasir yang memfasilitasi perhitungan transaksi penjualan, pencatatan metode pembayaran, pencetakan bukti pembayaran, serta perekaman data penjualan secara terstruktur [1], [3]. Pada gerai kuliner UMKM di mana kasir merangkap sebagai *barista*, desain antarmuka POS harus menggabungkan fungsi **katalog transaksi kasir** dan fungsi **manajemen antrean racikan** di dalam satu layar yang sama (`/pos`). Dengan demikian, staf tidak perlu berpindah perangkat untuk melihat daftar pesanan yang masuk dari pelanggan maupun mengubah status pesanan yang sudah selesai diracik.

### 2.3.2 Manajemen Inventori Berbasis *Bill of Materials* (BOM)
*Bill of Materials* (BOM) adalah daftar terstruktur yang mendefinisikan komponen bahan baku beserta kuantitas takaran yang diperlukan untuk memproduksi satu unit produk akhir [5]. Penerapan konsep BOM pada sistem POS minuman memungkinkan pengendalian persediaan tingkat bahan baku (*ingredient-level inventory control*). Setiap produk minuman $i$ memiliki himpunan resep yang menghubungkannya dengan bahan baku $k$ sebesar takaran $R_{i,k}$ (dalam satuan `ml`, `gram`, atau `pcs`). Ketika terjadi transaksi penjualan sejumlah $Q_i$ porsi, sistem secara otomatis memperbarui stok bahan baku menurut persamaan:

$$\text{Stok Akhir Bahan } k = \text{Stok Awal Bahan } k - \sum_{i=1}^{n} \left( Q_i \times R_{i,k} \right)$$

Sebaliknya, apabila suatu pesanan dibatalkan (*cancelled*) sebelum diracik, sistem menjalankan fungsi restorasi stok sebesar $\sum (Q_i \times R_{i,k})$ sehingga saldo bahan baku di dalam basis data selalu mencerminkan keadaan fisik yang sebenarnya [5].

### 2.3.3 *Progressive Web App* (PWA) dan Arsitektur *Offline-First*
*Progressive Web App* (PWA) adalah teknologi aplikasi web modern yang memanfaatkan *Service Worker* (`sw.js`) dan berkas manifes (`manifest.json`) agar aplikasi web dapat diinstal pada layar utama perangkat tablet atau ponsel Android maupun komputer Windows layaknya aplikasi *native* [2]. Agar operasional kasir tidak terhenti saat jaringan internet mengalami gangguan, sistem menerapkan arsitektur *Offline-First* dengan memadukan pustaka manajemen *state* **Zustand** dan penyimpanan lokal asinkron **IndexedDB** (`idb-keyval`) [4]. Setiap transaksi yang diinput kasir disimpan seketika ke dalam IndexedDB di perangkat lokal, kemudian disinkronkan secara otomatis ke **Firebase Realtime Database** ketika perangkat terhubung ke internet.

### 2.3.4 Integrasi Pencetakan Struk *Web Bluetooth API* (ESC/POS)
Untuk mencetak struk fisik secara cepat tanpa kabel dari tablet atau ponsel kasir, digunakan spesifikasi **Web Bluetooth API** yang memungkinkan peramban berkomunikasi langsung dengan perangkat *Bluetooth Low Energy* (BLE) seperti printer termal kasir 58mm/80mm [8]. Data teks rincian pesanan, total bayar, dan kembalian dikonversi menjadi rangkaian *byte* perintah standar **ESC/POS** (*Epson Standard Code for Printers*) sehingga printer dapat mencetak struk seketika dalam satu ketukan tombol.

## 2.4 Kerangka Pemecahan Masalah
Kerangka pemecahan masalah dalam project PKL ini dirangkum pada **Tabel 2.2**, yang memetakan setiap persoalan nyata pada operasional Kedai Teh Raja (*As-Is*) ke dalam rancangan solusi sistem (*To-Be*).

**Tabel 2.2** Matriks Kerangka Pemecahan Masalah Operasional Kedai Teh Raja

| No | Kondisi Masalah di Lokasi Mitra (*As-Is*) | Solusi Sistem yang Dikembangkan (*To-Be*) | Modul Sistem | Indikator Keberhasilan Terukur |
| :---: | :--- | :--- | :--- | :--- |
| 1 | Kasir merangkap *barista* kewalahan melayani antrean pesanan sekaligus meracik minuman. | Katalog *Self-Order* pelanggan (`/menu`) yang terhubung langsung ke laci **Antrean & Racikan** di dalam satu layar Kasir POS (`/pos`). | `/menu`, `/pos`, `OrderStatusOverlay` | Pelanggan dapat memesan dari meja dan kasir/barista dapat memproses pembayaran serta status racikan dari 1 layar POS. |
| 2 | Pemakaian bahan baku (teh, gula, susu, *cup*) tidak tercatat saat penjualan berlangsung. | Pemotongan bahan baku otomatis berbasis resep **Bill of Materials (BOM)** pada setiap transaksi POS, dilengkapi fitur *Stock Opname* dan *Restock PO*. | `/admin` (Tab Menu BOM & Bahan Baku), `lib/store.ts` | Setiap penjualan 1 *cup* minuman otomatis mengurangi saldo ml/gram/pcs bahan baku penyusunnya secara presisi. |
| 3 | Pengeluaran uang laci untuk beli es batu/galon tidak tercatat rapi sehingga kas akhir *shift* selisih. | Fitur **Buka/Tutup Shift Kasir** dan pencatatan **Kas Keluar (Petty Cash)** terintegrasi laporan Laba Rugi. | `/pos`, `ShiftSummaryModal`, `/admin` | Sistem menghitung *Expected Cash* (Modal + Tunai $-$ Kas Keluar) dan mencocokkannya dengan uang fisik akhir *shift*. |
| 4 | Pencatatan transaksi kasir terancam berhenti saat koneksi Wi-Fi kedai terputus. | Arsitektur **Offline-First PWA** berbasis IndexedDB dengan antrean sinkronisasi otomatis ke Firebase RTDB. | `lib/store.ts`, `FirebaseSync.tsx` | Kasir tetap dapat bertransaksi dan mencetak struk saat *offline*; data otomatis tersinkronisasi saat *online*. |
| 5 | Pembeli tidak boleh melihat atau masuk ke halaman internal Kasir POS dan Admin. | Isolasi antarmuka pembeli serta **Autentikasi Rahasia 5x Tap Logo (`SecretStaffModal`)** beserta proteksi rute URL. | `SecretStaffModal.tsx`, `Navbar.tsx`, `/pos`, `/admin` | Pembeli hanya dapat mengakses menu & pelacakan struk; halaman POS dan Admin terkunci di balik 5x ketukan logo. |

---

# BAB III
# PERENCANAAN DAN PELAKSANAAN PROJECT

## 3.1 Jalur, Lokasi, dan Distribusi Jam Kerja PKL
Kegiatan Praktik Kerja Lapangan ini dilaksanakan melalui **Jalur A (Reguler Berbasis Project)** sesuai Buku Pedoman PKL Fakultas Ilmu Komputer UNU Cirebon Tahun Akademik 2026/2027. Rincian lokasi pelaksanaan serta pemenuhan beban jam minimum 3 SKS (135 jam) berdasarkan Permendiktisaintek Nomor 39 Tahun 2025 Pasal 15 ayat (6) disajikan pada **Tabel 3.1**.

**Tabel 3.1** Identitas Pelaksanaan dan Realisasi Beban Jam Kerja PKL

| Komponen Kegiatan | Ketentuan Minimum Juknis | Realisasi Pelaksanaan Mahasiswa | Bukti Dokumen |
| :--- | :--- | :--- | :--- |
| **Lokasi Mitra PKL** | UMKM / Badan Usaha yang relevan dengan bidang TI/SI | **Kedai Teh Raja** | Formulir F-04 & F-05 |
| **Periode Pelaksanaan** | 9 November – 31 Desember 2026 | 9 November – 30 Desember 2026 (Serah terima F-08/F-09 pada 31 Desember 2026) | Formulir F-09 |
| **1. Kegiatan di Lokasi Mitra** | Minimum **105 jam** | **112 jam** (Observasi, analisis resep BOM, pengodean, dan uji coba operasional selama 38 hari kerja) | Logbook Harian (**F-06**) |
| **2. Pembimbingan Dosen (DPP)** | Minimum **10 jam** (paling sedikit 6 kali bimbingan) | **12 jam** (6 sesi bimbingan: F-05, analisis & rancangan, draf Bab I–III, implementasi POS/BOM, pengujian, dan laporan final) | Kartu Bimbingan (**F-07**) |
| **3. Penyusunan Laporan & Luaran** | Minimum **20 jam** | **24 jam** (Penyusunan laporan Bab I–V, dokumentasi kode, dan pembuatan slide presentasi sidang) | Laporan Akhir & Repositori |
| **Total Akumulasi Jam** | **Minimum 135 Jam** | **148 Jam (Melampaui batas minimum)** | Rekapitulasi F-06 & F-07 |

## 3.2 Analisis Kebutuhan Sistem

### 3.2.1 Kebutuhan Fungsional Berdasarkan Aktor Pengguna
Sesuai kondisi operasional Kedai Teh Raja, sistem membagi hak akses pengguna ke dalam tiga peran:
1. **Aktor Pelanggan / Pembeli (Akses Publik Terbatas pada `/` dan `/menu`):**
   - Melihat katalog menu minuman dan camilan yang menampilkan status ketersediaan secara *real-time* (otomatis bertuliskan **"BAHAN HABIS"** apabila salah satu bahan baku resep BOM di gudang tidak mencukupi).
   - Memilih kustomisasi varian minuman (Ukuran *Regular/Large/Jumbo*, Tingkat Gula, Level Es Batu, dan ekstra *Topping*) serta memasukkannya ke keranjang pesanan (*Tray*).
   - Memilih metode pembayaran (QRIS atau Tunai di Kasir) dan memantau status peracikan minuman secara langsung melalui *Live Order Tracker* (`OrderStatusOverlay`).
   - Mencari pesanan berdasarkan ID Pesanan, Nama, atau Nomor WhatsApp serta melihat/mengunduh **Struk Digital** melalui fitur **Lacak Pesanan & Struk** (`CustomerOrderTrackerModal`).
   - *Isolasi Keamanan & Proteksi Jam Tutup/Libur:* Pelanggan sama sekali tidak melihat tombol menuju halaman Kasir POS, Admin, maupun berkas presentasi. Selain itu, ketika kedai sedang libur atau ditutup oleh Administrator, akses katalog menu (`/menu`) otomatis terkunci dan menampilkan informasi resmi jadwal libur/operasional kedai.
2. **Aktor Kasir Merangkap Barista (Akses via 5x Tap Logo $\rightarrow$ `/pos`):**
   - Membuka akses login staf dengan mengetuk logo **TEH RAJA** sebanyak 5 kali berturut-turut, lalu masuk menggunakan akun kasir.
   - Membuka *shift* kasir dengan menginput modal uang kembalian awal (*starting cash*) dan menutup *shift* dengan menginput uang tunai fisik di laci (*actual cash*).
   - Menginput pesanan langsung di konter kasir, memilih metode pembayaran (Tunai dengan hitung kembalian otomatis, QRIS, atau Transfer), serta mencetak struk termal Bluetooth 58mm/80mm atau mengirim struk via WhatsApp.
   - Mengelola pesanan yang masuk dari ponsel pelanggan sekaligus memperbarui status peracikan (*Terima & Racik* $\rightarrow$ *Tandai Selesai*) langsung dari laci **Antrean & Struk** di halaman `/pos` tanpa perlu berpindah ke layar lain.
   - Menunda pesanan sementara (*Hold Order*) dan mencatat pengambilan uang laci untuk belanja mendadak pada fitur **Kas Keluar (Petty Cash)**.
3. **Aktor Administrator / Pemilik Kedai (Akses via 5x Tap Logo $\rightarrow$ `/admin`):**
   - Mengelola data master produk beserta pengaturan komposisi resep **Bill of Materials (BOM)** per gelas (jenis bahan baku dan kuantitas ml/gram/pcs yang dibutuhkan).
   - Memantau stok bahan baku gudang secara *real-time*, menerima peringatan bahan baku menipis (*low-stock alert*), mencatat pembelian bahan baku baru (*Restock PO* & kirim pesan PO ke WhatsApp suplier), serta melakukan penyesuaian stok fisik (*Stock Opname*).
   - Mengatur **Kunci Buka/Tutup Kedai & Pemesanan Online Pelanggan (*Lock/Unlock Online Store*)** secara *real-time* kapan saja (misalnya saat hari libur operasional, tanggal merah, atau di luar jam buka) beserta pesan pengumuman kustom sehingga pelanggan tidak dapat mengakses katalog menu saat kedai sedang tutup.
   - Memantau ringkasan omzet penjualan di *Dashboard* (dilengkapi filter per hari dan multi-*shift*), mengelola daftar transaksi di tab *Pesanan POS*, mengelola akun staf di tab *Karyawan*, serta melihat laporan keuangan di tab *Laba Rugi & Kas* (Pendapatan Kotor, estimasi HPP Bahan Baku, Kas Keluar, dan Laba Bersih) beserta ekspor laporan ke PDF/Excel CSV.

### 3.2.2 Kebutuhan Non-Fungsional
1. **Keandalan Luring (*Offline-First Reliability*):** Seluruh proses transaksi di `/pos` dan pemotongan stok BOM tetap berjalan lancar tanpa koneksi internet berkat penyimpanan lokal IndexedDB dan disinkronkan otomatis saat kembali daring.
2. **Proteksi Akses dan Rute (*Route Guard*):** Akses manual melalui URL browser ke `/pos` atau `/admin` oleh pengguna yang belum login melalui mekanisme *5x Tap Logo* akan langsung dialihkan (*redirect*) ke `/menu`.
3. **Kemudahan Penggunaan (*Single-Screen Ergonomics*):** Antarmuka `/pos` dirancang agar kasir yang merangkap *barista* dapat menyelesaikan transaksi dan memantau antrean racikan dengan minimal ketukan di layar tablet maupun ponsel.

## 3.3 Rencana Kerja dan Jadwal Pelaksanaan
Pelaksanaan project berlangsung selama 38 hari kerja efektif mulai tanggal 9 November hingga 31 Desember 2026 sebagaimana dirinci pada **Tabel 3.2**.

**Tabel 3.2** Jadwal Pelaksanaan Project PKL di Kedai Teh Raja (9 November – 31 Desember 2026)

| Minggu Ke- | Rentang Tanggal (2026) | Fokus Tahapan & Aktivitas Kerja | Luaran / Bukti Administratif |
| :---: | :--- | :--- | :--- |
| **I** | 9 – 13 November | Orientasi lapangan di Kedai Teh Raja, observasi alur kerja kasir merangkap *barista*, serta pendataan daftar menu dan takaran resep bahan baku (BOM) per *cup*. | Logbook F-06 Minggu I, Draf Kesepakatan F-05. |
| **II** | 16 – 20 November | Penandatanganan Lembar Kesepakatan Project (**F-05**), analisis kebutuhan sistem, perancangan skema database Firebase & relasi BOM. | **F-04 & F-05 Disahkan**, Bimbingan I–II (F-07), Laporan Kemajuan 1. |
| **III – IV** | 23 Nov – 5 Desember | Pembangunan fondasi Next.js 16, `lib/store.ts` (Zustand + IndexedDB + Firebase Sync), halaman Katalog Pelanggan (`/menu`), dan pengecekan stok BOM otomatis. | Kode modul pelanggan & *state management* inti, Logbook F-06 Minggu III–IV. |
| **V** | 7 – 11 Desember | Implementasi modul Kasir POS (`/pos`) terpadu untuk kasir merangkap *barista*, fitur Buka/Tutup *Shift*, Kas Kecil, QRIS, dan cetak struk *Web Bluetooth*. | Modul `/pos` selesai, Bimbingan III (F-07). |
| **VI** | 14 – 18 Desember | Implementasi panel Admin & Bahan Baku BOM (`/admin` — editor resep BOM, *Restock PO*, *Stock Opname*, Laba Rugi) serta penyerahan **Draf Bab I–III**. | **Tenggat 18 Des: Draf Bab I–III masuk ke DPP**, Bimbingan IV (F-07), Laporan Kemajuan 2. |
| **VII** | 21 – 25 Desember | Implementasi isolasi akses pembeli, fitur **Tap Logo 5x (`SecretStaffModal`)**, fitur **Lacak Pesanan & Struk (`CustomerOrderTrackerModal`)**, dan pengujian *Black-Box*. | Hasil uji fungsional 100% valid, Bimbingan V (F-07). |
| **VIII** | 28 – 31 Desember | Uji coba operasional langsung di gerai Teh Raja, pendampingan penggunaan sistem, serah terima hasil project, dan penilaian Pembimbing Lapangan. | **Penyerahan F-08 & F-09 (31 Des)**, Bimbingan VI (F-07). |

## 3.4 Perancangan Sistem dan Basis Data

### 3.4.1 Arsitektur Sistem *Offline-First* dan Alur Kerja Terpadu
Arsitektur aplikasi Web POS Teh Raja menggunakan pendekatan *Dual-Layer Persistence* yang menghubungkan penyimpanan lokal peramban (**IndexedDB**) dengan basis data awan (**Firebase Realtime Database**). Diagram arsitektur sistem diilustrasikan pada **Gambar 3.1**.

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                     LAPISAN ANTARMUKA PENGGUNA (NEXT.JS 16)                  │
│                                                                              │
│  ┌─────────────────────────┐          ┌───────────────────────────────────┐  │
│  │   MODE PELANGGAN PUBLIK │          │  MODE INTERNAL STAF (TAP LOGO 5X) │  │
│  │  • Beranda (/)          │          │  • Kasir POS & Antrean Racikan    │  │
│  │  • Katalog Menu (/menu) │          │    (/pos — Kasir Rangkap Barista) │  │
│  │  • Lacak Pesanan & Struk│          │  • Admin & Bahan Baku BOM (/admin)│  │
│  └────────────┬────────────┘          └─────────────────┬─────────────────┘  │
└───────────────┼─────────────────────────────────────────┼────────────────────┘
                │                                         │
                ▼                                         ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│           PUSAT LOGIKA BISNIS & STATE MANAGEMENT (lib/store.ts)              │
│   useAuthStore · useCartStore · useProductStore · useSalesStore              │
│   useInventoryStore (Mesin Pemotongan Bahan Baku BOM) · useExpenseStore      │
└───────────────┬─────────────────────────────────────────┬────────────────────┘
                │ (Tulis/Baca Lokal Instan)               │ (Sinkronisasi WebSocket)
                ▼                                         ▼
┌───────────────────────────────────┐     ┌────────────────────────────────────┐
│   PENYIMPANAN LOKAL (OFFLINE)     │     │   CLOUD REALTIME DATABASE          │
│   • IndexedDB (idb-keyval)        │◄───►│   • Firebase RTDB (JSON Tree)      │
│   • Offline Order & Log Queue     │     │   • Sinkronisasi Real-Time         │
└───────────────────────────────────┘     └────────────────────────────────────┘
```
**Gambar 3.1** Diagram Arsitektur *Offline-First* pada Sistem POS dan Manajemen Bahan Baku BOM Kedai Teh Raja

### 3.4.2 Perancangan Skema Basis Data NoSQL dan Relasi BOM
Basis data disusun menggunakan struktur pohon JSON pada Firebase Realtime Database yang disinkronkan secara dua arah oleh komponen [`components/FirebaseSync.tsx`](file:///d:/TEHRAJA/teh-raja/components/FirebaseSync.tsx). Spesifikasi koleksi data (*node*) utama disajikan pada **Tabel 3.3**.

**Tabel 3.3** Spesifikasi Struktur *Node* pada Firebase Realtime Database dan IndexedDB

| Nama *Node* | Kunci Utama (*Primary Key*) | Atribut Penting di Dalam Entitas | Fungsi Data dalam Sistem POS & BOM |
| :--- | :--- | :--- | :--- |
| `products` | `id` (`string`) | `name`, `price`, `category`, `stock`, `minStockThreshold`, `isAvailable`, `recipe[]` (`ingredientId`, `quantity`) | Menyimpan daftar menu penjualan beserta daftar komposisi bahan baku (`recipe` BOM) untuk 1 porsi produk. |
| `ingredients` | `id` (`string`) | `name`, `stock`, `unit` (`ml`, `gram`, `pcs`), `minStockThreshold` | Menyimpan saldo persediaan bahan baku gudang (teh, gula, susu, bubuk rasa, *cup*) yang terpotong otomatis saat transaksi. |
| `opnameLogs` | `id` (`string`) | `date`, `ingredientId`, `ingredientName`, `systemStock`, `actualStock`, `difference`, `notes` | Menyimpan riwayat penyesuaian stok fisik bahan baku (*stock opname*) di gudang. |
| `suppliers` | `id` (`string`) | `name`, `contactPerson`, `phone`, `address`, `itemsSupplied[]` | Menyimpan informasi pemasok bahan baku untuk pengiriman pesan *Purchase Order* (PO) via WhatsApp. |
| `orders` | `id` (`nanoid`) | `date`, `sessionId`, `items[]`, `subtotal`, `discount`, `total`, `customerName`, `cashierName`, `status` (`pending`, `awaiting_payment`, `processing`, `completed`, `cancelled`), `paymentMethod`, `orderType`, `tableNumber` | Menyimpan seluruh rekaman transaksi penjualan beserta relasi sesi *shift* kasir (`sessionId`) dan status racikannya. |
| `sessions` | `id` (`string`) | `cashierName`, `startTime`, `endTime`, `startingCash`, `totalSales`, `expectedCash`, `actualCash`, `cashExpenses`, `status` | Menyimpan rekaman pembukaan dan penutupan *shift* kasir (mendukung multi-sesi seperti **Shift 1** & **Shift 2** dalam satu hari) untuk rekonsiliasi uang fisik di laci. |
| `expenses` | `id` (`string`) | `date`, `sessionId`, `amount`, `description`, `category`, `paidVia`, `cashierName` | Menyimpan catatan pengeluaran kas kecil (*petty cash*) dari laci kasir per sesi *shift* maupun rekening toko. |
| `users` | `id` (`string`) | `username`, `password`, `role` (`admin` / `cashier`), `name` | Menyimpan kredensial staf kasir dan administrator untuk autentikasi *5x Tap Logo*. |

## 3.5 Implementasi Sistem Project

### 3.5.1 Implementasi Katalog Pelanggan dan Pelacakan Struk (`/menu`)
Halaman katalog pelanggan pada [`app/menu/page.tsx`](file:///d:/TEHRAJA/teh-raja/app/menu/page.tsx) menampilkan daftar menu yang terhubung langsung dengan ketersediaan stok bahan baku di gudang. Sebelum mengizinkan pelanggan menekan tombol **"Tambah ke Tray"**, sistem mengevaluasi apakah seluruh bahan baku pada resep BOM produk tersebut masih mencukupi untuk diracik (`isBomDepleted`). Apabila terdapat satu saja bahan baku penyusun yang habis (misalnya kemasan *cup* atau konsentrat teh kurang dari takaran 1 porsi), kartu produk secara otomatis menampilkan lencana merah **"BAHAN HABIS"** sehingga pelanggan tidak dapat memesan menu yang bahannya sedang kosong.

Setelah pelanggan mengirim pesanan melalui [`components/CartDrawer.tsx`](file:///d:/TEHRAJA/teh-raja/components/CartDrawer.tsx), layar ponsel pelanggan menampilkan [`components/OrderStatusOverlay.tsx`](file:///d:/TEHRAJA/teh-raja/components/OrderStatusOverlay.tsx) untuk memilih metode pembayaran (QRIS atau Tunai di Kasir) dan memantau tahapan peracikan minuman secara *real-time*. Pelanggan juga dapat membuka fitur **Lacak Pesanan & Struk** ([`components/CustomerOrderTrackerModal.tsx`](file:///d:/TEHRAJA/teh-raja/components/CustomerOrderTrackerModal.tsx)) kapan saja untuk mencari pesanannya serta melihat atau mengunduh **Struk Digital** ([`components/ReceiptModal.tsx`](file:///d:/TEHRAJA/teh-raja/components/ReceiptModal.tsx)).

### 3.5.2 Implementasi Proteksi Akses Rahasia Staf (*5x Tap Logo Authentication*)
Untuk memastikan pelanggan hanya dapat mengakses katalog menu serta pelacakan pesanan dan struk, seluruh tautan menuju halaman Kasir POS dan Admin disembunyikan dari tampilan publik pada [`app/page.tsx`](file:///d:/TEHRAJA/teh-raja/app/page.tsx) dan [`components/Navbar.tsx`](file:///d:/TEHRAJA/teh-raja/components/Navbar.tsx). Akses bagi staf dan admin diimplementasikan melalui komponen [`components/SecretStaffModal.tsx`](file:///d:/TEHRAJA/teh-raja/components/SecretStaffModal.tsx) yang mendeteksi lima ketukan cepat pada logo **TEH RAJA** dalam durasi 2,5 detik:

```typescript
// Potongan kode: components/SecretStaffModal.tsx
export function useSecretLogoTap(onUnlock: () => void) {
    const tapCountRef = useRef(0);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleLogoTap = useCallback(() => {
        tapCountRef.current += 1;
        if (timerRef.current) clearTimeout(timerRef.current);

        if (tapCountRef.current >= 5) {
            tapCountRef.current = 0;
            onUnlock();
            return;
        }
        timerRef.current = setTimeout(() => {
            tapCountRef.current = 0;
        }, 2500);
    }, [onUnlock]);

    return handleLogoTap;
}
```

Setelah staf mengetuk logo 5 kali dan memasukkan *username* serta *password* yang valid, modal menampilkan **Portal Akses Admin & Staf** untuk membuka halaman **Kasir POS (`/pos`)**, **Admin & Bahan Baku BOM (`/admin`)**, serta **Slide Presentasi PKL**. Apabila pengunjung yang belum login mencoba mengetik `/pos` atau `/admin` secara langsung di bilah alamat peramban, penjaga rute (*route guard*) otomatis mengalihkan mereka kembali ke halaman `/menu`.

### 3.5.3 Implementasi Terminal Kasir POS Terpadu untuk Kasir Merangkap Barista (`/pos`)
Halaman Kasir POS pada [`app/pos/page.tsx`](file:///d:/TEHRAJA/teh-raja/app/pos/page.tsx) dirancang khusus agar satu orang staf (kasir merangkap *barista*) dapat menangani seluruh operasional gerai dari satu layar:
1. **Buka & Tutup Multi-Shift Kasir Harian (`Shift 1` & `Shift 2`):** Saat mulai bertugas, kasir menginput modal uang kembalian di laci (*Starting Cash*). Apabila dalam satu hari gerai beroperasi dalam dua sesi pergantian staf (misalnya *Shift 1 Pagi* dan *Shift 2 Sore*), sistem secara otomatis menomori setiap sesi dan mengisolasi transaksi serta pengeluaran kas laci per sesi (`sessionId`). Saat tutup *shift*, [`components/ShiftSummaryModal.tsx`](file:///d:/TEHRAJA/teh-raja/components/ShiftSummaryModal.tsx) menyajikan rekapitulasi penjualan tunai, non-tunai, kas keluar, serta selisih kas secara terpisah untuk masing-masing *shift*.
2. **Transaksi Cepat & Kustomisasi Varian:** Kasir memilih produk, menentukan varian ukuran/gula/es/topping pada [`components/VariantModal.tsx`](file:///d:/TEHRAJA/teh-raja/components/VariantModal.tsx), memilih pembayaran (Tunai dengan nominal cepat, QRIS dinamis, atau Transfer), dan menyelesaikan pesanan dalam hitungan detik.
3. **Laci Antrean & Racikan dalam Satu Layar:** Pesanan mandiri dari ponsel pelanggan muncul pada tombol lonceng **Antrean & Struk** di bilah atas `/pos`. Kasir cukup membuka laci tersebut di layar yang sama, menekan **"Terima & Racik"** saat mulai membuat minuman, lalu menekan **"Tandai Selesai"** ketika minuman siap diserahkan.
4. **Pencatatan Kas Keluar (*Petty Cash*) & Cetak Struk Bluetooth:** Pengambilan uang laci untuk membeli es batu atau galon dicatat langsung melalui modal **Kas Keluar**, sedangkan pencetakan struk dilakukan melalui dialog cetak peramban, pengiriman ke WhatsApp pelanggan, atau printer termal Bluetooth via [`lib/bluetoothPrint.ts`](file:///d:/TEHRAJA/teh-raja/lib/bluetoothPrint.ts).

### 3.5.4 Implementasi Manajemen Bahan Baku Berbasis *Bill of Materials* (`/admin` & `lib/store.ts`)
Pengelolaan bahan baku dan resep minuman berpusat pada [`app/admin/page.tsx`](file:///d:/TEHRAJA/teh-raja/app/admin/page.tsx) dan `useInventoryStore` di [`lib/store.ts`](file:///d:/TEHRAJA/teh-raja/lib/store.ts). Pada tab **Menu & Resep BOM**, admin dapat mengatur komposisi bahan baku untuk setiap produk (misalnya menambahkan 15 ml Konsentrat Teh, 25 ml Gula Cair, 1 takar Es Batu, dan 1 pcs Cup Plastik).

Setiap kali terjadi checkout pesanan di `/pos` maupun `/menu`, fungsi `decrementIngredientsForOrder` secara otomatis memotong stok bahan baku di gudang:

```typescript
// Potongan kode asli: lib/store.ts (Pemotongan Bahan Baku Dinamis Sesuai Resep BOM & Varian)
decrementIngredientsForOrder: (items, products) => {
    set((state) => {
        const newIngredients = [...state.ingredients];
        items.forEach(cartItem => {
            const product = products.find(p => p.id === cartItem.id);
            const recipe = product?.recipe || cartItem.recipe;
            if (!recipe || recipe.length === 0) return;

            recipe.forEach(recipeItem => {
                const ingIndex = newIngredients.findIndex(i => i.id === recipeItem.ingredientId);
                if (ingIndex !== -1) {
                    const qtyToDeduct = calculateRecipeIngredientQty(recipeItem, cartItem);
                    newIngredients[ingIndex] = {
                        ...newIngredients[ingIndex],
                        stock: Math.max(0, Math.round((newIngredients[ingIndex].stock - qtyToDeduct) * 100) / 100)
                    };
                }
            });
        });

        const updates: Record<string, any> = {};
        newIngredients.forEach(ing => { updates[`ingredients/${ing.id}`] = ing; });
        if (Object.keys(updates).length > 0) {
            firebaseUpdate(ref(rtdb), updates).catch(err => console.warn(err));
        }
        return { ingredients: newIngredients };
    });
}
```

Selain itu, halaman Admin dilengkapi komponen **Filter Per Hari & Per Sesi Shift (`DayShiftFilterBar`)** pada tab *Dashboard*, *Pesanan POS*, serta *Laba Rugi & Kas*, sehingga pemilik kedai dapat memfilter dan mengekspor laporan (PDF, CSV, Excel) berdasarkan tanggal tertentu maupun sesi *shift* spesifik (`Shift 1` atau `Shift 2`).

Selanjutnya, pada tab **Bahan Baku & Suplier** di halaman Admin, pemilik dapat:
1. Memantau bar persentase sisa stok setiap bahan baku beserta lencana peringatan **Stok Menipis** apabila saldo berada di bawah batas aman (`minStockThreshold`).
2. Mencatat penambahan stok bahan baku baru melalui modal **Restock / Belanja Bahan (PO)** yang otomatis menambah saldo gudang, mencatat biaya belanja ke jurnal pengeluaran, dan menyediakan tombol kirim pesan pesanan (*Purchase Order*) langsung ke WhatsApp suplier.
3. Melakukan pencocokan stok fisik gudang melalui modal **Stock Opname** yang menghitung selisih antara stok sistem dan stok fisik aktual beserta riwayat audit opname.

## 3.6 Pengujian Sistem
Pengujian dilakukan menggunakan metode *Black-Box Testing* terhadap seluruh skenario utama sistem. Ringkasan hasil pengujian disajikan pada **Tabel 3.4**.

**Tabel 3.4** Hasil Pengujian Fungsional Sistem POS dan Manajemen Bahan Baku BOM (*Black-Box Testing*)

| Kode Uji | Modul & Skenario Pengujian | Prosedur Uji | Hasil yang Diharapkan | Hasil Aktual | Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **TC-01** | **Isolasi Akses Pelanggan & Proteksi Rute URL** | Membuka `/` dan `/menu` sebagai pembeli, lalu mencoba mengakses `/pos` dan `/admin` lewat URL browser tanpa login. | Tombol POS & Admin tidak terlihat di layar pembeli; akses URL langsung otomatis dialihkan (*redirect*) ke `/menu`. | Seluruh navigasi staf tersembunyi; akses URL tanpa izin otomatis dialihkan ke `/menu`. | **Valid (Lulus)** |
| **TC-02** | **Autentikasi Rahasia 5x Tap Logo** | Mengetuk logo **TEH RAJA** 5 kali berturut-turut dalam $< 2,5$ detik, lalu login dengan akun staf (`admin` / `123`). | Muncul modal login rahasia; setelah login sukses, terbuka Portal Akses menuju Kasir POS, Admin BOM, dan Slide Presentasi. | Modal terbuka tepat pada ketukan ke-5 dan memberikan akses penuh setelah verifikasi password. | **Valid (Lulus)** |
| **TC-03** | **Pemesanan Pelanggan & Lacak Struk Digital** | Memilih minuman + varian di `/menu`, mengirim pesanan, memilih bayar QRIS, lalu membuka tombol **Lacak Pesanan & Struk**. | Pesanan masuk ke sistem, progres racikan tampil *real-time*, dan pembeli dapat membuka serta mencetak struk digital. | Alur pemesanan mandiri, pelacakan status, dan tampilan struk berjalan akurat. | **Valid (Lulus)** |
| **TC-04** | **Transaksi Kasir Merangkap Barista (`/pos`)** | Membuka *shift* kasir, memproses transaksi tunai/QRIS, serta memperbarui status pesanan masuk (*Terima & Racik* $\rightarrow$ *Selesai*) dari laci antrean `/pos`. | Transaksi terekam, kembalian dihitung tepat, struk tercetak, dan status pesanan pelanggan berubah menjadi *Siap Diambil* dari 1 layar POS. | Seluruh fungsi transaksi dan manajemen antrean racikan berjalan lancar dalam 1 layar `/pos`. | **Valid (Lulus)** |
| **TC-05** | **Pemotongan & Pengembalian Stok Resep BOM** | Membeli 2 *cup Royale Milk Tea* di POS, memeriksa saldo bahan baku di `/admin`, lalu membatalkan pesanan tersebut. | Saldo Konsentrat Teh berkurang $30\text{ ml}$, Gula Cair berkurang $50\text{ ml}$, Es & Cup berkurang $2\text{ unit}$; saldo kembali utuh saat dibatalkan. | Pemotongan dan pengembalian stok bahan baku bekerja 100% presisi sesuai rasio resep BOM. | **Valid (Lulus)** |
| **TC-06** | **Deteksi Otomatis "Bahan Habis" pada Menu** | Mengubah stok salah satu bahan baku penyusun di bawah takaran 1 porsi, lalu membuka halaman `/menu` dan `/pos`. | Produk yang menggunakan bahan baku tersebut otomatis berstatus **BAHAN HABIS** dan tidak dapat dipesan. | Kartu produk langsung menampilkan lencana *HABIS* dan tombol tambah dinonaktifkan. | **Valid (Lulus)** |
| **TC-07** | **Multi-Shift Harian (`Shift 1` & `Shift 2`), Opname & Filter Laporan** | Membuka & menutup 2 sesi *shift* dalam 1 hari, mencatat *Kas Keluar* dan *Stock Opname*, lalu memfilter laporan Admin per hari & per sesi *shift*. | Setiap transaksi & kas laci terisolasi akurat antara *Shift 1* dan *Shift 2*; filter per hari & per *shift* menampilkan serta mengekspor data yang sesuai. | Rekonsiliasi uang kas antar *shift* terpisah presisi dan filter laporan berjalan akurat. | **Valid (Lulus)** |
| **TC-08** | **Ketahanan Mode Luring (*Offline-First*)** | Mematikan koneksi Wi-Fi pada perangkat kasir, memproses 3 transaksi di `/pos`, lalu menyalakan kembali Wi-Fi. | Transaksi tetap tersimpan di IndexedDB saat *offline* dan otomatis disinkronkan ke Firebase saat kembali *online*. | Tidak ada transaksi yang hilang; antrean luring berhasil tersinkronisasi penuh. | **Valid (Lulus)** |

## 3.7 Kendala Pelaksanaan dan Solusi Teknis
Selama pelaksanaan project di lokasi mitra, ditemukan tiga kendala teknis yang berhasil diatasi:
1. **Penyesuaian Antarmuka untuk Peran Ganda Kasir Merangkap Barista:**
   Pada rancangan awal, pemantauan antrean racikan diletakkan pada halaman terpisah. Namun karena di Kedai Teh Raja staf kasir merangkap sebagai *barista*, berpindah-pindah halaman justru memperlambat kerja. Solusi yang diterapkan adalah mengintegrasikan laci **Antrean & Struk** secara langsung di dalam halaman Kasir POS (`/pos`) sehingga kasir dapat menerima pembayaran sekaligus memperbarui status racikan dari satu layar yang sama.
2. **Sinkronisasi Status Ketersediaan Menu terhadap Stok Bahan Baku BOM:**
   Sebelumnya status ketersediaan menu hanya memeriksa atribut stok produk jadi (`product.stock`), sehingga ketika bahan baku seperti susu atau *cup* habis di gudang, menu masih tampak tersedia di layar pembeli. Solusi yang diterapkan adalah menambahkan pengecekan silang (`isBomDepleted`) terhadap seluruh item `recipe` pada `useInventoryStore` baik di halaman `/menu` maupun `/pos`.
3. **Pencegahan Akses Pelanggan ke Halaman Operasional Staf:**
   Agar pembeli yang membuka web menu tidak dapat masuk ke halaman Kasir POS dan Admin, seluruh tombol navigasi staf dihapus dari tampilan publik dan dipindahkan ke dalam modal rahasia **Tap Logo 5x (`SecretStaffModal`)**, disertai penjaga rute pasca-hidrasi IndexedDB (`useAuthStore.persist.hasHydrated()`).

---

# BAB IV
# HASIL, EVALUASI, DAN CAPAIAN PEMBELAJARAN

## 4.1 Hasil dan Luaran Project
Pelaksanaan Praktik Kerja Lapangan Berbasis Project ini menghasilkan luaran terverifikasi sebagai berikut:
1. **Produk Aplikasi Web POS & Inventori BOM (`Web POS Teh Raja`):** Aplikasi berbasis *Progressive Web App* (PWA) *Offline-First* yang telah lolos kompilasi produksi (`next build` dengan 0 error) dan siap dioperasikan pada perangkat tablet, ponsel pintar, maupun komputer kasir di Kedai Teh Raja.
2. **Repositori Kode Sumber Modular:** Kode sumber aplikasi dalam bahasa TypeScript yang terstruktur rapi pada folder `app/`, `components/`, `lib/`, `data/`, dan `public/`, serta terdokumentasi pada repositori Git (`https://github.com/JuxxxWildan10/teh-raja.git`).
3. **Dokumen Laporan Akhir & Materi Presentasi:** Mencakup Buku Laporan PKL sesuai sistematika Fakultas Ilmu Komputer UNU Cirebon serta berkas slide presentasi interaktif untuk Seminar Proposal dan Sidang Akhir PKL.

## 4.2 Evaluasi Target terhadap Realisasi (Formulir F-05)
Evaluasi ketercapaian project dilakukan dengan membandingkan spesifikasi target yang disepakati bersama Pembimbing Lapangan dan Dosen Pembimbing pada **Lembar Kesepakatan Project (Formulir F-05)** terhadap realisasi akhir. Hasil evaluasi disajikan pada **Tabel 4.1**.

**Tabel 4.1** Evaluasi Target terhadap Realisasi Berdasarkan Lembar Kesepakatan Project (Formulir F-05)

| No | Komponen Target pada Formulir F-05 | Spesifikasi Target Awal | Realisasi Akhir yang Dicapai | Persentase Capaian |
| :---: | :--- | :--- | :--- | :---: |
| 1 | **Modul Katalog Menu & Pelacakan Struk Pelanggan** | Katalog menu digital untuk pembeli dengan fitur keranjang pesanan. | Katalog interaktif (`/menu`) dengan validasi stok bahan baku BOM *real-time*, kustomisasi varian lengkap, pembayaran QRIS/Tunai, serta fitur **Lacak Pesanan & Struk Digital**. | **100% (Melampaui Target)** |
| 2 | **Modul Terminal Kasir POS (Kasir Merangkap Barista)** | Aplikasi kasir untuk mencatat transaksi penjualan dan mencetak struk. | Terminal *Smart POS* (`/pos`) dengan laci **Antrean & Racikan** dalam 1 layar, Buka/Tutup *Shift*, *Hold Order*, Kas Keluar (*Petty Cash*), QRIS dinamis, dan cetak struk *Web Bluetooth* / WhatsApp. | **100% (Melampaui Target)** |
| 3 | **Modul Manajemen Inventori Resep BOM** | Pencatatan stok bahan baku dan pemotongan otomatis saat produk terjual. | Editor resep *Bill of Materials* (BOM) per produk di `/admin`, pemotongan & pengembalian bahan baku otomatis (`decrementIngredientsForOrder`), *Low-Stock Alert*, *Stock Opname*, dan *Restock PO* Suplier. | **100% (Melampaui Target)** |
| 4 | **Modul Laporan Penjualan, Multi-Shift & Laba Rugi** | Rekapitulasi omzet penjualan harian bagi pemilik kedai. | *Dashboard* grafik penjualan, **Filter Per Hari & Per Sesi Shift** (mendukung 2+ *shift* dalam sehari), laporan **Laba Rugi & Kas (P&L)**, serta ekspor ke PDF dan CSV/Excel. | **100% (Melampaui Target)** |
| 5 | **Keandalan Offline-First & Keamanan Akses** | Aplikasi tetap berjalan saat koneksi lambat dan halaman staf terlindungi login. | Arsitektur *Offline-First PWA* (IndexedDB + Firebase RTDB) serta penyembunyian akses POS & Admin di balik mekanisme rahasia **Tap Logo 5x (`SecretStaffModal`)**. | **100% (Melampaui Target)** |

## 4.3 Manfaat bagi Mitra dan Keterbatasan Sistem

### 4.3.1 Manfaat Nyata bagi Mitra Kedai Teh Raja
1. **Mendukung Alur Kerja Kasir Merangkap Barista Secara Efisien:** Staf gerai cukup menggunakan satu perangkat di meja kasir (`/pos`) untuk menginput pesanan konter, menerima pesanan dari ponsel pembeli, memantau daftar minuman yang harus diracik, dan mencetak struk.
2. **Akurasi Pengendalian Bahan Baku Tanpa Hitung Manual:** Pemilik kedai dapat mengetahui sisa stok daun teh (ml), gula cair (ml), susu, bubuk rasa (gram), dan kemasan *cup* (pcs) setiap saat karena setiap penjualan otomatis memotong bahan baku sesuai takaran resep BOM.
3. **Transparansi Kas Laci Setiap Pergantian Shift:** Seluruh uang masuk (tunai maupun QRIS) dan uang keluar (*petty cash*) tercatat rapi sehingga meminimalkan selisih uang kas harian.

### 4.3.2 Keterbatasan Sistem pada Lingkup PKL Saat Ini
1. **Verifikasi Pembayaran QRIS Masih Konfirmasi Kasir:** Kode QRIS sudah dihasilkan secara dinamis sesuai nominal transaksi, namun perubahan status lunas masih dilakukan melalui tombol verifikasi oleh kasir setelah memeriksa bukti bayar pelanggan.
2. **Perencanaan Belanja Bahan Baku (*Restock*) Masih Berbasis Batas Ambang Minimum (*Threshold*):** Pada mode operasional PKL saat ini, peringatan belanja ulang bahan baku didasarkan pada batas stok minimum statis (`minStockThreshold`) dan belum mengaktifkan prediksi kebutuhan stok otomatis berbasis algoritma peramalan deret waktu (*time-series forecasting*).

## 4.4 Refleksi Capaian Pembelajaran dan Kompetensi Mahasiswa
Pelaksanaan project PKL ini memberikan penguatan kompetensi yang selaras dengan Capaian Pembelajaran Lulusan (CPL) Fakultas Ilmu Komputer UNU Cirebon:
1. **Kompetensi Teknis (*Hard Skills*):**
   - Kemampuan merancang arsitektur aplikasi web *Offline-First* menggunakan Next.js, TypeScript, Zustand, IndexedDB, dan Firebase Realtime Database.
   - Kemampuan menerjemahkan logika akuntansi persediaan *Bill of Materials* (BOM) dan rekonsiliasi kas *shift* ke dalam kode program yang bebas galat (*zero build error*).
2. **Kompetensi Non-Teknis (*Soft Skills*):**
   - Ketajaman analisis dalam menyesuaikan ruang lingkup perangkat lunak agar tepat guna dengan kondisi sumber daya manusia di lokasi mitra (satu operator kasir merangkap *barista*), bukan sekadar menumpuk fitur yang tidak terpakai.
   - Kedisiplinan manajemen waktu dalam memenuhi seluruh tenggat PKL Tahun Akademik 2026/2027 secara tepat waktu.

---

# BAB V
# PENUTUP

## 5.1 Kesimpulan
Berdasarkan hasil analisis kebutuhan, perancangan, implementasi, dan pengujian sistem yang telah dilaksanakan pada mitra Kedai Teh Raja, dapat disimpulkan tiga hal utama sebagai berikut:
1. Sistem **Point of Sale (POS) Teh Raja** berbasis *Progressive Web App* (PWA) dengan arsitektur *Offline-First* berhasil dirancang dan dibangun menggunakan Next.js 16, TypeScript, IndexedDB, dan Firebase Realtime Database. Penyatuan fitur transaksi kasir, laci antrean racikan, pencatatan kas kecil, pembukuan *shift*, dan pencetakan struk Bluetooth di dalam satu layar `/pos` terbukti sangat efektif mendukung alur kerja staf **kasir yang merangkap sebagai barista**, serta tetap berjalan lancar meskipun koneksi internet terputus.
2. Mekanisme manajemen inventori bahan baku berbasis **Bill of Materials (BOM)** berhasil diimplementasikan secara akurat pada modul Admin (`/admin`) dan `useInventoryStore`. Setiap transaksi penjualan secara otomatis memotong saldo bahan baku penyusun (dalam satuan `ml`, `gram`, dan `pcs`) sesuai komposisi resep per gelas, menandai menu **"BAHAN HABIS"** secara otomatis apabila salah satu bahan baku tidak mencukupi, serta memudahkan pemilik dalam melakukan *Restock PO* dan *Stock Opname*.
3. Isolasi hak akses antarmuka berhasil diterapkan melalui pemisahan tampilan publik dan autentikasi rahasia **Tap Logo 5x (`SecretStaffModal`)** beserta proteksi pengalihan rute otomatis (*route guard*). Dengan mekanisme ini, pembeli hanya dapat mengakses katalog menu serta fitur **Lacak Pesanan & Struk Digital**, sedangkan halaman internal Kasir POS dan Admin terlindungi dari akses publik.

## 5.2 Saran dan Rencana Pengembangan Lanjutan (Penelitian Skripsi)
Sebagai tindak lanjut dari hasil project PKL ini, penulis merumuskan saran operasional bagi mitra serta peta jalan pengembangan lanjutan untuk penelitian Tugas Akhir (Skripsi):
1. **Saran Operasional bagi Mitra (Kedai Teh Raja):**
   - Mengoperasikan aplikasi POS pada tablet atau ponsel Android dengan peramban Google Chrome serta melakukan *Stock Opname* fisik setiap akhir pekan agar saldo bahan baku digital pada sistem BOM senantiasa akurat.
2. **Rencana Pengembangan Lanjutan untuk Penelitian Skripsi (*Unlockable Advanced Modules*):**
   Sistem POS dan manajemen bahan baku BOM yang telah dibangun pada PKL ini menghasilkan basis data riwayat transaksi harian dan pemakaian bahan baku yang terstruktur. Fondasi ini telah dirancang secara modular (tersedia fitur *Unlock Pengembangan Lanjutan* pada panel Admin) untuk dikembangkan lebih lanjut pada penelitian Skripsi mendatang melalui penambahan:
   - **Implementasi Algoritma *Time-Series Demand Forecasting* (SMA, WMA, *Exponential Smoothing*, dan Evaluasi MAPE):** Mengolah data historis penjualan harian dari POS untuk memprediksi jumlah permintaan produk dan menghitung kebutuhan belanja bahan baku (*Safety Stock* & *Reorder Point*) secara ilmiah.
   - **Modul *Kitchen Display System* (KDS) Terpisah & Manajemen Multi-Cabang:** Mengaktifkan layar monitor antrean khusus dapur (`/kds`) serta pemantauan lintas cabang apabila di masa mendatang Kedai Teh Raja menambah jumlah karyawan khusus *barista* dan membuka cabang baru.
   - **Integrasi *AI Voice POS* & *Smart CRM Loyalty*:** Mengaktifkan fitur pemesanan berbasis suara dan rekomendasi *upselling* otomatis berbasis riwayat belanja member.

---

# DAFTAR PUSTAKA
*(Disusun menggunakan Gaya Sitasi IEEE sesuai Halaman 24 Buku Pedoman PKL FIKOM UNU Cirebon)*

[1] K. C. Laudon and J. P. Laudon, *Management Information Systems: Managing the Digital Firm*, 17th ed. Harlow, UK: Pearson Education, 2022.

[2] M. Firtman, *Learn Progressive Web Apps: Build Offline-Capable Web Applications with Service Workers and Web App Manifests*. Sebastopol, CA, USA: O'Reilly Media, 2021.

[3] R. S. Pressman and B. R. Maxim, *Software Engineering: A Practitioner's Approach*, 9th ed. New York, NY, USA: McGraw-Hill Education, 2020.

[4] L. Moroney, *The Definitive Guide to Firebase: Build Android, iOS, and Web Apps with Google's Mobile Platform*. Berkeley, CA, USA: Apress, 2021.

[5] J. Heizer, B. Render, and C. Munson, *Operations Management: Sustainability and Supply Chain Management*, 13th ed. Boston, MA, USA: Pearson, 2020.

[6] R. J. Hyndman and G. Athanasopoulos, *Forecasting: Principles and Practice*, 3rd ed. Melbourne, Australia: OTexts, 2021. [Online]. Tersedia: https://otexts.com/fpp3/

[7] Vercel Inc., "Next.js App Router Documentation," *Next.js Official Docs*, 2025. [Online]. Tersedia: https://nextjs.org/docs

[8] W3C Web Bluetooth Community Group, "Web Bluetooth Specification," *World Wide Web Consortium (W3C)*, 2024. [Online]. Tersedia: https://webbluetoothcg.github.io/web-bluetooth/

---

# LAMPIRAN
*(Sesuai Peta Formulir F-01 s.d. F-17 pada Halaman 22 Buku Pedoman PKL FIKOM UNU Cirebon)*

## Lampiran 1: Draf Isian Lembar Kesepakatan Project (Formulir F-05)

| Kolom Formulir F-05 | Isian Project Mahasiswa |
| :--- | :--- |
| **Nama Mahasiswa / NIM** | M. Yarzuq Wildani / 0402231058 |
| **Program Studi** | Teknik Informatika (`MTI36`) / Sistem Informasi (`MSI36`) |
| **Nama Mitra PKL** | Kedai Teh Raja |
| **Judul Project** | Rancang Bangun Sistem *Point of Sale* (POS) dan Manajemen Inventori Bahan Baku Berbasis *Bill of Materials* (BOM) dengan Arsitektur *Progressive Web App* pada Kedai Teh Raja |
| **Masalah Nyata Mitra** | Di Kedai Teh Raja, staf kasir merangkap sebagai *barista*. Pencatatan transaksi dan kustomisasi minuman masih manual, staf tidak sempat mencatat pemakaian bahan baku (teh, gula, susu, *cup*) setiap kali meracik sehingga stok sering selisih, serta kasir membutuhkan sistem yang tetap berjalan saat internet terputus. |
| **Ruang Lingkup & Spesifikasi Luaran** | 1. Aplikasi Web POS berbasis PWA *Offline-First* (Next.js + TypeScript + IndexedDB + Firebase RTDB).<br/>2. Modul Katalog Menu Pelanggan (`/menu`) + Fitur Lacak Pesanan & Struk Digital.<br/>3. Proteksi Akses Rahasia Staf via *5x Tap Logo* (`SecretStaffModal`).<br/>4. Modul Kasir POS Terpadu (`/pos`) untuk kasir merangkap *barista* + QRIS + Kas Kecil + Cetak Struk Bluetooth.<br/>5. Modul Admin & Inventori Bahan Baku BOM (`/admin`) untuk pengaturan resep per *cup*, pemotongan bahan otomatis, *Stock Opname*, *Restock PO*, dan Laporan Laba Rugi. |
| **Target Penyelesaian** | 9 November 2026 – 30 Desember 2026 (Serah terima hasil pada 31 Desember 2026). |
| **Hak Penggunaan Luaran** | Mitra Kedai Teh Raja memperoleh hak penuh untuk menggunakan perangkat lunak pada operasional gerai; mahasiswa berhak mempublikasikan laporan akademik dan melanjutkan pengembangan untuk penelitian Skripsi dengan menjaga kerahasiaan data transaksi mitra. |

---

## Lampiran 2: Ringkasan Logbook Kegiatan di Lokasi Mitra (Formulir F-06 — Total 112 Jam)

| Minggu | Rentang Tanggal | Uraian Singkat Kegiatan Harian di Mitra | Jam Kerja | Paraf PL |
| :---: | :--- | :--- | :---: | :---: |
| **I** | 9 – 13 Nov 2026 | Orientasi lingkungan kerja Kedai Teh Raja, observasi alur kerja kasir merangkap *barista*, serta pencatatan daftar menu beserta takaran resep bahan baku (BOM) per *cup*. | 20 Jam | *(Paraf)* |
| **II** | 16 – 20 Nov 2026 | Diskusi spesifikasi kebutuhan bersama Pembimbing Lapangan, penandatanganan **Formulir F-05**, perancangan skema basis data JSON Firebase, dan desain antarmuka POS & BOM. | 20 Jam | *(Paraf)* |
| **III** | 23 – 27 Nov 2026 | Inisialisasi project Next.js 16 & TypeScript, pembuatan `lib/store.ts` (Zustand Store + IndexedDB Offline-First), dan pembangunan halaman katalog pelanggan (`/menu`). | 14 Jam | *(Paraf)* |
| **IV** | 30 Nov – 4 Des 2026 | Implementasi komponen pemilihan varian minuman (`VariantModal`), keranjang belanja (`CartDrawer`), dan validasi otomatis stok bahan baku BOM pada katalog menu. | 14 Jam | *(Paraf)* |
| **V** | 7 – 11 Des 2026 | Pembangunan halaman Kasir POS terpadu (`/pos`) untuk kasir merangkap *barista*, laci antrean racikan, Buka/Tutup *Shift*, Kas Kecil, dan cetak struk *Web Bluetooth*. | 16 Jam | *(Paraf)* |
| **VI** | 14 – 18 Des 2026 | Pembangunan panel Admin & Bahan Baku BOM (`/admin`): editor resep BOM per produk, pemotongan bahan otomatis, *Stock Opname*, *Restock PO* Suplier, Laporan Laba Rugi, dan penyerahan Draf Bab I–III. | 14 Jam | *(Paraf)* |
| **VII–VIII** | 21 – 30 Des 2026 | Implementasi proteksi akses rahasia **Tap Logo 5x (`SecretStaffModal`)**, fitur **Lacak Pesanan & Struk (`CustomerOrderTrackerModal`)**, pengujian *Black-Box* bersama kasir mitra, dan serah terima luaran project (**F-08 & F-09**). | 14 Jam | *(Paraf)* |
| **Total** | **38 Hari Kerja** | **Seluruh target luaran F-05 tuntas 100% (Melampaui syarat minimum 105 jam di mitra)** | **112 Jam** | **Valid** |

---

## Lampiran 3: Ringkasan Kartu Bimbingan Dosen Pembimbing PKL (Formulir F-07 — 6 Kali Bimbingan)

| Bimbingan Ke- | Tanggal | Materi Konsultasi & Arahan Dosen Pembimbing | Tanda Tangan DPP |
| :---: | :--- | :--- | :---: |
| **1** | 16 November 2026 | Verifikasi topik project di mitra Kedai Teh Raja (fokus POS untuk kasir merangkap *barista* dan inventori bahan baku BOM) serta persetujuan Formulir F-05. | *(Paraf DPP)* |
| **2** | 20 November 2026 | Pemeriksaan Laporan Kemajuan 1: Analisis kebutuhan fungsional/non-fungsional, arsitektur *Offline-First*, dan skema relasi resep BOM pada Firebase. | *(Paraf DPP)* |
| **3** | 8 Desember 2026 | Konsultasi progres implementasi modul Kasir POS (`/pos`) satu layar dan fungsi pemotongan bahan baku otomatis (`decrementIngredientsForOrder`). | *(Paraf DPP)* |
| **4** | 18 Desember 2026 | Penyerahan dan evaluasi **Draf Bab I–III** (sesuai tenggat wajib 18 Desember 2026) serta pemeriksaan Laporan Kemajuan 2. | *(Paraf DPP)* |
| **5** | 29 Desember 2026 | Evaluasi hasil pengujian *Black-Box*, mekanisme keamanan akses *5x Tap Logo*, serta penyusunan Bab IV dan Bab V (termasuk peta pengembangan lanjutan untuk Skripsi). | *(Paraf DPP)* |
| **6** | 9 Januari 2027 | Pemeriksaan draf lengkap Bab I–V, verifikasi sitasi gaya IEEE, cek tingkat kemiripan (*similarity* $< 25\%$), dan persetujuan pendaftaran sidang (**F-10**). | *(Paraf DPP)* |
