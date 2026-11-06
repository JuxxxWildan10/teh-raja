"use client";

/**
 * ============================================================================
 * FILE: components/FirebaseSync.tsx
 * ============================================================================
 * @file Firebase Realtime Synchronizer
 * @description Komponen tersembunyi yang bertugas di latar belakang. Bertanggung jawab memantau koneksi internet, mengunggah data kasir yang tertunda, dan mendengarkan pembaruan pesanan, stok, BOM, promo, member, dan kas secara live.
 *
 * FUNGSI UTAMA (Jantung Arsitektur Offline-First & Real-Time):
 * 1. **Auto-Flush Antrean Offline**: Saat koneksi internet kembali *online*, otomatis mengunggah `offlineOrders` dan `offlineLogs` dari IndexedDB ke Firebase RTDB.
 * 2. **Real-Time Listener (`onValue`)**: Mendengarkan perubahan node `orders`, `products`, `ingredients` (BOM), `sessions`, `expenses`, `suppliers`, `opnameLogs`, dan `users` agar layar Pelanggan, Kasir POS, dan Admin selalu sinkron (<500ms).
 * 3. **Notifikasi Audio Otomatis**: Memutar bunyi bel saat ada pesanan baru masuk di kasir atau saat pesanan pelanggan selesai diracik.
 * ============================================================================
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { rtdb } from "@/lib/firebase";
import { ref, onValue, set as firebaseSet, update as firebaseUpdate, query, limitToLast } from "firebase/database";
import {
    useSalesStore,
    useInventoryStore,
    useCartStore,
    useProductStore,
    useForecastHistoryStore,
    useExpenseStore,
    usePromoStore,
    useCustomerStore,
    useSupplierStore,
    useAuthStore,
    DEFAULT_INGREDIENTS,
    Order,
    ActivityLog,
    ExtendedProduct,
    StoreSession,
    Promo,
    Customer,
    Supplier,
    OpnameLog,
    User,
    Ingredient,
} from "@/lib/store";
import { products as initialProducts } from "@/data/menu";
import { Bell, BellOff } from "lucide-react";

const SUCCESS_SOUND = "https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3";
const ALERT_SOUND = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

type NotifPerm = 'default' | 'granted' | 'denied';

export default function FirebaseSync() {
    const { orders } = useSalesStore();
    const { activeOrderId } = useCartStore();

    const prevOrdersLength = useRef(orders.length);
    const prevStatus = useRef<string | null>(null);
    const isFirstLoad = useRef(true);

    const [isConnected, setIsConnected] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [notifPerm, setNotifPerm] = useState<NotifPerm>('default');
    const [showNotifBanner, setShowNotifBanner] = useState(false);

    // ── 1. Check notification permission ─────────────────────
    useEffect(() => {
        if (typeof window === 'undefined' || !('Notification' in window)) return;
        const perm = Notification.permission as NotifPerm;
        setNotifPerm(perm);
        if (perm === 'default') {
            setTimeout(() => setShowNotifBanner(true), 3000);
        }
    }, []);

    const requestNotifPermission = useCallback(async () => {
        if (!('Notification' in window)) return;
        const perm = await Notification.requestPermission() as NotifPerm;
        setNotifPerm(perm);
        setShowNotifBanner(false);
    }, []);

    // ── 2. Helper: show browser notification ─────────────────
    const showNotification = useCallback((title: string, body: string, tag?: string) => {
        if (typeof window === 'undefined') return;
        if (!('Notification' in window)) return;
        if (Notification.permission !== 'granted') return;
        try {
            const notif = new Notification(title, {
                body,
                icon: '/icon-192.png',
                badge: '/icon-192.png',
                tag: tag || 'teh-raja',
                requireInteraction: false,
                silent: false,
            });
            notif.onclick = () => { window.focus(); notif.close(); };
        } catch (e) {
            console.warn('[Notification] Failed:', e);
        }
    }, []);

    // ── 3. Firebase Realtime DB Sync ──────────────────────────
    useEffect(() => {
        // Paginasi: Hanya ambil 100 order terakhir
        const ordersQuery = query(ref(rtdb, 'orders'), limitToLast(100));
        const unsubscribe = onValue(ordersQuery, (snapshot) => {
            setIsConnected(true);
            setErrorMsg(null);
            const data = snapshot.val();
            if (data) {
                const loadedOrders: Order[] = (Object.values(data) as Order[]).sort(
                    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
                );
                useSalesStore.setState((state) => {
                    const offlineOnly = state.offlineOrders.filter(oo => !loadedOrders.find(lo => lo.id === oo.id));
                    const combined = [...offlineOnly, ...loadedOrders].sort(
                        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
                    );
                    return { ...state, orders: combined };
                });
            } else {
                useSalesStore.setState((state) => ({
                    ...state,
                    orders: [...state.offlineOrders].sort(
                        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
                    )
                }));
            }
        }, (error) => {
            console.warn("Firebase Sync Error:", error);
            setIsConnected(false);
            setErrorMsg(error.message);
        });

        const productsRef = ref(rtdb, 'products');
        const unsubProducts = onValue(productsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const rawProducts: ExtendedProduct[] = Object.values(data);
                // Auto-hydrate missing BOM recipes from initialProducts
                const hydratedProducts = rawProducts.map(p => {
                    if (!p.recipe || p.recipe.length === 0) {
                        const defaultProd = initialProducts.find(ip => ip.id === p.id);
                        if (defaultProd?.recipe && defaultProd.recipe.length > 0) {
                            firebaseUpdate(ref(rtdb, `products/${p.id}`), { recipe: defaultProd.recipe }).catch(() => {});
                            return { ...p, recipe: defaultProd.recipe };
                        }
                    }
                    return p;
                });
                useProductStore.setState({ products: hydratedProducts });
            } else {
                const localProducts = useProductStore.getState().products;
                if (localProducts.length > 0) {
                    localProducts.forEach(p => {
                        const defaultProd = initialProducts.find(ip => ip.id === p.id);
                        const withRecipe = (!p.recipe || p.recipe.length === 0) && defaultProd?.recipe
                            ? { ...p, recipe: defaultProd.recipe }
                            : p;
                        firebaseSet(ref(rtdb, `products/${p.id}`), JSON.parse(JSON.stringify(withRecipe))).catch(console.warn);
                    });
                }
            }
        });

        const ingredientsRef = ref(rtdb, 'ingredients');
        const unsubIngredients = onValue(ingredientsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const loadedIngredients = Object.values(data) as Ingredient[];
                // Ensure any new default BOM ingredients exist
                const existingIds = new Set(loadedIngredients.map(i => i.id));
                const missingDefaults = DEFAULT_INGREDIENTS.filter(di => !existingIds.has(di.id));
                if (missingDefaults.length > 0) {
                    missingDefaults.forEach(mi => {
                        firebaseSet(ref(rtdb, `ingredients/${mi.id}`), mi).catch(() => {});
                    });
                }
                useInventoryStore.setState({ ingredients: [...loadedIngredients, ...missingDefaults] });
            } else {
                const localIngredients = useInventoryStore.getState().ingredients;
                const existingIds = new Set(localIngredients.map(i => i.id));
                const merged = [...localIngredients, ...DEFAULT_INGREDIENTS.filter(di => !existingIds.has(di.id))];
                useInventoryStore.setState({ ingredients: merged });
                merged.forEach((i) => {
                    firebaseSet(ref(rtdb, `ingredients/${i.id}`), i).catch(console.warn);
                });
            }
        }, (err) => {
            console.debug("[FirebaseSync] ingredients sync paused:", err.message);
        });

        const opnameRef = query(ref(rtdb, 'opnameLogs'), limitToLast(50));
        const unsubOpname = onValue(opnameRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const loadedOpname = (Object.values(data) as OpnameLog[]).sort(
                    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
                );
                useInventoryStore.setState({ opnameLogs: loadedOpname });
            }
        }, (err) => {
            console.debug("[FirebaseSync] opnameLogs sync paused:", err.message);
        });

        const suppliersRef = ref(rtdb, 'suppliers');
        const unsubSuppliers = onValue(suppliersRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const loadedSuppliers = Object.values(data) as Supplier[];
                useSupplierStore.setState({ suppliers: loadedSuppliers });
            } else {
                const localSuppliers = useSupplierStore.getState().suppliers;
                localSuppliers.forEach(s => {
                    firebaseSet(ref(rtdb, `suppliers/${s.id}`), s).catch(() => {});
                });
            }
        }, (err) => {
            console.debug("[FirebaseSync] suppliers sync paused:", err.message);
        });

        const promosRef = ref(rtdb, 'promos');
        const unsubPromos = onValue(promosRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const loadedPromos = Object.values(data) as Promo[];
                usePromoStore.setState({ promos: loadedPromos });
            } else {
                const localPromos = usePromoStore.getState().promos;
                localPromos.forEach(p => {
                    firebaseSet(ref(rtdb, `promos/${p.id}`), JSON.parse(JSON.stringify(p))).catch(() => {});
                });
            }
        }, (err) => {
            console.debug("[FirebaseSync] promos sync paused:", err.message);
        });

        const customersRef = ref(rtdb, 'customers');
        const unsubCustomers = onValue(customersRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const loadedCustomers = Object.values(data) as Customer[];
                useCustomerStore.setState({ customers: loadedCustomers });
            } else {
                const localCustomers = useCustomerStore.getState().customers;
                localCustomers.forEach(c => {
                    firebaseSet(ref(rtdb, `customers/${c.id}`), JSON.parse(JSON.stringify(c))).catch(() => {});
                });
            }
        }, (err) => {
            console.debug("[FirebaseSync] customers sync paused:", err.message);
        });

        const usersRef = ref(rtdb, 'users');
        const unsubUsers = onValue(usersRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const loadedUsers = Object.values(data) as User[];
                if (loadedUsers.length > 0) {
                    useAuthStore.setState({ users: loadedUsers });
                }
            } else {
                const localUsers = useAuthStore.getState().users;
                localUsers.forEach(u => {
                    firebaseSet(ref(rtdb, `users/${u.id}`), JSON.parse(JSON.stringify(u))).catch(() => {});
                });
            }
        }, (err) => {
            console.debug("[FirebaseSync] users sync paused:", err.message);
        });

        // Paginasi: Hanya ambil 100 log terakhir
        const logsQuery = query(ref(rtdb, 'logs'), limitToLast(100));
        const unsubLogs = onValue(logsQuery, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const loadedLogs: ActivityLog[] = Object.values(data);
                loadedLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                useSalesStore.setState((state) => {
                    const offlineOnly = state.offlineLogs.filter(ol => !loadedLogs.find(ll => ll.id === ol.id));
                    const combined = [...offlineOnly, ...loadedLogs];
                    combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                    return { ...state, logs: combined };
                });
            } else {
                useSalesStore.setState((state) => ({ ...state, logs: [...state.offlineLogs] }));
            }
        }, (err) => {
            console.debug("[FirebaseSync] logs sync paused:", err.message);
        });

        const sessionsRef = ref(rtdb, 'sessions');
        const unsubSessions = onValue(sessionsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const loadedSessions: StoreSession[] = Object.values(data);
                const activeSession = loadedSessions.find(s => s.status === 'open');
                useSalesStore.setState({
                    sessions: loadedSessions,
                    isStoreOpen: !!activeSession,
                    currentSessionId: activeSession ? activeSession.id : null
                });
            }
        }, (err) => {
            console.debug("[FirebaseSync] sessions sync paused:", err.message);
        });

        const historyRef = ref(rtdb, 'salesHistory');
        const unsubHistory = onValue(historyRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const loadedHistory = Object.values(data) as any[];
                loadedHistory.sort((a, b) => a.date.localeCompare(b.date));
                useForecastHistoryStore.setState({ records: loadedHistory });
            }
        }, (err) => {
            console.debug("[FirebaseSync] salesHistory sync paused:", err.message);
        });

        const expensesRef = ref(rtdb, 'expenses');
        const unsubExpenses = onValue(expensesRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const loaded = Object.values(data) as any[];
                loaded.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                useExpenseStore.setState({ expenses: loaded });
            }
        }, (err) => {
            console.debug("[FirebaseSync] expenses sync paused:", err.message);
        });

        const connectedRef = ref(rtdb, ".info/connected");
        const unsubscribeStatus = onValue(connectedRef, (snap) => {
            const connected = snap.val() === true;
            setIsConnected(connected);
            
            if (connected) {
                const state = useSalesStore.getState();
                if (state.offlineOrders && state.offlineOrders.length > 0) {
                    state.offlineOrders.forEach(order => {
                        const sanitizedOrder = JSON.parse(JSON.stringify(order));
                        firebaseSet(ref(rtdb, `orders/${order.id}`), sanitizedOrder)
                            .then(() => useSalesStore.getState().removeOfflineOrder(order.id))
                            .catch(err => console.warn("Flush Order Error:", err));
                    });
                }
                if (state.offlineLogs && state.offlineLogs.length > 0) {
                    state.offlineLogs.forEach(log => {
                        const sanitizedLog = JSON.parse(JSON.stringify(log));
                        firebaseSet(ref(rtdb, `logs/${log.id}`), sanitizedLog)
                            .then(() => useSalesStore.getState().removeOfflineLog(log.id))
                            .catch(err => console.warn("Flush Log Error:", err));
                    });
                }
            }
        });

        return () => {
            unsubscribe();
            unsubProducts();
            unsubIngredients();
            unsubOpname();
            unsubSuppliers();
            unsubPromos();
            unsubCustomers();
            unsubUsers();
            unsubLogs();
            unsubSessions();
            unsubHistory();
            unsubExpenses();
            unsubscribeStatus();
        };
    }, []);

    // ── 4. Audio + Push Notification: New Order ───────────────
    useEffect(() => {
        if (isFirstLoad.current) {
            isFirstLoad.current = false;
            prevOrdersLength.current = orders.length;
            return;
        }

        if (orders.length > prevOrdersLength.current) {
            new Audio(ALERT_SOUND).play().catch(() => {});

            const newOrders = orders.slice().sort((a, b) =>
                new Date(b.date).getTime() - new Date(a.date).getTime()
            ).slice(0, orders.length - prevOrdersLength.current);

            newOrders.forEach(order => {
                if (order.status === 'pending' || order.status === 'awaiting_payment' || order.status === 'completed') {
                    const itemList = order.items.slice(0, 2).map(i => `${i.quantity}x ${i.name}`).join(', ');
                    const suffix = order.items.length > 2 ? ` +${order.items.length - 2} lagi` : '';
                    showNotification(
                        `🍵 Pesanan Baru — ${order.customerName || 'Guest'}`,
                        `${itemList}${suffix} · Rp ${order.total.toLocaleString('id-ID')}`,
                        order.id
                    );
                }
            });
        }
        prevOrdersLength.current = orders.length;
    }, [orders, showNotification]);

    // ── 5. Audio: Status Change (Customer View) ───────────────
    useEffect(() => {
        if (!activeOrderId) return;
        const myOrder = orders.find(o => o.id === activeOrderId);
        if (myOrder && myOrder.status !== prevStatus.current) {
            if (prevStatus.current) {
                new Audio(SUCCESS_SOUND).play().catch(() => {});
            }
            prevStatus.current = myOrder.status;
        }
    }, [orders, activeOrderId]);

    return (
        <>
            {/* Notification Permission Banner */}
            {showNotifBanner && notifPerm === 'default' && (
                <div className="fixed bottom-16 left-4 z-[9998] max-w-xs bg-[#0D2B20] text-white border border-amber-400/30 rounded-2xl shadow-2xl p-4 animate-fade-in">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-amber-400/20 rounded-xl flex-shrink-0">
                            <Bell size={18} className="text-amber-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-amber-400 mb-0.5">Aktifkan Notifikasi</p>
                            <p className="text-xs text-white/70 leading-relaxed">Dapatkan alert otomatis setiap ada pesanan baru masuk.</p>
                        </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                        <button
                            onClick={requestNotifPermission}
                            className="flex-1 py-2 bg-amber-400 text-[#0D2B20] rounded-lg text-xs font-black hover:bg-amber-300 transition"
                        >
                            Aktifkan
                        </button>
                        <button
                            onClick={() => setShowNotifBanner(false)}
                            className="px-3 py-2 bg-white/10 text-white/60 rounded-lg text-xs hover:bg-white/20 transition"
                        >
                            Nanti
                        </button>
                    </div>
                </div>
            )}

            {/* Connection Status Indicator */}
            <div className="fixed bottom-4 left-4 z-[9999] pointer-events-none flex flex-col gap-1.5">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${errorMsg
                    ? 'bg-red-900/80 text-white border-red-500'
                    : isConnected
                        ? 'bg-green-900/80 text-green-100 border-green-500'
                        : 'bg-yellow-900/80 text-yellow-100 border-yellow-500'
                    }`}>
                    <div className={`w-2 h-2 rounded-full ${errorMsg ? 'bg-red-500 animate-pulse' : isConnected ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'}`} />
                    {errorMsg ? "Sync Error" : isConnected ? "Realtime On" : "Connecting..."}

                    {/* Notification status icon */}
                    <div className="w-[1px] h-3 bg-current opacity-30 mx-0.5" />
                    {notifPerm === 'granted'
                        ? <Bell size={10} className="text-green-300" />
                        : <BellOff size={10} className="text-current opacity-50" />
                    }
                </div>
                {errorMsg && <div className="text-[10px] bg-black text-red-300 p-1 rounded max-w-[200px]">{errorMsg}</div>}
            </div>
        </>
    );
}
