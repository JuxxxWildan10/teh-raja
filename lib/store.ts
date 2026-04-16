import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product, products as initialProducts } from '@/data/menu';
import { rtdb } from '@/lib/firebase'; // [NEW]
import { ref, set as firebaseSet, update as firebaseUpdate } from 'firebase/database'; // [NEW]
import { nanoid } from 'nanoid';

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
    username: string;
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

export interface ExtendedProduct extends Product {
    isAvailable: boolean;
    stock: number;
    minStockThreshold?: number;
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
    status: 'open' | 'closed';
}

// --- Stores ---

interface CartState {
    items: CartItem[];
    activeOrderId: string | null;
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
    heldOrders: Order[]; // Hold order feature
    logs: ActivityLog[];
    isStoreOpen: boolean;
    currentSessionId: string | null;
    sessions: StoreSession[];
    openStore: (cashierName: string) => void;
    closeStore: () => StoreSession | null;

    addOrder: (order: Order) => void;
    updateOrderStatus: (orderId: string, status: Order['status']) => void;
    holdOrder: (order: Order) => void; // Save current order to hold
    resumeOrder: (heldOrderId: string) => Order | null; // Get held order back
    deleteHeldOrder: (heldOrderId: string) => void;
    addLog: (action: string, details: string, user: string) => void;
    getDailySales: () => { date: string; total: number; count: number }[];
    getProductPopularity: () => { name: string; count: number }[];
    resetData: () => void;
}

interface AuthState {
    user: User | null;
    login: (username: string, role: Role) => void;
    logout: () => void;
}

// --- Implementations ---

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            login: (username, role) => set({ user: { username, role, name: username === 'admin' ? 'Administrator' : 'Staff Kasir' } }),
            logout: () => set({ user: null }),
        }),
        { name: 'teh-raja-auth' }
    )
);

export const useCartStore = create<CartState>()(
    persist(
        (set, get) => ({
            items: [],
            activeOrderId: null,
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
        { name: 'teh-raja-cart-v2' }  // Bumped version to clear old incompatible cache
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
        { name: 'teh-raja-products-v4' }
    )
);

export const useSalesStore = create<SalesState>()(
    persist(
        (set, get) => ({
            orders: [],
            heldOrders: [],
            logs: [],
            isStoreOpen: false,
            currentSessionId: null,
            sessions: [],

            openStore: (cashierName) => {
                const newSession: StoreSession = {
                    id: nanoid(),
                    startTime: new Date().toISOString(),
                    cashierName,
                    totalSales: 0,
                    totalOrders: 0,
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

            closeStore: () => {
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

                const closedSession: StoreSession = {
                    ...session,
                    endTime: new Date().toISOString(),
                    status: 'closed',
                    totalSales,
                    totalOrders
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
                set((state) => ({ orders: [...state.orders, order] }));
                // Sync to Firebase
                // Sanitize undefined fields which Firebase Realtime Database Rejects
                const sanitizedOrder = JSON.parse(JSON.stringify(order));
                const orderRef = ref(rtdb, `orders/${order.id}`);
                firebaseSet(orderRef, sanitizedOrder).catch(err => console.error("Firebase Add Error:", err));
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
                    logs: [newLog, ...state.logs].slice(0, 100)
                }));
                firebaseSet(ref(rtdb, `logs/${newLog.id}`), newLog).catch(err => console.error(err));
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
        { name: 'teh-raja-sales-v3' }
    )
);




