import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product, products as initialProducts } from '@/data/menu';
import { rtdb } from '@/lib/firebase'; // [NEW]
import { ref, set as firebaseSet, update as firebaseUpdate } from 'firebase/database'; // [NEW]
import { nanoid } from 'nanoid';

// --- Types ---
export type Role = 'admin' | 'cashier';

export interface User {
    username: string;
    role: Role;
    name: string;
}

export type CartItem = Product & {
    quantity: number;
    note?: string;
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
    customerName?: string;
    cashierName?: string;
    status: 'pending' | 'processing' | 'completed' | 'cancelled'; // [NEW] Status tracking
}

// --- Stores ---

interface CartState {
    items: CartItem[];
    activeOrderId: string | null; // [NEW] Track active order
    addToCart: (product: ExtendedProduct) => void;
    removeFromCart: (productId: string) => void;
    updateQuantity: (productId: string, quantity: number) => void;
    clearCart: () => void;
    setActiveOrder: (id: string | null) => void; // [NEW]
    total: () => number;
}

interface ProductState {
    products: ExtendedProduct[];
    addProduct: (product: ExtendedProduct) => void;
    updateProduct: (id: string, updated: Partial<ExtendedProduct>) => void;
    deleteProduct: (id: string) => void;
    toggleAvailability: (id: string) => void;
    decrementStock: (items: CartItem[]) => void;
}

interface SalesState {
    orders: Order[];
    logs: ActivityLog[];
    addOrder: (order: Order) => void;
    updateOrderStatus: (orderId: string, status: Order['status']) => void; // [NEW]
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
            activeOrderId: null, // [NEW]
            setActiveOrder: (id) => set({ activeOrderId: id }), // [NEW]
            addToCart: (product) => {
                set((state) => {
                    if (product.stock <= 0) return state;
                    const existing = state.items.find((i) => i.id === product.id);
                    if (existing) {
                        if (existing.quantity >= product.stock) return state;
                        return {
                            items: state.items.map((i) =>
                                i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
                            ),
                        };
                    }
                    return { items: [...state.items, { ...product, quantity: 1 }] };
                });
            },
            removeFromCart: (productId) => {
                set((state) => ({ items: state.items.filter((i) => i.id !== productId) }));
            },
            updateQuantity: (productId, quantity) => {
                set((state) => ({
                    items: quantity > 0
                        ? state.items.map((i) => (i.id === productId ? { ...i, quantity } : i))
                        : state.items.filter((i) => i.id !== productId),
                }));
            },
            clearCart: () => set({ items: [] }),
            total: () => get().items.reduce((acc, item) => acc + item.price * item.quantity, 0),
        }),
        { name: 'teh-raja-cart' }
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
                    const newProducts = state.products.map(p => {
                        const found = items.find(i => i.id === p.id);
                        if (found) {
                            const newStock = Math.max(0, p.stock - found.quantity);
                            const updated = { ...p, stock: newStock, isAvailable: newStock > 0 };
                            firebaseUpdate(ref(rtdb, `products/${p.id}`), { stock: newStock, isAvailable: newStock > 0 }).catch(err => console.error(err));
                            return updated;
                        }
                        return p;
                    });
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
            logs: [],
            addOrder: (order) => {
                set((state) => ({ orders: [...state.orders, order] }));
                // [NEW] Sync to Firebase
                const orderRef = ref(rtdb, `orders/${order.id}`);
                firebaseSet(orderRef, order).catch(err => console.error("Firebase Add Error:", err));
            },
            updateOrderStatus: (orderId, status) => {
                set((state) => ({
                    orders: state.orders.map(o => o.id === orderId ? { ...o, status } : o)
                }));
                // [NEW] Sync to Firebase
                const orderRef = ref(rtdb, `orders/${orderId}`);
                firebaseUpdate(orderRef, { status }).catch(err => console.error("Firebase Update Error:", err));
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
                set({ orders: [], logs: [] });
                firebaseSet(ref(rtdb, 'orders'), null).catch(err => console.error(err));
                firebaseSet(ref(rtdb, 'logs'), null).catch(err => console.error(err));
            }
        }),
        { name: 'teh-raja-sales-v3' }
    )
);




