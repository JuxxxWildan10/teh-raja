# PROPOSAL PRAKTIK KERJA LAPANGAN (PKL)
**PENGEMBANGAN SISTEM POINT OF SALE (POS) "TEH RAJA" BERBASIS PROGRESSIVE WEB APP (PWA) DENGAN ARSITEKTUR OFFLINE-FIRST DAN SINKRONISASI FIREBASE REALTIME DATABASE**

---

## 1. Latar Belakang
Di era digitalisasi UMKM, kecepatan dan keandalan sistem transaksi sangat krusial. Sistem kasir tradisional seringkali bergantung penuh pada koneksi internet yang stabil, sehingga transaksi dapat terhambat saat terjadi gangguan jaringan. Oleh karena itu, Teh Raja membutuhkan sebuah sistem kasir (Point of Sale) modern yang tidak hanya dapat beroperasi secara *offline* tanpa hambatan, namun juga mampu menyinkronkan data secara seketika (*real-time*) ke layar dapur (Kitchen Display System) dan Dasbor Admin ketika koneksi internet kembali tersedia.

## 2. Tujuan Pengembangan
1. Membangun aplikasi kasir berbasis web yang dapat di-*install* di tablet/HP layaknya aplikasi *native* menggunakan teknologi **Progressive Web App (PWA)**.
2. Menerapkan arsitektur **Offline-First** menggunakan IndexedDB sehingga kasir tetap bisa beroperasi normal memproses pesanan walau tidak ada jaringan internet.
3. Menghubungkan pesanan Kasir dengan Layar Dapur (KDS) dan Dasbor Admin secara *real-time* memanfaatkan **Firebase Realtime Database**.
4. Menyediakan sistem pelaporan cerdas berbasis AI dan integrasi cetak struk Thermal Bluetooth.

## 3. Arsitektur Sistem
Aplikasi ini dibangun dengan *Tech Stack* modern:
* **Frontend:** Next.js (React), Tailwind CSS, Framer Motion.
* **State Management (Lokal):** Zustand + IndexedDB (untuk menyimpan ribuan antrean transaksi secara lokal sebelum dikirim ke server).
* **Backend & Database:** Firebase Authentication (Keamanan Login) & Firebase Realtime Database (Penyimpanan Cloud).

---

## 4. Konsep Database (Bahan Jawaban Sidang)

Jika penguji/dosen bertanya: *"Bagaimana relasi database-nya?"*

**Jawaban Anda:**
*"Sistem ini menggunakan **Firebase Realtime Database**, yang merupakan database **NoSQL**. Artinya, database ini tidak menggunakan tabel bersilangan (Relational SQL) seperti MySQL, melainkan menggunakan struktur **Pohon JSON (JSON Tree)**. Meskipun tidak ada fitur Foreign Key baku, kami mensimulasikan 'Relasi' dengan menyimpan ID referensi (seperti \`productId\` atau \`userId\`) di dalam data dokumen."*

### Skema Struktur Pohon JSON (Struktur "Relasi")

Berikut adalah pemetaan data di Firebase:

```json
{
  "products": {
    "P001": {
      "id": "P001",
      "name": "Teh Raja Signature",
      "price": 15000,
      "category": "signature",
      "stock": 50
    }
  },
  
  "users": {
    "U001": {
      "id": "U001",
      "username": "admin",
      "role": "admin"
    }
  },

  "orders": {
    "ORD-1234": {
      "id": "ORD-1234",
      "date": "2026-06-14T10:00:00Z",
      "cashierName": "Kasir Default",
      "total": 32000,
      "status": "pending",
      // RELASI KE PRODUCTS: item keranjang merujuk pada produk
      "items": [
        {
          "id": "P001", // Referensi (Relasi) ke produk P001
          "quantity": 2,
          "finalPrice": 15000
        }
      ]
    }
  },

  "sessions": {
    "SESS-01": {
      "id": "SESS-01",
      "cashierName": "Kasir Default",
      "startTime": "2026-06-14T08:00:00Z",
      "totalSales": 1500000
    }
  }
}
```

**Penjelasan Relasi Database:**
1. **Relasi `orders` -> `products`:** Terjadi konsep relasi *One-to-Many*. Satu Order bisa memiliki banyak Item. Setiap item di dalam node `orders/$orderId/items` memiliki properti `id` yang mereferensikan kunci unik pada node `products`.
2. **Relasi `orders` -> `users/sessions`:** Atribut `cashierName` di dalam Order mereferensikan akun kasir (User) yang sedang memegang sesi (*Session*) tersebut. 

---

## 5. Cara Melihat Database di Firebase

Jika dosen meminta bukti bahwa datanya benar-benar tersimpan di server cloud (Firebase), Anda bisa memperlihatkannya dengan cara berikut:

1. Buka browser dan pergi ke **[console.firebase.google.com](https://console.firebase.google.com/)**.
2. *Login* menggunakan akun Google yang Anda gunakan saat pertama kali membuat proyek Firebase "Teh Raja".
3. Klik kotak proyek **"Teh Raja"**.
4. Pada menu di bilah kiri, klik menu **Build**, lalu pilih **Realtime Database**.
5. Di tab **Data**, Anda akan melihat sebuah struktur berbentuk *folder* berjatuhan (seperti `orders`, `products`, `logs`). 
6. Anda bisa mengklik ikon panah `[+]` di sebelah tulisan `orders` untuk membuktikan bahwa saat kasir menekan tombol "Checkout" di aplikasi, datanya seketika muncul di Firebase Console tanpa perlu *refresh* halaman.
