# Proposal Pengembangan Sistem POS & Smart Recommendation "Teh Raja"

## 1. Latar Belakang
Dalam industri minuman kekinian yang semakin kompetitif, pelanggan seringkali menghadapi *choice overload* atau kebingungan dalam memilih menu karena banyaknya variasi rasa (Manis, Creamy, Fruity) dan nama menu yang unik. Di sisi operasional, staf seringkali harus mengulang penjelasan karakteristik rasa kepada setiap pelanggan, yang berpotensi memperpanjang antrean dan menurunkan efisiensi layanan.

**Teh Raja** hadir dengan solusi digital terintegrasi yang menggabungkan sistem *Point of Sale* (POS) modern dengan fitur **Smart Recommendation (AI Tea Sommelier)**. Sistem ini menggunakan algoritma cerdas untuk membantu pelanggan menemukan minuman yang paling sesuai dengan selera mereka secara instan, sekaligus memberikan alat manajemen yang kuat bagi pemilik toko.

## 2. Tujuan
1.  **Personalisasi Pengalaman Pelanggan**: Menyediakan fitur rekomendasi berbasis preferensi rasa (Euclidean Distance Algorithm) untuk membantu pelanggan memilih menu dengan percaya diri.
2.  **Digitalisasi Operasional**: Menggantikan pencatatan manual dengan sistem POS digital yang mendukung manajemen stok, sesi kasir (Buka/Tutup Toko), dan pencetakan struk.
3.  **Efisiensi Layanan**: Mempercepat proses pemesanan melalui antarmuka yang intuitif dan integrasi otomatis ke WhatsApp serta Firebase Realtime Database.
4.  **Akurasi Data**: Memastikan setiap transaksi dan pergerakan stok tercatat secara akurat untuk keperluan laporan harian dan analisis performa.

## 3. Manfaat
*   **Bagi Pelanggan**: Mendapatkan rekomendasi yang akurat sesuai selera, proses pemesanan yang cepat, dan kemudahan dalam melihat detail pesanan (struk digital).
*   **Bagi Kasir/Staff**: Mengurangi beban kerja dalam menjelaskan menu secara manual, meminimalkan kesalahan input pesanan, dan memudahkan proses rekap/laporan harian.
*   **Bagi Pemilik (Owner)**: Memiliki kontrol penuh terhadap inventaris, memantau kinerja toko secara real-time dari mana saja, dan mendapatkan data pelanggan untuk strategi pemasaran.

## 4. Flowchart Sistem
![Flowchart Sistem POS Teh Raja](public/images/flowchart_pos.png)

```mermaid
graph TD
    Start([Mulai]) --> Path{Pilih Jalur?}
    Path -- Pelanggan (Rekomendasi) --> Quiz[/Isi Kuis Preferensi Rasa/]
    Quiz --> Calc[Algoritma Kalkulasi Euclidean]
    Calc --> Show[/Tampilkan 3 Rekomendasi Terbaik/]
    Show --> AddCart[Tambah ke Keranjang]
    
    Path -- Kasir (Langsung) --> POS[Buka POS & Pilih Menu]
    POS --> AddCart
    
    AddCart --> Checkout[Proses Checkout]
    Checkout --> Pay{Pilih Pembayaran}
    Pay -- Tunai/Cash --> Cash[/Input Uang & Hitung Kembalian/]
    Pay -- QRIS/Transfer --> Sync[Verifikasi Pembayaran]
    
    Cash --> Final[Cetak Struk & Simpan ke Database]
    Sync --> Final
    Final --> Stock[Update Stok Otomatis]
    Stock --> End([Selesai])
```

## 5. Wireframe Aplikasi
Representasi tata letak antarmuka utama (High-Level Wireframe):

### A. Interface POS (Point of Sale)
Menampilkan tata letak layar kasir yang terbagi menjadi dua panel utama.

![Wireframe POS Interface](public/images/wireframe_pos.png)

```mermaid
graph TB
    subgraph Layar_POS
    direction TB
    Header["[Logo] [Nama Kasir] [Indikator Sesi] [TUTUP TOKO]"]
    
    subgraph Area_Utama
    direction LR
        subgraph Katalog_Produk
        direction TB
        Search["[ Cari Produk... ]"]
        Tabs["[SEMUA] [MINUMAN] [MAKANAN] [SNACK]"]
        Grid["Grid Produk: [Gambar, Nama, Harga, Tombol +]"]
        Search --- Tabs --- Grid
        end
        
        subgraph Panel_Keranjang
        direction TB
        List["Daftar Pesanan: Item x Qty = Subtotal"]
        InputCust["[ Nama Pelanggan * ] [ No Meja ]"]
        Summary["Total: Rp XXX.XXX"]
        BtnPay["[ PROSES & CETAK STRUK ]"]
        List --- InputCust --- Summary --- BtnPay
        end
    end
    Header --- Area_Utama
    end
```

### B. Interface AI Recommendation (Quiz)
Antarmuka interaktif bagi pelanggan untuk mendapatkan saran menu.

![Wireframe Quiz Interface](public/images/wireframe_quiz.png)

```mermaid
graph TB
    subgraph Layar_Quiz
    Title["JUDUL: Temukan Minuman Favoritmu!"]
    
    Step1["1. Seberapa manis yang kamu inginkan? (Slider 0-10)"]
    Step2["2. Lebih suka tekstur kental/creamy? (Slider 0-10)"]
    Step3["3. Ingin aroma buah/bunga yang kuat? (Slider 0-10)"]
    
    FinalBtn["[ LIHAT REKOMENDASI SAYA ]"]
    
    subgraph Hasil_Rekomendasi
    Cards["3 Kartu Rekomendasi Terbaik (Skor Kecocokan % + Tombol Beli)"]
    end
    
    Title --- Step1 --- Step2 --- Step3 --- FinalBtn --- Hasil_Rekomendasi
    end
```

## 6. Penutup
Sistem **Teh Raja** dirancang bukan hanya sebagai aplikasi kasir biasa, melainkan sebagai ekosistem digital yang meningkatkan *value* brand melalui kecerdasan buatan sederhana namun efektif. Dengan hardening yang telah dilakukan, sistem ini siap untuk diimplementasikan dalam skala produksi.
