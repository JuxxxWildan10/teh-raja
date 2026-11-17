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
 * 2. **Real-Time Listener (`onValue`)**: Mendengarkan perubahan node `orders`, `products`, `ingredients` (BOM), `sessions`, `expenses`, `storeAccountMovements` (Rekening Toko), `suppliers`, `opnameLogs`, `users`, dan `storeConfig` (Lock/Unlock Buka-Tutup Kedai Online) agar layar Pelanggan, Kasir POS, dan Admin selalu sinkron (<500ms).
 * 3. **Notifikasi Audio Otomatis**: Memutar bunyi bel saat ada pesanan baru masuk di kasir atau saat pesanan pelanggan selesai diracik.
 * ============================================================================
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { rtdb } from "@/lib/firebase";
import { ref, onValue, set as firebaseSet, update as firebaseUpdate } from "firebase/database";
import {
    useSalesStore,
    useInventoryStore,
    useCartStore,
    useProductStore,
    useForecastHistoryStore,
    useExpenseStore,
    useStoreAccountStore,
    usePromoStore,
    useCustomerStore,
    useSupplierStore,
    useAuthStore,
    useStoreConfigStore,
    DEFAULT_STORE_CONFIG,
    DEFAULT_INGREDIENTS,
    DEFAULT_JASMINE_BUNDLE_PROMO,
    LEGACY_DEMO_EXPENSE_IDS,
    isOrderInSession,
    isExpenseInSession,
    Order,
    Expense,
    StoreAccountMovement,
    ActivityLog,
    ExtendedProduct,
    StoreSession,
    StoreOperationConfig,
    Promo,
    Customer,
    Supplier,
    OpnameLog,
    User,
    Ingredient,
} from "@/lib/store";
import type { DailyRecord } from "@/lib/forecast/data";
import { products as initialProducts } from "@/data/menu";
import { Bell, BellOff } from "lucide-react";

const SUCCESS_SOUND = "https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3";
const ALERT_SOUND = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

type NotifPerm = 'default' | 'granted' | 'denied';

function getSafeNotificationPermission(): NotifPerm {
    try {
        if (
            typeof window !== 'undefined' &&
            typeof window.Notification !== 'undefined' &&
            typeof window.Notification.permission === 'string'
        ) {
            return window.Notification.permission as NotifPerm;
        }
    } catch {
        // Fallback for Safari/iOS WebKit and restricted environments
    }
    return 'default';
}

export default function FirebaseSync() {
    const orders = useSalesStore(s => s.orders);
    const offlineOrdersCount = useSalesStore(s => s.offlineOrders?.length || 0);
    const offlineSessionsCount = useSalesStore(s => s.offlineSessions?.length || 0);
    const offlineExpensesCount = useExpenseStore(s => s.offlineExpenses?.length || 0);
    const offlineMovementsCount = useStoreAccountStore(s => s.offlineMovements?.length || 0);
    const pendingProductsCount = useProductStore(s => s.pendingProductIds?.length || 0);
    const pendingIngredientsCount = useInventoryStore(s => s.pendingIngredientIds?.length || 0);
    const pendingSyncCount = offlineOrdersCount + offlineSessionsCount + offlineExpensesCount + offlineMovementsCount + pendingProductsCount + pendingIngredientsCount;

    const { activeOrderId, items: cartItems } = useCartStore();

    const seenOrderIdsRef = useRef<Set<string>>(new Set());
    const hasSeededNotifIdsRef = useRef(false);
    const remoteOrdersArrivedRef = useRef(false);
    const prevStatus = useRef<string | null>(null);

    const [isConnected, setIsConnected] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [notifPerm, setNotifPerm] = useState<NotifPerm>('default');
    const [showNotifBanner, setShowNotifBanner] = useState(false);
    const [storesHydrated, setStoresHydrated] = useState(false);

    // ── 0. Wait for IndexedDB Hydration before starting RTDB Listeners ──
    // Mencegah race condition di mana IndexedDB selesai hidrasi setelah onValue Firebase
    // dan menimpa data live dengan data lokal yang lama, atau .info/connected jalan sebelum offlineOrders terhidrasi.
    useEffect(() => {
        const persistStores = [
            useSalesStore.persist,
            useProductStore.persist,
            useInventoryStore.persist,
            useExpenseStore.persist,
            useStoreAccountStore.persist,
            usePromoStore.persist,
            useCustomerStore.persist,
            useSupplierStore.persist,
            useAuthStore.persist,
            useStoreConfigStore.persist,
        ];
        const checkAllHydrated = () => persistStores.every(p => p?.hasHydrated?.() ?? true);
        if (checkAllHydrated()) {
            setStoresHydrated(true);
            return;
        }
        const unsubs = persistStores.map(p =>
            p?.onFinishHydration?.(() => {
                if (checkAllHydrated()) setStoresHydrated(true);
            })
        );
        const fallbackTimer = setTimeout(() => setStoresHydrated(true), 350);
        return () => {
            unsubs.forEach(u => u && u());
            clearTimeout(fallbackTimer);
        };
    }, []);

    // ── 1. Check notification permission safely ──────────────
    useEffect(() => {
        const safePerm = getSafeNotificationPermission();
        if (safePerm !== 'default') {
            setNotifPerm(safePerm);
        } else {
            try {
                if (typeof window !== 'undefined' && typeof window.Notification !== 'undefined') {
                    const timer = setTimeout(() => setShowNotifBanner(true), 3000);
                    return () => clearTimeout(timer);
                }
            } catch {
                // Ignore
            }
        }
    }, []);

    const requestNotifPermission = useCallback(async () => {
        try {
            if (
                typeof window !== 'undefined' &&
                typeof window.Notification !== 'undefined' &&
                typeof window.Notification.requestPermission === 'function'
            ) {
                const perm = await window.Notification.requestPermission() as NotifPerm;
                setNotifPerm(perm);
            }
        } catch (e) {
            console.warn('[Notification] requestPermission failed:', e);
        } finally {
            setShowNotifBanner(false);
        }
    }, []);

    // ── 2. Helper: show browser notification safely ──────────
    const showNotification = useCallback((title: string, body: string, tag?: string) => {
        try {
            if (typeof window === 'undefined' || typeof window.Notification === 'undefined') return;
            if (getSafeNotificationPermission() !== 'granted') return;

            // In mobile devices (Android/iOS PWA), new Notification() throws an error.
            // Prefer Service Worker showNotification if active.
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.ready.then(reg => {
                    reg.showNotification(title, {
                        body,
                        icon: '/icon-192.png',
                        badge: '/icon-192.png',
                        tag: tag || 'teh-raja',
                    });
                }).catch(() => {});
            } else {
                const notif = new window.Notification(title, {
                    body,
                    icon: '/icon-192.png',
                    badge: '/icon-192.png',
                    tag: tag || 'teh-raja',
                    requireInteraction: false,
                    silent: false,
                });
                notif.onclick = () => { window.focus(); notif.close(); };
            }
        } catch (e) {
            console.warn('[Notification] Failed:', e);
        }
    }, []);

    // ── 3. Firebase Realtime DB Sync ──────────────────────────
    useEffect(() => {
        if (!storesHydrated) return;

        let remoteOrdersLoaded = false;
        let remoteSessionsLoaded = false;
        let remoteExpensesLoaded = false;

        // Helper: Rekonsiliasi otomatis totalOrders, totalSales, dan expectedCash pada sesi shift yang sudah ditutup
        // HANYA berjalan setelah data remote orders, sessions, & expenses seluruhnya termuat dan antrean offline kosong.
        const tryReconcileClosedSessions = () => {
            if (!remoteOrdersLoaded || !remoteSessionsLoaded || !remoteExpensesLoaded) return;
            const salesState = useSalesStore.getState();
            const expState = useExpenseStore.getState();
            if (
                (salesState.offlineOrders?.length || 0) > 0 ||
                (salesState.offlineSessions?.length || 0) > 0 ||
                (expState.offlineExpenses?.length || 0) > 0
            ) {
                return;
            }
            const allOrders = salesState.orders || [];
            const allSessions = salesState.sessions || [];
            const allExpenses = expState.expenses || [];
            if (!allOrders.length || !allSessions.length) return;

            let changed = false;
            const reconciled = allSessions.map(sess => {
                if (sess.status !== 'closed') return sess;
                const sessOrders = allOrders.filter(o => o.status !== 'cancelled' && isOrderInSession(o, sess));
                if (sessOrders.length === 0) return sess;
                const calcSales = sessOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
                const calcCount = sessOrders.length;
                const cashSales = sessOrders
                    .filter(o => o.paymentMethod === 'cash' || !o.paymentMethod)
                    .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
                const cashExp = allExpenses
                    .filter(e => e.paidVia === 'kas_laci' && isExpenseInSession(e, sess))
                    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
                const calcExpectedCash = Math.max(0, (sess.startingCash || 0) + cashSales - cashExp);
                if (
                    sess.totalOrders !== calcCount ||
                    sess.totalSales !== calcSales ||
                    sess.expectedCash !== calcExpectedCash ||
                    sess.cashExpenses !== cashExp
                ) {
                    changed = true;
                    const updatedSess: StoreSession = {
                        ...sess,
                        totalOrders: calcCount,
                        totalSales: calcSales,
                        expectedCash: calcExpectedCash,
                        cashExpenses: cashExp,
                    };
                    firebaseUpdate(ref(rtdb, `sessions/${sess.id}`), JSON.parse(JSON.stringify(updatedSess))).catch(() => {});
                    return updatedSess;
                }
                return sess;
            });

            if (changed) {
                useSalesStore.setState({ sessions: reconciled });
            }
        };

        // Ambil seluruh order secara utuh (tanpa limitToLast pada random nanoid key yang menyebabkan order terpotong alfabetis!)
        const ordersRef = ref(rtdb, 'orders');
        const unsubscribe = onValue(ordersRef, (snapshot) => {
            setIsConnected(true);
            setErrorMsg(null);
            remoteOrdersLoaded = true;
            remoteOrdersArrivedRef.current = true;
            const data = snapshot.val();
            if (data) {
                const loadedOrders: Order[] = (Object.values(data) as Order[])
                    .filter(o => o && o.id && o.date)
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                useSalesStore.setState((state) => {
                    const orderMap = new Map<string, Order>();
                    loadedOrders.forEach(lo => orderMap.set(lo.id, lo));

                    // Jaga order yang baru saja dibuat di memori lokal (< 2 menit) jika belum sempat masuk snapshot RTDB
                    const nowMs = Date.now();
                    state.orders.forEach(localOrd => {
                        if (!orderMap.has(localOrd.id)) {
                            const ageMs = nowMs - new Date(localOrd.date).getTime();
                            if (ageMs >= 0 && ageMs < 120_000) {
                                orderMap.set(localOrd.id, localOrd);
                            }
                        }
                    });

                    // Timpa dengan offlineOrders yang masih pending sinkronisasi agar perubahan lokal tidak tertimpa snapshot lama
                    (state.offlineOrders || []).forEach(oo => {
                        orderMap.set(oo.id, oo);
                    });

                    // Bersihkan offlineOrders hanya jika sudah benar-benar masuk ke RTDB dengan status yang sama
                    const loadedById = new Map(loadedOrders.map(lo => [lo.id, lo]));
                    const remainingOffline = (state.offlineOrders || []).filter(oo => {
                        const remote = loadedById.get(oo.id);
                        return !remote || remote.status !== oo.status;
                    });

                    const combined = Array.from(orderMap.values()).sort(
                        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
                    );

                    return {
                        ...state,
                        orders: combined,
                        offlineOrders: remainingOffline,
                    };
                });
                tryReconcileClosedSessions();
            } else {
                useSalesStore.setState((state) => ({
                    ...state,
                    orders: [...(state.offlineOrders || [])].sort(
                        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
                    )
                }));
            }
        }, (error) => {
            console.warn("Firebase Sync Error:", error);
            setIsConnected(false);
            setErrorMsg(error.message);
        });

        // Pantau daftar ID bahan baku yang sengaja dihapus agar tidak di-seed ulang otomatis
        const deletedIngRef = ref(rtdb, 'deletedIngredients');
        let remoteDeletedIds = new Set<string>(useInventoryStore.getState().deletedIngredientIds || []);
        const unsubDeletedIng = onValue(deletedIngRef, (snapshot) => {
            const val = snapshot.val();
            const fromRemote = val && typeof val === 'object' ? Object.keys(val).filter(k => val[k]) : [];
            const localDel = useInventoryStore.getState().deletedIngredientIds || [];
            remoteDeletedIds = new Set([...fromRemote, ...localDel]);
            useInventoryStore.setState((s) => ({
                ingredients: s.ingredients.filter(i => !remoteDeletedIds.has(i.id)),
                deletedIngredientIds: Array.from(remoteDeletedIds),
            }));
        }, () => {});

        const productsRef = ref(rtdb, 'products');
        const unsubProducts = onValue(productsRef, (snapshot) => {
            const data = snapshot.val();
            const prodState = useProductStore.getState();
            const pendingSet = new Set(prodState.pendingProductIds || []);
            const localMap = new Map(prodState.products.map(p => [p.id, p]));

            if (data) {
                const rawProducts: ExtendedProduct[] = Object.values(data);
                // Auto-hydrate missing BOM recipes hanya jika produk belum pernah diedit resepnya (hasCustomRecipe !== true)
                // Sekaligus migrasi 1x harga Imperial Jasmine (M: Rp 3.500, L: Rp 5.000) bila masih data lama (Rp 3.000)
                const hydratedProducts = rawProducts.map(p => {
                    if (pendingSet.has(p.id) && localMap.has(p.id)) {
                        return localMap.get(p.id)!;
                    }
                    let nextProduct: ExtendedProduct = { ...p, recipe: p.recipe || [] };
                    const rtdbPatch: Record<string, unknown> = {};

                    if (p.id === '2' && !p.hasCustomPrice && (p.price !== 3500 || p.largePrice !== 5000)) {
                        nextProduct = {
                            ...nextProduct,
                            price: 3500,
                            largePrice: 5000,
                            hasCustomPrice: true,
                            description: p.description?.trim().startsWith('Teh melati wangi yang harum')
                                ? 'Teh melati wangi yang harum dan menenangkan. Promo Size M: beli 3 cup Rp 10.000, 6 cup Rp 20.000!'
                                : p.description,
                        };
                        rtdbPatch.price = 3500;
                        rtdbPatch.largePrice = 5000;
                        rtdbPatch.hasCustomPrice = true;
                        rtdbPatch.description = nextProduct.description;
                    }

                    if ((!p.recipe || p.recipe.length === 0) && !p.hasCustomRecipe) {
                        const defaultProd = initialProducts.find(ip => ip.id === p.id);
                        const filteredDefaultRecipe = (defaultProd?.recipe || []).filter(
                            r => !remoteDeletedIds.has(r.ingredientId)
                        );
                        if (filteredDefaultRecipe.length > 0) {
                            nextProduct = { ...nextProduct, recipe: filteredDefaultRecipe };
                            rtdbPatch.recipe = filteredDefaultRecipe;
                        }
                    }

                    if (Object.keys(rtdbPatch).length > 0) {
                        firebaseUpdate(ref(rtdb, `products/${p.id}`), rtdbPatch).catch(() => {});
                    }
                    return nextProduct;
                });

                // Pertahankan produk baru yang dibuat lokal saat offline jika belum masuk ke RTDB
                const loadedIds = new Set(hydratedProducts.map(p => p.id));
                const localPendingAdds = prodState.products.filter(lp => pendingSet.has(lp.id) && !loadedIds.has(lp.id));
                useProductStore.setState({ products: [...hydratedProducts, ...localPendingAdds] });
            } else {
                const localProducts = prodState.products;
                if (localProducts.length > 0) {
                    localProducts.forEach(p => {
                        const defaultProd = initialProducts.find(ip => ip.id === p.id);
                        const withRecipe = (!p.recipe || p.recipe.length === 0) && !p.hasCustomRecipe && defaultProd?.recipe
                            ? { ...p, recipe: defaultProd.recipe.filter(r => !remoteDeletedIds.has(r.ingredientId)) }
                            : p;
                        firebaseSet(ref(rtdb, `products/${p.id}`), JSON.parse(JSON.stringify(withRecipe))).catch(console.warn);
                    });
                }
            }
        });

        const ingredientsRef = ref(rtdb, 'ingredients');
        const unsubIngredients = onValue(ingredientsRef, (snapshot) => {
            const data = snapshot.val();
            const invState = useInventoryStore.getState();
            const pendingSet = new Set(invState.pendingIngredientIds || []);
            const localIngMap = new Map(invState.ingredients.map(i => [i.id, i]));
            const currentDeleted = new Set([
                ...remoteDeletedIds,
                ...(invState.deletedIngredientIds || []),
            ]);

            if (data) {
                // Gunakan data dari Firebase apa adanya, namun lindungi stok lokal yang belum ter-flush
                const loadedIngredients = (Object.values(data) as Ingredient[])
                    .filter(i => i && i.id && !currentDeleted.has(i.id))
                    .map(i => (pendingSet.has(i.id) && localIngMap.has(i.id) ? localIngMap.get(i.id)! : i));

                // Auto-seed bahan kemasan kresek baru jika belum ada di Firebase dan belum pernah dihapus oleh admin
                const defaultKresekIds = ['ing-kresek-1', 'ing-kresek-21', 'ing-kresek-28'];
                const loadedIds = new Set(loadedIngredients.map(i => i.id));
                const localPendingAdds = invState.ingredients.filter(
                    li => pendingSet.has(li.id) && !loadedIds.has(li.id) && !currentDeleted.has(li.id)
                );
                const missingKresek = DEFAULT_INGREDIENTS.filter(
                    di => defaultKresekIds.includes(di.id) && !loadedIds.has(di.id) && !currentDeleted.has(di.id)
                );

                if (missingKresek.length > 0) {
                    const merged = [...loadedIngredients, ...localPendingAdds, ...missingKresek];
                    useInventoryStore.setState({ ingredients: merged });
                    missingKresek.forEach((i) => {
                        firebaseSet(ref(rtdb, `ingredients/${i.id}`), i).catch(console.warn);
                    });
                } else {
                    useInventoryStore.setState({ ingredients: [...loadedIngredients, ...localPendingAdds] });
                }
            } else {
                // Jika seluruh bahan sengaja dihapus oleh admin, biarkan kosong
                if (currentDeleted.size > 0) {
                    useInventoryStore.setState({ ingredients: [] });
                    return;
                }
                // Hanya lakukan initial seed pada database baru yang benar-benar belum pernah diinisialisasi
                const localIngredients = invState.ingredients;
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

        const opnameRef = ref(rtdb, 'opnameLogs');
        const unsubOpname = onValue(opnameRef, (snapshot) => {
            const data = snapshot.val();
            const offlineLogs = useInventoryStore.getState().offlineOpnameLogs || [];
            if (data) {
                const loadedOpname = (Object.values(data) as OpnameLog[])
                    .filter(l => l && l.id && l.date);
                const loadedIds = new Set(loadedOpname.map(l => l.id));
                const remainingOffline = offlineLogs.filter(ol => !loadedIds.has(ol.id));
                const combined = [...remainingOffline, ...loadedOpname]
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                useInventoryStore.setState({ opnameLogs: combined, offlineOpnameLogs: remainingOffline });
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

        const deletedPromosRef = ref(rtdb, 'deletedPromos');
        let remoteDeletedPromoIds = new Set<string>(usePromoStore.getState().deletedPromoIds || []);
        const unsubDeletedPromos = onValue(deletedPromosRef, (snapshot) => {
            const val = snapshot.val();
            const fromRemote = val && typeof val === 'object' ? Object.keys(val).filter(k => val[k]) : [];
            const localDel = usePromoStore.getState().deletedPromoIds || [];
            remoteDeletedPromoIds = new Set([...fromRemote, ...localDel]);
            usePromoStore.setState((s) => ({
                promos: s.promos.filter(p => !remoteDeletedPromoIds.has(p.id)),
                deletedPromoIds: Array.from(remoteDeletedPromoIds),
            }));
        }, () => {});

        const promosRef = ref(rtdb, 'promos');
        const unsubPromos = onValue(promosRef, (snapshot) => {
            const data = snapshot.val();
            const currentDeletedPromos = new Set([
                ...remoteDeletedPromoIds,
                ...(usePromoStore.getState().deletedPromoIds || []),
            ]);
            if (data) {
                const loadedPromos = (Object.values(data) as Promo[]).filter(
                    p => p && p.id && !currentDeletedPromos.has(p.id)
                );
                const hasJasminePromo = loadedPromos.some(p => p.id === DEFAULT_JASMINE_BUNDLE_PROMO.id);
                if (!hasJasminePromo && !currentDeletedPromos.has(DEFAULT_JASMINE_BUNDLE_PROMO.id)) {
                    loadedPromos.unshift(DEFAULT_JASMINE_BUNDLE_PROMO);
                    firebaseSet(
                        ref(rtdb, `promos/${DEFAULT_JASMINE_BUNDLE_PROMO.id}`),
                        JSON.parse(JSON.stringify(DEFAULT_JASMINE_BUNDLE_PROMO))
                    ).catch(() => {});
                }
                usePromoStore.setState({ promos: loadedPromos });
            } else {
                const localPromos = usePromoStore.getState().promos.filter(p => !currentDeletedPromos.has(p.id));
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

        // Ambil log aktivitas dan urutkan secara kronologis (tanpa limitToLast pada random nanoid key)
        const logsRef = ref(rtdb, 'logs');
        const unsubLogs = onValue(logsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const loadedLogs: ActivityLog[] = (Object.values(data) as ActivityLog[])
                    .filter(l => l && l.id && l.timestamp);
                loadedLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                useSalesStore.setState((state) => {
                    const loadedIds = new Set(loadedLogs.map(ll => ll.id));
                    const offlineOnly = state.offlineLogs.filter(ol => !loadedIds.has(ol.id));
                    const combined = [...offlineOnly, ...loadedLogs];
                    combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                    return { ...state, logs: combined.slice(0, 200), offlineLogs: offlineOnly };
                });
            } else {
                useSalesStore.setState((state) => ({ ...state, logs: [...state.offlineLogs] }));
            }
        }, (err) => {
            console.debug("[FirebaseSync] logs sync paused:", err.message);
        });

        const sessionsRef = ref(rtdb, 'sessions');
        const unsubSessions = onValue(sessionsRef, (snapshot) => {
            remoteSessionsLoaded = true;
            const data = snapshot.val();
            const offlineSess = useSalesStore.getState().offlineSessions || [];
            if (data) {
                const sessMap = new Map<string, StoreSession>();
                (Object.values(data) as StoreSession[])
                    .filter(s => s && s.id && s.startTime)
                    .forEach(s => sessMap.set(s.id, s));

                // Pertahankan sesi lokal yang masih menunggu sync (misal baru buka/tutup shift saat offline)
                offlineSess.forEach(os => sessMap.set(os.id, os));

                const loadedIds = new Map((Object.values(data) as StoreSession[]).map(s => [s.id, s]));
                const remainingOfflineSess = offlineSess.filter(os => {
                    const rem = loadedIds.get(os.id);
                    return !rem || rem.status !== os.status || rem.endTime !== os.endTime;
                });

                const loadedSessions = Array.from(sessMap.values()).sort(
                    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
                );
                // Ambil sesi terbaru yang masih berstatus open
                const openSessions = loadedSessions.filter(s => s.status === 'open');
                const activeSession = openSessions.length > 0 ? openSessions[openSessions.length - 1] : undefined;
                useSalesStore.setState({
                    sessions: loadedSessions,
                    offlineSessions: remainingOfflineSess,
                    isStoreOpen: !!activeSession,
                    currentSessionId: activeSession ? activeSession.id : null
                });
                tryReconcileClosedSessions();
            } else if (offlineSess.length > 0) {
                const openSessions = offlineSess.filter(s => s.status === 'open');
                const activeSession = openSessions.length > 0 ? openSessions[openSessions.length - 1] : undefined;
                useSalesStore.setState({
                    sessions: [...offlineSess],
                    isStoreOpen: !!activeSession,
                    currentSessionId: activeSession ? activeSession.id : null,
                });
            }
        }, (err) => {
            console.debug("[FirebaseSync] sessions sync paused:", err.message);
        });

        const historyRef = ref(rtdb, 'salesHistory');
        const unsubHistory = onValue(historyRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const loadedHistory = Object.values(data) as DailyRecord[];
                loadedHistory.sort((a, b) => a.date.localeCompare(b.date));
                useForecastHistoryStore.setState({ records: loadedHistory });
            }
        }, (err) => {
            console.debug("[FirebaseSync] salesHistory sync paused:", err.message);
        });

        const deletedExpensesRef = ref(rtdb, 'deletedExpenses');
        let remoteDeletedExpenseIds = new Set<string>(useExpenseStore.getState().deletedExpenseIds || []);
        const unsubDeletedExpenses = onValue(deletedExpensesRef, (snapshot) => {
            const val = snapshot.val();
            const fromRemote = val && typeof val === 'object' ? Object.keys(val).filter(k => val[k]) : [];
            const localDel = useExpenseStore.getState().deletedExpenseIds || [];
            remoteDeletedExpenseIds = new Set([
                ...fromRemote,
                ...localDel,
                ...Array.from(LEGACY_DEMO_EXPENSE_IDS),
            ]);
            useExpenseStore.setState((s) => ({
                expenses: s.expenses.filter(e => !remoteDeletedExpenseIds.has(e.id)),
                deletedExpenseIds: Array.from(remoteDeletedExpenseIds),
            }));
        }, () => {});

        const expensesRef = ref(rtdb, 'expenses');
        const unsubExpenses = onValue(expensesRef, (snapshot) => {
            remoteExpensesLoaded = true;
            const data = snapshot.val();
            const expState = useExpenseStore.getState();
            const offlineExps = expState.offlineExpenses || [];
            const currentDeleted = new Set([
                ...remoteDeletedExpenseIds,
                ...(expState.deletedExpenseIds || []),
                ...Array.from(LEGACY_DEMO_EXPENSE_IDS),
            ]);
            if (data) {
                const expMap = new Map<string, Expense>();
                (Object.values(data) as Expense[])
                    .filter(e => e && e.id && !currentDeleted.has(e.id))
                    .forEach(e => expMap.set(e.id, e));

                offlineExps.forEach(oe => {
                    if (!currentDeleted.has(oe.id)) expMap.set(oe.id, oe);
                });

                const remoteIds = new Set(Object.keys(data));
                const remainingOfflineExp = offlineExps.filter(oe => !remoteIds.has(oe.id) && !currentDeleted.has(oe.id));

                const loaded = Array.from(expMap.values()).sort(
                    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
                );
                useExpenseStore.setState({ expenses: loaded, offlineExpenses: remainingOfflineExp });
            } else {
                useExpenseStore.setState((s) => ({
                    expenses: s.expenses.filter(e => !currentDeleted.has(e.id)),
                }));
            }
            tryReconcileClosedSessions();
        }, (err) => {
            console.debug("[FirebaseSync] expenses sync paused:", err.message);
        });

        // Sinkronisasi Real-Time Mutasi Manual Rekening Toko (Top-Up Modal & Tarik Dana)
        const deletedMovementsRef = ref(rtdb, 'deletedStoreAccountMovements');
        let remoteDeletedMovementIds = new Set<string>(useStoreAccountStore.getState().deletedMovementIds || []);
        const unsubDeletedMovements = onValue(deletedMovementsRef, (snapshot) => {
            const val = snapshot.val();
            const fromRemote = val && typeof val === 'object' ? Object.keys(val).filter(k => val[k]) : [];
            const localDel = useStoreAccountStore.getState().deletedMovementIds || [];
            remoteDeletedMovementIds = new Set([...fromRemote, ...localDel]);
            useStoreAccountStore.setState((s) => ({
                movements: s.movements.filter(m => !remoteDeletedMovementIds.has(m.id)),
                deletedMovementIds: Array.from(remoteDeletedMovementIds),
            }));
        }, () => {});

        const storeMovementsRef = ref(rtdb, 'storeAccountMovements');
        const unsubMovements = onValue(storeMovementsRef, (snapshot) => {
            const data = snapshot.val();
            const movState = useStoreAccountStore.getState();
            const offlineMovs = movState.offlineMovements || [];
            const currentDeleted = new Set([
                ...remoteDeletedMovementIds,
                ...(movState.deletedMovementIds || []),
            ]);
            if (data) {
                const movMap = new Map<string, StoreAccountMovement>();
                (Object.values(data) as StoreAccountMovement[])
                    .filter(m => m && m.id && !currentDeleted.has(m.id))
                    .forEach(m => movMap.set(m.id, m));

                offlineMovs.forEach(om => {
                    if (!currentDeleted.has(om.id)) movMap.set(om.id, om);
                });

                const remoteIds = new Set(Object.keys(data));
                const remainingOfflineMov = offlineMovs.filter(om => !remoteIds.has(om.id) && !currentDeleted.has(om.id));

                const loaded = Array.from(movMap.values()).sort(
                    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
                );
                useStoreAccountStore.setState({ movements: loaded, offlineMovements: remainingOfflineMov });
            } else {
                useStoreAccountStore.setState((s) => ({
                    movements: s.movements.filter(m => !currentDeleted.has(m.id)),
                }));
            }
        }, (err) => {
            console.debug("[FirebaseSync] storeAccountMovements sync paused:", err.message);
        });

        // Sinkronisasi Real-Time Status Buka / Tutup (Lock / Unlock) Kedai & Menu Online Pelanggan
        const storeConfigRef = ref(rtdb, 'storeConfig');
        const unsubStoreConfig = onValue(storeConfigRef, (snapshot) => {
            const data = snapshot.val() as StoreOperationConfig | null;
            if (data && typeof data.isOnlineOrderOpen === 'boolean') {
                useStoreConfigStore.setState({
                    isOnlineOrderOpen: data.isOnlineOrderOpen,
                    closedBadge: data.closedBadge || DEFAULT_STORE_CONFIG.closedBadge,
                    closedMessage: data.closedMessage || DEFAULT_STORE_CONFIG.closedMessage,
                    reopenInfo: data.reopenInfo || '',
                    updatedAt: data.updatedAt,
                    updatedBy: data.updatedBy,
                });
            } else {
                const localCfg = useStoreConfigStore.getState();
                const seedCfg: StoreOperationConfig = {
                    isOnlineOrderOpen: localCfg.isOnlineOrderOpen ?? true,
                    closedBadge: localCfg.closedBadge || DEFAULT_STORE_CONFIG.closedBadge,
                    closedMessage: localCfg.closedMessage || DEFAULT_STORE_CONFIG.closedMessage,
                    reopenInfo: localCfg.reopenInfo || DEFAULT_STORE_CONFIG.reopenInfo,
                    updatedAt: localCfg.updatedAt,
                    updatedBy: localCfg.updatedBy,
                };
                firebaseSet(storeConfigRef, JSON.parse(JSON.stringify(seedCfg))).catch(() => {});
            }
        }, (err) => {
            console.debug("[FirebaseSync] storeConfig sync paused:", err.message);
        });

        const hasAnyOfflinePending = () => {
            const s = useSalesStore.getState();
            const p = useProductStore.getState();
            const inv = useInventoryStore.getState();
            const exp = useExpenseStore.getState();
            const mov = useStoreAccountStore.getState();
            return (
                (s.offlineOrders?.length || 0) > 0 ||
                (s.offlineLogs?.length || 0) > 0 ||
                (s.offlineSessions?.length || 0) > 0 ||
                (exp.offlineExpenses?.length || 0) > 0 ||
                (mov.offlineMovements?.length || 0) > 0 ||
                (inv.offlineOpnameLogs?.length || 0) > 0 ||
                (p.pendingProductIds?.length || 0) > 0 ||
                (inv.pendingIngredientIds?.length || 0) > 0
            );
        };

        const flushOfflineQueue = () => {
            const state = useSalesStore.getState();
            if (state.offlineOrders && state.offlineOrders.length > 0) {
                state.offlineOrders.forEach(order => {
                    try {
                        const sanitizedOrder = JSON.parse(JSON.stringify(order));
                        firebaseSet(ref(rtdb, `orders/${order.id}`), sanitizedOrder)
                            .then(() => useSalesStore.getState().removeOfflineOrder(order.id))
                            .catch(err => console.warn("Flush Order Error:", err));
                    } catch (err) {
                        console.warn("Flush Order Sync Error:", err);
                    }
                });
            }
            if (state.offlineLogs && state.offlineLogs.length > 0) {
                state.offlineLogs.forEach(log => {
                    try {
                        const sanitizedLog = JSON.parse(JSON.stringify(log));
                        firebaseSet(ref(rtdb, `logs/${log.id}`), sanitizedLog)
                            .then(() => useSalesStore.getState().removeOfflineLog(log.id))
                            .catch(err => console.warn("Flush Log Error:", err));
                    } catch (err) {
                        console.warn("Flush Log Sync Error:", err);
                    }
                });
            }
            if (state.offlineSessions && state.offlineSessions.length > 0) {
                state.offlineSessions.forEach(sess => {
                    try {
                        const sanitizedSess = JSON.parse(JSON.stringify(sess));
                        firebaseSet(ref(rtdb, `sessions/${sess.id}`), sanitizedSess)
                            .then(() => useSalesStore.getState().removeOfflineSession(sess.id))
                            .catch(err => console.warn("Flush Session Error:", err));
                    } catch (err) {
                        console.warn("Flush Session Sync Error:", err);
                    }
                });
            }

            const expState = useExpenseStore.getState();
            if (expState.offlineExpenses && expState.offlineExpenses.length > 0) {
                expState.offlineExpenses.forEach(exp => {
                    try {
                        firebaseSet(ref(rtdb, `expenses/${exp.id}`), JSON.parse(JSON.stringify(exp)))
                            .then(() => useExpenseStore.getState().removeOfflineExpense(exp.id))
                            .catch(err => console.warn("Flush Expense Error:", err));
                    } catch (err) {
                        console.warn("Flush Expense Sync Error:", err);
                    }
                });
            }

            const movState = useStoreAccountStore.getState();
            if (movState.offlineMovements && movState.offlineMovements.length > 0) {
                movState.offlineMovements.forEach(mov => {
                    try {
                        firebaseSet(ref(rtdb, `storeAccountMovements/${mov.id}`), JSON.parse(JSON.stringify(mov)))
                            .then(() => useStoreAccountStore.getState().removeOfflineMovement(mov.id))
                            .catch(err => console.warn("Flush Movement Error:", err));
                    } catch (err) {
                        console.warn("Flush Movement Sync Error:", err);
                    }
                });
            }

            const invState = useInventoryStore.getState();
            if (invState.offlineOpnameLogs && invState.offlineOpnameLogs.length > 0) {
                invState.offlineOpnameLogs.forEach(ol => {
                    try {
                        firebaseSet(ref(rtdb, `opnameLogs/${ol.id}`), JSON.parse(JSON.stringify(ol)))
                            .then(() => useInventoryStore.getState().removeOfflineOpnameLog(ol.id))
                            .catch(err => console.warn("Flush Opname Error:", err));
                    } catch (err) {
                        console.warn("Flush Opname Sync Error:", err);
                    }
                });
            }
            if (invState.pendingIngredientIds && invState.pendingIngredientIds.length > 0) {
                const ingUpdates: Record<string, unknown> = {};
                const syncedIds: string[] = [];
                invState.pendingIngredientIds.forEach(ingId => {
                    const ingObj = invState.ingredients.find(i => i.id === ingId);
                    if (ingObj) {
                        ingUpdates[`ingredients/${ingId}`] = ingObj;
                        syncedIds.push(ingId);
                    }
                });
                if (Object.keys(ingUpdates).length > 0) {
                    try {
                        firebaseUpdate(ref(rtdb), JSON.parse(JSON.stringify(ingUpdates)))
                            .then(() => useInventoryStore.getState().clearPendingIngredientIds(syncedIds))
                            .catch(err => console.warn("Flush Ingredient Error:", err));
                    } catch (err) {
                        console.warn("Flush Ingredient Sync Error:", err);
                    }
                }
            }

            const prodState = useProductStore.getState();
            if (prodState.pendingProductIds && prodState.pendingProductIds.length > 0) {
                const prodUpdates: Record<string, unknown> = {};
                const syncedProdIds: string[] = [];
                prodState.pendingProductIds.forEach(prodId => {
                    const prodObj = prodState.products.find(p => p.id === prodId);
                    if (prodObj) {
                        prodUpdates[`products/${prodId}`] = prodObj;
                        syncedProdIds.push(prodId);
                    }
                });
                if (Object.keys(prodUpdates).length > 0) {
                    try {
                        firebaseUpdate(ref(rtdb), JSON.parse(JSON.stringify(prodUpdates)))
                            .then(() => useProductStore.getState().clearPendingProductIds(syncedProdIds))
                            .catch(err => console.warn("Flush Product Error:", err));
                    } catch (err) {
                        console.warn("Flush Product Sync Error:", err);
                    }
                }
            }
        };

        const connectedRef = ref(rtdb, ".info/connected");
        const unsubscribeStatus = onValue(connectedRef, (snap) => {
            const connected = snap.val() === true;
            setIsConnected(connected);
            if (connected) {
                flushOfflineQueue();
            }
        });

        const handleBrowserOnline = () => {
            flushOfflineQueue();
        };
        if (typeof window !== 'undefined') {
            window.addEventListener('online', handleBrowserOnline);
        }

        // Heartbeat retry setiap 15 detik apabila masih ada antrean offline yang belum terkirim
        const retryInterval = setInterval(() => {
            if (hasAnyOfflinePending()) {
                flushOfflineQueue();
            }
        }, 15_000);

        return () => {
            unsubscribe();
            unsubDeletedIng();
            unsubProducts();
            unsubIngredients();
            unsubOpname();
            unsubSuppliers();
            unsubDeletedPromos();
            unsubPromos();
            unsubCustomers();
            unsubUsers();
            unsubLogs();
            unsubSessions();
            unsubHistory();
            unsubDeletedExpenses();
            unsubExpenses();
            unsubDeletedMovements();
            unsubMovements();
            unsubStoreConfig();
            unsubscribeStatus();
            clearInterval(retryInterval);
            if (typeof window !== 'undefined') {
                window.removeEventListener('online', handleBrowserOnline);
            }
        };
    }, [storesHydrated]);

    // ── 4. Audio + Push Notification: New Order ───────────────
    useEffect(() => {
        if (!storesHydrated) return;

        // Tunggu snapshot awal dari Firebase (atau jadikan snapshot pertama yang non-kosong sebagai baseline)
        // agar saat refresh / memuat ulang 148+ order historis tidak memicu spam notifikasi & bel lama.
        if (!hasSeededNotifIdsRef.current) {
            if (!remoteOrdersArrivedRef.current && orders.length === 0) return;
            if (!remoteOrdersArrivedRef.current) {
                // Seed ID lokal sementara, tunggu remote selesai sebelum mulai alert
                orders.forEach(o => seenOrderIdsRef.current.add(o.id));
                return;
            }
            orders.forEach(o => seenOrderIdsRef.current.add(o.id));
            hasSeededNotifIdsRef.current = true;
            return;
        }

        const nowMs = Date.now();
        const unseenRecentOrders = orders.filter(order => {
            if (seenOrderIdsRef.current.has(order.id)) return false;
            seenOrderIdsRef.current.add(order.id);
            const ageMs = nowMs - new Date(order.date).getTime();
            return ageMs >= -30_000 && ageMs < 120_000;
        });

        if (unseenRecentOrders.length > 0) {
            new Audio(ALERT_SOUND).play().catch(() => {});

            unseenRecentOrders.forEach(order => {
                if (order.status === 'pending' || order.status === 'awaiting_payment' || order.status === 'processing' || order.status === 'completed') {
                    const itemList = order.items.slice(0, 2).map(i => `${i.quantity}x ${i.name}`).join(', ');
                    const suffix = order.items.length > 2 ? ` +${order.items.length - 2} lagi` : '';
                    showNotification(
                        `🍵 Pesanan Baru — ${order.customerName || 'Pelanggan'}`,
                        `${itemList}${suffix} · Rp ${order.total.toLocaleString('id-ID')}`,
                        order.id
                    );
                }
            });
        }
    }, [orders, storesHydrated, showNotification]);

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
                <div className={`fixed left-3 right-3 sm:left-4 sm:right-auto sm:max-w-xs z-40 bg-[#0D2B20] text-white border border-amber-400/30 rounded-2xl shadow-2xl p-4 animate-fade-in ${cartItems.length > 0 ? 'bottom-28 sm:bottom-16' : 'bottom-16'}`}>
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

            {/* Connection Status Indicator — otomatis naik di mobile saat tombol Tray muncul agar tidak menutupi tombol */}
            <div className={`fixed left-3 sm:left-4 z-10 pointer-events-none flex flex-col gap-1.5 transition-all duration-200 ${cartItems.length > 0 ? 'bottom-24 lg:bottom-4' : 'bottom-9 lg:bottom-4'}`}>
                <div className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-bold border shadow-md ${errorMsg
                    ? 'bg-red-900/85 text-white border-red-500'
                    : pendingSyncCount > 0
                        ? 'bg-amber-900/90 text-amber-100 border-amber-400/80'
                        : isConnected
                            ? 'bg-green-900/80 text-green-100 border-green-500/70'
                            : 'bg-yellow-900/85 text-yellow-100 border-yellow-500'
                    }`}>
                    <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${errorMsg ? 'bg-red-500 animate-pulse' : pendingSyncCount > 0 ? 'bg-amber-400 animate-pulse' : isConnected ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'}`} />
                    {errorMsg
                        ? "Sync Error"
                        : pendingSyncCount > 0
                            ? (isConnected ? `Syncing (${pendingSyncCount})` : `Offline (${pendingSyncCount} antre)`)
                            : isConnected
                                ? "Realtime On"
                                : "Connecting..."}

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
