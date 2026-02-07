Panduan Penyusunan Laporan Skripsi: TEH RAJA
Dokumen ini berisi materi teknis dan teoritis yang bisa Anda "Copy-Paste" dan sesuaikan untuk BAB 1, 3, dan 4 skripsi Anda.

📌 Rekomendasi Judul Skripsi
Pilih salah satu yang paling Anda kuasai:

"Implementasi Metode Content-Based Filtering Menggunakan Algoritma Euclidean Distance untuk Sistem Rekomendasi Pemesanan Minuman pada Teh Raja" (Fokus ke Algoritma - Paling Disarankan).
"Rancang Bangun Sistem Informasi Penjualan dan Rekomendasi Menu Berbasis Web dengan Pendekatan User-Centered Design pada Teh Raja" (Fokus ke Desain/UI).
"Penerapan Single Page Application (SPA) Menggunakan Next.js untuk Optimalisasi Performa Website E-Commerce Teh Raja" (Fokus ke Teknologi Web).
📄 BAB 1: Pendahuluan (Latar Belakang)
Masalah: Pelanggan sering merasa bingung memilih menu minuman karena banyaknya variasi rasa (Manis, Creamy, Fruity) dan nama menu yang unik. Pelayan toko sering kewalahan menjelaskan rasa satu per satu saat antrian panjang.

Solusi: Dibutuhkan sistem "Smart Menu" yang dapat bertindak sebagai Virtual Sommelier. Sistem ini tidak hanya menampilkan daftar menu, tetapi dapat memberikan rekomendasi cerdas berdasarkan preferensi rasa pengguna secara spesifik (tingkat kemanisan, tekstur, dan aroma) menggunakan algoritma perhitungan kemiripan (similarity matching).

🔬 BAB 3: Metodologi Penelitian
1. Metode Algoritma: Content-Based Filtering (Vector Space Model)
Sistem ini memandang setiap produk sebagai sebuah "Vektor" dalam ruang 3 dimensi.

Atribut Vektor Produk ($P$):

$x$: Sweetness (Kemanisan) [0-10]
$y$: Creaminess (Kekentalan) [0-10]
$z$: Fruity/Floral (Aroma) [0-10]
Input Data User ($U$): User memberikan preferensi mereka melalui slider, misal: User ingin manis (8), tidak creamy (2), dan sangat fruity (9). Maka $U = (8, 2, 9)$.

Rumus Perhitungan (Euclidean Distance): Sistem menghitung jarak antara Keinginan User ($U$) dengan Setiap Produk ($P_i$) yang ada di database.

$$D(U, P_i) = \sqrt{(U_x - P_{ix})^2 + (U_y - P_{iy})^2 + (U_z - P_{iz})^2}$$

Semakin KECIL nilai $D$ (Jarak), semakin COCOK produk tersebut dengan selera user.
Sistem kemudian mengurutkan produk dari jarak terkecil ke terbesar dan mengambil 3 produk teratas.
💻 BAB 4: Implementasi & Pembahasan
1. Arsitektur Sistem
Frontend: Next.js 14 (App Router) - Framework React untuk performa tinggi dan rendering server-side.
Styling: Tailwind CSS - Untuk desain antarmuka yang responsif dan modern (Glassmorphism).
State Management: Zustand - Mengelola data keranjang belanja dan sinkronisasi data Admin ke User secara real-time (Client-side state).
Animation: Framer Motion - Memberikan pengalaman interaktif yang premium.
2. Fitur Unggulan (Hasil Pembahasan)
AI Tea Sommelier: Modul kuis interaktif yang mengimplementasikan rumus Euclidean Distance secara live. Tidak memerlukan refresh halaman.
Dynamic CMS (Content Management System):
Admin dapat menambah/mengedit/menghapus produk.
Fitur spesial: Admin dapat mengatur "Bobot Rasa" (Sweet/Creamy/Fruity) untuk setiap produk baru, yang otomatis akan mengubah hasil rekomendasi algoritma.
Smart Cart & WhatsApp Integration:
Sistem keranjang belanja yang persisten (tidak hilang saat di-refresh).
Checkout otomatis mengonversi pesanan menjadi format pesan WhatsApp yang rapi, memudahkan operasional toko tanpa backend database yang kompleks.
❓ Prediksi Pertanyaan Sidang & Jawaban
Q: Kenapa memilih Next.js bukan PHP/Laravel biasa? A: Karena Next.js menggunakan arsitektur SPA (Single Page Application). Perpindahan antar halaman jauh lebih cepat (tanpa reload), memberikan UX (User Experience) setara aplikasi mobile native, yang sangat penting untuk mempertahankan engagement pelanggan di era modern.

Q: Apakah datanya disimpan di Database? A: Untuk skala prototipe skripsi ini, data menggunakan Local Storage Persistence dan simulasi State Global. Namun, struktur datanya (JSON) sudah dirancang agar siap dihubungkan ke database nyata (seperti MongoDB atau PostgreSQL) dengan mudah di masa depan (Scalable).

Q: Apa keunggulan algoritma Anda dibanding sekadar filter biasa (IF-ELSE)? A: Filter biasa bersifat biner (Ya/Tidak). Algoritma Euclidean Distance memberikan Skor Kecocokan (Ranking). Misal, jika tidak ada produk yang 100% cocok, algoritma tetap akan memberikan produk yang "paling mendekati" (Best Alternative), sehingga peluang penjualan tetap terjadi.