import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product, products as initialProducts } from '@/data/menu';
import { db } from './firebase';
import {
    collection,
    onSnapshot,
    doc,
    setDoc,
    addDoc,
    updateDoc,
    query,
    orderBy,
    limit,
    getDocs,
    writeBatch
} from 'firebase/firestore';

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
    setProducts: (products: ExtendedProduct[]) => void;
    addProduct: (product: ExtendedProduct) => Promise<void>;
    updateProduct: (id: string, updated: Partial<ExtendedProduct>) => Promise<void>;
    deleteProduct: (id: string) => Promise<void>;
    toggleAvailability: (id: string) => Promise<void>;
    decrementStock: (items: CartItem[]) => Promise<void>;
}

interface SalesState {
    orders: Order[];
    logs: ActivityLog[];
    setOrders: (orders: Order[]) => void;
    setLogs: (logs: ActivityLog[]) => void;
    addOrder: (order: Order) => Promise<void>;
    addLog: (action: string, details: string, user: string) => Promise<void>;
    getDailySales: () => { date: string; total: number; count: number }[];
    getProductPopularity: () => { name: string; count: number }[];
    resetData: () => Promise<void>;
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

export const useProductStore = create<ProductState>((set) => ({
    products: [],
    setProducts: (products) => set({ products }),
    addProduct: async (product) => {
        await setDoc(doc(db, "products", product.id), product);
    },
    updateProduct: async (id, updated) => {
        await updateDoc(doc(db, "products", id), updated);
    },
    deleteProduct: async (id) => {
        // We don't delete docs usually in this app flow, but if needed:
        // await deleteDoc(doc(db, "products", id));
    },
    toggleAvailability: async (id) => {
        const product = useProductStore.getState().products.find(p => p.id === id);
        if (product) {
            await updateDoc(doc(db, "products", id), { isAvailable: !product.isAvailable });
        }
    },
    decrementStock: async (items) => {
        const batch = writeBatch(db);
        items.forEach(item => {
            const product = useProductStore.getState().products.find(p => p.id === item.id);
            if (product) {
                const newStock = Math.max(0, product.stock - item.quantity);
                batch.update(doc(db, "products", item.id), {
                    stock: newStock,
                    isAvailable: newStock > 0
                });
            }
        });
        await batch.commit();
    }
}));

export const useSalesStore = create<SalesState>((set, get) => ({
    orders: [],
    logs: [],
    setOrders: (orders) => set({ orders }),
    setLogs: (logs) => set({ logs }),
    addOrder: async (order) => {
        await setDoc(doc(db, "orders", order.id), order);
    },
    addLog: async (action, details, user) => {
        const newLog = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            action,
            details,
            user
        };
        await addDoc(collection(db, "logs"), newLog);
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
    resetData: async () => {
        // Implementation for clearing Firestore data would go here
    }
}));

// --- Initialization & Real-time Listeners ---

if (typeof window !== 'undefined') {
    console.log("Initializing Firebase Listeners...");

    if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
        console.error("CRITICAL: Firebase API Key is missing! Check environment variables.");
    }

    // 1. Sync Products
    onSnapshot(collection(db, "products"), (snapshot) => {
        console.log("Products snapshot received. Empty:", snapshot.empty);
        if (snapshot.empty) {
            console.log("Seeding products...");
            // Seed if empty
            initialProducts.forEach(async (p) => {
                try {
                    await setDoc(doc(db, "products", p.id), {
                        ...p,
                        isAvailable: true,
                        stock: 50,
                        minStockThreshold: 10
                    });
                    console.log(`Seeded: ${p.name}`);
                } catch (err) {
                    console.error("Error seeding product:", err);
                }
            });
        } else {
            const products = snapshot.docs.map(doc => doc.data() as ExtendedProduct);
            console.log("Products loaded from Firestore:", products.length);
            useProductStore.getState().setProducts(products);
        }
    }, (error) => {
        console.error("Firestore Products Listener Error:", error);
    });

    // 2. Sync Orders
    const ordersQuery = query(collection(db, "orders"), orderBy("date", "desc"), limit(500));
    onSnapshot(ordersQuery, (snapshot) => {
        const orders = snapshot.docs.map(doc => doc.data() as Order);
        useSalesStore.getState().setOrders(orders);
    }, (error) => {
        console.error("Firestore Orders Listener Error:", error);
    });

    // 3. Sync Logs
    const logsQuery = query(collection(db, "logs"), orderBy("timestamp", "desc"), limit(100));
    onSnapshot(logsQuery, (snapshot) => {
        const logs = snapshot.docs.map(doc => doc.data() as ActivityLog);
        useSalesStore.getState().setLogs(logs);
    }, (error) => {
        console.error("Firestore Logs Listener Error:", error);
    });
}


