# LAPORAN PRAKTIK KERJA LAPANGAN (PKL)
**PENGEMBANGAN SISTEM POINT OF SALE (POS) BERBASIS PROGRESSIVE WEB APP (PWA) DENGAN INTEGRASI WEB BLUETOOTH PRINTER PADA TEH RAJA**

---
*(Catatan: Pindahkan draf ini ke Microsoft Word dan sesuaikan format font/spasi sesuai pedoman kampus/sekolah Anda)*

## 1. BAGIAN AWAL
*(Bagian ini murni administratif, Anda harus membuatnya sendiri di Word)*
- **Halaman Sampul (Cover):** [TAMBAHKAN: Logo kampus, Judul, Nama Anda, NIM, Nama Kampus/Sekolah]
- **Lembar Pengesahan:** [TAMBAHKAN: Tanda tangan pembimbing instansi dan pembimbing kampus]
- **Lembar Pernyataan Keaslian:** [TAMBAHKAN: Tanda tangan di atas materai]
- **Kata Pengantar:** [TAMBAHKAN: Ucapan terima kasih kepada pihak-pihak terkait]
- **Daftar Isi, Daftar Gambar, Daftar Tabel, Daftar Lampiran**

---

## BAB I PENDAHULUAN

### 1.1 Latar Belakang
Perkembangan teknologi informasi saat ini mendorong berbagai sektor bisnis, termasuk industri Food and Beverage (F&B), untuk melakukan transformasi digital. Teh Raja adalah salah satu unit usaha F&B yang memiliki volume transaksi harian tinggi. Selama ini, pencatatan transaksi dan antrean pesanan masih rentan terhadap hilangnya data akibat kendala teknis (seperti listrik padam atau koneksi internet terputus) serta proses rekapitulasi data yang harus dilakukan secara manual.

Sistem *Point of Sale* (POS) tradisional seringkali tidak fleksibel karena harus diinstal pada satu mesin spesifik. Oleh karena itu, diperlukan sebuah sistem POS berbasis *Progressive Web App* (PWA) yang ringan, dapat diinstal silang platform (Android/Windows), dan dilengkapi kemampuan *Robust Offline Mode* serta terkoneksi langsung dengan Printer Thermal via Bluetooth tanpa perantara untuk menunjang kecepatan pelayanan kasir di lapangan.

### 1.2 Rumusan Masalah
1. Bagaimana merancang bangun aplikasi POS yang bisa digunakan secara luring (*offline*) saat koneksi tidak stabil, lalu melakukan sinkronisasi otomatis ke cloud?
2. Bagaimana cara mengintegrasikan antarmuka web secara langsung menuju perangkat keras kasir (Bluetooth Thermal Printer)?
3. Bagaimana mengelola varian produk yang dinamis (ukuran, level gula, level es) agar tidak menyulitkan staf kasir saat pesanan menumpuk?

### 1.3 Tujuan PKL
- **Tujuan Umum:** Mengimplementasikan ilmu rekayasa perangkat lunak ke dalam dunia kerja nyata melalui pembuatan sistem POS berskala instansi.
- **Tujuan Khusus:** Menghasilkan sistem POS Teh Raja berbasis PWA dengan fitur manajemen varian pesanan, sistem sinkronisasi luring (*offline mode queue*), dan integrasi Web Bluetooth API untuk efisiensi *printing*.

### 1.4 Manfaat PKL
- **Bagi Mahasiswa/Siswa:** Memperoleh pengalaman langsung dalam membangun aplikasi berstandar *Enterprise* dan menggunakan teknologi modern seperti React/Next.js dan Firebase.
- **Bagi Instansi (Teh Raja):** Memiliki sebuah perangkat lunak kasir mandiri yang mempercepat alur transaksi, mengamankan data transaksi tanpa kepanikan saat *offline*, dan meningkatkan kualitas mutu layanan.
- **Bagi Kampus/Sekolah:** Menjalin kerja sama yang baik dengan dunia industri.

### 1.5 Waktu dan Tempat PKL
- **Tempat:** Kedai / Manajemen Teh Raja [TAMBAHKAN: Alamat lengkap Teh Raja]
- **Waktu PKL:** [TAMBAHKAN: Tanggal Mulai s/d Tanggal Selesai]

---

## BAB II PROFIL INSTANSI
*(Informasi spesifik perusahaan harus Anda cari tahu dari pemilik Teh Raja atau staf di sana)*

### 2.1 Sejarah Instansi
[TAMBAHKAN: Jelaskan kapan Teh Raja berdiri, siapa pendirinya, dan mengapa dinamakan Teh Raja]

### 2.2 Struktur Organisasi
[TAMBAHKAN: Foto bagan struktur organisasi Teh Raja. Contoh hirarki: Owner -> Manager Operasional -> Kasir & Barista]

### 2.3 Visi dan Misi
[TAMBAHKAN: Tanyakan visi dan misi resmi Teh Raja kepada manajemen/pembimbing lapangan Anda]

### 2.4 Bidang Usaha / Kegiatan
Teh Raja bergerak di sektor industri Food & Beverage (Kulier), secara khusus berfokus pada penyajian minuman otentik berbasis olahan daun teh lokal premium yang dikombinasikan dengan campuran olahan susu, buah, dan teknik peracikan modern. 

---

## BAB III LANDASAN TEORI

### 3.1 Point of Sale (POS)
Sistem *Point of Sale* (POS) adalah terminal kasir modern terkomputerisasi yang digunakan untuk menyelesaikan transaksi ritel. Fungsi POS telah berevolusi dari sekadar mesin kasir elektronik menjadi pusat manajemen bisnis yang memantau penjualan, persediaan inventaris, dan rekam jejak pelanggan.

### 3.2 Progressive Web App (PWA)
*Progressive Web App* (PWA) merupakan metodologi dalam membangun perangkat lunak hibrida (gabungan aplikasi web dan *mobile*). PWA memungkinkan halaman web berjalan dengan performa sangat cepat, dapat diinstal ke layar *home screen* pengguna layaknya *native app*, dan mampu bekerja secara luring (*offline*) berkat teknologi *Service Worker*.

### 3.3 React dan Next.js
React.js adalah sebuah *library* JavaScript *open-source* pembuat User Interface. Sementara Next.js adalah *framework* mutakhir buatan Vercel untuk mempermudah pengerjaan sistem React melalui kapabilitas *Server-Side Rendering* (SSR) maupun *Static Site Generation* (SSG).

### 3.4 Firebase Realtime Database
Firebase adalah platform Backend-as-a-Service (BaaS) terpadu buatan Google. Sistem ini memanfaatkan fitur Realtime Database (NoSQL) yang memungkinkan data orderan tersinkronisasi antar berbagai *device* tanpa delay (waktu nyata).

### 3.5 Web Bluetooth API & ESC/POS
Protokol Web Bluetooth API mengizinkan aplikasi berbasis *browser* untuk mengontrol perangkat *Bluetooth Low Energy* secara langsung. Untuk memberikan perintah mekanik kepada printer termal kasir, digunakan bahasa markah standar yang bernama ESC/POS (*Epson Standard Code for Printers*).

---

## BAB IV PEMBAHASAN / HASIL PROJECT

### 4.1 Deskripsi Project
Proyek ini menghasilkan aplikasi kasir pintar bernama "Teh Raja POS". Aplikasi ini beroperasi sepenuhnya seakan-akan merupakan aplikasi terinstal berkat teknologi PWA. POS Teh Raja mendigitalkan rekap penjualan, memangkas proses mencetak bon, serta memberikan sistem antrean transaksi *real-time* dan *hold orders* bagi pelanggan yang mengantre panjang tanpa merusak alur kasir.

### 4.2 Analisis Kebutuhan
- **Kebutuhan Sistem:**
  - Aplikasi harus ringan (< 5MB) sehingga alat kasir (HP/Tablet murah) lancar menjalankan program.
  - Memori *Storage* (Zustand Cache & IndexedDB) digunakan untuk menjaga data transaksi di antrean saat koneksi terputus.
  - Sinkronisasi awan berbasis Firebase untuk pantauan *dashboard* para Admin.
- **Kebutuhan Pengguna (Staf & Admin):**
  - **Kasir:** Membutuhkan kemudahan menekan menu berdasarkan gambar, menyesuaikan varian gula/es/ukuran (upcharge +Rp2000), serta tombol "*print*" Bluetooth satu ketukan.
  - **Admin:** Membutuhkan *dashboard* yang kuat dan analitik grafik pesanan harian. Juga kemudahan mengatur kredensial staff Kasir.

### 4.3 Perancangan Sistem
- **Flowchart Kasir:** [TAMBAHKAN: Gambarlah flowchart. Contoh: Start -> Pilih Produk -> PopUp Varian Modifikasi -> Masuk Keranjang -> Bayar Tunai/QRIS -> Print Bluetooth -> End]
- **Use Case Diagram:** [TAMBAHKAN: Gambar aktor 'Kasir' memiliki aksi 'Input Order' & 'Print', aktor 'Admin' memiliki aksi 'Kelola Akun', 'Edit Produk', 'View Laporan']

### 4.4 Implementasi
Pada tahap pengerjaan (*deployment*), sistem dibagi ke dalam dua antarmuka utama:
1. **Layar POS (Point of Sale):** Memuat ratusan produk, kustomisasi dinamis pesanan, tab kasir harian (*Shift Summary*), penangguhan fitur (*Hold Order*), dan terhubung ke Service Worker (SW.js) untuk menyimpan pesanan secara kokoh meski koneksi *drop*.
2. **Layar Administrator:** Dilindungi sistem Multi-Akun statis. Meliputi grafik *Sales* interaktif, dan penambahan akun *Staff* serta inventaris di dalam satu halaman yang fleksibel.

*(Catatan Laporan: Screenshot tampilan halaman "Halaman Kasir", "Menu Varian Gula/Es", "Dashboard Admin", dan "Popup Bluetooth" HARUS diletakkan di bagian ini)*

### 4.5 Pengujian Sistem
- **Skenario Pengujian 1 (Robust Offline Queue):** Alat *Wi-Fi* dimatikan secara manual, kemudian beberapa orderan dicoba diinput oleh kasir.
  - *Hasil:* Order berhasil tersimpan di sistem Luring (*LocalStorage*). Saat *Wi-Fi* dinyalakan, program menjalankan injeksi balik dengan perintah `flushOrders` dan semua data masuk seketika ke Firebase tanpa bentrokan susunan indeks.
- **Skenario Pengujian 2 (Thermal Printer Test via ESC/POS):**
  - *Hasil:* Browser Chrome berhasil mendeteksi "Generic Bluetooth Printer". Alih-alih merender file PDF, sistem mencetak serangkaian *bytes* di mana instruksi `this.cut()` berhasil memicu pisau mesin kasir dan struk terpotong secara mekanis dengan lebar 48 CPL (80mm kertas).

---

## BAB V PENUTUP

### 5.1 Kesimpulan
Selama pelaksanaan Praktik Kerja Lapangan (PKL), penulis berhasil merancang dan mendistribusikan Sistem Kasir tingkat Lanjut (Enterprise POS PWA) untuk operasional manajemen Teh Raja. Solusi *Robust Offline Queue* secara dramatis menyelamatkan efisiensi pencatatan dari insiden hilangnya koneksi, dan terobosan fitur cetak langsung API Web Bluetooth menghilangkan latensi dari klik (*print prompt*) konvensional. Sistem ini sangat stabil digunakan pada kondisi *rush hour*.

### 5.2 Saran
1. **Pengembangan Sistem:** Sistem yang ada saat ini dapat diperluas dengan memberikan *Loyalty Program / Poin Member* terintegrasi Whatsapp OTP, serta penambahan koneksi *Payment Gateway* QRIS dinamis di masa depan.
2. **Bagi Instansi:** Disarankan menggunakan HP/Tablet kasir minimal Android 10 atau Windows 11 dengan peramban Google Chrome terbaru (V120+) agar perizinan dan manajemen konektivitas perangkat keras berjalan mulus.
3. **Bagi Mahasiswa/Siswa Berikutnya:** Bisa mengeksplorasi penggunaan perpustakaan manajemen antrean (*Queue Middleware*) taraf lebih besar jika *volume* transaksi mencapai angka ribuan per menit di _branch_ gabungan perusahaan Teh Raja.

---

## 7. DAFTAR PUSTAKA
[TAMBAHKAN: Masukkan referensi jurnal terkait POS atau web PWA. Atau referensi URL manual dokumentasi React/Next.js]
Contoh:
- Vercel Next.js Team. (2024). *Next.js Documentation*. Diakses dari https://nextjs.org/docs
- Google Developers. (2024). *Web Bluetooth API Specification*. Diakses dari https://developer.chrome.com/articles/bluetooth/
- Meta Platforms. (2024). *React Global State with Zustand*. Diakses dari https://docs.pmnd.rs/zustand/

## 8. LAMPIRAN
[TAMBAHKAN: Masukkan:]
1. Foto Anda (penulis) saat sedang memprogram atau menguji mesin di kedai Teh Raja.
2. Foto mesin Thermal Printer Bluetooth 80mm dan Struk fisiknya (yang sudah di-*print* oleh aplikasi).
3. Surat Penerimaan PKL.
4. Log / Jurnal Harian kegiatan (contoh: Hari 1 mendesain PWA, Hari 2 setting Firebase, dst).
