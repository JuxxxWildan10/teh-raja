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
import { rtdb } from '@/lib/firebase'; // [NEW]
import { ref, set as firebaseSet, update as firebaseUpdate } from 'firebase/database'; // [NEW]
import { nanoid } from 'nanoid';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';

// --- Types ---
export type Role = 'admin' | 'cashier';

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
    status: 'pending' | 'processing' | 'completed' | 'cancelled';
    // POS Fields
    paymentMethod?: 'cash' | 'qris' | 'transfer';
    cashReceived?: number;
    changeAmount?: number;
    tableNumber?: string;
    orderType?: 'dine-in' | 'take-away';
}

export interface StoreSession {
    id: string;
    startTime: string; // ISO
    endTime?: string;  // ISO
    cashierName: string;
    totalSales: number;
    totalOrders: number;
    startingCash?: number;
    actualCash?: number;
    expectedCash?: number;
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
    orders: Order[];
    offlineOrders: Order[]; // [NEW] Robust Offline Queue
    heldOrders: Order[]; // Hold order feature
    logs: ActivityLog[];
    offlineLogs: ActivityLog[]; // [NEW] Robust Offline Queue
    isStoreOpen: boolean;
    currentSessionId: string | null;
    sessions: StoreSession[];
    openStore: (cashierName: string, startingCash: number) => void;
    closeStore: (actualCash?: number, notes?: string) => StoreSession | null;

    addOrder: (order: Order) => void;
    removeOfflineOrder: (id: string) => void; // [NEW]
    updateOrderStatus: (orderId: string, status: Order['status']) => void;
    holdOrder: (order: Order) => void; // Save current order to hold
    resumeOrder: (heldOrderId: string) => Order | null; // Get held order back
    deleteHeldOrder: (heldOrderId: string) => void;
    addLog: (action: string, details: string, user: string) => void;
    removeOfflineLog: (id: string) => void; // [NEW]
    getDailySales: () => { date: string; total: number; count: number }[];
    getProductPopularity: () => { name: string; count: number }[];
    resetData: () => void;
}

interface AuthState {
    user: User | null;
    users: User[]; // [NEW] Staff accounts
    login: (username: string, role: Role) => User | null; // Mengembalikan user
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
            // Kompatibilitas mundur. Idealnya panggil loginWithPassword
            login: (username, role) => {
                const found = get().users.find(u => u.username === username);
                const u = found || { id: nanoid(), username, role, name: username === 'admin' ? 'Administrator' : 'Staff Kasir' };
                set({ user: u });
                return u;
            },
            loginWithPassword: async (username, password) => {
                const found = get().users.find(u => u.username === username && u.password === password);
                if (found) {
                    // Firebase Auth integration
                    const safePassword = password.length < 6 ? password + '123456' : password;
                    const email = `${username}@tehraja.local`;
                    try {
                        await signInWithEmailAndPassword(auth, email, safePassword);
                    } catch (err: any) {
                        try {
                            await createUserWithEmailAndPassword(auth, email, safePassword);
                        } catch (e) {
                            console.error("Firebase Auth Error:", e);
                        }
                    }
                    set({ user: found });
                    return found;
                }
                return null;
            },
            logout: async () => {
                try {
                    await signOut(auth);
                } catch (e) {
                    console.error("SignOut Error", e);
                }
                set({ user: null });
            },
            addUser: (u) => set((s) => ({ users: [...s.users, u] })),
            removeUser: (id) => set((s) => ({ users: s.users.filter(u => u.id !== id) })),
            updateUser: (id, updated) => set((s) => ({ users: s.users.map(u => u.id === id ? { ...u, ...updated } : u) })),
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
                    // Build a cartItemId that is unique per product+variant combo
                    const variantSig = variants ? JSON.stringify(variants) : 'default';
                    const cartItemId = `${product.id}__${variantSig}`;
                    const vFinalPrice = finalPrice ?? product.price;

                    const existing = state.items.find(i => i.cartItemId === cartItemId);
                    // Count total qty of this product across all variants to check stock
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
        { name: 'teh-raja-cart-v2', storage: createJSONStorage(() => idbStorage) }  // Bumped version to clear old incompatible cache
    )
);

export const useProductStore = create<ProductState>()(
    persist(
        (set) => ({
            products: initialProducts.map(p => ({
                ...p,
                isAvailable: true,
                stock: 50,
                minStockThreshold: 10
            })),
            addProduct: (product) => {
                set((state) => ({ products: [...state.products, product] }));
                firebaseSet(ref(rtdb, `products/${product.id}`), product).catch(err => console.error(err));
            },
            updateProduct: (id, updated) => {
                set((state) => ({
                    products: state.products.map((p) => (p.id === id ? { ...p, ...updated } : p))
                }));
                // Only update the specific fields
                firebaseUpdate(ref(rtdb, `products/${id}`), updated).catch(err => console.error(err));
            },
            deleteProduct: (id) => {
                set((state) => ({
                    products: state.products.filter((p) => p.id !== id)
                }));
                firebaseSet(ref(rtdb, `products/${id}`), null).catch(err => console.error(err));
            },
            toggleAvailability: (id) => {
                set((state) => {
                    const newProducts = state.products.map((p) => {
                        if (p.id === id) {
                            const updated = { ...p, isAvailable: !p.isAvailable };
                            firebaseUpdate(ref(rtdb, `products/${id}`), { isAvailable: updated.isAvailable }).catch(err => console.error(err));
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
                    const newProducts = state.products.map(p => {
                        const found = items.find(i => i.id === p.id);
                        if (found) {
                            const newStock = Math.max(0, p.stock - found.quantity);
                            const updated = { ...p, stock: newStock, isAvailable: newStock > 0 };
                            updates[`products/${p.id}/stock`] = newStock;
                            updates[`products/${p.id}/isAvailable`] = newStock > 0;
                            return updated;
                        }
                        return p;
                    });
                    if (Object.keys(updates).length > 0) {
                        firebaseUpdate(ref(rtdb), updates).catch(err => console.error("Firebase Stock Update Error:", err));
                    }
                    return { products: newProducts };
                })
            },

            restoreStock: (items) => {
                set((state) => {
                    const updates: Record<string, any> = {};
                    const newProducts = state.products.map(p => {
                        const found = items.find(i => i.id === p.id);
                        if (found) {
                            const newStock = p.stock + found.quantity;
                            const updated = { ...p, stock: newStock, isAvailable: newStock > 0 };
                            updates[`products/${p.id}/stock`] = newStock;
                            updates[`products/${p.id}/isAvailable`] = true;
                            return updated;
                        }
                        return p;
                    });
                    if (Object.keys(updates).length > 0) {
                        firebaseUpdate(ref(rtdb), updates).catch(err => console.error("Firebase Stock Restore Error:", err));
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
            orders: [],
            offlineOrders: [], // [NEW]
            heldOrders: [],
            logs: [],
            offlineLogs: [], // [NEW]
            isStoreOpen: false,
            currentSessionId: null,
            sessions: [],

            openStore: (cashierName, startingCash) => {
                const newSession: StoreSession = {
                    id: nanoid(),
                    startTime: new Date().toISOString(),
                    cashierName,
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
                firebaseSet(sessionRef, newSession).catch(err => console.error(err));
            },

            closeStore: (actualCash, notes) => {
                const state = get();
                if (!state.isStoreOpen || !state.currentSessionId) return null;

                const sessionIndex = state.sessions.findIndex(s => s.id === state.currentSessionId);
                if (sessionIndex === -1) return null;

                const session = state.sessions[sessionIndex];

                // Calculate total sales that occurred during this session time
                // Filter out cancelled orders
                const sessionOrders = state.orders.filter(o => o.date >= session.startTime && o.status !== 'cancelled');
                const totalSales = sessionOrders.reduce((sum, order) => sum + order.total, 0);
                const totalOrders = sessionOrders.length;
                
                // Calculate expected cash: starting cash + total cash sales
                const cashSales = sessionOrders.filter(o => o.paymentMethod === 'cash').reduce((sum, order) => sum + order.total, 0);
                const expectedCash = (session.startingCash || 0) + cashSales;

                const closedSession: StoreSession = {
                    ...session,
                    endTime: new Date().toISOString(),
                    status: 'closed',
                    totalSales,
                    totalOrders,
                    actualCash,
                    expectedCash,
                    notes
                };

                const updatedSessions = [...state.sessions];
                updatedSessions[sessionIndex] = closedSession;

                set({
                    isStoreOpen: false,
                    currentSessionId: null,
                    sessions: updatedSessions
                });

                // Sync to Firebase
                const sessionRef = ref(rtdb, `sessions/${closedSession.id}`);
                firebaseUpdate(sessionRef, closedSession).catch(err => console.error(err));

                return closedSession;
            },

            addOrder: (order) => {
                set((state) => ({ 
                    orders: [...state.orders, order],
                    offlineOrders: [...state.offlineOrders, order]
                }));
                // Sync to Firebase
                // Sanitize undefined fields which Firebase Realtime Database Rejects
                const sanitizedOrder = JSON.parse(JSON.stringify(order));
                const orderRef = ref(rtdb, `orders/${order.id}`);
                firebaseSet(orderRef, sanitizedOrder)
                    .then(() => get().removeOfflineOrder(order.id))
                    .catch(err => console.error("Firebase Add Error:", err));
            },
            removeOfflineOrder: (id) => {
                set((state) => ({ offlineOrders: state.offlineOrders.filter(o => o.id !== id) }));
            },
            updateOrderStatus: (orderId, status) => {
                // Restore stock when cancelling
                if (status === 'cancelled') {
                    const state = get();
                    const order = state.orders.find(o => o.id === orderId);
                    if (order) {
                        useProductStore.getState().restoreStock(order.items);
                    }
                }
                set((state) => ({
                    orders: state.orders.map(o => o.id === orderId ? { ...o, status } : o)
                }));
                const orderRef = ref(rtdb, `orders/${orderId}`);
                firebaseUpdate(orderRef, { status }).catch(err => console.error("Firebase Update Error:", err));
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
                    .catch(err => console.error(err));
            },
            removeOfflineLog: (id) => {
                set((state) => ({ offlineLogs: state.offlineLogs.filter(l => l.id !== id) }));
            },
            getDailySales: () => {
                const orders = get().orders;
                const salesMap = new Map<string, { total: number; count: number }>();
                orders.forEach(order => {
                    const date = new Date(order.date).toLocaleDateString('id-ID');
                    const current = salesMap.get(date) || { total: 0, count: 0 };
                    salesMap.set(date, {
                        total: current.total + order.total,
                        count: current.count + 1
                    });
                });
                return Array.from(salesMap.entries())
                    .map(([date, data]) => ({ date, ...data }))
                    .slice(-7);
            },
            getProductPopularity: () => {
                const orders = get().orders;
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
            resetData: () => {
                set({ orders: [], logs: [], sessions: [], isStoreOpen: false, currentSessionId: null });
                firebaseSet(ref(rtdb, 'orders'), null).catch(err => console.error(err));
                firebaseSet(ref(rtdb, 'logs'), null).catch(err => console.error(err));
                firebaseSet(ref(rtdb, 'sessions'), null).catch(err => console.error(err));
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
                    name: 'Promo Weekend',
                    type: 'percent',
                    value: 5,
                    minSubtotal: 30000,
                    isActive: false,
                    description: 'Diskon 5% untuk pembelian min. Rp 30.000',
                },
            ],
            addPromo: (promo) => set((s) => ({ promos: [...s.promos, promo] })),
            updatePromo: (id, updated) => set((s) => ({
                promos: s.promos.map((p) => p.id === id ? { ...p, ...updated } : p),
            })),
            deletePromo: (id) => set((s) => ({ promos: s.promos.filter((p) => p.id !== id) })),
            togglePromo: (id) => set((s) => ({
                promos: s.promos.map((p) => p.id === id ? { ...p, isActive: !p.isActive } : p),
            })),
            getApplicablePromo: (subtotal) => {
                const now = new Date();
                const currentHour = now.getHours();
                const activePromos = get().promos.filter((p) => p.isActive);
                let best: { promo: Promo; discountAmount: number } | null = null;

                for (const promo of activePromos) {
                    // Check min subtotal
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
    addPoints: (phone: string, orderTotal: number) => void;
    redeemPoints: (phone: string, points: number) => boolean;
    getRedeemValue: (points: number) => number;
    getPointsForOrder: (total: number) => number;
}

export const useCustomerStore = create<CustomerState>()(
    persist(
        (set, get) => ({
            customers: [],
            findByPhone: (phone) => get().customers.find((c) => c.phone === phone.trim()),
            addCustomer: (customer) => set((s) => ({ customers: [...s.customers, customer] })),
            addPoints: (phone, orderTotal) => {
                const earnedPoints = Math.floor(orderTotal * POINTS_PER_RUPIAH);
                set((s) => ({
                    customers: s.customers.map((c) =>
                        c.phone === phone
                            ? {
                                ...c,
                                points: c.points + earnedPoints,
                                totalSpent: c.totalSpent + orderTotal,
                                lastVisit: new Date().toISOString(),
                            }
                            : c
                    ),
                }));
            },
            redeemPoints: (phone, points) => {
                const customer = get().findByPhone(phone);
                if (!customer || customer.points < points) return false;
                set((s) => ({
                    customers: s.customers.map((c) =>
                        c.phone === phone ? { ...c, points: c.points - points } : c
                    ),
                }));
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
// ══════════════════════════════════════════════════════
interface InventoryState {
    ingredients: Ingredient[];
    addIngredient: (ingredient: Ingredient) => void;
    updateIngredient: (id: string, updated: Partial<Ingredient>) => void;
    deleteIngredient: (id: string) => void;
    decrementIngredientsForOrder: (items: CartItem[], products: ExtendedProduct[]) => void;
}

export const useInventoryStore = create<InventoryState>()(
    persist(
        (set, get) => ({
            ingredients: [
                { id: 'ing-tea', name: 'Daun Teh Hitam', stock: 5000, unit: 'gram', minStockThreshold: 1000 },
                { id: 'ing-sugar', name: 'Gula Cair', stock: 10000, unit: 'ml', minStockThreshold: 2000 },
                { id: 'ing-milk', name: 'Susu Segar', stock: 5000, unit: 'ml', minStockThreshold: 1000 },
                { id: 'ing-ice', name: 'Es Batu', stock: 200, unit: 'pcs', minStockThreshold: 50 },
                { id: 'ing-cup', name: 'Cup Plastik M', stock: 500, unit: 'pcs', minStockThreshold: 100 },
            ],
            addIngredient: (ingredient) => set((s) => ({ ingredients: [...s.ingredients, ingredient] })),
            updateIngredient: (id, updated) => set((s) => ({
                ingredients: s.ingredients.map(i => i.id === id ? { ...i, ...updated } : i)
            })),
            deleteIngredient: (id) => set((s) => ({ ingredients: s.ingredients.filter(i => i.id !== id) })),
            decrementIngredientsForOrder: (items, products) => {
                set((state) => {
                    const newIngredients = [...state.ingredients];
                    
                    items.forEach(cartItem => {
                        const product = products.find(p => p.id === cartItem.id);
                        if (!product || !product.recipe) return;

                        // Base quantity multiplier based on variant size
                        let sizeMultiplier = 1;
                        if (cartItem.variants?.size === 'L') sizeMultiplier = 1.5; // Large is 50% more

                        product.recipe.forEach(recipeItem => {
                            const ingIndex = newIngredients.findIndex(i => i.id === recipeItem.ingredientId);
                            if (ingIndex !== -1) {
                                // Adjust quantity based on sugar/ice variants if applicable
                                let qtyToDeduct = recipeItem.quantity * sizeMultiplier * cartItem.quantity;
                                
                                // Example: if this ingredient is sugar and variant is 50%
                                if (newIngredients[ingIndex].id === 'ing-sugar' && cartItem.variants?.sugar) {
                                    const sugarLvl = parseInt(cartItem.variants.sugar.replace('%', ''));
                                    if (!isNaN(sugarLvl)) qtyToDeduct = qtyToDeduct * (sugarLvl / 100);
                                }
                                
                                newIngredients[ingIndex] = {
                                    ...newIngredients[ingIndex],
                                    stock: Math.max(0, newIngredients[ingIndex].stock - qtyToDeduct)
                                };
                            }
                        });
                    });
                    
                    return { ingredients: newIngredients };
                });
            }
        }),
        { name: 'teh-raja-inventory-v1', storage: createJSONStorage(() => idbStorage) }
    )
);

