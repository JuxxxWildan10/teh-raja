# 📚 CONTEKAN LENGKAP STRUKTUR FOLDER & FUNGSI FILE — WEB POS TEH RAJA

> **Dokumen Pegangan Belajar & Sidang PKL / Sempro**
> **Nama Mahasiswa:** M. Yarzuq Wildani (`0402231058`)
> **Arsitektur Sistem:** Next.js 16 (App Router) + TypeScript + Tailwind CSS + Zustand (IndexedDB Offline-First) + Firebase Realtime Database + Google Gemini AI

---

## 🗺️ 1. Gambaran Besar Peta Folder (Directory Tree)

```text
teh-raja/
├── app/                                # 📁 Halaman Web (Frontend Routes) & Endpoint API (Backend)
│   ├── layout.tsx                      # Kerangka utama seluruh halaman (Root Layout, Toast, FirebaseSync)
│   ├── globals.css                     # Styling global, warna tema (Forest Green & Gold), dan aturan cetak struk
│   ├── page.tsx                        # Halaman Beranda (Landing Page Pelanggan + Tap 5x Logo Rahasia)
│   ├── menu/
│   │   └── page.tsx                    # Halaman Katalog Menu Pelanggan (Self-Order, Filter, Promo, Kuis AI)
│   ├── pos/
│   │   └── page.tsx                    # Halaman Kasir Point of Sale (Transaksi, QRIS, Voice AI, Kas Kecil, Hold)
│   ├── kds/
│   │   └── page.tsx                    # Halaman Kitchen Display System (Layar Antrean Racikan Barista/Dapur)
│   ├── admin/
│   │   └── page.tsx                    # Halaman Dashboard Admin ERP (12 Tab Manajemen, BOM, Laba Rugi, AI)
│   └── api/                            # 📁 Backend Serverless API Routes
│       ├── payment/qris/route.ts       # API pembuat kode QRIS dinamis sesuai nominal transaksi
│       └── ai/
│           ├── voice-pos/route.ts      # API pengubah suara kasir menjadi item keranjang (Gemini AI)
│           ├── crm-upsell/route.ts     # API rekomendasi penawaran menu tambahan (Upselling) untuk member
│           └── forecast/route.ts       # API prediksi stok & penjualan dengan Weighted Moving Average + Gemini AI
│
├── components/                         # 📁 Komponen UI Reusable (Dipakai di berbagai halaman)
│   ├── Navbar.tsx                      # Navigasi atas pelanggan + detektor Tap 5x Logo + tombol Lacak Struk
│   ├── SecretStaffModal.tsx            # Modal Login Rahasia (Tap Logo 5x) & Portal Akses Admin/POS/KDS/Slide
│   ├── CustomerOrderTrackerModal.tsx   # Modal Pelanggan untuk mencari pesanan, lacak status live, & cetak struk
│   ├── CartDrawer.tsx                  # Laci keranjang belanja pelanggan (hitung diskon promo, poin, & checkout)
│   ├── OrderStatusOverlay.tsx          # Layar progres pesanan real-time pelanggan (Pilih QRIS/Kasir -> Diracik -> Siap)
│   ├── VariantModal.tsx                # Pop-up kustomisasi minuman (Ukuran Cup, Gula, Es, & Topping)
│   ├── ReceiptModal.tsx                # Pop-up Struk Digital & Thermal 58mm (Cetak, Bluetooth, & Kirim WhatsApp)
│   ├── RecommendationQuiz.tsx          # Kuis interaktif "AI Tea Sommelier" pencari minuman sesuai mood pelanggan
│   ├── FirebaseSync.tsx                # Jembatan sinkronisasi otomatis 2 arah antara Browser & Firebase RTDB
│   ├── ShiftSummaryModal.tsx           # Laporan penutupan shift kasir (rekonsiliasi uang fisik vs sistem)
│   ├── ReportGenerator.tsx             # Pembuat laporan penjualan & ekspor data (PDF / Excel CSV)
│   ├── ConfirmModal.tsx                # Pop-up konfirmasi keamanan (sebelum hapus data / kosongkan keranjang / logout)
│   ├── Toast.tsx                       # Notifikasi pop-up sudut layar (Sukses, Peringatan, Error)
│   ├── PWAInstall.tsx                  # Tombol instalasi aplikasi ke layar HP/Tablet (Progressive Web App)
│   └── forecast/
│       └── ForecastDashboard.tsx       # Komponen visualisasi grafik & tabel perbandingan 5 metode peramalan
│
├── lib/                                # 📁 Otak Logika Bisnis, State Management, Database & Utilitas
│   ├── store.ts                        # INTI SISTEM: 7 Zustand Store + IndexedDB Offline-First + Logika BOM/Stok
│   ├── firebase.ts                     # Konfigurasi koneksi ke Firebase Realtime Database
│   ├── gemini.ts                       # Konfigurasi koneksi ke Google Gemini AI SDK
│   ├── recommendation.ts               # Rumus rekomendasi minuman (Euclidean Distance / pencocokan rasa)
│   ├── printer.ts                      # Format cetak struk thermal standar (58mm/80mm)
│   ├── bluetoothPrint.ts               # Driver cetak struk langsung ke printer thermal Bluetooth (ESC/POS)
│   └── forecast/                       # 📁 Mesin Matematika Peramalan (Time-Series Forecasting Engine)
│       ├── data.ts                     # Generator & pengolah data deret waktu (time-series) penjualan harian
│       ├── models.ts                   # Rumus 5 metode: SMA, WMA, SES, Holt's Linear, & Regresi Linear
│       ├── metrics.ts                  # Rumus akurasi error: MAE, RMSE, MAPE, dan R-Squared (R²)
│       └── engine.ts                   # Orkestrator yang menjalankan semua model & memilih model terbaik otomatis
│
├── data/                               # 📁 Master Data Awal (Seed Data)
│   └── menu.ts                         # Data produk awal Teh Raja (Nama, Harga, Gambar, Rasa, & Resep BOM)
│
└── public/                             # 📁 File Statis Publik, PWA & Slide Presentasi
    ├── manifest.json                   # Konfigurasi PWA (agar web bisa di-install seperti aplikasi Android/iOS)
    ├── sw.js                           # Service Worker untuk caching aset saat mode offline
    ├── presentasi_sempro_tehraja.html  # Slide Presentasi Seminar Proposal (Fokus Web POS)
    ├── presentasi_pkl_tehraja.html     # Slide Presentasi Laporan Akhir PKL (Fokus Web POS)
    └── images/                         # Gambar produk, wireframe, dan diagram flowchart
```

---

## 🔍 2. Penjelasan Mendalam Fungsi Setiap Folder & File

### A. Folder `app/` — Halaman Utama & Backend API (Next.js App Router)

Di Next.js App Router, setiap subfolder di dalam `app/` yang memiliki file `page.tsx` otomatis menjadi **URL halaman web**, dan yang memiliki `route.ts` menjadi **endpoint API backend**.

| Nama File | URL / Endpoint | Fungsi Utama & Hal Penting yang Perlu Kamu Ketahui |
| :--- | :--- | :--- |
| [`app/layout.tsx`](file:///d:/TEHRAJA/teh-raja/app/layout.tsx) | Semua Halaman | **Kerangka Induk Aplikasi**. Memuat font Google (*Playfair Display* & *Inter*), memasang `ToastProvider` (notifikasi), dan menjalankan `<FirebaseSync />` di latar belakang agar semua halaman selalu terhubung ke database real-time. |
| [`app/globals.css`](file:///d:/TEHRAJA/teh-raja/app/globals.css) | Semua Halaman | **Pusat Desain & CSS**. Mengatur variabel warna khas Teh Raja (`--color-forest: #0D2B20`, `--color-gold: #D4AF37`), efek kaca (*glassmorphism*), serta aturan `@media print` untuk mencetak struk kasir ukuran 58mm. |
| [`app/page.tsx`](file:///d:/TEHRAJA/teh-raja/app/page.tsx) | `/` | **Landing Page Pelanggan**. Menampilkan carousel menu unggulan, tombol menuju katalog `/menu`, dan tombol **Lacak Pesanan & Struk**. **Fitur Rahasia:** Jika logo **Teh Raja** diketuk **5x**, akan memunculkan `SecretStaffModal` untuk login Admin/Staf. |
| [`app/menu/page.tsx`](file:///d:/TEHRAJA/teh-raja/app/menu/page.tsx) | `/menu` | **Halaman Self-Order Pelanggan**. Tempat pembeli melihat katalog menu, mencari minuman, melihat banner promo aktif, menggunakan kuis *AI Tea Sommelier*, memilih varian topping, dan memantau pesanan. Otomatis menandai menu **"BAHAN HABIS"** jika salah satu bahan baku resep (BOM) di gudang tidak cukup. |
| [`app/pos/page.tsx`](file:///d:/TEHRAJA/teh-raja/app/pos/page.tsx) | `/pos` | **Halaman Kasir Point of Sale (POS)**. Jantung operasional kasir. Memiliki fitur: Buka/Tutup Shift Kasir, Katalog Cepat, Keranjang Kasir, Perhitungan Diskon & Poin Member otomatis, AI Voice Command (pesan lewat suara), AI Upsell Hint, Hold/Resume Order, Kas Keluar (*Petty Cash*), Antrean Pesanan Masuk dari Web Pelanggan, Pembayaran Tunai/QRIS/Transfer, dan Cetak Struk. **Terproteksi:** Hanya bisa diakses jika staf/admin sudah login. |
| [`app/kds/page.tsx`](file:///d:/TEHRAJA/teh-raja/app/kds/page.tsx) | `/kds` | **Halaman Kitchen Display System (Layar Dapur/Barista)**. Menampilkan pesanan yang berstatus `processing` (Sedang Diracik) dengan urutan FIFO (*First-In First-Out*) dan indikator waktu tunggu (SLA), serta tab Antrean Masuk. Barista cukup klik **"Selesai Diracik"** maka layar HP pelanggan otomatis berubah menjadi **"Pesanan Siap!"**. |
| [`app/admin/page.tsx`](file:///d:/TEHRAJA/teh-raja/app/admin/page.tsx) | `/admin` | **Halaman Dashboard Admin ERP (12 Modul)**. Pusat kendali manajemen toko yang berisi 12 tab: <br>1. **Dashboard** (Ringkasan omzet, grafik, ekspor laporan)<br>2. **Laba Rugi / P&L** (Pendapatan kotor, HPP/COGS 40%, pengeluaran kas kecil, laba bersih)<br>3. **Menu & Resep BOM** (CRUD produk + pengaturan takaran bahan baku per cup)<br>4. **Analitik BI** (Grafik jam sibuk, produk terlaris, analisis varian ukuran/gula/es)<br>5. **Inventaris & Suplier** (Stok bahan baku, Restock PO, Stock Opname fisik, Data Suplier)<br>6. **Pesanan** (Manajemen seluruh transaksi, filter status, batalkan order & kembalikan stok)<br>7. **Promo Engine** (Buat promo diskon persen/nominal dengan syarat minimum belanja)<br>8. **Loyalty CRM** (Database pelanggan member, poin loyalitas, riwayat belanja)<br>9. **Multi Cabang** (Pindah cabang aktif & perbandingan performa antar cabang)<br>10. **Karyawan** (Manajemen akun Admin & Kasir)<br>11. **Log Aktivitas** (Audit trail semua tindakan staf & riwayat tutup shift)<br>12. **AI Forecast** (Peramalan stok & penjualan berbasis Time-Series + Gemini AI). |
| [`app/api/payment/qris/route.ts`](file:///d:/TEHRAJA/teh-raja/app/api/payment/qris/route.ts) | `POST /api/payment/qris` | **API Pembayaran QRIS**. Menerima `orderId` dan `total`, lalu menghasilkan payload QRIS standar EMVCo beserta gambar QR Code untuk di-scan oleh pelanggan maupun di layar kasir. |
| [`app/api/ai/voice-pos/route.ts`](file:///d:/TEHRAJA/teh-raja/app/api/ai/voice-pos/route.ts) | `POST /api/ai/voice-pos` | **API Voice Command Kasir**. Menerima transkrip suara kasir (misal: *"Dua Royale Milk Tea ukuran Large less sugar"*), lalu menggunakan Gemini AI (dan fallback parser cerdas) untuk menerjemahkannya menjadi JSON daftar item + varian yang langsung masuk ke keranjang POS. |
| [`app/api/ai/crm-upsell/route.ts`](file:///d:/TEHRAJA/teh-raja/app/api/ai/crm-upsell/route.ts) | `POST /api/ai/crm-upsell` | **API Smart CRM Upselling**. Menganalisis riwayat pesanan member dan isi keranjang saat ini untuk memberikan kalimat saran penawaran kepada kasir (contoh: *"Tawarkan tambahan Cireng Crispy karena pelanggan ini sering memesan camilan"*). |
| [`app/api/ai/forecast/route.ts`](file:///d:/TEHRAJA/teh-raja/app/api/ai/forecast/route.ts) | `POST /api/ai/forecast` | **API Hybrid AI Demand Forecasting**. Menghitung proyeksi penjualan 7 hari ke depan menggunakan algoritma **Weighted Moving Average (WMA)**, membandingkan dengan stok produk & bahan baku saat ini, lalu meminta Gemini AI menyusun analisis narasi dan rekomendasi jumlah restock. |

---

### B. Folder `components/` — Komponen Antarmuka (UI) & Modal

Folder ini menyimpan potongan komponen yang dipanggil oleh halaman-halaman di `app/`.

| Nama File | Dipakai Di | Fungsi Utama |
| :--- | :--- | :--- |
| [`components/Navbar.tsx`](file:///d:/TEHRAJA/teh-raja/components/Navbar.tsx) | `/menu` | Navbar khusus pelanggan. Menampilkan logo **TEH RAJA** (dengan fitur **Tap 5x** untuk membuka login admin), link *Beranda*, *Menu Kami*, *AI Sommelier*, tombol **Lacak Pesanan & Struk**, indikator pesanan aktif, dan tombol Keranjang (Tray). |
| [`components/SecretStaffModal.tsx`](file:///d:/TEHRAJA/teh-raja/components/SecretStaffModal.tsx) | `/` & `/menu` | **Modal Akses Rahasia Admin (Tap Logo 5x)**. Berisi hook `useSecretLogoTap` (mendeteksi 5 ketukan dalam 2,5 detik). Saat belum login, menampilkan form login Admin/Kasir. Saat sudah login, menampilkan **Portal Akses Cepat** ke `/pos`, `/admin`, `/kds`, Slide Sempro, Slide Laporan Akhir, serta tombol **Kunci Akses (Logout)**. |
| [`components/CustomerOrderTrackerModal.tsx`](file:///d:/TEHRAJA/teh-raja/components/CustomerOrderTrackerModal.tsx) | `/` & `/menu` | **Modal Lacak Pesanan & Struk Pelanggan**. Memungkinkan pembeli memantau pesanan aktifnya atau mencari pesanan berdasarkan **ID Pesanan**, **Nama**, atau **No. WhatsApp**, melihat rincian status peracikan, dan mencetak/mengunduh struk digital kapan saja. |
| [`components/CartDrawer.tsx`](file:///d:/TEHRAJA/teh-raja/components/CartDrawer.tsx) | `/menu` | **Drawer Keranjang Belanja Pelanggan**. Mengelola item yang dipilih pembeli, mengecek ketersediaan stok & bahan baku BOM, menghitung diskon promo otomatis, menukar/menambah poin member via nomor WA, mendeteksi nomor meja dari URL (`?meja=5`), dan mengirim pesanan baru ke POS/KDS. |
| [`components/OrderStatusOverlay.tsx`](file:///d:/TEHRAJA/teh-raja/components/OrderStatusOverlay.tsx) | `/menu` | **Layar Live Order Tracker Pelanggan**. Muncul otomatis setelah pelanggan checkout di `/menu`. Menampilkan tahapan: *1. Diterima (Pilih Bayar QRIS / Tunai di Kasir) -> 2. Menunggu Verifikasi Kasir -> 3. Sedang Diracik Barista -> 4. Pesanan Siap Diambil!*, lengkap dengan tombol **Struk**. |
| [`components/VariantModal.tsx`](file:///d:/TEHRAJA/teh-raja/components/VariantModal.tsx) | `/menu` & `/pos` | **Modal Kustomisasi Minuman**. Pop-up untuk memilih Ukuran Cup (`Regular`, `Large +Rp3.000`, `Jumbo +Rp5.000`), Kadar Gula (`Normal`, `Less Sugar`, `No Sugar`), Suhu/Es (`Normal Ice`, `Less Ice`, `No Ice`, `Warm`), dan ekstra Topping (`Boba`, `Grass Jelly`, `Pudding`, `Cheese Foam`). |
| [`components/ReceiptModal.tsx`](file:///d:/TEHRAJA/teh-raja/components/ReceiptModal.tsx) | `/pos`, `/admin`, `/menu` | **Modal Struk Transaksi**. Menampilkan struk bergaya printer kasir dengan QR Code verifikasi, tombol **Cetak Printer Browser (58mm)**, tombol **Cetak Printer Thermal Bluetooth**, dan tombol **Kirim Struk ke WhatsApp Pelanggan**. |
| [`components/RecommendationQuiz.tsx`](file:///d:/TEHRAJA/teh-raja/components/RecommendationQuiz.tsx) | `/menu` | **Kuis AI Tea Sommelier**. Antarmuka 3 pertanyaan interaktif (preferensi manis, tekstur creamy/segar, dan aroma buah/klasik) untuk mencarikan menu Teh Raja yang paling cocok bagi pelanggan. |
| [`components/FirebaseSync.tsx`](file:///d:/TEHRAJA/teh-raja/components/FirebaseSync.tsx) | `app/layout.tsx` | **Mesin Sinkronisasi Real-Time & Offline Queue**. Mendengarkan perubahan data di Firebase Realtime Database (`products`, `orders`, `ingredients`, `suppliers`, `promos`, `customers`, `expenses`, `branches`, `users`) dan langsung memperbarui tampilan di semua perangkat tanpa *refresh*. Jika internet mati, menyimpan transaksi di antrean lokal dan mengirimnya otomatis saat internet kembali menyala. |
| [`components/ShiftSummaryModal.tsx`](file:///d:/TEHRAJA/teh-raja/components/ShiftSummaryModal.tsx) | `/pos` & `/admin` | **Modal Rekap Tutup Shift Kasir**. Menampilkan perbandingan antara *Expected Cash* (uang tunai menurut sistem: Modal Awal + Penjualan Tunai - Kas Keluar) dengan *Actual Cash* (uang fisik yang dihitung kasir), lengkap dengan rincian selisih (*discrepancy*). |
| [`components/ReportGenerator.tsx`](file:///d:/TEHRAJA/teh-raja/components/ReportGenerator.tsx) | `/admin` | **Generator Laporan Eksekutif**. Mengekspor data penjualan, rincian item terjual, dan metrik keuangan menjadi dokumen **PDF siap cetak** (`jsPDF` + `jspdf-autotable`) maupun file **CSV/Excel**. |
| [`components/ConfirmModal.tsx`](file:///d:/TEHRAJA/teh-raja/components/ConfirmModal.tsx) | `/pos` & `/admin` | Modal konfirmasi standar sebelum melakukan aksi krusial (seperti menghapus produk, membatalkan pesanan, mereset database, atau keluar dari akun). |
| [`components/Toast.tsx`](file:///d:/TEHRAJA/teh-raja/components/Toast.tsx) | Semua Halaman | Sistem notifikasi pop-up interaktif (`toast.success`, `toast.error`, `toast.warning`, `toast.info`). |
| [`components/PWAInstall.tsx`](file:///d:/TEHRAJA/teh-raja/components/PWAInstall.tsx) | Semua Halaman | Mendaftarkan Service Worker (`sw.js`) dan menangani banner instalasi aplikasi PWA di perangkat pengguna. |
| [`components/forecast/ForecastDashboard.tsx`](file:///d:/TEHRAJA/teh-raja/components/forecast/ForecastDashboard.tsx) | `/admin` (Tab AI Forecast) | **Dashboard Komparasi Peramalan Akademik**. Menampilkan grafik garis interaktif, kartu pemenang model terbaik (MAPE terendah), tabel perbandingan error (MAE, RMSE, MAPE, $R^2$) untuk 5 metode statistik, dan rekomendasi restock bahan baku. |

---

### C. Folder `lib/` — Otak Logika Bisnis, Database & Perhitungan

Jika penguji bertanya *"Di mana logika pemotongan stok, penyimpanan data, atau rumus peramalannya?"*, jawabannya ada di folder `lib/` ini!

| Nama File | Fungsi Utama & Detail Teknis |
| :--- | :--- |
| [`lib/store.ts`](file:///d:/TEHRAJA/teh-raja/lib/store.ts) | **INTI STATE MANAGEMENT & LOGIKA BISNIS**. Berisi **7 Zustand Store** yang semuanya disimpan secara lokal di **IndexedDB (`idb-keyval`)** dan disinkronkan ke **Firebase RTDB**:<br>1. `useAuthStore`: Login staf/admin, daftar karyawan (`users`), dan sesi user.<br>2. `useCartStore`: Keranjang belanja, item varian, kalkulasi subtotal, dan `activeOrderId` pelanggan.<br>3. `useProductStore`: Daftar menu produk, tambah/edit/hapus menu, serta fungsi `decrementStock` & `restoreStock`.<br>4. `useSalesStore`: Data pesanan (`orders`), log audit (`logs`), sesi buka/tutup shift kasir (`sessions`), *hold orders*, multi-cabang (`branches`), dan analitik (`getDailySales`, `getProductPopularity`, `getPeakHours`).<br>5. `useInventoryStore`: Stok bahan baku (`ingredients`), data suplier (`suppliers`), fungsi **`decrementIngredientsForOrder`** (pemotongan bahan baku otomatis sesuai resep BOM saat transaksi terjadi), dan `restoreIngredientsForOrder` (pengembalian bahan baku saat pesanan dibatalkan).<br>6. `usePromoStore`: Daftar aturan promo dan fungsi `getApplicablePromo(subtotal)` untuk mencari diskon terbaik secara otomatis.<br>7. `useCustomerStore`: Data member CRM, perhitungan perolehan poin (Rp 10.000 = 1 poin), dan penukaran poin (1 poin = Rp 500).<br>8. `useExpenseStore`: Pencatatan kas keluar / *petty cash* (`expenses`). |
| [`lib/firebase.ts`](file:///d:/TEHRAJA/teh-raja/lib/firebase.ts) | **Inisialisasi Firebase SDK**. Menghubungkan aplikasi ke Firebase Realtime Database (`rtdb`) menggunakan kredensial dari `.env.local`. |
| [`lib/gemini.ts`](file:///d:/TEHRAJA/teh-raja/lib/gemini.ts) | **Inisialisasi Google Gemini AI**. Menyediakan instance model Gemini (`gemini-2.0-flash`) untuk dipakai oleh fitur Voice POS, CRM Upsell, dan AI Demand Forecasting. |
| [`lib/recommendation.ts`](file:///d:/TEHRAJA/teh-raja/lib/recommendation.ts) | **Algoritma Rekomendasi Menu**. Menghitung jarak kemiripan (*Euclidean Distance*) antara preferensi rasa pengguna (`sweet`, `creamy`, `fruity` skala 1–10) dengan atribut rasa setiap produk untuk mengurutkan 3 minuman yang paling cocok. |
| [`lib/printer.ts`](file:///d:/TEHRAJA/teh-raja/lib/printer.ts) & [`lib/bluetoothPrint.ts`](file:///d:/TEHRAJA/teh-raja/lib/bluetoothPrint.ts) | **Modul Cetak Struk Kasir**. Mengonversi data pesanan menjadi perintah byte **ESC/POS** untuk dikirim langsung ke printer thermal Bluetooth 58mm melalui *Web Bluetooth API*, atau dicetak melalui dialog print browser. |
| [`lib/forecast/data.ts`](file:///d:/TEHRAJA/teh-raja/lib/forecast/data.ts) | Mengolah riwayat pesanan menjadi data deret waktu (*time-series*) harian per produk maupun agregat toko. |
| [`lib/forecast/models.ts`](file:///d:/TEHRAJA/teh-raja/lib/forecast/models.ts) | Implementasi rumus matematika murni 5 model peramalan: **SMA** (*Simple Moving Average*), **WMA** (*Weighted Moving Average*), **SES** (*Single Exponential Smoothing*), **DES / Holt's Linear Trend**, dan **Linear Regression (OLS)**. |
| [`lib/forecast/metrics.ts`](file:///d:/TEHRAJA/teh-raja/lib/forecast/metrics.ts) | Menghitung metrik evaluasi akurasi peramalan: **MAE** (*Mean Absolute Error*), **MSE**, **RMSE** (*Root Mean Squared Error*), **MAPE** (*Mean Absolute Percentage Error*), dan koefisien determinasi **$R^2$**. |
| [`lib/forecast/engine.ts`](file:///d:/TEHRAJA/teh-raja/lib/forecast/engine.ts) | Menjalankan kelima model sekaligus pada data historis, membandingkan nilai error-nya, menentukan **Best Model** secara otomatis berdasarkan MAPE terkecil, dan menghitung rekomendasi *Safety Stock* & *Reorder Point (ROP)*. |

---

### D. Folder `data/` & `public/` — Data Awal & Aset Statis

| Nama File | Fungsi Utama |
| :--- | :--- |
| [`data/menu.ts`](file:///d:/TEHRAJA/teh-raja/data/menu.ts) | **Master Data Menu Awal**. Berisi daftar produk default Teh Raja (seperti *Royale Milk Tea*, *The Great Matcha Latte*, *Tropical Mango Tea*, dll.) beserta harga, kategori, skor atribut rasa (`sweet`, `creamy`, `fruity`), dan komposisi resep awal (`recipe` BOM). |
| [`public/presentasi_sempro_tehraja.html`](file:///d:/TEHRAJA/teh-raja/public/presentasi_sempro_tehraja.html) | **File Slide Presentasi Seminar Proposal (Sempro)**. Presentasi HTML interaktif 10 slide yang membahas Latar Belakang, Rumusan Masalah, Batasan, Tujuan, dan Metodologi Perancangan Sistem Web POS Teh Raja. |
| [`public/presentasi_pkl_tehraja.html`](file:///d:/TEHRAJA/teh-raja/public/presentasi_pkl_tehraja.html) | **File Slide Presentasi Laporan Akhir PKL**. Presentasi HTML interaktif 12 slide yang membahas Hasil Implementasi, Arsitektur Sistem, Fitur POS, KDS, BOM Inventory, Pengujian Black-Box, dan Kesimpulan. |
| [`public/manifest.json`](file:///d:/TEHRAJA/teh-raja/public/manifest.json) & [`public/sw.js`](file:///d:/TEHRAJA/teh-raja/public/sw.js) | File konfigurasi **PWA (Progressive Web App)** dan *Service Worker* agar aplikasi memiliki ikon, nama, dan kemampuan berjalan secara *offline-first*. |

---

## 🔄 3. Contekan Alur Kerja Sistem (Bagaimana File Saling Terhubung)

### Alur 1: Pelanggan Memesan Sendiri dari Meja (`/menu`) hingga Minuman Siap
1. **Pilih Menu & Varian:** Pelanggan membuka [`app/menu/page.tsx`](file:///d:/TEHRAJA/teh-raja/app/menu/page.tsx) -> klik produk -> [`components/VariantModal.tsx`](file:///d:/TEHRAJA/teh-raja/components/VariantModal.tsx) muncul -> item masuk ke `useCartStore` di [`lib/store.ts`](file:///d:/TEHRAJA/teh-raja/lib/store.ts).
2. **Checkout Keranjang:** Pelanggan membuka [`components/CartDrawer.tsx`](file:///d:/TEHRAJA/teh-raja/components/CartDrawer.tsx) -> sistem otomatis mengecek promo di `usePromoStore` dan stok/BOM di `useInventoryStore` -> pelanggan klik **"Kirim Pesanan Sekarang"**.
3. **Pemotongan Stok & Sinkronisasi Real-Time:** `CartDrawer.tsx` memanggil `addOrder()`, `decrementStock()`, dan `decrementIngredientsForOrder()` di [`lib/store.ts`](file:///d:/TEHRAJA/teh-raja/lib/store.ts) -> data langsung dikirim ke Firebase RTDB dan ditangkap oleh [`components/FirebaseSync.tsx`](file:///d:/TEHRAJA/teh-raja/components/FirebaseSync.tsx).
4. **Pilih Metode Bayar & Lacak Live:** Di layar pelanggan, [`components/OrderStatusOverlay.tsx`](file:///d:/TEHRAJA/teh-raja/components/OrderStatusOverlay.tsx) terbuka otomatis -> pelanggan memilih **Bayar via QRIS** (memanggil [`app/api/payment/qris/route.ts`](file:///d:/TEHRAJA/teh-raja/app/api/payment/qris/route.ts)) atau **Bayar Tunai di Kasir**.
5. **Verifikasi Kasir (`/pos`):** Di layar kasir [`app/pos/page.tsx`](file:///d:/TEHRAJA/teh-raja/app/pos/page.tsx), muncul notifikasi dering & badge merah **"Pesanan Masuk"** -> Kasir memverifikasi pembayaran dan klik **"Terima & Racik (KDS)"** (status berubah menjadi `processing`).
6. **Peracikan Barista (`/kds`):** Pesanan langsung muncul di layar dapur [`app/kds/page.tsx`](file:///d:/TEHRAJA/teh-raja/app/kds/page.tsx) -> Barista meracik minuman lalu klik **"Selesai Diracik"** (status berubah menjadi `completed`).
7. **Pesanan Selesai & Struk:** Layar HP pelanggan di [`components/OrderStatusOverlay.tsx`](file:///d:/TEHRAJA/teh-raja/components/OrderStatusOverlay.tsx) atau [`components/CustomerOrderTrackerModal.tsx`](file:///d:/TEHRAJA/teh-raja/components/CustomerOrderTrackerModal.tsx) langsung berubah menjadi **"Pesanan Siap! 🎉"** dan pelanggan bisa melihat/mengunduh struk lewat [`components/ReceiptModal.tsx`](file:///d:/TEHRAJA/teh-raja/components/ReceiptModal.tsx).

---

### Alur 2: Cara Kerja Akses Rahasia Admin (Tap Logo 5x) & Unlock Fitur Pengembangan Lanjutan (Skripsi)
1. Pembeli biasa yang membuka `/` ([`app/page.tsx`](file:///d:/TEHRAJA/teh-raja/app/page.tsx)) atau `/menu` ([`app/menu/page.tsx`](file:///d:/TEHRAJA/teh-raja/app/menu/page.tsx)) **tidak melihat tombol apa pun** ke `/pos`, `/kds`, `/admin`, maupun file presentasi.
2. Jika pembeli nekat mengetik `/pos`, `/kds`, atau `/admin` di URL browser, sistem otomatis menahan akses dan meminta autentikasi staf.
3. Saat Admin/Staf mengetuk logo **TEH RAJA** sebanyak **5 kali cepat** (dalam waktu < 2,5 detik), hook `useSecretLogoTap` di [`components/SecretStaffModal.tsx`](file:///d:/TEHRAJA/teh-raja/components/SecretStaffModal.tsx) membuka modal **Akses Rahasia Admin**.
4. Setelah Admin memasukkan username (`admin` / `kasir`) dan password (`123`), `loginWithPassword()` di [`lib/store.ts`](file:///d:/TEHRAJA/teh-raja/lib/store.ts) menyimpan sesi login.
5. **Mode Default PKL (`isAdvancedUnlocked: false`):** Secara bawaan, aplikasi mengunci fitur-fitur tingkat lanjut dan hanya menampilkan **POS Satu Layar (Kasir merangkap Barista) + Manajemen Bahan Baku Resep (BOM) + 6 Tab Inti Admin** (`Dashboard`, `Menu & Resep BOM`, `Bahan Baku & Suplier`, `Pesanan POS`, `Laba Rugi & Kas`, `Karyawan`).
6. **Cara Unlock Fitur Pengembangan Lanjutan / Skripsi (1 Klik):** Jika saat sidang Dosen Penguji bertanya *"Bagaimana rencana pengembangan selanjutnya?"*, kamu cukup klik tombol **`🔒 Mode PKL (POS & BOM)`** di navbar atas [`app/admin/page.tsx`](file:///d:/TEHRAJA/teh-raja/app/admin/page.tsx) atau tombol **`Unlock Semua Fitur Lanjutan`** di dalam modal **Tap Logo 5x** ([`components/SecretStaffModal.tsx`](file:///d:/TEHRAJA/teh-raja/components/SecretStaffModal.tsx)). Seketika seluruh fitur lanjutan (**AI Demand Forecasting, Layar Dapur KDS Terpisah `/kds`, AI Voice POS, Tea Sommelier Quiz, Promo Engine, Loyalty CRM, Multi-Cabang, Analitik BI, & Log Aktivitas**) langsung terbuka!

---

## 🎯 4. Contekan Cepat Saat Ditanya Dosen Penguji

| Jika Dosen Penguji Bertanya... | Tunjukkan File Ini |
| :--- | :--- |
| *"Tunjukkan di mana struktur database dan state aplikasi disimpan!"* | [`lib/store.ts`](file:///d:/TEHRAJA/teh-raja/lib/store.ts) dan [`components/FirebaseSync.tsx`](file:///d:/TEHRAJA/teh-raja/components/FirebaseSync.tsx) |
| *"Bagaimana cara kerja pemotongan bahan baku otomatis (Bill of Materials / BOM)?"* | Fungsi `decrementIngredientsForOrder` di [`lib/store.ts`](file:///d:/TEHRAJA/teh-raja/lib/store.ts) dan editor resep di [`app/admin/page.tsx`](file:///d:/TEHRAJA/teh-raja/app/admin/page.tsx) |
| *"Kenapa di aplikasi ini tidak ada layar KDS dapur terpisah?"* | Jelaskan bahwa di Kedai Teh Raja **1 kasir merangkap barista**, sehingga antrean racik disatukan di **Laci Antrean & Struk 3 Tab** pada [`app/pos/page.tsx`](file:///d:/TEHRAJA/teh-raja/app/pos/page.tsx). Lalu tunjukkan bahwa modul `/kds`, AI Forecasting, dan CRM sudah disiapkan di balik tombol **Unlock Pengembangan Lanjutan**! |
| *"Bagaimana keamanan akses agar pelanggan tidak bisa masuk ke halaman Kasir atau Admin?"* | [`components/SecretStaffModal.tsx`](file:///d:/TEHRAJA/teh-raja/components/SecretStaffModal.tsx) (fitur *5x Tap Logo* + state `isAdvancedUnlocked`) |
| *"Di mana kodingan rumus peramalan (Forecasting) jika nanti di-unlock untuk Skripsi?"* | [`lib/forecast/models.ts`](file:///d:/TEHRAJA/teh-raja/lib/forecast/models.ts), [`lib/forecast/metrics.ts`](file:///d:/TEHRAJA/teh-raja/lib/forecast/metrics.ts), dan [`app/api/ai/forecast/route.ts`](file:///d:/TEHRAJA/teh-raja/app/api/ai/forecast/route.ts) |
| *"Bagaimana cara kerja cetak struk kasir dan kirim struk ke WhatsApp?"* | [`components/ReceiptModal.tsx`](file:///d:/TEHRAJA/teh-raja/components/ReceiptModal.tsx) dan [`lib/bluetoothPrint.ts`](file:///d:/TEHRAJA/teh-raja/lib/bluetoothPrint.ts) |


