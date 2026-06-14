"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { rtdb } from "@/lib/firebase";
import { ref, onValue, set as firebaseSet, query, limitToLast } from "firebase/database";
import { useSalesStore, useCartStore, useProductStore, Order, ActivityLog, ExtendedProduct, StoreSession } from "@/lib/store";
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
        // Show banner only if permission is default (not yet asked)
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
                const loadedOrders: Order[] = Object.values(data);
                useSalesStore.setState((state) => {
                    const offlineOnly = state.offlineOrders.filter(oo => !loadedOrders.find(lo => lo.id === oo.id));
                    return { ...state, orders: [...loadedOrders, ...offlineOnly] };
                });
            } else {
                useSalesStore.setState((state) => ({ ...state, orders: [...state.offlineOrders] }));
            }
        }, (error) => {
            console.error("Firebase Sync Error:", error);
            setIsConnected(false);
            setErrorMsg(error.message);
        });

        const productsRef = ref(rtdb, 'products');
        const unsubProducts = onValue(productsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const loadedProducts: ExtendedProduct[] = Object.values(data);
                useProductStore.setState({ products: loadedProducts });
            } else {
                const localProducts = useProductStore.getState().products;
                if (localProducts.length > 0) {
                    localProducts.forEach(p => {
                        firebaseSet(ref(rtdb, `products/${p.id}`), p).catch(console.error);
                    });
                }
            }
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
        });

        const connectedRef = ref(rtdb, ".info/connected");
        const unsubscribeStatus = onValue(connectedRef, (snap) => {
            const connected = snap.val() === true;
            setIsConnected(connected);
            
            if (connected) {
                // Flush offline robust queue
                const state = useSalesStore.getState();
                if (state.offlineOrders && state.offlineOrders.length > 0) {
                    state.offlineOrders.forEach(order => {
                        const sanitizedOrder = JSON.parse(JSON.stringify(order));
                        firebaseSet(ref(rtdb, `orders/${order.id}`), sanitizedOrder)
                            .then(() => useSalesStore.getState().removeOfflineOrder(order.id))
                            .catch(err => console.error("Flush Order Error:", err));
                    });
                }
                if (state.offlineLogs && state.offlineLogs.length > 0) {
                    state.offlineLogs.forEach(log => {
                        const sanitizedLog = JSON.parse(JSON.stringify(log));
                        firebaseSet(ref(rtdb, `logs/${log.id}`), sanitizedLog)
                            .then(() => useSalesStore.getState().removeOfflineLog(log.id))
                            .catch(err => console.error("Flush Log Error:", err));
                    });
                }
            }
        });

        return () => {
            unsubscribe();
            unsubProducts();
            unsubLogs();
            unsubSessions();
            unsubscribeStatus();
        };
    }, []);

    // ── 4. Audio + Push Notification: New Order ───────────────
    useEffect(() => {
        // Skip on first load to avoid spamming
        if (isFirstLoad.current) {
            isFirstLoad.current = false;
            prevOrdersLength.current = orders.length;
            return;
        }

        if (orders.length > prevOrdersLength.current) {
            // Play alert sound
            new Audio(ALERT_SOUND).play().catch(() => {});

            // Show push notification for each new pending order
            const newOrders = orders.slice().sort((a, b) =>
                new Date(b.date).getTime() - new Date(a.date).getTime()
            ).slice(0, orders.length - prevOrdersLength.current);

            newOrders.forEach(order => {
                if (order.status === 'pending' || order.status === 'completed') {
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
