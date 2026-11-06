/**
 * @file Global State Management (Zustand)
 * @description Jantung arsitektur offline-first dari aplikasi. Semua logika penyimpanan lokal (Cart, Sales, Products, dll) dikonfigurasi di sini.
 * Menggunakan idb-keyval (IndexedDB) untuk kapabilitas penyimpanan tanpa batas.
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
    customerName?: string;
    cashierName?: string;
    status: 'pending' | 'awaiting_payment' | 'processing' | 'completed' | 'cancelled';
    // POS Fields
    paymentMethod?: 'cash' | 'qris' | 'transfer';
    cashReceived?: number;
    changeAmount?: number;
    tableNumber?: string;
    branchId?: string; // [MULTI-BRANCH] Identifier cabang
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

// ── Promo Engine ─────────────────────────────────────────────
export type PromoType = 'percent' | 'amount' | 'happy_hour';

export interface Promo {
    id: string;
    name: string;            // e.g. "Happy Hour Sore"
    type: PromoType;
    value: number;           // e.g. 10 for 10% | 5000 for Rp5.000
    minSubtotal?: number;    // Minimum purchase to apply (optional)
    startHour?: number;      // For happy_hour type (0-23)
    endHour?: number;        // For happy_hour type (0-23)
    isActive: boolean;
    description?: string;
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
                set((state) => ({
                    products: state.products.map((p) => (p.id === id ? { ...p, ...updated } : p))
                }));
                firebaseUpdate(ref(rtdb, `products/${id}`), JSON.parse(JSON.stringify(updated))).catch(err => console.warn(err));
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
        { name: 'teh-raja-products-v4', storage: createJSONStorage(() => idbStorage) }
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

                const sessionOrders = state.orders.filter(o => {
                    const oTime = new Date(o.date).getTime();
                    const sTime = new Date(session.startTime).getTime();
                    return !isNaN(oTime) && oTime >= sTime && o.status !== 'cancelled';
                });
                const totalSales = sessionOrders.reduce((sum, order) => sum + order.total, 0);
                const totalOrders = sessionOrders.length;
                
                const cashSales = sessionOrders.filter(o => o.paymentMethod === 'cash' || !o.paymentMethod).reduce((sum, order) => sum + order.total, 0);
                const sessionCashExpenses = (useExpenseStore.getState()?.expenses || [])
                    .filter(e => {
                        const eTime = new Date(e.date).getTime();
                        const sTime = new Date(session.startTime).getTime();
                        return e.paidVia === 'kas_laci' && !isNaN(eTime) && eTime >= sTime;
                    })
                    .reduce((sum, e) => sum + e.amount, 0);
                const expectedCash = Math.max(0, (session.startingCash || 0) + cashSales - sessionCashExpenses);

                const closedSession: StoreSession = {
                    ...session,
                    endTime: new Date().toISOString(),
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
                const orderWithBranch: Order = {
                    ...order,
                    branchId: order.branchId || get().branchId || 'main',
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
                set({ orders: [], logs: [], sessions: [], isStoreOpen: false, currentSessionId: null });
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
    addPromo: (promo: Promo) => void;
    updatePromo: (id: string, updated: Partial<Promo>) => void;
    deletePromo: (id: string) => void;
    togglePromo: (id: string) => void;
    /** Returns the best applicable promo for a given subtotal & current time */
    getApplicablePromo: (subtotal: number) => { promo: Promo; discountAmount: number } | null;
}

export const usePromoStore = create<PromoState>()(
    persist(
        (set, get) => ({
            promos: [
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
            addPromo: (promo) => {
                set((s) => ({ promos: [...s.promos, promo] }));
                firebaseSet(ref(rtdb, `promos/${promo.id}`), JSON.parse(JSON.stringify(promo))).catch(console.warn);
            },
            updatePromo: (id, updated) => {
                set((s) => ({
                    promos: s.promos.map((p) => p.id === id ? { ...p, ...updated } : p),
                }));
                firebaseUpdate(ref(rtdb, `promos/${id}`), JSON.parse(JSON.stringify(updated))).catch(console.warn);
            },
            deletePromo: (id) => {
                set((s) => ({ promos: s.promos.filter((p) => p.id !== id) }));
                firebaseSet(ref(rtdb, `promos/${id}`), null).catch(console.warn);
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
            getApplicablePromo: (subtotal) => {
                const now = new Date();
                const currentHour = now.getHours();
                const activePromos = get().promos.filter((p) => p.isActive);
                let best: { promo: Promo; discountAmount: number } | null = null;

                for (const promo of activePromos) {
                    if (promo.minSubtotal && subtotal < promo.minSubtotal) continue;

                    let discountAmount = 0;

                    if (promo.type === 'happy_hour') {
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
        { name: 'teh-raja-promos-v1', storage: createJSONStorage(() => idbStorage) }
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
// INVENTORY STORE (BOM)
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
    opnameLogs: OpnameLog[];
    addIngredient: (ingredient: Ingredient) => void;
    updateIngredient: (id: string, updated: Partial<Ingredient>) => void;
    deleteIngredient: (id: string) => void;
    decrementIngredientsForOrder: (items: CartItem[], products: ExtendedProduct[]) => void;
    restoreIngredientsForOrder: (items: CartItem[], products: ExtendedProduct[]) => void;
    recordOpname: (log: Omit<OpnameLog, 'id' | 'date'>) => void;
}

function calculateRecipeIngredientQty(recipeItem: RecipeItem, cartItem: CartItem): number {
    let sizeMultiplier = 1;
    if (cartItem.variants?.size === 'L') sizeMultiplier = 1.5;

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

export const useInventoryStore = create<InventoryState>()(
    persist(
        (set) => ({
            ingredients: DEFAULT_INGREDIENTS,
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
                set((s) => ({ ingredients: [...s.ingredients, ingredient] }));
                firebaseSet(ref(rtdb, `ingredients/${ingredient.id}`), ingredient).catch(err => console.warn(err));
            },
            updateIngredient: (id, updated) => {
                set((s) => ({ ingredients: s.ingredients.map(i => i.id === id ? { ...i, ...updated } : i) }));
                firebaseUpdate(ref(rtdb, `ingredients/${id}`), updated).catch(err => console.warn(err));
            },
            deleteIngredient: (id) => {
                set((s) => ({ ingredients: s.ingredients.filter(i => i.id !== id) }));
                firebaseSet(ref(rtdb, `ingredients/${id}`), null).catch(err => console.warn(err));
            },
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
        { name: 'teh-raja-inventory-v1', storage: createJSONStorage(() => idbStorage) }
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
                { id: 'sup-3', name: 'UD Dairy & Kemasan Prima', contactPerson: 'Pak Hendra', phone: '081322334455', address: 'Lembang, Bandung', itemsSupplied: ['ing-milk', 'ing-cup', 'ing-snack', 'ing-bread'] },
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
export type ExpenseCategory = 'bahan_tambahan' | 'operasional' | 'utilitas' | 'gaji' | 'lainnya';

export const EXPENSE_CATEGORIES: { id: ExpenseCategory; label: string }[] = [
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
}

interface ExpenseState {
    expenses: Expense[];
    addExpense: (expense: Omit<Expense, 'id' | 'date'>) => Expense;
    deleteExpense: (id: string) => void;
    setExpenses: (expenses: Expense[]) => void;
}

export const useExpenseStore = create<ExpenseState>()(
    persist(
        (set) => ({
            expenses: [
                {
                    id: 'exp-demo-1',
                    date: new Date(Date.now() - 3600000 * 5).toISOString(),
                    category: 'bahan_tambahan',
                    description: 'Beli Es Batu Kristal (2 Karung)',
                    amount: 24000,
                    paidVia: 'kas_laci',
                    cashierName: 'Kasir Default',
                },
                {
                    id: 'exp-demo-2',
                    date: new Date(Date.now() - 3600000 * 24).toISOString(),
                    category: 'utilitas',
                    description: 'Air Mineral Galon (2 Galon)',
                    amount: 40000,
                    paidVia: 'kas_laci',
                    cashierName: 'Kasir Default',
                }
            ],
            setExpenses: (expenses) => set({ expenses }),
            addExpense: (expenseData) => {
                const newExp: Expense = {
                    ...expenseData,
                    id: nanoid(),
                    date: new Date().toISOString(),
                };
                set((s) => ({ expenses: [newExp, ...s.expenses] }));
                firebaseSet(ref(rtdb, `expenses/${newExp.id}`), JSON.parse(JSON.stringify(newExp))).catch(console.warn);
                return newExp;
            },
            deleteExpense: (id) => {
                set((s) => ({ expenses: s.expenses.filter(e => e.id !== id) }));
                firebaseSet(ref(rtdb, `expenses/${id}`), null).catch(console.warn);
            }
        }),
        { name: 'teh-raja-expenses-v1', storage: createJSONStorage(() => idbStorage) }
    )
);
