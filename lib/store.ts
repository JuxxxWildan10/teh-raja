/**
 * ============================================================================
 * FILE: lib/store.ts
 * ============================================================================
 * @file Global State Management (Zustand)
 * @description Jantung arsitektur offline-first dari aplikasi. Semua logika penyimpanan lokal (Cart, Sales, Products, dll) dikonfigurasi di sini.
 * Menggunakan idb-keyval (IndexedDB) untuk kapabilitas penyimpanan tanpa batas.
 *
 * FUNGSI UTAMA & DAFTAR ZUSTAND STORE DI DALAM FILE INI:
 * 1. `useAuthStore`            : Mengelola sesi login staf/admin, daftar karyawan (`users`), dan sakelar `isAdvancedUnlocked`
 *                                (Mode PKL POS & BOM vs Mode Pengembangan Lanjutan / Skripsi).
 * 2. `useCartStore`            : Mengelola keranjang belanja pelanggan (`items`), varian kustomisasi, dan `activeOrderId`.
 * 3. `useProductStore`         : Mengelola katalog produk, harga, ketersediaan menu, dan pemotongan/pengembalian stok langsung.
 * 4. `useSalesStore`           : Mengelola daftar pesanan (`orders`), antrean offline (`offlineOrders`), sesi buka/tutup shift kasir (`sessions`),
 *                                rekonsiliasi uang laci, *hold order*, dan analitik penjualan harian.
 * 5. `usePromoStore`           : Mengelola aturan diskon otomatis (Persen, Nominal, Happy Hour) & Paket Bundle produk (aktif di Mode PKL & Full, misal Imperial Jasmine 3M = Rp 10.000).
 * 6. `useCustomerStore`        : Mengelola member CRM dan poin loyalitas — *Fitur Pengembangan Lanjutan*.
 * 7. `useInventoryStore`       : **INTI MANAJEMEN BAHAN BAKU (BOM)** — Mengelola 9 bahan baku utama, rumus pemotongan takaran resep
 *                                (`calculateRecipeIngredientQty` & `decrementIngredientsForOrder`), *rollback* stok saat order batal
 *                                (`restoreIngredientsForOrder`), serta pencatatan **Audit Stock Opname Fisik** (`recordOpname`).
 * 8. `useSupplierStore`        : Mengelola daftar pemasok bahan baku (`suppliers`) untuk fitur Restok Bahan (PO).
 * 9. `useForecastHistoryStore` : Menyimpan data histori penjualan (impor/simulasi) untuk modul AI Demand Forecasting.
 * 10. `useExpenseStore`        : Mengelola pengeluaran operasional, restok bahan (PO), & kas kecil laci kasir (*Petty Cash*).
 * 11. `useStoreConfigStore`    : Mengelola status **Buka / Tutup (Lock / Unlock) Kedai & Menu Online Pelanggan** secara *real-time*
 *                                (termasuk pesan pengumuman saat Hari Libur Operasional / Tutup Sementara).
 * 12. `useStoreAccountStore`   : Mengelola mutasi manual **Rekening Toko** (*Top-Up Modal* & *Tarik Dana / Laba*) serta helper *real-time*
 *                                (`calculateStoreAccountSummary` & `buildStoreAccountLedger`) untuk memutar modal restok bahan dari total pendapatan kedai.
 * ============================================================================
 */
import { create } from 'zustand';
import { persist, StateStorage, createJSONStorage } from 'zustand/middleware';
import { get, set as idbSet, del } from 'idb-keyval';

const idbStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return (await get(name)) || null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await idbSet(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await del(name);
  },
};
import { Product, products as initialProducts } from '@/data/menu';
import { rtdb } from '@/lib/firebase';
import { ref, set as firebaseSet, update as firebaseUpdate } from 'firebase/database';
import { nanoid } from 'nanoid';

const logRtdbWarn = (...args: unknown[]) => {
    if (typeof window !== 'undefined') {
        console.warn('[RTDB Sync]', ...args);
    }
};

// --- Types ---
export type Role = 'admin' | 'cashier';

export interface BranchInfo {
    id: string;
    name: string;
    address: string;
    phone: string;
}

export const DEFAULT_BRANCHES: BranchInfo[] = [
    { id: 'main', name: 'Cabang Utama', address: 'Jl. Merdeka No. 10, Pusat Kota', phone: '0812-3456-7890' },
    { id: 'b2', name: 'Cabang Sudirman', address: 'Jl. Jend. Sudirman No. 45, Kav. B', phone: '0812-8888-2222' },
    { id: 'b3', name: 'Cabang Kampus Dago', address: 'Jl. Ir. H. Juanda No. 88', phone: '0812-9999-3333' },
];

// Product Variants — pilihan kustomisasi minuman
export interface ProductVariants {
    size: 'M' | 'L';           // M = harga normal, L = +Rp 2.000
    temperature?: 'panas' | 'es'; // Untuk minuman saja
    sugar?: '0%' | '25%' | '50%' | '75%' | '100%'; // Level gula
    ice?: 'no-ice' | 'less' | 'normal' | 'extra'; // Level es (jika es)
}

const VARIANT_SIZE_UPCHARGE: Record<string, number> = { M: 0, L: 2000 };

/**
 * Menghitung tambahan harga untuk ukuran cup (`M` = normal, `L` = +Rp 2.000 default
 * atau menggunakan `product.largePrice` khusus seperti Imperial Jasmine L = Rp 5.000).
 */
export function getSizeUpcharge(
    product: Pick<Product, 'id' | 'price' | 'largePrice'>,
    size: 'M' | 'L' = 'M'
): number {
    if (size !== 'L') return 0;
    if (typeof product.largePrice === 'number' && product.largePrice >= 0) {
        return Math.max(0, product.largePrice - product.price);
    }
    if (product.id === '2') {
        return Math.max(0, 5000 - product.price);
    }
    return VARIANT_SIZE_UPCHARGE.L;
}

/**
 * Menghitung harga satuan akhir suatu produk berdasarkan ukuran (`M` / `L`).
 */
export function getVariantUnitPrice(
    product: Pick<Product, 'id' | 'price' | 'largePrice'>,
    size: 'M' | 'L' = 'M'
): number {
    if (size === 'L') {
        if (typeof product.largePrice === 'number' && product.largePrice >= 0) {
            return product.largePrice;
        }
        if (product.id === '2') {
            return 5000;
        }
    }
    return product.price + getSizeUpcharge(product, size);
}

export function formatVariantLabel(v?: ProductVariants): string {
    if (!v) return '';
    const parts = [];
    parts.push(v.size || 'M');
    if (v.temperature) parts.push(v.temperature === 'panas' ? '☕ Panas' : '🧊 Es');
    if (v.sugar) parts.push(`🍯 Gula ${v.sugar}`);
    if (v.ice && v.temperature === 'es') {
        const iceMap: Record<string, string> = { 'no-ice': 'No Ice', 'less': 'Less Ice', 'normal': 'Normal Ice', 'extra': 'Extra Ice' };
        parts.push(iceMap[v.ice] || v.ice);
    }
    return parts.join(' · ');
}

export { VARIANT_SIZE_UPCHARGE };

export interface User {
    id: string;
    username: string;
    password?: string;
    role: Role;
    name: string;
}

export type CartItem = Product & {
    cartItemId?: string;    // Unique per variant combo — optional for backward compat
    quantity: number;
    note?: string;
    variants?: ProductVariants;
    finalPrice?: number;    // Base price + size upcharge; defaults to product.price
};

export interface RecipeItem {
    ingredientId: string;
    quantity: number; // in ml/gram/pcs
}

export interface ExtendedProduct extends Product {
    isAvailable: boolean;
    stock: number; // for direct stock (e.g. snacks)
    minStockThreshold?: number;
    recipe?: RecipeItem[]; // BOM
    hasCustomRecipe?: boolean; // Menandai resep sudah pernah diedit/dihapus agar tidak ditimpa ulang oleh default seed
    hasCustomPrice?: boolean;  // Menandai harga sudah diperbarui Admin agar tidak tertimpa seed awal
}

export interface ActivityLog {
    id: string;
    timestamp: string;
    action: string;
    details: string;
    user: string; // "Admin" or "Kasir"
}

export interface Order {
    id: string;
    date: string; // ISO String
    items: CartItem[];
    total: number;
    subtotal?: number; // Before discount
    discount?: number; // Nominal discount
    discountType?: 'amount' | 'percent';
    discountValue?: number; // Original input (e.g. 10 for 10%)
    promoName?: string; // Nama promo otomatis yang diterapkan (misal Paket Imperial Jasmine 3 Cup M)
    customerName?: string;
    cashierName?: string;
    status: 'pending' | 'awaiting_payment' | 'processing' | 'completed' | 'cancelled';
    // POS Fields
    paymentMethod?: 'cash' | 'qris' | 'transfer';
    cashReceived?: number;
    changeAmount?: number;
    tableNumber?: string;
    branchId?: string; // [MULTI-BRANCH] Identifier cabang
    sessionId?: string; // ID sesi shift kasir saat transaksi dibuat (mendukung multi-shift dalam 1 hari)
    orderType?: 'dine-in' | 'take-away';
    customerPhone?: string; // For CRM lookup
    paymentNote?: string; // e.g. 'qris' | 'cash' - customer self-selected
}

export interface StoreSession {
    id: string;
    startTime: string; // ISO
    endTime?: string;  // ISO
    cashierName: string;
    branchId?: string; // [MULTI-BRANCH]
    totalSales: number;
    totalOrders: number;
    startingCash?: number;
    actualCash?: number;
    expectedCash?: number;
    cashExpenses?: number; // Total pengeluaran kas kecil (petty cash) selama shift
    notes?: string;
    status: 'open' | 'closed';
}

// ── Helper Tanggal Lokal & Multi-Shift Harian (Shift 1, Shift 2, dst.) ───────
export interface EnrichedStoreSession extends StoreSession {
    dateKey: string;          // Format YYYY-MM-DD (zona waktu lokal)
    shiftNumber: number;      // Urutan sesi pada hari tersebut: 1, 2, 3, ...
    totalShiftsOnDay: number; // Total sesi shift pada hari yang sama
    shiftBadge: string;       // Contoh: "Shift 1", "Shift 2"
    timeRangeLabel: string;   // Contoh: "08.00 – 15.00" atau "15.05 – Sedang Buka"
}

/**
 * Mengubah string tanggal ISO menjadi kunci tanggal lokal `YYYY-MM-DD`
 * agar filter per hari akurat sesuai zona waktu lokal perangkat (WIB/WITA/WIT).
 */
export function toLocalDateKey(isoStr?: string | Date): string {
    const d = isoStr instanceof Date ? isoStr : new Date(isoStr || '');
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function getTodayDateKey(): string {
    return toLocalDateKey(new Date());
}

export function getYesterdayDateKey(): string {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return toLocalDateKey(d);
}

/**
 * Mengecek apakah sebuah pesanan (`Order`) masuk ke dalam sesi shift tertentu.
 * Memprioritaskan kecocokan `sessionId`, atau menggunakan batas waktu buka-tutup shift
 * untuk pesanan web/lama yang belum memiliki `sessionId` agar Shift 1 & Shift 2 tidak tercampur.
 */
export function isOrderInSession(order: Order, session: StoreSession): boolean {
    if (order.sessionId) {
        return order.sessionId === session.id;
    }
    const oTime = new Date(order.date).getTime();
    const sTime = new Date(session.startTime).getTime();
    if (isNaN(oTime) || isNaN(sTime)) return false;
    if (session.endTime) {
        const eTime = new Date(session.endTime).getTime();
        if (!isNaN(eTime)) {
            return oTime >= sTime && oTime <= eTime;
        }
    }
    return oTime >= sTime;
}

/**
 * Mengecek apakah pencatatan pengeluaran (`Expense`) terjadi pada sesi shift tertentu.
 */
export function isExpenseInSession(expense: { date: string; sessionId?: string }, session: StoreSession): boolean {
    if (expense.sessionId) {
        return expense.sessionId === session.id;
    }
    const expTime = new Date(expense.date).getTime();
    const sTime = new Date(session.startTime).getTime();
    if (isNaN(expTime) || isNaN(sTime)) return false;
    if (session.endTime) {
        const eTime = new Date(session.endTime).getTime();
        if (!isNaN(eTime)) {
            return expTime >= sTime && expTime <= eTime;
        }
    }
    return expTime >= sTime;
}

/**
 * Mengurutkan seluruh riwayat sesi secara kronologis dan menomori setiap sesi per hari
 * (misal sehari ada 2 sesi -> otomatis menjadi Shift 1 dan Shift 2 pada tanggal tersebut).
 */
export function getEnrichedSessions(sessions: StoreSession[]): EnrichedStoreSession[] {
    const sorted = [...sessions].sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
    const countsPerDay = new Map<string, number>();
    sorted.forEach(s => {
        const key = toLocalDateKey(s.startTime);
        countsPerDay.set(key, (countsPerDay.get(key) || 0) + 1);
    });

    const runningIdxPerDay = new Map<string, number>();
    return sorted.map(s => {
        const dateKey = toLocalDateKey(s.startTime);
        const shiftNumber = (runningIdxPerDay.get(dateKey) || 0) + 1;
        runningIdxPerDay.set(dateKey, shiftNumber);
        const totalShiftsOnDay = countsPerDay.get(dateKey) || 1;
        const startFmt = new Date(s.startTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        const endFmt = s.endTime
            ? new Date(s.endTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
            : 'Sedang Buka';
        return {
            ...s,
            dateKey,
            shiftNumber,
            totalShiftsOnDay,
            shiftBadge: `Shift ${shiftNumber}`,
            timeRangeLabel: `${startFmt} – ${endFmt}`,
        };
    });
}

/**
 * Menghasilkan label pembeli otomatis berurutan ("Customer 1", "Customer 2", "Customer 3", ...)
 * untuk tanggal tertentu (default: hari ini) dan otomatis reset ke "Customer 1" setiap pergantian hari.
 */
export function getNextCustomerLabel(orders: Order[], dateKey: string = getTodayDateKey()): string {
    const validTodayOrders = orders.filter(
        o => o.status !== 'cancelled' && toLocalDateKey(o.date) === dateKey
    );
    let maxSeq = 0;
    for (const o of validTodayOrders) {
        const match = (o.customerName || '').trim().match(/^customer\s+(\d+)$/i);
        if (match) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxSeq) maxSeq = num;
        }
    }
    const nextNumber = Math.max(maxSeq + 1, validTodayOrders.length + 1);
    return `Customer ${nextNumber}`;
}

// ── Promo Engine ─────────────────────────────────────────────
export type PromoType = 'percent' | 'amount' | 'happy_hour' | 'bundle';

export interface Promo {
    id: string;
    name: string;            // e.g. "Paket Hemat Imperial Jasmine (M)"
    type: PromoType;
    value: number;           // e.g. 10 for 10% | 5000 for Rp5.000 | 10000 for bundle 3 cup = Rp10.000
    minSubtotal?: number;    // Minimum purchase to apply (optional)
    startHour?: number;      // For happy_hour type (0-23)
    endHour?: number;        // For happy_hour type (0-23)
    productId?: string;      // Khusus type 'bundle': ID produk target (misal '2' untuk Imperial Jasmine)
    targetSize?: 'M' | 'L';  // Khusus type 'bundle': ukuran cup target (misal 'M')
    bundleQty?: number;      // Khusus type 'bundle': jumlah cup per paket (misal 3)
    alwaysApplyInPkl?: boolean; // True = tetap berlaku walau Mode Pengembangan Lanjutan dikunci
    isActive: boolean;
    description?: string;
}

export const DEFAULT_JASMINE_BUNDLE_PROMO: Promo = {
    id: 'promo-jasmine-bundle-3',
    name: 'Paket Hemat Imperial Jasmine (M)',
    type: 'bundle',
    productId: '2',
    targetSize: 'M',
    bundleQty: 3,
    value: 10000, // 3 cup M = Rp 10.000, 6 cup M = Rp 20.000
    alwaysApplyInPkl: true,
    isActive: true,
    description: 'Beli 3 cup Imperial Jasmine (M) hanya Rp 10.000, 6 cup Rp 20.000 (kelipatan 3 cup).',
};

/**
 * Mengecek apakah sebuah CartItem memenuhi kriteria promo produk tertentu.
 */
export function doesCartItemMatchBundlePromo(item: CartItem, promo: Promo): boolean {
    if (promo.type !== 'bundle') return false;
    const itemSize = item.variants?.size || 'M';
    if (promo.targetSize && itemSize !== promo.targetSize) return false;
    if (promo.productId) {
        if (item.id === promo.productId) return true;
        if (promo.productId === '2' && item.name.toLowerCase().includes('imperial jasmine')) return true;
        return false;
    }
    return true;
}

/**
 * Menghitung total diskon nominal dari promo tipe `bundle` (kelipatan X cup = Rp Y),
 * menggabungkan semua varian gula/es asalkan produk & ukuran (`M`/`L`) cocok.
 */
export function calculateBundlePromoDiscount(promo: Promo, items: CartItem[]): number {
    if (promo.type !== 'bundle' || !promo.isActive || items.length === 0) return 0;
    const bundleQty = Math.max(1, promo.bundleQty || 3);
    const bundlePrice = Math.max(0, promo.value || 0);

    const eligibleUnitPrices: number[] = [];
    for (const item of items) {
        if (!doesCartItemMatchBundlePromo(item, promo)) continue;
        const unitPrice = item.finalPrice ?? item.price;
        for (let q = 0; q < item.quantity; q++) {
            eligibleUnitPrices.push(unitPrice);
        }
    }

    const bundles = Math.floor(eligibleUnitPrices.length / bundleQty);
    if (bundles <= 0) return 0;

    eligibleUnitPrices.sort((a, b) => b - a);
    const coveredCount = bundles * bundleQty;
    let normalCost = 0;
    for (let i = 0; i < coveredCount; i++) {
        normalCost += eligibleUnitPrices[i];
    }
    const targetCost = bundles * bundlePrice;
    return Math.max(0, normalCost - targetCost);
}

/**
 * Menghitung info progres paket bundle untuk ditampilkan sebagai hint/upsell ringan
 * di keranjang pelanggan & kasir (misal: "Tambah 1 cup lagi untuk paket 3 cup = Rp 10.000!").
 */
export function getBundlePromoStatus(promo: Promo, items: CartItem[]): {
    eligibleQty: number;
    bundleQty: number;
    activeBundles: number;
    remainingForNextBundle: number;
    discountAmount: number;
} {
    const bundleQty = Math.max(1, promo.bundleQty || 3);
    const eligibleQty = items
        .filter(item => doesCartItemMatchBundlePromo(item, promo))
        .reduce((sum, item) => sum + item.quantity, 0);
    const activeBundles = Math.floor(eligibleQty / bundleQty);
    const remainder = eligibleQty % bundleQty;
    const remainingForNextBundle = eligibleQty > 0 && remainder > 0 ? bundleQty - remainder : 0;
    const discountAmount = calculateBundlePromoDiscount(promo, items);
    return {
        eligibleQty,
        bundleQty,
        activeBundles,
        remainingForNextBundle,
        discountAmount,
    };
}

// ── Customer Loyalty ─────────────────────────────────────────
export interface Customer {
    id: string;
    name: string;
    phone: string;           // Primary key for lookup
    points: number;          // Accumulated loyalty points
    totalSpent: number;      // Lifetime spending
    createdAt: string;       // ISO
    lastVisit?: string;      // ISO
}

// ── Inventory & BOM ──────────────────────────────────────────
export type UnitType = 'ml' | 'gram' | 'pcs';

export interface Ingredient {
    id: string;
    name: string;
    stock: number; // Current stock in units
    unit: UnitType;
    minStockThreshold: number;
}

export const DEFAULT_INGREDIENTS: Ingredient[] = [
    { id: 'ing-tea', name: 'Daun Teh Hitam', stock: 5000, unit: 'gram', minStockThreshold: 1000 },
    { id: 'ing-matcha', name: 'Bubuk Matcha Jepang', stock: 2000, unit: 'gram', minStockThreshold: 400 },
    { id: 'ing-sugar', name: 'Gula Cair', stock: 10000, unit: 'ml', minStockThreshold: 2000 },
    { id: 'ing-milk', name: 'Susu Segar', stock: 5000, unit: 'ml', minStockThreshold: 1000 },
    { id: 'ing-syrup', name: 'Sirup Buah Mangga/Leci', stock: 3000, unit: 'ml', minStockThreshold: 500 },
    { id: 'ing-ice', name: 'Es Batu', stock: 500, unit: 'pcs', minStockThreshold: 100 },
    { id: 'ing-cup', name: 'Cup Plastik M/L', stock: 500, unit: 'pcs', minStockThreshold: 100 },
    { id: 'ing-snack', name: 'Kentang Beku / Snack', stock: 5000, unit: 'gram', minStockThreshold: 1000 },
    { id: 'ing-bread', name: 'Roti Gandum & Topping', stock: 100, unit: 'pcs', minStockThreshold: 20 },
    { id: 'ing-kresek-1', name: 'Plastik Kresek 1 Cup', stock: 500, unit: 'pcs', minStockThreshold: 50 },
    { id: 'ing-kresek-21', name: 'Plastik Kresek 21 (2-4 Cup)', stock: 500, unit: 'pcs', minStockThreshold: 50 },
    { id: 'ing-kresek-28', name: 'Plastik Kresek 28 (5-7 Cup)', stock: 500, unit: 'pcs', minStockThreshold: 50 },
];

// ── Supplier Management ──────────────────────────────────────
export interface Supplier {
    id: string;
    name: string;
    contactPerson: string;
    phone: string;
    address: string;
    itemsSupplied: string[]; // array of ingredient names or IDs
}

export interface PurchaseOrder {
    id: string;
    supplierId: string;
    date: string; // ISO
    totalAmount: number;
    status: 'pending' | 'received' | 'cancelled';
}

// --- Stores ---

interface CartState {
    items: CartItem[];
    activeOrderId: string | null;
    isCartDrawerOpen: boolean;
    setCartDrawerOpen: (open: boolean) => void;
    addToCart: (product: ExtendedProduct, variants?: ProductVariants, finalPrice?: number) => void;
    removeFromCart: (cartItemId: string) => void;
    updateQuantity: (cartItemId: string, quantity: number) => void;
    updateNote: (cartItemId: string, note: string) => void;
    clearCart: () => void;
    setActiveOrder: (id: string | null) => void;
    total: () => number;
}

interface ProductState {
    products: ExtendedProduct[];
    addProduct: (product: ExtendedProduct) => void;
    updateProduct: (id: string, updated: Partial<ExtendedProduct>) => void;
    deleteProduct: (id: string) => void;
    toggleAvailability: (id: string) => void;
    decrementStock: (items: CartItem[]) => void;
    restoreStock: (items: CartItem[]) => void;
}

interface SalesState {
    branchId: string;
    branchName: string;
    setBranch: (id: string, name: string) => void;
    orders: Order[];
    offlineOrders: Order[]; // Robust Offline Queue
    heldOrders: Order[]; // Hold order feature
    logs: ActivityLog[];
    offlineLogs: ActivityLog[]; // Robust Offline Queue
    isStoreOpen: boolean;
    currentSessionId: string | null;
    sessions: StoreSession[];
    openStore: (cashierName: string, startingCash: number) => void;
    closeStore: (actualCash?: number, notes?: string) => StoreSession | null;

    addOrder: (order: Order) => void;
    updateOrder: (orderId: string, updated: Partial<Order>) => void;
    removeOfflineOrder: (id: string) => void;
    updateOrderStatus: (orderId: string, status: Order['status']) => void;
    holdOrder: (order: Order) => void; // Save current order to hold
    resumeOrder: (heldOrderId: string) => Order | null; // Get held order back
    deleteHeldOrder: (heldOrderId: string) => void;
    addLog: (action: string, details: string, user: string) => void;
    removeOfflineLog: (id: string) => void;
    getDailySales: () => { date: string; total: number; count: number }[];
    getProductPopularity: () => { name: string; count: number }[];
    getPeakHours: () => { hour: string; count: number }[];
    resetData: () => void;
}

interface AuthState {
    user: User | null;
    users: User[]; // Staff accounts
    isAdvancedUnlocked: boolean; // false = Mode PKL (Fokus POS & BOM), true = Mode Pengembangan / Skripsi (Full Fitur)
    setAdvancedUnlocked: (val: boolean) => void;
    toggleAdvancedUnlocked: () => void;
    login: (username: string, role: Role) => User | null;
    loginWithPassword: (username: string, password: string) => Promise<User | null>;
    logout: () => Promise<void>;
    addUser: (user: User) => void;
    removeUser: (id: string) => void;
    updateUser: (id: string, updated: Partial<User>) => void;
}

// --- Implementations ---

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            users: [
                { id: '1', username: 'admin', password: '123', role: 'admin', name: 'Administrator' },
                { id: '2', username: 'kasir', password: '123', role: 'cashier', name: 'Kasir Default' },
            ],
            isAdvancedUnlocked: false,
            setAdvancedUnlocked: (val) => set({ isAdvancedUnlocked: val }),
            toggleAdvancedUnlocked: () => set((s) => ({ isAdvancedUnlocked: !s.isAdvancedUnlocked })),
            login: (username, role) => {
                const found = get().users.find(u => u.username === username);
                const u = found || { id: nanoid(), username, role, name: username === 'admin' ? 'Administrator' : 'Staff Kasir' };
                set({ user: u });
                return u;
            },
            loginWithPassword: async (username, password) => {
                const cleanUsername = username.trim().toLowerCase();
                const found = get().users.find(
                    u => u.username.toLowerCase() === cleanUsername && u.password === password
                );
                if (found) {
                    set({ user: found });
                    firebaseSet(ref(rtdb, `users/${found.id}`), JSON.parse(JSON.stringify(found))).catch(logRtdbWarn);
                    return found;
                }
                return null;
            },
            logout: async () => {
                set({ user: null });
            },
            addUser: (u) => {
                set((s) => ({ users: [...s.users, u] }));
                firebaseSet(ref(rtdb, `users/${u.id}`), JSON.parse(JSON.stringify(u))).catch(logRtdbWarn);
            },
            removeUser: (id) => {
                set((s) => ({ users: s.users.filter(u => u.id !== id) }));
                firebaseSet(ref(rtdb, `users/${id}`), null).catch(logRtdbWarn);
            },
            updateUser: (id, updated) => {
                set((s) => ({ users: s.users.map(u => u.id === id ? { ...u, ...updated } : u) }));
                firebaseUpdate(ref(rtdb, `users/${id}`), JSON.parse(JSON.stringify(updated))).catch(logRtdbWarn);
            },
        }),
        { name: 'teh-raja-auth', storage: createJSONStorage(() => idbStorage) }
    )
);

export const useCartStore = create<CartState>()(
    persist(
        (set, get) => ({
            items: [],
            activeOrderId: null,
            isCartDrawerOpen: false,
            setCartDrawerOpen: (open) => set({ isCartDrawerOpen: open }),
            setActiveOrder: (id) => set({ activeOrderId: id }),

            addToCart: (product, variants, finalPrice) => {
                set((state) => {
                    if (product.stock <= 0) return state;
                    const variantSig = variants ? JSON.stringify(variants) : 'default';
                    const cartItemId = `${product.id}__${variantSig}`;
                    const vFinalPrice = finalPrice ?? product.price;

                    const existing = state.items.find(i => i.cartItemId === cartItemId);
                    const totalProductQty = state.items
                        .filter(i => i.id === product.id)
                        .reduce((sum, i) => sum + i.quantity, 0);

                    if (existing) {
                        if (totalProductQty >= product.stock) return state;
                        return {
                            items: state.items.map(i =>
                                i.cartItemId === cartItemId ? { ...i, quantity: i.quantity + 1 } : i
                            ),
                        };
                    }
                    if (totalProductQty >= product.stock) return state;
                    return {
                        items: [
                            ...state.items,
                            { ...product, cartItemId, quantity: 1, finalPrice: vFinalPrice, variants },
                        ],
                    };
                });
            },

            removeFromCart: (cartItemId) => {
                set((state) => ({
                    items: state.items.filter(i => (i.cartItemId ?? i.id) !== cartItemId)
                }));
            },

            updateQuantity: (cartItemId, quantity) => {
                set((state) => ({
                    items: quantity > 0
                        ? state.items.map(i => (i.cartItemId ?? i.id) === cartItemId ? { ...i, quantity } : i)
                        : state.items.filter(i => (i.cartItemId ?? i.id) !== cartItemId),
                }));
            },

            updateNote: (cartItemId, note) => {
                set((state) => ({
                    items: state.items.map(i =>
                        (i.cartItemId ?? i.id) === cartItemId ? { ...i, note } : i
                    )
                }));
            },

            clearCart: () => set({ items: [] }),
            total: () => get().items.reduce((acc, item) => acc + (item.finalPrice ?? item.price) * item.quantity, 0),
        }),
        { name: 'teh-raja-cart-v2', storage: createJSONStorage(() => idbStorage) }
    )
);

export const useProductStore = create<ProductState>()(
    persist(
        (set) => ({
            products: initialProducts.map(p => ({
                ...p,
                isAvailable: true,
                stock: 50,
                minStockThreshold: 10,
                recipe: p.recipe || [],
            })),
            addProduct: (product) => {
                set((state) => ({ products: [...state.products, product] }));
                firebaseSet(ref(rtdb, `products/${product.id}`), JSON.parse(JSON.stringify(product))).catch(err => console.warn(err));
            },
            updateProduct: (id, updated) => {
                const payload: Partial<ExtendedProduct> = { ...updated };
                if (updated.recipe !== undefined) payload.hasCustomRecipe = true;
                if (updated.price !== undefined || 'largePrice' in updated) payload.hasCustomPrice = true;
                set((state) => ({
                    products: state.products.map((p) => (p.id === id ? { ...p, ...payload } : p))
                }));
                const rtdbPayload = JSON.parse(JSON.stringify(payload));
                if ('largePrice' in updated && updated.largePrice === undefined) {
                    rtdbPayload.largePrice = null;
                }
                firebaseUpdate(ref(rtdb, `products/${id}`), rtdbPayload).catch(err => console.warn(err));
            },
            deleteProduct: (id) => {
                set((state) => ({
                    products: state.products.filter((p) => p.id !== id)
                }));
                firebaseSet(ref(rtdb, `products/${id}`), null).catch(err => console.warn(err));
            },
            toggleAvailability: (id) => {
                set((state) => {
                    const newProducts = state.products.map((p) => {
                        if (p.id === id) {
                            const updated = { ...p, isAvailable: !p.isAvailable };
                            firebaseUpdate(ref(rtdb, `products/${id}`), { isAvailable: updated.isAvailable }).catch(err => console.warn(err));
                            return updated;
                        }
                        return p;
                    });
                    return { products: newProducts };
                });
            },
            decrementStock: (items) => {
                set((state) => {
                    const updates: Record<string, any> = {};
                    // Aggregate total quantity per product ID across variants
                    const qtyByProductId = new Map<string, number>();
                    items.forEach(i => {
                        qtyByProductId.set(i.id, (qtyByProductId.get(i.id) || 0) + i.quantity);
                    });
                    const newProducts = state.products.map(p => {
                        const qty = qtyByProductId.get(p.id);
                        if (qty) {
                            const newStock = Math.max(0, p.stock - qty);
                            const updated = { ...p, stock: newStock, isAvailable: newStock > 0 };
                            updates[`products/${p.id}/stock`] = newStock;
                            updates[`products/${p.id}/isAvailable`] = newStock > 0;
                            return updated;
                        }
                        return p;
                    });
                    if (Object.keys(updates).length > 0) {
                        firebaseUpdate(ref(rtdb), updates).catch(err => console.warn("Firebase Stock Update Error:", err));
                    }
                    return { products: newProducts };
                })
            },

            restoreStock: (items) => {
                set((state) => {
                    const updates: Record<string, any> = {};
                    const qtyByProductId = new Map<string, number>();
                    items.forEach(i => {
                        qtyByProductId.set(i.id, (qtyByProductId.get(i.id) || 0) + i.quantity);
                    });
                    const newProducts = state.products.map(p => {
                        const qty = qtyByProductId.get(p.id);
                        if (qty) {
                            const newStock = p.stock + qty;
                            const updated = { ...p, stock: newStock, isAvailable: newStock > 0 };
                            updates[`products/${p.id}/stock`] = newStock;
                            updates[`products/${p.id}/isAvailable`] = true;
                            return updated;
                        }
                        return p;
                    });
                    if (Object.keys(updates).length > 0) {
                        firebaseUpdate(ref(rtdb), updates).catch(err => console.warn("Firebase Stock Restore Error:", err));
                    }
                    return { products: newProducts };
                })
            }
        }),
        {
            name: 'teh-raja-products-v4',
            storage: createJSONStorage(() => idbStorage),
            version: 2,
            migrate: (persistedState: unknown, version: number) => {
                const s = persistedState as { products?: ExtendedProduct[] } | undefined;
                if (!s || !Array.isArray(s.products)) return persistedState as ProductState;
                if (version < 2) {
                    return {
                        ...s,
                        products: s.products.map((p) => {
                            if (p.id === '2' && !p.hasCustomPrice && (p.price === 3000 || p.largePrice === undefined)) {
                                return {
                                    ...p,
                                    price: 3500,
                                    largePrice: 5000,
                                    hasCustomPrice: true,
                                    description: p.description?.trim().startsWith('Teh melati wangi yang harum')
                                        ? 'Teh melati wangi yang harum dan menenangkan. Promo Size M: beli 3 cup Rp 10.000, 6 cup Rp 20.000!'
                                        : p.description,
                                };
                            }
                            return p;
                        }),
                    };
                }
                return s;
            },
        }
    )
);

export const useSalesStore = create<SalesState>()(
    persist(
        (set, get) => ({
            branchId: 'main',
            branchName: 'Cabang Utama',
            orders: [],
            offlineOrders: [],
            heldOrders: [],
            logs: [],
            offlineLogs: [],
            isStoreOpen: false,
            currentSessionId: null,
            sessions: [],

            setBranch: (id: string, name: string) => set({ branchId: id, branchName: name }),
            openStore: (cashierName, startingCash) => {
                const newSession: StoreSession = {
                    id: nanoid(),
                    startTime: new Date().toISOString(),
                    cashierName,
                    branchId: get().branchId,
                    totalSales: 0,
                    totalOrders: 0,
                    startingCash,
                    status: 'open'
                };
                set((state) => ({
                    isStoreOpen: true,
                    currentSessionId: newSession.id,
                    sessions: [...state.sessions, newSession]
                }));
                const sessionRef = ref(rtdb, `sessions/${newSession.id}`);
                firebaseSet(sessionRef, newSession).catch(err => console.warn(err));
            },

            closeStore: (actualCash, notes) => {
                const state = get();
                if (!state.isStoreOpen || !state.currentSessionId) return null;

                const sessionIndex = state.sessions.findIndex(s => s.id === state.currentSessionId);
                if (sessionIndex === -1) return null;

                const session = state.sessions[sessionIndex];
                const closeTimeIso = new Date().toISOString();
                const sessionWithEnd: StoreSession = { ...session, endTime: closeTimeIso };

                // Isolasi ketat transaksi khusus sesi shift ini (mendukung 2+ shift dalam 1 hari)
                const sessionOrders = state.orders.filter(
                    o => o.status !== 'cancelled' && isOrderInSession(o, sessionWithEnd)
                );
                const totalSales = sessionOrders.reduce((sum, order) => sum + order.total, 0);
                const totalOrders = sessionOrders.length;
                
                const cashSales = sessionOrders
                    .filter(o => o.paymentMethod === 'cash' || !o.paymentMethod)
                    .reduce((sum, order) => sum + order.total, 0);
                const sessionCashExpenses = (useExpenseStore.getState()?.expenses || [])
                    .filter(e => e.paidVia === 'kas_laci' && isExpenseInSession(e, sessionWithEnd))
                    .reduce((sum, e) => sum + e.amount, 0);
                const expectedCash = Math.max(0, (session.startingCash || 0) + cashSales - sessionCashExpenses);

                const closedSession: StoreSession = {
                    ...session,
                    endTime: closeTimeIso,
                    status: 'closed',
                    totalSales,
                    totalOrders,
                    actualCash,
                    expectedCash,
                    cashExpenses: sessionCashExpenses,
                    notes
                };

                const updatedSessions = [...state.sessions];
                updatedSessions[sessionIndex] = closedSession;

                set({
                    isStoreOpen: false,
                    currentSessionId: null,
                    sessions: updatedSessions
                });

                const sessionRef = ref(rtdb, `sessions/${closedSession.id}`);
                firebaseUpdate(sessionRef, JSON.parse(JSON.stringify(closedSession))).catch(err => console.warn(err));

                return closedSession;
            },

            addOrder: (order) => {
                const activeSessionId = get().isStoreOpen ? (get().currentSessionId || undefined) : undefined;
                const autoCustomerName = order.customerName?.trim()
                    || getNextCustomerLabel(
                        [...get().orders, ...get().heldOrders],
                        toLocalDateKey(order.date) || getTodayDateKey()
                    );
                const orderWithBranch: Order = {
                    ...order,
                    customerName: autoCustomerName,
                    branchId: order.branchId || get().branchId || 'main',
                    sessionId: order.sessionId || activeSessionId,
                };
                set((state) => ({ 
                    orders: [orderWithBranch, ...state.orders.filter(o => o.id !== orderWithBranch.id)],
                    offlineOrders: [orderWithBranch, ...state.offlineOrders.filter(o => o.id !== orderWithBranch.id)]
                }));
                const sanitizedOrder = JSON.parse(JSON.stringify(orderWithBranch));
                const orderRef = ref(rtdb, `orders/${orderWithBranch.id}`);
                firebaseSet(orderRef, sanitizedOrder)
                    .then(() => get().removeOfflineOrder(orderWithBranch.id))
                    .catch(err => console.warn("Firebase Add Error:", err));
            },
            updateOrder: (orderId, updated) => {
                set((state) => ({
                    orders: state.orders.map(o => o.id === orderId ? { ...o, ...updated } : o)
                }));
                const sanitized = JSON.parse(JSON.stringify(updated));
                const orderRef = ref(rtdb, `orders/${orderId}`);
                firebaseUpdate(orderRef, sanitized).catch(err => console.warn("Firebase Update Order Error:", err));
            },
            removeOfflineOrder: (id) => {
                set((state) => ({ offlineOrders: state.offlineOrders.filter(o => o.id !== id) }));
            },
            updateOrderStatus: (orderId, status) => {
                const state = get();
                const order = state.orders.find(o => o.id === orderId);
                // Restore stock and BOM ingredients when cancelling an uncancelled order
                if (status === 'cancelled' && order && order.status !== 'cancelled') {
                    useProductStore.getState().restoreStock(order.items);
                    useInventoryStore.getState().restoreIngredientsForOrder(
                        order.items,
                        useProductStore.getState().products
                    );
                }
                set((s) => ({
                    orders: s.orders.map(o => o.id === orderId ? { ...o, status } : o)
                }));
                const orderRef = ref(rtdb, `orders/${orderId}`);
                firebaseUpdate(orderRef, { status }).catch(err => console.warn("Firebase Update Error:", err));
            },

            holdOrder: (order) => {
                set(state => ({ heldOrders: [...state.heldOrders, { ...order, status: 'pending' }] }));
            },

            resumeOrder: (heldOrderId) => {
                const state = get();
                const held = state.heldOrders.find(o => o.id === heldOrderId);
                if (held) {
                    set(s => ({ heldOrders: s.heldOrders.filter(o => o.id !== heldOrderId) }));
                }
                return held || null;
            },

            deleteHeldOrder: (heldOrderId) => {
                set(state => ({ heldOrders: state.heldOrders.filter(o => o.id !== heldOrderId) }));
            },
            addLog: (action, details, user) => {
                const newLog = {
                    id: nanoid(),
                    timestamp: new Date().toISOString(),
                    action,
                    details,
                    user
                };
                set((state) => ({
                    logs: [newLog, ...state.logs].slice(0, 100),
                    offlineLogs: [newLog, ...state.offlineLogs]
                }));
                firebaseSet(ref(rtdb, `logs/${newLog.id}`), newLog)
                    .then(() => get().removeOfflineLog(newLog.id))
                    .catch(err => console.warn(err));
            },
            removeOfflineLog: (id) => {
                set((state) => ({ offlineLogs: state.offlineLogs.filter(l => l.id !== id) }));
            },
            getDailySales: () => {
                const orders = get().orders.filter(o => o.status !== 'cancelled');
                const salesMap = new Map<string, { total: number; count: number; displayDate: string }>();
                orders.forEach(order => {
                    const d = new Date(order.date);
                    if (isNaN(d.getTime())) return;
                    const year = d.getFullYear();
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    const isoDate = `${year}-${month}-${day}`;
                    const displayDate = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                    const current = salesMap.get(isoDate) || { total: 0, count: 0, displayDate };
                    salesMap.set(isoDate, {
                        total: current.total + order.total,
                        count: current.count + 1,
                        displayDate
                    });
                });
                return Array.from(salesMap.entries())
                    .sort((a, b) => a[0].localeCompare(b[0]))
                    .slice(-7)
                    .map(([, data]) => ({ date: data.displayDate, total: data.total, count: data.count }));
            },
            getProductPopularity: () => {
                const orders = get().orders.filter(o => o.status !== 'cancelled');
                const popularityMap = new Map<string, number>();
                orders.forEach(order => {
                    order.items.forEach(item => {
                        const currentCount = popularityMap.get(item.name) || 0;
                        popularityMap.set(item.name, currentCount + item.quantity);
                    });
                });
                return Array.from(popularityMap.entries())
                    .map(([name, count]) => ({ name, count }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 5);
            },
            getPeakHours: () => {
                const orders = get().orders.filter(o => o.status !== 'cancelled');
                const hoursMap = new Map<string, number>();
                orders.forEach(order => {
                    const hour = new Date(order.date).getHours().toString().padStart(2, '0') + ':00';
                    hoursMap.set(hour, (hoursMap.get(hour) || 0) + 1);
                });
                return Array.from(hoursMap.entries())
                    .map(([hour, count]) => ({ hour, count }))
                    .sort((a, b) => a.hour.localeCompare(b.hour));
            },
            resetData: () => {
                set({
                    orders: [],
                    offlineOrders: [],
                    heldOrders: [],
                    logs: [],
                    offlineLogs: [],
                    sessions: [],
                    isStoreOpen: false,
                    currentSessionId: null,
                });
                firebaseSet(ref(rtdb, 'orders'), null).catch(err => console.warn(err));
                firebaseSet(ref(rtdb, 'logs'), null).catch(err => console.warn(err));
                firebaseSet(ref(rtdb, 'sessions'), null).catch(err => console.warn(err));
            }
        }),
        { name: 'teh-raja-sales-v3', storage: createJSONStorage(() => idbStorage) }
    )
);

// ══════════════════════════════════════════════════════
// PROMO STORE
// ══════════════════════════════════════════════════════
interface PromoState {
    promos: Promo[];
    deletedPromoIds: string[];
    addPromo: (promo: Promo) => void;
    updatePromo: (id: string, updated: Partial<Promo>) => void;
    deletePromo: (id: string) => void;
    togglePromo: (id: string) => void;
    /** Mengembalikan promo terbaik yang berlaku (mendukung promo produk bundle di Mode PKL) */
    getApplicablePromo: (
        subtotal: number,
        items?: CartItem[],
        includeAdvancedPromos?: boolean
    ) => { promo: Promo; discountAmount: number } | null;
}

export const usePromoStore = create<PromoState>()(
    persist(
        (set, get) => ({
            promos: [
                DEFAULT_JASMINE_BUNDLE_PROMO,
                {
                    id: 'promo-happy-hour',
                    name: 'Happy Hour Sore',
                    type: 'happy_hour',
                    value: 10,
                    startHour: 15,
                    endHour: 17,
                    isActive: true,
                    description: 'Diskon 10% setiap hari pukul 15:00 - 17:00',
                },
                {
                    id: 'promo-weekend',
                    name: 'Promo Spesial Teh Raja',
                    type: 'percent',
                    value: 10,
                    minSubtotal: 25000,
                    isActive: true,
                    description: 'Diskon 10% otomatis untuk pembelian min. Rp 25.000',
                },
            ],
            deletedPromoIds: [],
            addPromo: (promo) => {
                set((s) => ({
                    promos: [...s.promos.filter(p => p.id !== promo.id), promo],
                    deletedPromoIds: (s.deletedPromoIds || []).filter(id => id !== promo.id),
                }));
                firebaseUpdate(ref(rtdb), {
                    [`promos/${promo.id}`]: JSON.parse(JSON.stringify(promo)),
                    [`deletedPromos/${promo.id}`]: null,
                }).catch(console.warn);
            },
            updatePromo: (id, updated) => {
                set((s) => ({
                    promos: s.promos.map((p) => p.id === id ? { ...p, ...updated } : p),
                }));
                firebaseUpdate(ref(rtdb, `promos/${id}`), JSON.parse(JSON.stringify(updated))).catch(console.warn);
            },
            deletePromo: (id) => {
                set((s) => {
                    const prevDeleted = s.deletedPromoIds || [];
                    return {
                        promos: s.promos.filter((p) => p.id !== id),
                        deletedPromoIds: prevDeleted.includes(id) ? prevDeleted : [...prevDeleted, id],
                    };
                });
                firebaseUpdate(ref(rtdb), {
                    [`promos/${id}`]: null,
                    [`deletedPromos/${id}`]: true,
                }).catch(console.warn);
            },
            togglePromo: (id) => {
                set((s) => {
                    const updatedPromos = s.promos.map((p) => {
                        if (p.id === id) {
                            const next = { ...p, isActive: !p.isActive };
                            firebaseUpdate(ref(rtdb, `promos/${id}`), { isActive: next.isActive }).catch(console.warn);
                            return next;
                        }
                        return p;
                    });
                    return { promos: updatedPromos };
                });
            },
            getApplicablePromo: (subtotal, items = [], includeAdvancedPromos = true) => {
                const now = new Date();
                const currentHour = now.getHours();
                const activePromos = get().promos.filter(
                    (p) => p.isActive && (includeAdvancedPromos || p.type === 'bundle' || p.alwaysApplyInPkl)
                );
                let best: { promo: Promo; discountAmount: number } | null = null;

                for (const promo of activePromos) {
                    if (promo.minSubtotal && subtotal < promo.minSubtotal) continue;

                    let discountAmount = 0;

                    if (promo.type === 'bundle') {
                        discountAmount = calculateBundlePromoDiscount(promo, items);
                    } else if (promo.type === 'happy_hour') {
                        const start = promo.startHour ?? 0;
                        const end = promo.endHour ?? 23;
                        if (currentHour < start || currentHour >= end) continue;
                        discountAmount = Math.floor(subtotal * promo.value / 100);
                    } else if (promo.type === 'percent') {
                        discountAmount = Math.floor(subtotal * promo.value / 100);
                    } else if (promo.type === 'amount') {
                        discountAmount = Math.min(promo.value, subtotal);
                    }

                    if (discountAmount > 0 && (!best || discountAmount > best.discountAmount)) {
                        best = { promo, discountAmount };
                    }
                }
                return best;
            },
        }),
        {
            name: 'teh-raja-promos-v1',
            storage: createJSONStorage(() => idbStorage),
            version: 2,
            migrate: (persistedState: unknown, version: number) => {
                const s = persistedState as { promos?: Promo[]; deletedPromoIds?: string[] } | undefined;
                if (!s || !Array.isArray(s.promos)) return persistedState as PromoState;
                if (version < 2) {
                    const deleted = s.deletedPromoIds || [];
                    const hasJasmineBundle = s.promos.some(p => p.id === DEFAULT_JASMINE_BUNDLE_PROMO.id);
                    return {
                        ...s,
                        deletedPromoIds: deleted,
                        promos: (!hasJasmineBundle && !deleted.includes(DEFAULT_JASMINE_BUNDLE_PROMO.id))
                            ? [DEFAULT_JASMINE_BUNDLE_PROMO, ...s.promos]
                            : s.promos,
                    };
                }
                return s;
            },
        }
    )
);

// ══════════════════════════════════════════════════════
// CUSTOMER LOYALTY STORE
// ══════════════════════════════════════════════════════
const POINTS_PER_RUPIAH = 1 / 1000; // 1 poin per Rp 1.000
const POINTS_REDEEM_VALUE = 100;     // 1 poin = Rp 100

interface CustomerState {
    customers: Customer[];
    findByPhone: (phone: string) => Customer | undefined;
    addCustomer: (customer: Customer) => void;
    updateCustomer: (id: string, updated: Partial<Customer>) => void;
    deleteCustomer: (id: string) => void;
    addPoints: (phone: string, orderTotal: number) => void;
    redeemPoints: (phone: string, points: number) => boolean;
    getRedeemValue: (points: number) => number;
    getPointsForOrder: (total: number) => number;
}

export const useCustomerStore = create<CustomerState>()(
    persist(
        (set, get) => ({
            customers: [
                {
                    id: 'cust-1',
                    name: 'Budi Santoso',
                    phone: '081234567890',
                    points: 120,
                    totalSpent: 120000,
                    createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
                    lastVisit: new Date(Date.now() - 86400000 * 2).toISOString(),
                },
                {
                    id: 'cust-2',
                    name: 'Siti Rahmawati',
                    phone: '081298765432',
                    points: 65,
                    totalSpent: 65000,
                    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
                    lastVisit: new Date(Date.now() - 86400000).toISOString(),
                },
            ],
            findByPhone: (phone) => get().customers.find((c) => c.phone === phone.trim()),
            addCustomer: (customer) => {
                set((s) => ({ customers: [...s.customers.filter(c => c.id !== customer.id && c.phone !== customer.phone), customer] }));
                firebaseSet(ref(rtdb, `customers/${customer.id}`), JSON.parse(JSON.stringify(customer))).catch(console.warn);
            },
            updateCustomer: (id, updated) => {
                set((s) => ({
                    customers: s.customers.map(c => c.id === id ? { ...c, ...updated } : c)
                }));
                firebaseUpdate(ref(rtdb, `customers/${id}`), JSON.parse(JSON.stringify(updated))).catch(console.warn);
            },
            deleteCustomer: (id) => {
                set((s) => ({ customers: s.customers.filter(c => c.id !== id) }));
                firebaseSet(ref(rtdb, `customers/${id}`), null).catch(console.warn);
            },
            addPoints: (phone, orderTotal) => {
                const earnedPoints = Math.floor(orderTotal * POINTS_PER_RUPIAH);
                set((s) => {
                    const updatedCustomers = s.customers.map((c) => {
                        if (c.phone === phone.trim()) {
                            const updated = {
                                ...c,
                                points: c.points + earnedPoints,
                                totalSpent: c.totalSpent + orderTotal,
                                lastVisit: new Date().toISOString(),
                            };
                            firebaseUpdate(ref(rtdb, `customers/${c.id}`), {
                                points: updated.points,
                                totalSpent: updated.totalSpent,
                                lastVisit: updated.lastVisit,
                            }).catch(console.warn);
                            return updated;
                        }
                        return c;
                    });
                    return { customers: updatedCustomers };
                });
            },
            redeemPoints: (phone, points) => {
                const customer = get().findByPhone(phone);
                if (!customer || customer.points < points) return false;
                const newPoints = Math.max(0, customer.points - points);
                set((s) => ({
                    customers: s.customers.map((c) =>
                        c.phone === phone.trim() ? { ...c, points: newPoints } : c
                    ),
                }));
                firebaseUpdate(ref(rtdb, `customers/${customer.id}`), { points: newPoints }).catch(console.warn);
                return true;
            },
            getRedeemValue: (points) => points * POINTS_REDEEM_VALUE,
            getPointsForOrder: (total) => Math.floor(total * POINTS_PER_RUPIAH),
        }),
        { name: 'teh-raja-customers-v1', storage: createJSONStorage(() => idbStorage) }
    )
);

export { POINTS_PER_RUPIAH, POINTS_REDEEM_VALUE };

// ══════════════════════════════════════════════════════
// INVENTORY STORE (BILL OF MATERIALS / BOM & STOCK OPNAME)
// ══════════════════════════════════════════════════════
// Struktur log untuk mencatat hasil audit perhitungan stok fisik bahan baku di gudang (Stock Opname)
export interface OpnameLog {
    id: string;
    date: string; // ISO
    ingredientId: string;
    ingredientName: string;
    systemStock: number;
    actualStock: number;
    difference: number;
    unit: string;
    reason: 'tumpah' | 'basi' | 'rusak' | 'koreksi_hitung' | 'lainnya';
    notes?: string;
    recordedBy: string;
}

interface InventoryState {
    ingredients: Ingredient[];
    deletedIngredientIds: string[];
    opnameLogs: OpnameLog[];
    addIngredient: (ingredient: Ingredient) => void;
    updateIngredient: (id: string, updated: Partial<Ingredient>) => void;
    deleteIngredient: (id: string) => void;
    decrementIngredientsForOrder: (items: CartItem[], products: ExtendedProduct[]) => void;
    restoreIngredientsForOrder: (items: CartItem[], products: ExtendedProduct[]) => void;
    recordOpname: (log: Omit<OpnameLog, 'id' | 'date'>) => void;
}

/**
 * FUNGSI INTI PERHITUNGAN RESEP BOM DINAMIS (`calculateRecipeIngredientQty`):
 * Menghitung berapa gram/ml/pcs bahan baku yang harus dipotong untuk setiap item pesanan,
 * dengan menyesuaikan varian:
 * - Ukuran Cup Large (L) = 1.5x takaran bahan cair/bubuk (cup kemasan `ing-cup` tetap 1 pcs per gelas!)
 * - Gula Cair (`ing-sugar`) = proporsional sesuai pilihan % gula (0%, 25%, 50%, 75%, 100%)
 * - Es Batu (`ing-ice`) = 0 jika minuman Panas atau No-Ice, 0.5x jika Less Ice, 1.5x jika Extra Ice
 */
export function calculateRecipeIngredientQty(recipeItem: RecipeItem, cartItem: CartItem): number {
    // Kemasan cup plastik tetap dihitung 1 pcs per gelas meskipun ukuran Large (L)
    const isPackagingCup = recipeItem.ingredientId === 'ing-cup';
    const sizeMultiplier = !isPackagingCup && cartItem.variants?.size === 'L' ? 1.5 : 1;

    let qty = recipeItem.quantity * sizeMultiplier * cartItem.quantity;

    if (recipeItem.ingredientId === 'ing-sugar' && cartItem.variants?.sugar) {
        const sugarLvl = parseInt(cartItem.variants.sugar.replace('%', ''));
        if (!isNaN(sugarLvl)) qty = qty * (sugarLvl / 100);
    }

    if (recipeItem.ingredientId === 'ing-ice') {
        if (cartItem.variants?.temperature === 'panas' || cartItem.variants?.ice === 'no-ice') {
            qty = 0;
        } else if (cartItem.variants?.ice === 'less') {
            qty = Math.ceil(qty * 0.5);
        } else if (cartItem.variants?.ice === 'extra') {
            qty = Math.ceil(qty * 1.5);
        }
    }

    return Math.round(qty * 100) / 100;
}

/**
 * Memeriksa apakah suatu item pesanan merupakan minuman dalam kemasan cup
 */
export function isCupDrink(cartItem: CartItem, product?: ExtendedProduct): boolean {
    if (product?.recipe && product.recipe.some(r => r.ingredientId === 'ing-cup')) return true;
    if (cartItem.recipe && cartItem.recipe.some(r => r.ingredientId === 'ing-cup')) return true;
    if (product?.category && product.category !== 'snack' && product.category !== 'food') return true;
    return false;
}

/**
 * Menghitung total cup minuman dalam sebuah daftar item pesanan
 */
export function countOrderCupQuantity(items: CartItem[], products: ExtendedProduct[]): number {
    return items.reduce((total, item) => {
        const product = products.find(p => p.id === item.id);
        if (isCupDrink(item, product)) {
            return total + (item.quantity || 1);
        }
        return total;
    }, 0);
}

/**
 * Menghitung alokasi kantong plastik kresek berdasarkan total cup minuman:
 * 1. Pesanan 1 cup       -> Plastik Kresek 1 Cup (`ing-kresek-1`) sebanyak 1 pcs
 * 2. Pesanan 2 s/d 4 cup -> Plastik Kresek 21 (`ing-kresek-21`) sebanyak 1 pcs
 * 3. Pesanan 5 s/d 7 cup -> Plastik Kresek 28 (`ing-kresek-28`) sebanyak 1 pcs
 * 4. Pesanan > 7 cup     -> Kombinasi efisien kresek 28 (kapasitas 7) + sisa kresek
 */
export function calculateKresekForCupCount(totalCups: number): { ingredientId: string; quantity: number }[] {
    if (totalCups <= 0) return [];
    if (totalCups === 1) {
        return [{ ingredientId: 'ing-kresek-1', quantity: 1 }];
    }
    if (totalCups >= 2 && totalCups <= 4) {
        return [{ ingredientId: 'ing-kresek-21', quantity: 1 }];
    }
    if (totalCups >= 5 && totalCups <= 7) {
        return [{ ingredientId: 'ing-kresek-28', quantity: 1 }];
    }

    // Untuk pesanan borongan > 7 cup:
    const counts: Record<string, number> = {};
    const fullBags = Math.floor(totalCups / 7);
    const remainder = totalCups % 7;

    if (fullBags > 0) {
        counts['ing-kresek-28'] = fullBags;
    }
    if (remainder === 1) {
        counts['ing-kresek-1'] = (counts['ing-kresek-1'] || 0) + 1;
    } else if (remainder >= 2 && remainder <= 4) {
        counts['ing-kresek-21'] = (counts['ing-kresek-21'] || 0) + 1;
    } else if (remainder >= 5) {
        counts['ing-kresek-28'] = (counts['ing-kresek-28'] || 0) + 1;
    }

    return Object.entries(counts).map(([ingredientId, quantity]) => ({ ingredientId, quantity }));
}

/**
 * Mendapatkan teks label kemasan kantong plastik kresek untuk struk belanja, layar KDS dapur, dan keranjang POS
 */
export function getKresekPackagingLabel(totalCups: number): string {
    if (totalCups <= 0) return '';
    const reqs = calculateKresekForCupCount(totalCups);
    return reqs.map(r => {
        const name = r.ingredientId === 'ing-kresek-1' ? 'Plastik Kresek 1 Cup'
            : r.ingredientId === 'ing-kresek-21' ? 'Plastik Kresek 21 (2-4 Cup)'
            : 'Plastik Kresek 28 (5-7 Cup)';
        return `${name} (${r.quantity} pcs)`;
    }).join(', ');
}

/**
 * Mengecek kecukupan akumulasi bahan baku BOM di gudang untuk seluruh isi keranjang sekaligus
 * (termasuk bahan baku bersama seperti Daun Teh, Gula Cair, Es Batu, Cup Plastik, dan Plastik Kresek).
 */
export function getInsufficientBomIngredients(
    items: CartItem[],
    products: ExtendedProduct[],
    ingredients: Ingredient[]
): { id: string; name: string; needed: number; available: number; unit: UnitType }[] {
    const totalNeededMap = new Map<string, number>();

    items.forEach(cartItem => {
        const product = products.find(p => p.id === cartItem.id);
        const recipe = product?.recipe || cartItem.recipe;
        if (!recipe || recipe.length === 0) return;

        recipe.forEach(recipeItem => {
            const qty = calculateRecipeIngredientQty(recipeItem, cartItem);
            if (qty > 0) {
                totalNeededMap.set(
                    recipeItem.ingredientId,
                    Math.round(((totalNeededMap.get(recipeItem.ingredientId) || 0) + qty) * 100) / 100
                );
            }
        });
    });

    // Perhitungkan kebutuhan kemasan plastik kresek berdasarkan total cup
    const totalCups = countOrderCupQuantity(items, products);
    if (totalCups > 0) {
        const kresekNeeded = calculateKresekForCupCount(totalCups);
        kresekNeeded.forEach(({ ingredientId, quantity }) => {
            totalNeededMap.set(
                ingredientId,
                Math.round(((totalNeededMap.get(ingredientId) || 0) + quantity) * 100) / 100
            );
        });
    }

    const shortages: { id: string; name: string; needed: number; available: number; unit: UnitType }[] = [];
    totalNeededMap.forEach((needed, ingId) => {
        const ing = ingredients.find(i => i.id === ingId);
        if (ing && ing.stock < needed) {
            shortages.push({
                id: ing.id,
                name: ing.name,
                needed,
                available: ing.stock,
                unit: ing.unit,
            });
        }
    });

    return shortages;
}

export const useInventoryStore = create<InventoryState>()(
    persist(
        (set) => ({
            ingredients: DEFAULT_INGREDIENTS,
            deletedIngredientIds: [],
            opnameLogs: [],
            recordOpname: (data) => {
                const newLog: OpnameLog = {
                    ...data,
                    id: nanoid(),
                    date: new Date().toISOString(),
                };
                set((state) => ({
                    ingredients: state.ingredients.map(i => i.id === data.ingredientId ? { ...i, stock: data.actualStock } : i),
                    opnameLogs: [newLog, ...(state.opnameLogs || [])]
                }));
                firebaseUpdate(ref(rtdb, `ingredients/${data.ingredientId}`), { stock: data.actualStock }).catch(console.warn);
                firebaseSet(ref(rtdb, `opnameLogs/${newLog.id}`), JSON.parse(JSON.stringify(newLog))).catch(console.warn);
            },
            addIngredient: (ingredient) => {
                set((s) => ({
                    ingredients: [...s.ingredients.filter(i => i.id !== ingredient.id), ingredient],
                    deletedIngredientIds: (s.deletedIngredientIds || []).filter(delId => delId !== ingredient.id),
                }));
                firebaseUpdate(ref(rtdb), {
                    [`ingredients/${ingredient.id}`]: ingredient,
                    [`deletedIngredients/${ingredient.id}`]: null,
                }).catch(err => console.warn(err));
            },
            updateIngredient: (id, updated) => {
                set((s) => ({ ingredients: s.ingredients.map(i => i.id === id ? { ...i, ...updated } : i) }));
                firebaseUpdate(ref(rtdb, `ingredients/${id}`), updated).catch(err => console.warn(err));
            },
            // Menghapus bahan baku secara permanen (termasuk bahan default seperti Susu Segar / Kentang Beku)
            // dan membersihkan referensinya dari resep BOM produk serta daftar suplier agar tidak muncul kembali
            deleteIngredient: (id) => {
                set((s) => {
                    const prevDeleted = s.deletedIngredientIds || [];
                    return {
                        ingredients: s.ingredients.filter(i => i.id !== id),
                        deletedIngredientIds: prevDeleted.includes(id) ? prevDeleted : [...prevDeleted, id],
                    };
                });

                const rtdbUpdates: Record<string, any> = {
                    [`ingredients/${id}`]: null,
                    [`deletedIngredients/${id}`]: true,
                };

                // Bersihkan bahan baku yang dihapus dari resep BOM pada setiap produk
                const prodState = useProductStore.getState();
                let productsChanged = false;
                const updatedProducts = prodState.products.map(p => {
                    if (p.recipe && p.recipe.some(r => r.ingredientId === id)) {
                        productsChanged = true;
                        const nextRecipe = p.recipe.filter(r => r.ingredientId !== id);
                        rtdbUpdates[`products/${p.id}/recipe`] = nextRecipe.length > 0 ? nextRecipe : null;
                        rtdbUpdates[`products/${p.id}/hasCustomRecipe`] = true;
                        return { ...p, recipe: nextRecipe, hasCustomRecipe: true };
                    }
                    return p;
                });
                if (productsChanged) {
                    useProductStore.setState({ products: updatedProducts });
                }

                // Bersihkan bahan baku yang dihapus dari daftar item suplier
                const supState = useSupplierStore.getState();
                let suppliersChanged = false;
                const updatedSuppliers = supState.suppliers.map(sup => {
                    if (sup.itemsSupplied && sup.itemsSupplied.includes(id)) {
                        suppliersChanged = true;
                        const nextSupplied = sup.itemsSupplied.filter(itemId => itemId !== id);
                        rtdbUpdates[`suppliers/${sup.id}/itemsSupplied`] = nextSupplied;
                        return { ...sup, itemsSupplied: nextSupplied };
                    }
                    return sup;
                });
                if (suppliersChanged) {
                    useSupplierStore.setState({ suppliers: updatedSuppliers });
                }

                firebaseUpdate(ref(rtdb), rtdbUpdates).catch(err => console.warn(err));
            },
            decrementIngredientsForOrder: (items, products) => {
                set((state) => {
                    const newIngredients = [...state.ingredients];
                    
                    // 1. Potong bahan baku sesuai resep BOM produk (teh, bubuk, susu, sirup, gula, es, cup kemasan)
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

                    // 2. Potong bahan baku plastik kresek otomatis berdasarkan akumulasi cup dalam pesanan:
                    //    - 1 cup       -> Plastik Kresek 1 Cup (-1 pcs)
                    //    - 2 s/d 4 cup -> Plastik Kresek 21 (-1 pcs)
                    //    - 5 s/d 7 cup -> Plastik Kresek 28 (-1 pcs)
                    const totalCups = countOrderCupQuantity(items, products);
                    if (totalCups > 0) {
                        const kresekDeductions = calculateKresekForCupCount(totalCups);
                        kresekDeductions.forEach(({ ingredientId, quantity }) => {
                            const ingIndex = newIngredients.findIndex(i => i.id === ingredientId);
                            if (ingIndex !== -1) {
                                newIngredients[ingIndex] = {
                                    ...newIngredients[ingIndex],
                                    stock: Math.max(0, Math.round((newIngredients[ingIndex].stock - quantity) * 100) / 100)
                                };
                            }
                        });
                    }
                    
                    const updates: Record<string, any> = {};
                    newIngredients.forEach(ing => {
                        updates[`ingredients/${ing.id}`] = ing;
                    });
                    if (Object.keys(updates).length > 0) {
                        firebaseUpdate(ref(rtdb), updates).catch(err => console.warn("Firebase BOM Update Error:", err));
                    }
                    
                    return { ingredients: newIngredients };
                });
            },
            restoreIngredientsForOrder: (items, products) => {
                set((state) => {
                    const newIngredients = [...state.ingredients];

                    // 1. Kembalikan takaran resep produk saat pesanan dibatalkan
                    items.forEach(cartItem => {
                        const product = products.find(p => p.id === cartItem.id);
                        const recipe = product?.recipe || cartItem.recipe;
                        if (!recipe || recipe.length === 0) return;

                        recipe.forEach(recipeItem => {
                            const ingIndex = newIngredients.findIndex(i => i.id === recipeItem.ingredientId);
                            if (ingIndex !== -1) {
                                const qtyToRestore = calculateRecipeIngredientQty(recipeItem, cartItem);
                                newIngredients[ingIndex] = {
                                    ...newIngredients[ingIndex],
                                    stock: Math.round((newIngredients[ingIndex].stock + qtyToRestore) * 100) / 100
                                };
                            }
                        });
                    });

                    // 2. Kembalikan stok plastik kresek otomatis saat pesanan dibatalkan
                    const totalCups = countOrderCupQuantity(items, products);
                    if (totalCups > 0) {
                        const kresekRestorations = calculateKresekForCupCount(totalCups);
                        kresekRestorations.forEach(({ ingredientId, quantity }) => {
                            const ingIndex = newIngredients.findIndex(i => i.id === ingredientId);
                            if (ingIndex !== -1) {
                                newIngredients[ingIndex] = {
                                    ...newIngredients[ingIndex],
                                    stock: Math.round((newIngredients[ingIndex].stock + quantity) * 100) / 100
                                };
                            }
                        });
                    }

                    const updates: Record<string, any> = {};
                    newIngredients.forEach(ing => {
                        updates[`ingredients/${ing.id}`] = ing;
                    });
                    if (Object.keys(updates).length > 0) {
                        firebaseUpdate(ref(rtdb), updates).catch(err => console.warn("Firebase BOM Restore Error:", err));
                    }

                    return { ingredients: newIngredients };
                });
            }
        }),
        {
            name: 'teh-raja-inventory-v1',
            storage: createJSONStorage(() => idbStorage),
            version: 2,
            migrate: (persistedState: unknown, _version: number) => {
                const s = persistedState as { ingredients?: Ingredient[]; deletedIngredientIds?: string[] } | undefined;
                if (!s || !Array.isArray(s.ingredients)) return persistedState as any;
                const existingIds = new Set(s.ingredients.map(i => i.id));
                const deletedSet = new Set(s.deletedIngredientIds || []);
                const missingKresek = DEFAULT_INGREDIENTS.filter(
                    di => di.id.startsWith('ing-kresek-') && !existingIds.has(di.id) && !deletedSet.has(di.id)
                );
                if (missingKresek.length > 0) {
                    return {
                        ...s,
                        ingredients: [...s.ingredients, ...missingKresek],
                    };
                }
                return s;
            }
        }
    )
);

// ══════════════════════════════════════════════════════
// SUPPLIER STORE
// ══════════════════════════════════════════════════════
interface SupplierState {
    suppliers: Supplier[];
    addSupplier: (supplier: Supplier) => void;
    updateSupplier: (id: string, updated: Partial<Supplier>) => void;
    deleteSupplier: (id: string) => void;
}

export const useSupplierStore = create<SupplierState>()(
    persist(
        (set) => ({
            suppliers: [
                { id: 'sup-1', name: 'PT Surya Daun Teh', contactPerson: 'Pak Budi', phone: '08123456789', address: 'Bandung, Jawa Barat', itemsSupplied: ['ing-tea', 'ing-matcha'] },
                { id: 'sup-2', name: 'CV Gula & Sirup Nusantara', contactPerson: 'Bu Ani', phone: '08987654321', address: 'Cirebon, Jawa Barat', itemsSupplied: ['ing-sugar', 'ing-syrup'] },
                { id: 'sup-3', name: 'UD Dairy & Kemasan Prima', contactPerson: 'Pak Hendra', phone: '081322334455', address: 'Lembang, Bandung', itemsSupplied: ['ing-milk', 'ing-cup', 'ing-snack', 'ing-bread', 'ing-kresek-1', 'ing-kresek-21', 'ing-kresek-28'] },
            ],
            addSupplier: (supplier) => {
                set((s) => ({ suppliers: [...s.suppliers, supplier] }));
                firebaseSet(ref(rtdb, `suppliers/${supplier.id}`), supplier).catch(err => console.warn(err));
            },
            updateSupplier: (id, updated) => {
                set((s) => ({ suppliers: s.suppliers.map(i => i.id === id ? { ...i, ...updated } : i) }));
                firebaseUpdate(ref(rtdb, `suppliers/${id}`), updated).catch(err => console.warn(err));
            },
            deleteSupplier: (id) => {
                set((s) => ({ suppliers: s.suppliers.filter(i => i.id !== id) }));
                firebaseSet(ref(rtdb, `suppliers/${id}`), null).catch(err => console.warn(err));
            }
        }),
        { name: 'teh-raja-suppliers-v1', storage: createJSONStorage(() => idbStorage) }
    )
);

// ══════════════════════════════════════════════════════
// FORECAST HISTORY STORE (Import & Simulation)
// ══════════════════════════════════════════════════════
import type { DailyRecord, HistorySource } from '@/lib/forecast/data';

interface ForecastHistoryState {
    records: DailyRecord[];
    addRecords: (newRecords: DailyRecord[]) => void;
    deleteRecord: (id: string) => void;
    clearBySource: (source: HistorySource) => void;
    clearAll: () => void;
    setRecords: (records: DailyRecord[]) => void;
}

export const useForecastHistoryStore = create<ForecastHistoryState>()(
    persist(
        (set, get) => ({
            records: [],
            setRecords: (records) => set({ records }),
            addRecords: (newRecords) => {
                set((state) => {
                    const map = new Map<string, DailyRecord>();
                    state.records.forEach(r => map.set(r.id, r));
                    newRecords.forEach(r => map.set(r.id, r));
                    const sorted = Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
                    return { records: sorted };
                });
                newRecords.forEach(r => {
                    const cleanRecord = JSON.parse(JSON.stringify(r));
                    firebaseSet(ref(rtdb, `salesHistory/${r.id}`), cleanRecord).catch(err => console.warn("Firebase History Set Error:", err));
                });
            },
            deleteRecord: (id) => {
                set((state) => ({ records: state.records.filter(r => r.id !== id) }));
                firebaseSet(ref(rtdb, `salesHistory/${id}`), null).catch(err => console.warn(err));
            },
            clearBySource: (source) => {
                const toDelete = get().records.filter(r => r.source === source);
                set((state) => ({ records: state.records.filter(r => r.source !== source) }));
                toDelete.forEach(r => {
                    firebaseSet(ref(rtdb, `salesHistory/${r.id}`), null).catch(err => console.warn(err));
                });
            },
            clearAll: () => {
                set({ records: [] });
                firebaseSet(ref(rtdb, 'salesHistory'), null).catch(err => console.warn(err));
            }
        }),
        { name: 'teh-raja-forecast-history-v1', storage: createJSONStorage(() => idbStorage) }
    )
);

// ══════════════════════════════════════════════════════
// EXPENSE & PETTY CASH STORE
// ══════════════════════════════════════════════════════
export type ExpenseCategory = 'restok_bahan' | 'bahan_tambahan' | 'operasional' | 'utilitas' | 'gaji' | 'lainnya';

export const EXPENSE_CATEGORIES: { id: ExpenseCategory; label: string }[] = [
    { id: 'restok_bahan', label: 'Restok Bahan Baku (PO Suplier)' },
    { id: 'bahan_tambahan', label: 'Bahan Tambahan (Es batu, susu, sirup, dll)' },
    { id: 'operasional', label: 'Operasional Toko (Sedotan, kresek, sabun, dll)' },
    { id: 'utilitas', label: 'Utilitas (Listrik, air galon, internet)' },
    { id: 'gaji', label: 'Uang Makan / Kasbon Staff' },
    { id: 'lainnya', label: 'Lain-lain' },
];

export interface Expense {
    id: string;
    date: string; // ISO
    category: ExpenseCategory;
    description: string;
    amount: number;
    paidVia: 'kas_laci' | 'rekening_toko';
    cashierName?: string;
    sessionId?: string;
    notes?: string;
    ingredientId?: string;
    supplierName?: string;
}

export const LEGACY_DEMO_EXPENSE_IDS = new Set(['exp-demo-1', 'exp-demo-2']);

interface ExpenseState {
    expenses: Expense[];
    deletedExpenseIds: string[];
    addExpense: (expense: Omit<Expense, 'id' | 'date'>) => Expense;
    deleteExpense: (id: string) => void;
    setExpenses: (expenses: Expense[]) => void;
}

export const useExpenseStore = create<ExpenseState>()(
    persist(
        (set) => ({
            expenses: [],
            deletedExpenseIds: [],
            setExpenses: (expenses) => set({ expenses }),
            addExpense: (expenseData) => {
                const salesState = useSalesStore.getState();
                const activeSessionId = salesState.isStoreOpen ? (salesState.currentSessionId || undefined) : undefined;
                const newExp: Expense = {
                    ...expenseData,
                    sessionId: expenseData.sessionId || activeSessionId,
                    id: nanoid(),
                    date: new Date().toISOString(),
                };
                set((s) => ({
                    expenses: [newExp, ...s.expenses],
                    deletedExpenseIds: s.deletedExpenseIds.filter(did => did !== newExp.id),
                }));
                firebaseSet(ref(rtdb, `expenses/${newExp.id}`), JSON.parse(JSON.stringify(newExp))).catch(logRtdbWarn);
                firebaseSet(ref(rtdb, `deletedExpenses/${newExp.id}`), null).catch(logRtdbWarn);
                return newExp;
            },
            deleteExpense: (id) => {
                set((s) => ({
                    expenses: s.expenses.filter(e => e.id !== id),
                    deletedExpenseIds: Array.from(new Set([...s.deletedExpenseIds, id])),
                }));
                firebaseSet(ref(rtdb, `expenses/${id}`), null).catch(logRtdbWarn);
                firebaseSet(ref(rtdb, `deletedExpenses/${id}`), true).catch(logRtdbWarn);
            }
        }),
        {
            name: 'teh-raja-expenses-v1',
            version: 2,
            storage: createJSONStorage(() => idbStorage),
            migrate: (persisted: unknown, version: number) => {
                const state = persisted as Partial<ExpenseState> | undefined;
                const deleted = Array.isArray(state?.deletedExpenseIds) ? [...state.deletedExpenseIds] : [];
                let expenses = Array.isArray(state?.expenses) ? [...state.expenses] : [];
                if (version < 2) {
                    expenses = expenses.filter(e => !LEGACY_DEMO_EXPENSE_IDS.has(e.id));
                    LEGACY_DEMO_EXPENSE_IDS.forEach(demoId => {
                        if (!deleted.includes(demoId)) deleted.push(demoId);
                    });
                }
                return {
                    ...state,
                    expenses,
                    deletedExpenseIds: deleted,
                };
            },
        }
    )
);

// ══════════════════════════════════════════════════════
// STORE OPERATIONAL CONFIG (LOCK / UNLOCK MENU & ORDER ONLINE PELANGGAN)
// ══════════════════════════════════════════════════════
export interface ShopClosePreset {
    id: string;
    label: string;
    badge: string;
    message: string;
    reopenHint: string;
}

export const SHOP_CLOSE_PRESETS: ShopClosePreset[] = [
    {
        id: 'holiday',
        label: '📅 Hari Libur / Tanggal Merah',
        badge: 'Libur Operasional',
        message: 'Mohon maaf, Kedai Teh Raja sedang libur operasional hari ini. Terima kasih atas pengertian Anda dan sampai jumpa kembali!',
        reopenHint: 'Buka kembali di hari operasional berikutnya pukul 09.00 WIB',
    },
    {
        id: 'closed_hours',
        label: '🌙 Kedai Sudah Tutup',
        badge: 'Kedai Sedang Tutup',
        message: 'Mohon maaf, saat ini Kedai Teh Raja sedang tutup di luar jam operasional. Silakan kunjungi kembali saat kedai buka.',
        reopenHint: 'Jam Operasional: 09.00 – 21.00 WIB',
    },
    {
        id: 'break',
        label: '⏸️ Tutup Sementara / Istirahat',
        badge: 'Tutup Sementara',
        message: 'Mohon maaf, pemesanan online sedang dikunci sementara untuk istirahat operasional dan persiapan bahan baku segar.',
        reopenHint: 'Akan segera dibuka kembali hari ini',
    },
    {
        id: 'sold_out',
        label: '🍵 Stok Hari Ini Habis',
        badge: 'Habis Terjual Hari Ini',
        message: 'Terima kasih! Seluruh kuota racikan Teh Raja hari ini telah habis terjual. Sampai jumpa kembali besok!',
        reopenHint: 'Buka kembali besok pagi dengan bahan segar baru',
    },
];

export interface StoreOperationConfig {
    /** true = Kedai Buka (Pelanggan bebas akses /menu & checkout), false = Kedai Dikunci / Tutup */
    isOnlineOrderOpen: boolean;
    /** Label singkat alasan tutup (misal: "Libur Operasional", "Kedai Sedang Tutup") */
    closedBadge: string;
    /** Pesan pengumuman lengkap yang tampil di layar pelanggan saat kedai tutup */
    closedMessage: string;
    /** Informasi opsional jadwal buka kembali */
    reopenInfo?: string;
    /** Waktu perubahan status terakhir (ISO) */
    updatedAt?: string;
    /** Nama Admin yang membuka / menutup kedai */
    updatedBy?: string;
}

interface StoreConfigState extends StoreOperationConfig {
    /** Membuka kunci kedai agar pelanggan bisa mengakses menu & memesan online kembali */
    openOnlineStore: (updatedBy?: string) => void;
    /** Mengunci / menutup akses menu & order online pelanggan kapan saja (libur / tutup) */
    closeOnlineStore: (options?: {
        closedBadge?: string;
        closedMessage?: string;
        reopenInfo?: string;
        updatedBy?: string;
    }) => void;
    /** Memperbarui pesan libur / info jadwal buka tanpa mengubah status jika diperlukan */
    updateStoreConfig: (partial: Partial<StoreOperationConfig>) => void;
}

export const DEFAULT_STORE_CONFIG: StoreOperationConfig = {
    isOnlineOrderOpen: true,
    closedBadge: 'Libur Operasional',
    closedMessage: 'Mohon maaf, Kedai Teh Raja sedang tutup / libur operasional hari ini. Silakan kunjungi kembali pada jam operasional berikutnya.',
    reopenInfo: 'Jam Operasional: Setiap Hari 09.00 – 21.00 WIB',
};

export const useStoreConfigStore = create<StoreConfigState>()(
    persist(
        (set, get) => ({
            ...DEFAULT_STORE_CONFIG,
            openOnlineStore: (updatedBy = 'Admin') => {
                const payload: StoreOperationConfig = {
                    isOnlineOrderOpen: true,
                    closedBadge: get().closedBadge || DEFAULT_STORE_CONFIG.closedBadge,
                    closedMessage: get().closedMessage || DEFAULT_STORE_CONFIG.closedMessage,
                    reopenInfo: get().reopenInfo || '',
                    updatedAt: new Date().toISOString(),
                    updatedBy,
                };
                set(payload);
                firebaseSet(ref(rtdb, 'storeConfig'), JSON.parse(JSON.stringify(payload))).catch(logRtdbWarn);
            },
            closeOnlineStore: (options) => {
                const payload: StoreOperationConfig = {
                    isOnlineOrderOpen: false,
                    closedBadge: options?.closedBadge?.trim() || get().closedBadge || DEFAULT_STORE_CONFIG.closedBadge,
                    closedMessage: options?.closedMessage?.trim() || get().closedMessage || DEFAULT_STORE_CONFIG.closedMessage,
                    reopenInfo: options?.reopenInfo !== undefined ? options.reopenInfo.trim() : (get().reopenInfo || ''),
                    updatedAt: new Date().toISOString(),
                    updatedBy: options?.updatedBy || 'Admin',
                };
                set(payload);
                firebaseSet(ref(rtdb, 'storeConfig'), JSON.parse(JSON.stringify(payload))).catch(logRtdbWarn);
            },
            updateStoreConfig: (partial) => {
                const current = get();
                const payload: StoreOperationConfig = {
                    isOnlineOrderOpen: partial.isOnlineOrderOpen !== undefined ? partial.isOnlineOrderOpen : current.isOnlineOrderOpen,
                    closedBadge: partial.closedBadge !== undefined ? partial.closedBadge : current.closedBadge,
                    closedMessage: partial.closedMessage !== undefined ? partial.closedMessage : current.closedMessage,
                    reopenInfo: partial.reopenInfo !== undefined ? partial.reopenInfo : (current.reopenInfo || ''),
                    updatedAt: new Date().toISOString(),
                    updatedBy: partial.updatedBy || current.updatedBy || 'Admin',
                };
                set(payload);
                firebaseSet(ref(rtdb, 'storeConfig'), JSON.parse(JSON.stringify(payload))).catch(logRtdbWarn);
            },
        }),
        { name: 'teh-raja-store-config-v1', storage: createJSONStorage(() => idbStorage) }
    )
);

// ══════════════════════════════════════════════════════
// STORE ACCOUNT / REKENING TOKO REAL-TIME (PUTARAN MODAL RESTOK)
// ══════════════════════════════════════════════════════
export type StoreAccountMovementType = 'topup' | 'withdraw';

export interface StoreAccountMovement {
    id: string;
    date: string; // ISO
    type: StoreAccountMovementType;
    amount: number;
    description: string;
    recordedBy?: string;
    notes?: string;
}

interface StoreAccountState {
    movements: StoreAccountMovement[];
    deletedMovementIds: string[];
    addMovement: (movement: Omit<StoreAccountMovement, 'id' | 'date'>) => StoreAccountMovement;
    deleteMovement: (id: string) => void;
    setMovements: (movements: StoreAccountMovement[]) => void;
}

export const useStoreAccountStore = create<StoreAccountState>()(
    persist(
        (set) => ({
            movements: [],
            deletedMovementIds: [],
            setMovements: (movements) => set({ movements }),
            addMovement: (movementData) => {
                const newMov: StoreAccountMovement = {
                    ...movementData,
                    id: nanoid(),
                    date: new Date().toISOString(),
                };
                set((s) => ({
                    movements: [newMov, ...s.movements],
                    deletedMovementIds: s.deletedMovementIds.filter(did => did !== newMov.id),
                }));
                firebaseSet(
                    ref(rtdb, `storeAccountMovements/${newMov.id}`),
                    JSON.parse(JSON.stringify(newMov))
                ).catch(logRtdbWarn);
                firebaseSet(ref(rtdb, `deletedStoreAccountMovements/${newMov.id}`), null).catch(logRtdbWarn);
                return newMov;
            },
            deleteMovement: (id) => {
                set((s) => ({
                    movements: s.movements.filter(m => m.id !== id),
                    deletedMovementIds: Array.from(new Set([...s.deletedMovementIds, id])),
                }));
                firebaseSet(ref(rtdb, `storeAccountMovements/${id}`), null).catch(logRtdbWarn);
                firebaseSet(ref(rtdb, `deletedStoreAccountMovements/${id}`), true).catch(logRtdbWarn);
            },
        }),
        {
            name: 'teh-raja-store-account-v1',
            storage: createJSONStorage(() => idbStorage),
        }
    )
);

export function isRestockExpense(expense: Expense): boolean {
    return expense.category === 'restok_bahan' || (expense.description || '').startsWith('Restok PO ');
}

export interface StoreAccountSummary {
    validOrderCount: number;
    cashRevenue: number;
    qrisRevenue: number;
    transferRevenue: number;
    digitalRevenue: number;
    totalOrderRevenue: number;
    totalTopUp: number;
    totalWithdraw: number;
    rekeningRestockCost: number;
    rekeningOtherExpense: number;
    rekeningExpenses: number;
    cashDrawerRestockCost: number;
    cashDrawerOtherExpense: number;
    cashDrawerExpenses: number;
    totalRestockCost: number;
    totalOtherExpenses: number;
    totalAllExpenses: number;
    totalInflow: number;
    totalOutflow: number;
    availableBalance: number;
}

/**
 * Menghitung Saldo & Rincian Rekening Toko secara real-time untuk putaran modal restok bahan:
 * Saldo Rekening Toko =
 *   Pendapatan Total Kedai (Tunai + QRIS + Transfer, tidak termasuk pesanan dibatalkan)
 *   + Top-Up / Modal Awal Rekening
 *   - Seluruh Pengeluaran & Restok (Rekening Toko + Kas Laci)
 *   - Penarikan Dana / Ambil Laba
 */
export function calculateStoreAccountSummary(
    orders: Order[],
    expenses: Expense[],
    movements: StoreAccountMovement[]
): StoreAccountSummary {
    const validOrders = (orders || []).filter(o => o && o.status !== 'cancelled');

    let cashRevenue = 0;
    let qrisRevenue = 0;
    let transferRevenue = 0;

    for (const o of validOrders) {
        const amt = Number(o.total) || 0;
        if (o.paymentMethod === 'qris') qrisRevenue += amt;
        else if (o.paymentMethod === 'transfer') transferRevenue += amt;
        else cashRevenue += amt;
    }

    const digitalRevenue = qrisRevenue + transferRevenue;
    const totalOrderRevenue = cashRevenue + digitalRevenue;

    let totalTopUp = 0;
    let totalWithdraw = 0;
    for (const m of movements || []) {
        const amt = Number(m.amount) || 0;
        if (m.type === 'topup') totalTopUp += amt;
        else if (m.type === 'withdraw') totalWithdraw += amt;
    }

    let rekeningRestockCost = 0;
    let rekeningOtherExpense = 0;
    let cashDrawerRestockCost = 0;
    let cashDrawerOtherExpense = 0;

    for (const e of expenses || []) {
        const amt = Number(e.amount) || 0;
        const restock = isRestockExpense(e);
        if (e.paidVia === 'rekening_toko') {
            if (restock) rekeningRestockCost += amt;
            else rekeningOtherExpense += amt;
        } else {
            if (restock) cashDrawerRestockCost += amt;
            else cashDrawerOtherExpense += amt;
        }
    }

    const rekeningExpenses = rekeningRestockCost + rekeningOtherExpense;
    const cashDrawerExpenses = cashDrawerRestockCost + cashDrawerOtherExpense;
    const totalRestockCost = rekeningRestockCost + cashDrawerRestockCost;
    const totalOtherExpenses = rekeningOtherExpense + cashDrawerOtherExpense;
    const totalAllExpenses = rekeningExpenses + cashDrawerExpenses;
    const totalInflow = totalOrderRevenue + totalTopUp;
    const totalOutflow = totalAllExpenses + totalWithdraw;
    const availableBalance = totalInflow - totalOutflow;

    return {
        validOrderCount: validOrders.length,
        cashRevenue,
        qrisRevenue,
        transferRevenue,
        digitalRevenue,
        totalOrderRevenue,
        totalTopUp,
        totalWithdraw,
        rekeningRestockCost,
        rekeningOtherExpense,
        rekeningExpenses,
        cashDrawerRestockCost,
        cashDrawerOtherExpense,
        cashDrawerExpenses,
        totalRestockCost,
        totalOtherExpenses,
        totalAllExpenses,
        totalInflow,
        totalOutflow,
        availableBalance,
    };
}

export type StoreLedgerKind = 'order_revenue' | 'topup' | 'restock' | 'expense' | 'withdraw';

export interface StoreAccountLedgerEntry {
    id: string;
    sourceId: string;
    date: string;
    kind: StoreLedgerKind;
    direction: 'in' | 'out';
    amount: number;
    signedAmount: number;
    balanceAfter: number;
    title: string;
    subtitle: string;
    channelLabel: string;
    actor?: string;
    canDelete: boolean;
}

/**
 * Membangun buku besar mutasi Rekening Toko real-time (terurut terbaru di atas)
 * lengkap dengan running balance setelah tiap transaksi.
 */
export function buildStoreAccountLedger(
    orders: Order[],
    expenses: Expense[],
    movements: StoreAccountMovement[]
): StoreAccountLedgerEntry[] {
    interface RawEntry {
        id: string;
        sourceId: string;
        date: string;
        ts: number;
        kind: StoreLedgerKind;
        direction: 'in' | 'out';
        amount: number;
        signedAmount: number;
        title: string;
        subtitle: string;
        channelLabel: string;
        actor?: string;
        canDelete: boolean;
    }

    const raw: RawEntry[] = [];

    for (const o of orders || []) {
        if (!o || o.status === 'cancelled') continue;
        const amt = Number(o.total) || 0;
        const method = o.paymentMethod === 'qris'
            ? 'QRIS'
            : o.paymentMethod === 'transfer'
                ? 'Transfer Bank'
                : 'Tunai POS';
        const itemsSummary = (o.items || [])
            .slice(0, 2)
            .map(i => `${i.quantity}x ${i.name}`)
            .join(', ') + ((o.items?.length || 0) > 2 ? ` +${o.items.length - 2} lagi` : '');

        raw.push({
            id: `ord-${o.id}`,
            sourceId: o.id,
            date: o.date,
            ts: new Date(o.date).getTime() || 0,
            kind: 'order_revenue',
            direction: 'in',
            amount: amt,
            signedAmount: amt,
            title: `Pendapatan Order · ${o.customerName || 'Customer'}`,
            subtitle: itemsSummary || 'Pesanan kedai',
            channelLabel: method,
            actor: o.cashierName || 'Kasir / Online',
            canDelete: false,
        });
    }

    for (const m of movements || []) {
        const amt = Number(m.amount) || 0;
        const isTopUp = m.type === 'topup';
        raw.push({
            id: `mov-${m.id}`,
            sourceId: m.id,
            date: m.date,
            ts: new Date(m.date).getTime() || 0,
            kind: isTopUp ? 'topup' : 'withdraw',
            direction: isTopUp ? 'in' : 'out',
            amount: amt,
            signedAmount: isTopUp ? amt : -amt,
            title: m.description || (isTopUp ? 'Top-Up Modal Rekening' : 'Penarikan Dana Rekening'),
            subtitle: m.notes || (isTopUp ? 'Penambahan modal kerja Rekening Toko' : 'Penarikan dana / pengambilan laba'),
            channelLabel: isTopUp ? 'Top-Up Modal' : 'Tarik Dana',
            actor: m.recordedBy || 'Admin',
            canDelete: true,
        });
    }

    for (const e of expenses || []) {
        const amt = Number(e.amount) || 0;
        const restock = isRestockExpense(e);
        raw.push({
            id: `exp-${e.id}`,
            sourceId: e.id,
            date: e.date,
            ts: new Date(e.date).getTime() || 0,
            kind: restock ? 'restock' : 'expense',
            direction: 'out',
            amount: amt,
            signedAmount: -amt,
            title: e.description || (restock ? 'Restok Bahan Baku' : 'Biaya Operasional'),
            subtitle: e.notes || (restock ? 'Putar modal untuk pembelian stok bahan' : 'Pengeluaran operasional / petty cash'),
            channelLabel: e.paidVia === 'kas_laci' ? '💵 Kas Laci' : '🏦 Rekening Toko',
            actor: e.cashierName || 'Admin',
            canDelete: false,
        });
    }

    // Hitung saldo berjalan secara kronologis (terlama -> terbaru)
    raw.sort((a, b) => a.ts - b.ts || a.id.localeCompare(b.id));

    let running = 0;
    const withBalance: StoreAccountLedgerEntry[] = raw.map(entry => {
        running += entry.signedAmount;
        return {
            id: entry.id,
            sourceId: entry.sourceId,
            date: entry.date,
            kind: entry.kind,
            direction: entry.direction,
            amount: entry.amount,
            signedAmount: entry.signedAmount,
            balanceAfter: running,
            title: entry.title,
            subtitle: entry.subtitle,
            channelLabel: entry.channelLabel,
            actor: entry.actor,
            canDelete: entry.canDelete,
        };
    });

    // Tampilkan terbaru di paling atas
    return withBalance.reverse();
}
