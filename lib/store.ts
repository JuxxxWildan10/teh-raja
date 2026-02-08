import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product, products as initialProducts } from '@/data/menu';

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
    stock: number; // [NEW] Real stock tracking
    minStockThreshold?: number; // [NEW] Warning level
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
    cashierName?: string; // [NEW] Track who sold it
}

// --- Stores ---

interface CartState {
    items: CartItem[];
    addToCart: (product: ExtendedProduct) => void;
    removeFromCart: (productId: string) => void;
    updateQuantity: (productId: string, quantity: number) => void;
    clearCart: () => void;
    total: () => number;
}

interface ProductState {
    products: ExtendedProduct[];
    addProduct: (product: ExtendedProduct) => void;
    updateProduct: (id: string, updated: Partial<ExtendedProduct>) => void;
    deleteProduct: (id: string) => void;
    toggleAvailability: (id: string) => void;
    decrementStock: (items: CartItem[]) => void; // [NEW]
}

interface SalesState {
    orders: Order[];
    logs: ActivityLog[]; // [NEW]
    addOrder: (order: Order) => void;
    addLog: (action: string, details: string, user: string) => void; // [NEW]
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
            addToCart: (product) => {
                set((state) => {
                    // Check stock first (Double check)
                    if (product.stock <= 0) return state;

                    const existing = state.items.find((i) => i.id === product.id);
                    if (existing) {
                        // Prevent adding more than stock
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
        {
            name: 'teh-raja-cart',
        }
    )
);

export const useProductStore = create<ProductState>()(
    persist(
        (set) => ({
            products: initialProducts.map(p => ({
                ...p,
                isAvailable: true,
                stock: 50, // Default stock for new install
                minStockThreshold: 10
            })),
            addProduct: (product) => set((state) => ({ products: [...state.products, product] })),
            updateProduct: (id, updated) => set((state) => ({
                products: state.products.map((p) => (p.id === id ? { ...p, ...updated } : p))
            })),
            deleteProduct: (id) => set((state) => ({
                products: state.products.filter((p) => p.id !== id)
            })),
            toggleAvailability: (id) => set((state) => ({
                products: state.products.map((p) => (p.id === id ? { ...p, isAvailable: !p.isAvailable } : p))
            })),
            decrementStock: (items) => set((state) => ({
                products: state.products.map(p => {
                    const found = items.find(i => i.id === p.id);
                    if (found) {
                        const newStock = Math.max(0, p.stock - found.quantity);
                        return { ...p, stock: newStock, isAvailable: newStock > 0 };
                    }
                    return p;
                })
            }))
        }),
        {
            name: 'teh-raja-products-v3', // Start fresh for "Perfect" version
        }
    )
);

export const useSalesStore = create<SalesState>()(
    persist(
        (set, get) => ({
            orders: [],
            logs: [],
            addOrder: (order) => set((state) => ({ orders: [...state.orders, order] })),
            addLog: (action, details, user) => set((state) => ({
                logs: [{
                    id: crypto.randomUUID(),
                    timestamp: new Date().toISOString(),
                    action,
                    details,
                    user
                }, ...state.logs].slice(0, 100) // Keep last 100 logs
            })),
            getDailySales: () => {
                const orders = get().orders;
                const salesMap = new Map<string, { total: number; count: number }>();

                orders.forEach(order => {
                    const date = new Date(order.date).toLocaleDateString('id-ID'); // Group by day
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
                    .slice(0, 5); // Top 5
            },
            resetData: () => set({ orders: [], logs: [] })
        }),
        {
            name: 'teh-raja-sales-v2',
        }
    )
);
