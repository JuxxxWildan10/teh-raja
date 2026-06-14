"use client";

/**
 * @file KDS (Kitchen Display System) Page
 * @description Layar khusus dapur untuk menerima pesanan secara Real-time dari kasir. Mendukung notifikasi suara (audio alert) dan perubahan status pesanan.
 */


import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, useSalesStore, formatVariantLabel } from "@/lib/store";
import { Clock, CheckCircle2, UtensilsCrossed, ShoppingBag, LayoutDashboard, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function KDSPage() {
    const router = useRouter();
    const { user } = useAuthStore();
    const { orders, updateOrderStatus } = useSalesStore();
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
        if (!user) {
            router.push('/admin');
        }
    }, [user, router]);

    // Filter orders: only processing (active) and completed (last 10 mins)
    const activeOrders = useMemo(() => {
        return orders.filter(o => o.status === 'processing').sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [orders]);

    const completedOrders = useMemo(() => {
        const tenMinsAgo = new Date(Date.now() - 10 * 60000).getTime();
        return orders.filter(o => o.status === 'completed' && new Date(o.date).getTime() > tenMinsAgo)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [orders]);

    if (!isClient || !user) return null;

    return (
        <div className="h-screen bg-gray-900 text-white flex flex-col overflow-hidden font-sans">
            {/* ── HEADER ── */}
            <header className="bg-black/50 p-4 border-b border-white/10 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-4">
                    <div className="bg-amber-500 text-black p-2 rounded-lg">
                        <UtensilsCrossed size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-wider uppercase text-amber-400">Kitchen Display</h1>
                        <p className="text-gray-400 text-sm">Teh Raja POS System</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                        <span className="text-green-400 font-bold text-sm">Live Sync Aktif</span>
                    </div>
                    <a href="/admin" className="flex items-center gap-2 text-gray-300 hover:text-white bg-white/10 hover:bg-white/20 transition px-4 py-2 rounded-xl text-sm font-bold">
                        <LayoutDashboard size={16} />
                        Dashboard
                    </a>
                </div>
            </header>

            {/* ── MAIN CONTENT ── */}
            <div className="flex-1 overflow-hidden flex p-4 gap-6">
                
                {/* AKTIF ORDERS (SEDANG DIBUAT) */}
                <div className="flex-1 flex flex-col bg-gray-800 rounded-2xl border border-gray-700 shadow-xl overflow-hidden">
                    <div className="bg-gray-800/80 p-4 border-b border-gray-700 flex justify-between items-center">
                        <h2 className="text-xl font-bold flex items-center gap-2 text-amber-400">
                            <Clock className="animate-pulse" /> Sedang Dibuat ({activeOrders.length})
                        </h2>
                    </div>
                    <div className="flex-1 overflow-x-auto p-4 flex gap-4 items-start">
                        {activeOrders.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-gray-500 h-full">
                                <CheckCircle2 size={64} className="mb-4 opacity-20" />
                                <p className="text-xl font-medium">Dapur sedang kosong</p>
                                <p className="text-sm">Menunggu pesanan masuk...</p>
                            </div>
                        ) : (
                            <AnimatePresence>
                                {activeOrders.map(order => {
                                    const waitTime = Math.floor((Date.now() - new Date(order.date).getTime()) / 60000);
                                    const isLate = waitTime >= 10;
                                    
                                    return (
                                        <motion.div 
                                            key={order.id}
                                            layout
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.8 }}
                                            className={`flex-shrink-0 w-80 bg-gray-900 border-2 rounded-2xl overflow-hidden shadow-lg flex flex-col max-h-full ${isLate ? 'border-red-500 shadow-red-900/20' : 'border-amber-500/50'}`}
                                        >
                                            {/* Order Card Header */}
                                            <div className={`p-3 border-b flex justify-between items-center ${isLate ? 'bg-red-500/20 border-red-500/30' : 'bg-gray-800 border-gray-700'}`}>
                                                <div>
                                                    <p className="text-xs text-gray-400 font-mono">#{order.id.slice(0,6).toUpperCase()}</p>
                                                    <p className="text-lg font-black truncate max-w-[150px]">{order.customerName}</p>
                                                </div>
                                                <div className="text-right">
                                                    <div className={`text-xl font-black ${isLate ? 'text-red-400 animate-pulse' : 'text-amber-400'}`}>
                                                        {waitTime}m
                                                    </div>
                                                    <div className="flex items-center gap-1 text-[10px] text-gray-400 justify-end uppercase font-bold">
                                                        {order.orderType === 'dine-in' ? <UtensilsCrossed size={10}/> : <ShoppingBag size={10}/>}
                                                        {order.orderType === 'dine-in' ? 'Dine In' : 'Take Away'}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Order Card Body */}
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
                                            </div>

                                            {/* Order Card Footer */}
                                            <div className="p-3 bg-gray-800 border-t border-gray-700 mt-auto">
                                                <button 
                                                    onClick={() => updateOrderStatus(order.id, 'completed')}
                                                    className="w-full py-4 rounded-xl font-black text-lg bg-green-500 hover:bg-green-400 text-black transition transform active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-green-500/20"
                                                >
                                                    <CheckCircle2 /> Selesai Dibuat
                                                </button>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        )}
                    </div>
                </div>

                {/* COMPLETED ORDERS (SELESAI BARU-BARU INI) */}
                <div className="w-80 flex flex-col bg-gray-800/50 rounded-2xl border border-gray-700/50 overflow-hidden">
                    <div className="p-4 border-b border-gray-700/50">
                        <h2 className="text-lg font-bold text-gray-300 flex items-center gap-2">
                            <CheckCircle2 size={20} className="text-green-500" /> Selesai (10m Terakhir)
                        </h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {completedOrders.length === 0 ? (
                            <div className="text-center text-gray-500 py-10 text-sm">
                                Belum ada order selesai
                            </div>
                        ) : (
                            <AnimatePresence>
                                {completedOrders.map(order => (
                                    <motion.div 
                                        key={order.id}
                                        layout
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="bg-gray-900 p-3 rounded-xl border border-green-500/20 border-l-4 border-l-green-500 opacity-60 hover:opacity-100 transition"
                                    >
                                        <div className="flex justify-between items-center mb-1">
                                            <p className="font-bold text-gray-200">{order.customerName}</p>
                                            <p className="text-xs text-gray-500 font-mono">#{order.id.slice(0,5).toUpperCase()}</p>
                                        </div>
                                        <p className="text-xs text-gray-400">{order.items.length} item • Selesai {new Date(order.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
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
