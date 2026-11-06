/**
 * ============================================================================
 * FILE: data/menu.ts
 * ============================================================================
 * FUNGSI UTAMA:
 * Menyimpan struktur tipe data `Product` dan data master menu awal (initial seed)
 * untuk Kedai Teh Raja, lengkap dengan komposisi resep bahan baku (Bill of Materials / BOM).
 *
 * KETERKAITAN DENGAN FILE LAIN:
 * - Diimpor oleh `lib/store.ts` (`useProductStore`) sebagai data awal produk.
 * - Diimpor oleh `lib/recommendation.ts` untuk pencocokan profil rasa.
 *
 * BAGIAN KODE PENTING:
 * 1. `type Product`: Struktur objek menu (id, nama, harga, kategori, atribut rasa, dan `recipe` BOM).
 * 2. `products`: Daftar menu default beserta takaran bahan baku (`ingredientId` & `quantity` per cup ukuran M).
 * ============================================================================
 */

// Struktur tipe data untuk setiap item menu produk di Kedai Teh Raja
export type Product = {
    id: string;
    name: string;
    price: number;
    description: string;
    image: string;
    category: 'signature' | 'milk' | 'fruit' | 'classic' | 'snack' | 'food';
    attributes: {
        sweet: number;  // 0-10
        creamy: number; // 0-10
        fruity: number; // 0-10
    };
    // Daftar bahan baku (Bill of Materials / BOM) yang otomatis dipotong saat produk ini terjual
    recipe?: { ingredientId: string; quantity: number }[];
};

// Daftar produk awal beserta resep takaran bahan baku standar (untuk ukuran Cup Medium / Normal)
export const products: Product[] = [
    {
        id: '1',
        name: 'Royale Milk Tea',
        price: 5000,
        description: 'Teh melati signature dipadukan dengan susu segar premium .',
        image: 'https://i.pinimg.com/736x/0b/e7/b8/0be7b87d66b4d16ec60455d1d81abbe8.jpg',
        category: 'signature',
        attributes: { sweet: 8, creamy: 9, fruity: 0 },
        recipe: [
            { ingredientId: 'ing-tea', quantity: 10 },
            { ingredientId: 'ing-milk', quantity: 100 },
            { ingredientId: 'ing-sugar', quantity: 30 },
            { ingredientId: 'ing-ice', quantity: 1 },
            { ingredientId: 'ing-cup', quantity: 1 },
        ]
    },
    {
        id: '2',
        name: 'Imperial Jasmine',
        price: 3000,
        description: 'Teh melati wangi yang harum dan menenangkan .',
        image: 'https://i.pinimg.com/736x/15/0d/e4/150de4882a02714ec9c4f585f29a433e.jpg',
        category: 'classic',
        attributes: { sweet: 6, creamy: 0, fruity: 2 },
        recipe: [
            { ingredientId: 'ing-tea', quantity: 12 },
            { ingredientId: 'ing-sugar', quantity: 25 },
            { ingredientId: 'ing-ice', quantity: 1 },
            { ingredientId: 'ing-cup', quantity: 1 },
        ]
    },
    {
        id: '3',
        name: 'Teh Tarik Istimewa',
        price: 7000,
        description: 'Paduan yang istimewa antara teh dan susu segar.',
        image: 'https://i.pinimg.com/736x/2a/74/7d/2a747d0502b31ca988ccbb4b8ac9af84.jpg',
        category: 'signature',
        attributes: { sweet: 9, creamy: 7, fruity: 2 },
        recipe: [
            { ingredientId: 'ing-tea', quantity: 12 },
            { ingredientId: 'ing-milk', quantity: 120 },
            { ingredientId: 'ing-sugar', quantity: 30 },
            { ingredientId: 'ing-ice', quantity: 1 },
            { ingredientId: 'ing-cup', quantity: 1 },
        ]
    },
    {
        id: '4',
        name: 'The Great Matcha Latte',
        price: 7000,
        description: 'Matcha otentik  dengan susu segar, pekat dan bersahaja.',
        image: 'https://i.pinimg.com/736x/dc/c9/ce/dcc9cece545e7f612d6ad61fd4f3f552.jpg',
        category: 'milk',
        attributes: { sweet: 5, creamy: 8, fruity: 0 },
        recipe: [
            { ingredientId: 'ing-matcha', quantity: 15 },
            { ingredientId: 'ing-milk', quantity: 120 },
            { ingredientId: 'ing-sugar', quantity: 25 },
            { ingredientId: 'ing-ice', quantity: 1 },
            { ingredientId: 'ing-cup', quantity: 1 },
        ]
    },
    {
        id: '5',
        name: 'Tropical Milk Tea Mango ',
        price: 7000,
        description: 'Teh mangga menyegarkan dan creamy.',
        image: 'https://i.pinimg.com/1200x/88/ea/83/88ea83064077c3bc9aac22a359f02180.jpg',
        category: 'fruit',
        attributes: { sweet: 7, creamy: 2, fruity: 10 },
        recipe: [
            { ingredientId: 'ing-tea', quantity: 8 },
            { ingredientId: 'ing-milk', quantity: 80 },
            { ingredientId: 'ing-syrup', quantity: 30 },
            { ingredientId: 'ing-sugar', quantity: 20 },
            { ingredientId: 'ing-ice', quantity: 1 },
            { ingredientId: 'ing-cup', quantity: 1 },
        ]
    },
    {
        id: '6',
        name: 'Lychee Tea',
        price: 7000,
        description: 'Sajian minuman teh dengan leci yang segar.',
        image: 'https://i.pinimg.com/736x/8d/43/37/8d4337f052681194d09bc7af73d93c44.jpg',
        category: 'fruit',
        attributes: { sweet: 6, creamy: 0, fruity: 9 },
        recipe: [
            { ingredientId: 'ing-tea', quantity: 10 },
            { ingredientId: 'ing-syrup', quantity: 30 },
            { ingredientId: 'ing-sugar', quantity: 20 },
            { ingredientId: 'ing-ice', quantity: 1 },
            { ingredientId: 'ing-cup', quantity: 1 },
        ]
    },
    {
        id: '7',
        name: 'French Fries',
        price: 15000,
        description: 'Kentang goreng renyah dengan bumbu rahasia Teh Raja.',
        image: 'https://i.pinimg.com/736x/89/a3/1b/89a31b268fdfb6ab37c18ccff0344d5d.jpg',
        category: 'snack',
        attributes: { sweet: 0, creamy: 2, fruity: 0 },
        recipe: [
            { ingredientId: 'ing-snack', quantity: 150 },
        ]
    },
    {
        id: '8',
        name: 'Toast Roti Bakar',
        price: 20000,
        description: 'Roti bakar gandum tebal dengan selai cokelat keju lezat.',
        image: 'https://i.pinimg.com/736x/43/66/be/4366be8e4bf92a0bd2a514d7912d5dfd.jpg',
        category: 'food',
        attributes: { sweet: 8, creamy: 5, fruity: 0 },
        recipe: [
            { ingredientId: 'ing-bread', quantity: 2 },
            { ingredientId: 'ing-milk', quantity: 20 },
        ]
    }
];
