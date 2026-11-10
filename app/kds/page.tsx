"use client";

/**
 * ============================================================================
 * FILE: app/kds/page.tsx
 * ============================================================================
 * @file KDS (Kitchen Display System) Page
 * @description Layar khusus dapur untuk menerima pesanan secara Real-time dari kasir dan menu pelanggan. Mendukung notifikasi suara dan perubahan status pesanan.
 *
 * CATATAN MODE PKL VS SKRIPSI:
 * - Di Kedai Teh Raja saat ini 1 staf kasir merangkap sebagai barista, sehingga antrean racik utama sudah terintegrasi di laci `Antrean & Struk` pada halaman `/pos`.
 * - Halaman `/kds` ini disiapkan sebagai **Fitur Pengembangan Lanjutan (Skripsi)** apabila kedai menambah staf barista khusus di area dapur terpisah (muncul saat `isAdvancedUnlocked: true`).
 * ============================================================================
 */

import { useEffect, useState, useMemo, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore, useSalesStore, formatVariantLabel, countOrderCupQuantity, getKresekPackagingLabel } from "@/lib/store";
import { Clock, CheckCircle2, UtensilsCrossed, ShoppingBag, LayoutDashboard, AlertCircle, ShoppingCart, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const emptySubscribe = () => () => {};
let cachedKdsTime = typeof Date.now === 'function' ? Date.now() : 0;
const kdsTimeListeners = new Set<() => void>();
let kdsTimerInterval: ReturnType<typeof setInterval> | null = null;

const subscribeTime = (cb: () => void) => {
    kdsTimeListeners.add(cb);
    if (!kdsTimerInterval) {
        kdsTimerInterval = setInterval(() => {
            cachedKdsTime = Date.now();
            kdsTimeListeners.forEach(l => l());
        }, 10000);
    }
    return () => {
        kdsTimeListeners.delete(cb);
        if (kdsTimeListeners.size === 0 && kdsTimerInterval) {
            clearInterval(kdsTimerInterval);
            kdsTimerInterval = null;
        }
    };
};
const getClientTime = () => cachedKdsTime;
const getServerTime = () => 0;

export default function KDSPage() {
    const router = useRouter();
    const { user } = useAuthStore();
    const { orders, updateOrderStatus, addLog } = useSalesStore();
    const isClient = useSyncExternalStore(emptySubscribe, () => true, () => false);
    const currentTime = useSyncExternalStore(subscribeTime, getClientTime, getServerTime);
    const [authHydrated, setAuthHydrated] = useState(() => useAuthStore.persist.hasHydrated());
    const [kdsTab, setKdsTab] = useState<'active' | 'incoming' | 'completed'>('active');

    useEffect(() => {
        if (!authHydrated) {
            const unsub = useAuthStore.persist.onFinishHydration(() => setAuthHydrated(true));
            const fallback = setTimeout(() => setAuthHydrated(true), 600);
            return () => { unsub(); clearTimeout(fallback); };
        }
    }, [authHydrated]);

    useEffect(() => {
        if (isClient && authHydrated && !user) {
            router.replace('/menu');
        }
    }, [isClient, authHydrated, user, router]);

    // 1. Sedang Diracik (processing) - FIFO (oldest first so longest waiting gets served)
    const activeOrders = useMemo(() => {
        return orders.filter(o => o.status === 'processing').sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [orders]);

    // 2. Antrean Masuk (pending / awaiting_payment) - NEWEST ALWAYS AT THE TOP
    const pendingOrders = useMemo(() => {
        return orders
            .filter(o => !o.status || o.status === 'pending' || o.status === 'awaiting_payment')
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [orders]);

    // 3. Selesai Hari Ini
    const completedOrders = useMemo(() => {
        const todayStr = new Date().toDateString();
        return orders
            .filter(o => o.status === 'completed' && new Date(o.date).toDateString() === todayStr)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 20);
    }, [orders]);

    if (!isClient || !user) return null;

    return (
        <div className="h-[100dvh] bg-gray-900 text-white flex flex-col overflow-hidden font-sans">
            {/* ── HEADER ── */}
            <header className="bg-black/50 px-3 py-2.5 sm:p-4 border-b border-white/10 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 flex-shrink-0">
                <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
                    <div className="bg-amber-500 text-black p-1.5 sm:p-2 rounded-lg flex-shrink-0">
                        <UtensilsCrossed size={20} className="sm:w-6 sm:h-6" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-base sm:text-2xl font-black tracking-wider uppercase text-amber-400 truncate">Kitchen Display</h1>
                        <p className="hidden sm:block text-gray-400 text-xs sm:text-sm">Teh Raja Barista &amp; Dapur System</p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
                    {pendingOrders.length > 0 && (
                        <button
                            onClick={() => setKdsTab('incoming')}
                            className="flex items-center gap-1.5 bg-orange-500/20 text-orange-300 border border-orange-500/40 px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold hover:bg-orange-500/30 transition animate-pulse whitespace-nowrap"
                        >
                            <span className="w-2 h-2 rounded-full bg-orange-400 animate-ping" />
                            <span className="hidden md:inline">{pendingOrders.length} Order Masuk Menunggu</span>
                            <span className="md:hidden">{pendingOrders.length} Baru</span>
                        </button>
                    )}
                    <div className="hidden lg:flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl whitespace-nowrap">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                        <span className="text-green-400 font-bold text-sm">Live Sync Aktif</span>
                    </div>
                    <Link href="/pos" className="flex items-center gap-1.5 text-amber-300 hover:text-amber-200 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 transition px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap">
                        <ShoppingCart size={15} />
                        <span className="hidden sm:inline">Kasir </span>POS
                    </Link>
                    <Link href="/admin" className="flex items-center gap-1.5 text-gray-300 hover:text-white bg-white/10 hover:bg-white/20 transition px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap">
                        <LayoutDashboard size={15} />
                        <span className="hidden sm:inline">Admin</span>
                    </Link>
                </div>
            </header>

            {/* ── MAIN CONTENT ── */}
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col lg:flex-row p-3 sm:p-4 gap-3 sm:gap-6">

                {/* PANEL UTAMA: SEDANG DIRACIK ATAU ANTREAN MASUK */}
                <div className="flex-1 min-h-0 flex flex-col bg-gray-800 rounded-2xl border border-gray-700 shadow-xl overflow-hidden">
                    <div className="bg-gray-800/90 p-2.5 sm:p-3 border-b border-gray-700 flex flex-wrap justify-between items-center gap-2">
                        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide max-w-full">
                            <button
                                onClick={() => setKdsTab('active')}
                                className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2 transition whitespace-nowrap flex-shrink-0 ${kdsTab === 'active'
                                    ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                                    : 'bg-gray-700/60 text-gray-300 hover:bg-gray-700'
                                    }`}
                            >
                                <Clock size={15} className={kdsTab === 'active' ? "animate-pulse" : ""} />
                                Diracik ({activeOrders.length})
                            </button>
                            <button
                                onClick={() => setKdsTab('incoming')}
                                className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2 transition whitespace-nowrap flex-shrink-0 ${kdsTab === 'incoming'
                                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                                    : 'bg-gray-700/60 text-gray-300 hover:bg-gray-700'
                                    }`}
                            >
                                <span className={`w-2 h-2 rounded-full bg-orange-400 ${pendingOrders.length > 0 ? 'animate-ping' : ''}`} />
                                Masuk ({pendingOrders.length})
                            </button>
                            <button
                                onClick={() => setKdsTab('completed')}
                                className={`lg:hidden px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap flex-shrink-0 ${kdsTab === 'completed'
                                    ? 'bg-green-500 text-black shadow-lg shadow-green-500/20'
                                    : 'bg-gray-700/60 text-gray-300 hover:bg-gray-700'
                                    }`}
                            >
                                <CheckCircle2 size={15} />
                                Selesai ({completedOrders.length})
                            </button>
                        </div>
                        <div className="hidden sm:block text-xs text-gray-400 font-mono">
                            {kdsTab === 'active' ? 'Urutan: FIFO (Terlama Dahulu)' : 'Urutan: Pesanan Baru Paling Atas'}
                        </div>
                    </div>

                    <div className="flex-1 min-h-0 overflow-x-auto p-3 sm:p-4 flex gap-3 sm:gap-4 items-start">
                        {/* TAB 1: SEDANG DIRACIK */}
                        {kdsTab === 'active' && (
                            activeOrders.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-gray-500 h-full">
                                    <CheckCircle2 size={64} className="mb-4 opacity-20 text-amber-400" />
                                    <p className="text-xl font-medium text-gray-300">Dapur sedang santai</p>
                                    <p className="text-sm">Tidak ada minuman yang sedang diracik saat ini.</p>
                                    {pendingOrders.length > 0 && (
                                        <button
                                            onClick={() => setKdsTab('incoming')}
                                            className="mt-4 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl transition shadow"
                                        >
                                            Lihat {pendingOrders.length} Pesanan Masuk →
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <AnimatePresence>
                                    {activeOrders.map(order => {
                                        const now = currentTime || new Date(order.date).getTime();
                                        const waitTime = Math.floor((now - new Date(order.date).getTime()) / 60000);
                                        const isLate = waitTime >= 10;

                                        return (
                                            <motion.div
                                                key={order.id}
                                                layout
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.8 }}
                                                className={`flex-shrink-0 w-[82vw] max-w-[320px] sm:w-80 bg-gray-900 border-2 rounded-2xl overflow-hidden shadow-lg flex flex-col max-h-full ${isLate ? 'border-red-500 shadow-red-900/20' : 'border-amber-500/50'}`}
                                            >
                                                <div className={`p-3 border-b flex justify-between items-center ${isLate ? 'bg-red-500/20 border-red-500/30' : 'bg-gray-800 border-gray-700'}`}>
                                                    <div>
                                                        <p className="text-xs text-gray-400 font-mono">#{order.id.slice(0, 6).toUpperCase()}</p>
                                                        <p className="text-lg font-black truncate max-w-[150px]">{order.customerName || "Pelanggan"}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className={`text-xl font-black ${isLate ? 'text-red-400 animate-pulse' : 'text-amber-400'}`}>
                                                            {waitTime}m
                                                        </div>
                                                        <div className="flex items-center gap-1 text-[10px] text-gray-400 justify-end uppercase font-bold">
                                                            {order.orderType === 'dine-in' ? <UtensilsCrossed size={10} /> : <ShoppingBag size={10} />}
                                                            {order.orderType === 'dine-in' ? (order.tableNumber ? `Meja ${order.tableNumber}` : 'Dine In') : 'Take Away'}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                                                    {order.items.map((item, idx) => (
                                                        <div key={idx} className="bg-gray-800 rounded-xl p-3 border border-gray-700">
                                                            <div className="flex gap-3">
                                                                <div className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center font-black text-amber-400 text-lg flex-shrink-0">
                                                                    {item.quantity}x
                                                                </div>
                                                                <div>
                                                                    <p className="font-bold text-lg leading-tight">{item.name}</p>
                                                                    {item.variants && (
                                                                        <p className="text-amber-400 text-sm font-medium mt-1">
                                                                            {formatVariantLabel(item.variants)}
                                                                        </p>
                                                                    )}
                                                                    {item.note && (
                                                                        <div className="mt-2 flex items-start gap-1 text-red-400 bg-red-400/10 p-1.5 rounded-lg text-xs font-bold border border-red-400/20">
                                                                            <AlertCircle size={14} className="flex-shrink-0" />
                                                                            <p>Catatan: {item.note}</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}

                                                    {/* Petunjuk Kantong Plastik Packing untuk Barista/Staf */}
                                                    {(() => {
                                                        const cups = countOrderCupQuantity(order.items, []);
                                                        const kresek = getKresekPackagingLabel(cups);
                                                        if (!kresek) return null;
                                                        return (
                                                            <div className="p-2.5 bg-emerald-950/70 border border-emerald-500/40 rounded-xl flex items-center justify-between text-xs text-emerald-300">
                                                                <span className="font-bold flex items-center gap-1.5 min-w-0 truncate">
                                                                    <span>🛍️</span>
                                                                    <span className="truncate">Kemasan: <strong className="text-white">{kresek}</strong></span>
                                                                </span>
                                                                <span className="text-[10px] bg-emerald-900 border border-emerald-700 text-emerald-200 px-1.5 py-0.5 rounded font-black flex-shrink-0">
                                                                    {cups} Cup
                                                                </span>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>

                                                <div className="p-3 bg-gray-800 border-t border-gray-700 mt-auto">
                                                    <button
                                                        onClick={() => {
                                                            updateOrderStatus(order.id, 'completed');
                                                            addLog("KDS_COMPLETE", `Order #${order.id.slice(0, 6)} selesai diracik`, user?.name || 'Barista');
                                                        }}
                                                        className="w-full py-4 rounded-xl font-black text-lg bg-green-500 hover:bg-green-400 text-black transition transform active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-green-500/20"
                                                    >
                                                        <CheckCircle2 /> Selesai Dibuat
                                                    </button>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                            )
                        )}

                        {/* TAB 2: ANTREAN MASUK */}
                        {kdsTab === 'incoming' && (
                            pendingOrders.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-gray-500 h-full">
                                    <CheckCircle2 size={64} className="mb-4 opacity-20 text-green-400" />
                                    <p className="text-xl font-medium text-gray-300">Tidak ada orderan baru</p>
                                    <p className="text-sm">Semua pesanan masuk sudah diproses ke meja racik.</p>
                                </div>
                            ) : (
                                <AnimatePresence>
                                    {pendingOrders.map(order => {
                                        const orderTime = new Date(order.date);
                                        const now = currentTime || orderTime.getTime();
                                        const diffMins = Math.floor((now - orderTime.getTime()) / 60000);
                                        const isAwaitingPayment = order.status === 'awaiting_payment';

                                        return (
                                            <motion.div
                                                key={order.id}
                                                layout
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.8 }}
                                                className="flex-shrink-0 w-[82vw] max-w-[320px] sm:w-80 bg-gray-900 border-2 border-orange-500/60 rounded-2xl overflow-hidden shadow-lg flex flex-col max-h-full"
                                            >
                                                <div className="p-3 border-b border-gray-700 bg-gray-800 flex justify-between items-center">
                                                    <div>
                                                        <div className="flex items-center gap-1.5">
                                                            <p className="text-xs text-gray-400 font-mono">#{order.id.slice(0, 6).toUpperCase()}</p>
                                                            {diffMins < 5 && (
                                                                <span className="text-[9px] bg-red-500/30 text-red-300 font-bold px-1.5 py-0.2 rounded-full animate-pulse">BARU</span>
                                                            )}
                                                        </div>
                                                        <p className="text-lg font-black truncate max-w-[150px]">{order.customerName || "Pelanggan"}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isAwaitingPayment ? 'bg-orange-500/30 text-orange-300 border border-orange-500/50' : 'bg-amber-500/30 text-amber-300 border border-amber-500/50'}`}>
                                                            {isAwaitingPayment ? 'Menunggu Bayar' : 'Order Masuk'}
                                                        </span>
                                                        <div className="text-[10px] text-gray-400 mt-1 uppercase font-bold">
                                                            {order.tableNumber ? `Meja ${order.tableNumber}` : (order.orderType === 'take-away' ? 'Take Away' : 'Dine In')}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                                                    {order.items.map((item, idx) => (
                                                        <div key={idx} className="bg-gray-800 rounded-xl p-3 border border-gray-700">
                                                            <div className="flex gap-3">
                                                                <div className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center font-black text-orange-400 text-lg flex-shrink-0">
                                                                    {item.quantity}x
                                                                </div>
                                                                <div>
                                                                    <p className="font-bold text-lg leading-tight">{item.name}</p>
                                                                    {item.variants && (
                                                                        <p className="text-amber-400 text-sm font-medium mt-1">
                                                                            {formatVariantLabel(item.variants)}
                                                                        </p>
                                                                    )}
                                                                    {item.note && (
                                                                        <div className="mt-2 text-red-400 bg-red-400/10 p-1.5 rounded-lg text-xs font-bold border border-red-400/20">
                                                                            Catatan: {item.note}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}

                                                    {/* Petunjuk Kantong Plastik Packing untuk Barista/Staf */}
                                                    {(() => {
                                                        const cups = countOrderCupQuantity(order.items, []);
                                                        const kresek = getKresekPackagingLabel(cups);
                                                        if (!kresek) return null;
                                                        return (
                                                            <div className="p-2.5 bg-orange-950/70 border border-orange-500/40 rounded-xl flex items-center justify-between text-xs text-orange-300">
                                                                <span className="font-bold flex items-center gap-1.5 min-w-0 truncate">
                                                                    <span>🛍️</span>
                                                                    <span className="truncate">Kemasan: <strong className="text-white">{kresek}</strong></span>
                                                                </span>
                                                                <span className="text-[10px] bg-orange-900 border border-orange-700 text-orange-200 px-1.5 py-0.5 rounded font-black flex-shrink-0">
                                                                    {cups} Cup
                                                                </span>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>

                                                <div className="p-3 bg-gray-800 border-t border-gray-700 mt-auto flex gap-2">
                                                    <button
                                                        onClick={() => {
                                                            updateOrderStatus(order.id, 'processing');
                                                            addLog("KDS_START", `Barista mulai racik order #${order.id.slice(0, 6)}`, user?.name || 'Barista');
                                                            setKdsTab('active');
                                                        }}
                                                        className="flex-1 py-3 rounded-xl font-black text-sm bg-amber-500 hover:bg-amber-400 text-black transition transform active:scale-95 flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20"
                                                    >
                                                        <Clock size={16} /> Mulai Racik Sekarang
                                                    </button>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                            )
                        )}

                        {/* TAB 3 (MOBILE): SELESAI HARI INI */}
                        {kdsTab === 'completed' && (
                            completedOrders.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-gray-500 h-full text-center">
                                    <CheckCircle2 size={56} className="mb-3 opacity-20 text-green-400" />
                                    <p className="text-base font-medium text-gray-300">Belum ada order selesai hari ini</p>
                                </div>
                            ) : (
                                <div className="w-full space-y-2.5 overflow-y-auto max-h-full">
                                    {completedOrders.map(order => (
                                        <div
                                            key={order.id}
                                            className="bg-gray-900 p-3 rounded-xl border border-green-500/20 border-l-4 border-l-green-500"
                                        >
                                            <div className="flex justify-between items-center mb-1">
                                                <p className="font-bold text-gray-200 truncate">{order.customerName}</p>
                                                <p className="text-xs text-gray-500 font-mono">#{order.id.slice(0, 5).toUpperCase()}</p>
                                            </div>
                                            <div className="flex justify-between items-center mt-1">
                                                <p className="text-xs text-gray-400">{order.items.reduce((s, i) => s + i.quantity, 0)} cup • {new Date(order.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                                                <button
                                                    onClick={() => updateOrderStatus(order.id, 'processing')}
                                                    className="text-xs text-amber-400 hover:underline flex items-center gap-1"
                                                >
                                                    <RotateCcw size={12} /> Racik Ulang
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )
                        )}
                    </div>
                </div>

                {/* COMPLETED ORDERS (SELESAI HARI INI — Desktop Sidebar) */}
                <div className="hidden lg:flex w-80 flex-col bg-gray-800/50 rounded-2xl border border-gray-700/50 overflow-hidden flex-shrink-0">
                    <div className="p-4 border-b border-gray-700/50">
                        <h2 className="text-lg font-bold text-gray-300 flex items-center gap-2">
                            <CheckCircle2 size={20} className="text-green-500" /> Selesai Hari Ini ({completedOrders.length})
                        </h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {completedOrders.length === 0 ? (
                            <div className="text-center text-gray-500 py-10 text-sm">
                                Belum ada order selesai hari ini
                            </div>
                        ) : (
                            <AnimatePresence>
                                {completedOrders.map(order => (
                                    <motion.div
                                        key={order.id}
                                        layout
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="bg-gray-900 p-3 rounded-xl border border-green-500/20 border-l-4 border-l-green-500 opacity-75 hover:opacity-100 transition"
                                    >
                                        <div className="flex justify-between items-center mb-1">
                                            <p className="font-bold text-gray-200 truncate">{order.customerName}</p>
                                            <p className="text-xs text-gray-500 font-mono">#{order.id.slice(0, 5).toUpperCase()}</p>
                                        </div>
                                        <div className="flex justify-between items-center mt-1">
                                            <p className="text-xs text-gray-400">{order.items.reduce((s, i) => s + i.quantity, 0)} cup • {new Date(order.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                                            <button
                                                onClick={() => updateOrderStatus(order.id, 'processing')}
                                                className="text-[10px] text-amber-400 hover:underline flex items-center gap-1"
                                                title="Kembalikan ke sedang diracik"
                                            >
                                                <RotateCcw size={10} /> Racik Ulang
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
