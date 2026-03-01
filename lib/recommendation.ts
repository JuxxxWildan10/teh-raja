import { Product } from '@/data/menu';

// Tipe data untuk menyimpan preferensi rasa pengguna
// Nilainya merepresentasikan tingkat: manis, creamy, dan rasa buah/floral (0-10)
type UserPreferences = {
    sweet: number;
    creamy: number;
    fruity: number;
};

// Fungsi ini menghitung jarak Euclidean (Euclidean Distance) antara dua titik koordinat prefence.
// Digunakan untuk mencari seberapa dekat "selera pengguna" dengan "profil rasa produk".
// Rumus: √((x2-x1)² + (y2-y1)² + (z2-z1)²)
function calculateDistance(pref: UserPreferences, input: UserPreferences): number {
    return Math.sqrt(
        Math.pow(pref.sweet - input.sweet, 2) +    // Selisih tingkat kemanisan
        Math.pow(pref.creamy - input.creamy, 2) +  // Selisih tingkat creamy
        Math.pow(pref.fruity - input.fruity, 2)    // Selisih tingkat fruity
    );
}

// Fungsi untuk mendapatkan daftar rekomendasi produk terbaik
export function getRecommendations<T extends Product>(preferences: UserPreferences, currentProducts: T[]): T[] {
    // 1. Petakan setiap produk untuk menambah properti 'score' (jarak/kemiripan)
    // 2. Urutkan produk berdasarkan skor dari yang terkecil (paling cocok/mirip) ke terbesar
    const ranked = currentProducts.map((product) => {
        const distance = calculateDistance(preferences, product.attributes);
        return { ...product, score: distance };
    }).sort((a, b) => a.score - b.score);

    // Ambil dan kembalikan 3 produk dengan skor terbaik (teratas)
    return ranked.slice(0, 3);
}
