# Panduan Akademik Skripsi: Sistem Peramalan Penjualan & AI Teh Raja

Dokumen ini disusun untuk membantu Anda dalam menyusun **Proposal, Bab 3 (Metodologi), Bab 4 (Hasil & Pembahasan)**, serta persiapan presentasi sidang skripsi.

---

## 1. Usulan Judul Skripsi

Berikut beberapa opsi judul skripsi yang kuat secara akademik:

1. **Rekomendasi Utama (Metode Komparatif & Rantai Pasok)**:
   > *"Penerapan Metode Triple Exponential Smoothing (Holt-Winters) dan Large Language Model untuk Peramalan Penjualan serta Estimasi Kebutuhan Bahan Baku pada Sistem Point of Sale Teh Raja"*

2. **Opsi 2 (Komparasi Multi-Model & AI Advisor)**:
   > *"Komparasi Algoritma Time Series Forecasting (Holt-Winters, Moving Average, dan Ensemble) Berbasis Evaluasi MAPE Terintegrasi Generative AI pada Web POS Teh Raja"*

3. **Opsi 3 (Sistem Pendukung Keputusan)**:
   > *"Rancang Bangun Sistem Pendukung Keputusan Peramalan Penjualan Minuman Berbasis Time Series Cross-Validation dan Bill of Materials (BOM) pada Kedai Teh Raja"*

---

## 2. Landasan Teori & Formula Matematis (Bab 2 & 3)

Sistem yang dibangun membandingkan **9 metode peramalan** secara otomatis:

### A. Metode Baseline (Pembanding)
1. **Naive Forecast**:
   $$\hat{y}_{t+h} = y_t$$
   *Asumsi*: Penjualan masa depan sama persis dengan observasi terakhir.

2. **Seasonal Naive ($m = 7$)**:
   $$\hat{y}_{t+h} = y_{t+h-m \cdot k}$$
   *Asumsi*: Penjualan hari tertentu (misal: Sabtu) sama dengan penjualan pada hari yang sama di minggu sebelumnya.

3. **Simple Moving Average (SMA)**:
   $$\hat{y}_{t+1} = \frac{1}{k} \sum_{i=0}^{k-1} y_{t-i}$$
   Nilai $k \in \{3, 5, 7, 14\}$ dioptimasi otomatis mencari galat terkecil.

4. **Weighted Moving Average (WMA)**:
   $$\hat{y}_{t+1} = \frac{\sum_{i=1}^k i \cdot y_{t-k+i}}{\sum_{i=1}^k i}$$
   Data terbaru diberikan bobot linear lebih besar.

---

### B. Metode Exponential Smoothing & Tren
5. **Single Exponential Smoothing (SES)**:
   $$\ell_t = \alpha y_t + (1 - \alpha) \ell_{t-1}$$
   $$\hat{y}_{t+h} = \ell_t$$
   Parameter $\alpha \in [0.05, 0.9]$ dioptimasi via Grid Search.

6. **Holt Linear with Damped Trend**:
   $$\ell_t = \alpha y_t + (1 - \alpha)(\ell_{t-1} + \phi b_{t-1})$$
   $$b_t = \beta (\ell_t - \ell_{t-1}) + (1 - \beta)\phi b_{t-1}$$
   $$\hat{y}_{t+h} = \ell_t + \left(\sum_{i=1}^h \phi^i\right) b_t$$
   $\phi \in [0.8, 1.0]$ adalah faktor redaman agar tren pertumbuhan tidak melambung tak realistis.

---

### C. Metode Musiman & Komposit (Unggulan)
7. **Holt-Winters Aditif (Damped)**:
   Cocok jika fluktuasi akhir pekan besarnya konstan dalam rupiah:
   $$\ell_t = \alpha(y_t - s_{t-m}) + (1 - \alpha)(\ell_{t-1} + \phi b_{t-1})$$
   $$b_t = \beta(\ell_t - \ell_{t-1}) + (1 - \beta)\phi b_{t-1}$$
   $$s_t = \gamma(y_t - \ell_t) + (1 - \gamma)s_{t-m}$$
   $$\hat{y}_{t+h} = \ell_t + \phi_h b_t + s_{t+h-m}$$

8. **Holt-Winters Multiplikatif**:
   Cocok jika fluktuasi akhir pekan proporsional terhadap besarnya omzet:
   $$\ell_t = \alpha\left(\frac{y_t}{s_{t-m}}\right) + (1 - \alpha)(\ell_{t-1} + \phi b_{t-1})$$
   $$b_t = \beta(\ell_t - \ell_{t-1}) + (1 - \beta)\phi b_{t-1}$$
   $$s_t = \gamma\left(\frac{y_t}{\ell_t}\right) + (1 - \gamma)s_{t-m}$$
   $$\hat{y}_{t+h} = (\ell_t + \phi_h b_t) \cdot s_{t+h-m}$$

9. **Ensemble (Top-3 Model Combination)**:
   Rata-rata dari 3 model terbaik berdasarkan literatur *M4 Competition (Makridakis et al., 2018)* yang membuktikan bahwa kombinasi ramalan sering kali menghasilkan variansi galat terendah:
   $$\hat{y}_{\text{ensemble}} = \frac{1}{3} \sum_{j=1}^3 \hat{y}_{(j)}$$

---

## 3. Metrik Evaluasi Akurasi (Bab 3 & 4)

1. **Mean Absolute Percentage Error (MAPE)**:
   $$\text{MAPE} = \frac{100\%}{n} \sum_{t=1}^n \left| \frac{y_t - \hat{y}_t}{y_t} \right|$$

   **Kriteria Interpretasi Akurasi Lewis (1982)**:
   - $\text{MAPE} < 10\%$ : **Sangat Akurat (Highly Accurate)**
   - $10\% \le \text{MAPE} < 20\%$ : **Akurat / Baik (Good Forecasting)**
   - $20\% \le \text{MAPE} < 50\%$ : **Cukup Layak (Reasonable)**
   - $\text{MAPE} \ge 50\%$ : **Tidak Akurat (Inaccurate)**

2. **Root Mean Squared Error (RMSE)**:
   $$\text{RMSE} = \sqrt{\frac{1}{n} \sum_{t=1}^n (y_t - \hat{y}_t)^2}$$

3. **Mean Absolute Error (MAE)**:
   $$\text{MAE} = \frac{1}{n} \sum_{t=1}^n |y_t - \hat{y}_t|$$

---

## 4. Integrasi Supply Chain (BOM - Bill of Materials)

Keunggulan sistem ini adalah **tidak hanya meramal rupiah**, tetapi menghubungkan hasil ramalan ke kebutuhan fisik bahan baku:

$$\text{Kebutuhan Bahan}_j = \sum_{p \in \text{Produk}} \left( \hat{Y}_p \times \text{Takaran}_{p, j} \right)$$

- **Ketahanan Stok (Hari)**: $\frac{\text{Sisa Stok}_j}{\text{Kebutuhan Harian}_j}$
- **Reorder Point (ROP)**: Bahan baku diberi status **Kritis / Peringatan** jika ketahanan stok $\le$ Horizon ramalan.

---

## 5. Fitur Baru di Web POS untuk Sidang Skripsi

1. **Tab "AI Forecast ✨" di Halaman Admin**:
   - Kurva interaktif aktual vs fitted vs masa depan lengkap dengan area interval kepercayaan 95%.
   - Grafik batang **Pola Musiman Mingguan** (multiplier hari Minggu–Sabtu).
2. **Tabel Evaluasi Model Lengkap**:
   - Menampilkan peringkat 1 sampai 9 dengan metrik MAE, RMSE, MAPE, dan interpretasi Lewis.
   - Dilengkapi tombol **"Salin Format Markdown"** (langsung bisa ditempel ke Microsoft Word atau Google Docs).
3. **Generator Data Simulasi**:
   - Tombol `🎲 Buat Simulasi Data` membuat 60–180 hari riwayat penjualan realistis khas F&B untuk pengujian algoritma bila data riil dari kedai masih dalam tahap awal.
4. **Import Excel / CSV**:
   - Mendukung impor file riwayat transaksi riil dari kedai dengan pendeteksian kolom otomatis.
5. **Ekspor Laporan ke Excel (.xlsx)**:
   - Menghasilkan 4 sheet terpisah (Proyeksi Harian, Evaluasi Skripsi, Kebutuhan BOM, Data Historis) yang siap dilampirkan di skripsi.
6. **Sintesis Narasi Gemini AI**:
   - Mengubah angka statistik menjadi laporan eksekutif dan rekomendasi strategis bisnis dalam hitungan detik menggunakan Gemini 3.5 Flash Lite.
