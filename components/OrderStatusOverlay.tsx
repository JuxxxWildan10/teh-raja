"use client";

import { useSalesStore, useCartStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Clock, Loader, XCircle, ArrowRight, Home, Receipt } from "lucide-react"; // [NEW] Receipt icon
import { useEffect, useState } from "react";
import ReceiptModal from "./ReceiptModal"; // [NEW]

export default function OrderStatusOverlay() {
    const { activeOrderId, setActiveOrder } = useCartStore();
    const { orders } = useSalesStore();
    const [activeOrder, setActiveOrderData] = useState<any>(null);
    const [showReceipt, setShowReceipt] = useState(false); // [NEW]

    useEffect(() => {
        if (activeOrderId) {
            const found = orders.find(o => o.id === activeOrderId);
            if (found) {
                setActiveOrderData(found);
            }
        } else {
            setActiveOrderData(null);
        }
    }, [activeOrderId, orders]);

    if (!activeOrderId || !activeOrder) return null;

    const statusConfig = {
        pending: {
            title: "Pesanan Diterima",
            desc: "Mohon tunggu sebentar, pesanan Anda sedang kami siapkan.",
            icon: <Clock size={64} className="text-yellow-500 animate-pulse" />,
            color: "bg-yellow-500",
            bg: "bg-yellow-50"
        },
        processing: {
            title: "Sedang Racik",
            desc: "Barista kami sedang meracik minuman spesial untuk Anda.",
            icon: <Loader size={64} className="text-blue-500 animate-spin" />,
            color: "bg-blue-500",
            bg: "bg-blue-50"
        },
        completed: {
            title: "Terima Kasih!",
            desc: "Pesanan Anda sudah siap. Silakan ambil di kasir.",
            icon: <CheckCircle size={64} className="text-green-500" />,
            color: "bg-green-500",
            bg: "bg-green-50"
        },
        cancelled: {
            title: "Pesanan Dibatalkan",
            desc: "Maaf, pesanan Anda dibatalkan. Silakan hubungi kasir.",
            icon: <XCircle size={64} className="text-red-500" />,
            color: "bg-red-500",
            bg: "bg-red-50"
        }
    };

    const currentStatus = activeOrder.status || 'pending';
    const config = statusConfig[currentStatus as keyof typeof statusConfig];

    const handleClose = () => {
        setActiveOrder(null);
    };

    return (
        <AnimatePresence>
            {showReceipt && activeOrder && (
                <div key="receipt-modal">
                    <ReceiptModal
                        order={activeOrder}
                        onClose={() => setShowReceipt(false)}
                    />
                </div>
            )}

            <motion.div
                key="status-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-forest/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center"
            >
                <motion.div
                    initial={{ scale: 0.8, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    className={`bg-white text-forest w-full max-w-md rounded-3xl p-8 shadow-2xl relative overflow-hidden`}
                >
                    {/* Status Indicator Line */}
                    <div className={`absolute top-0 left-0 w-full h-2 ${config.color}`} />

                    <div className="absolute top-4 right-4">
                        <button
                            onClick={() => setShowReceipt(true)}
                            className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 text-gray-600 transition"
                            title="Lihat Struk"
                        >
                            <Receipt size={20} />
                        </button>
                    </div>

                    <div className="mb-8 flex justify-center">
                        <div className={`p-6 rounded-full ${config.bg} border-4 border-white shadow-inner`}>
                            {config.icon}
                        </div>
                    </div>

                    <h2 className="text-3xl font-serif font-bold mb-4">{config.title}</h2>
                    <p className="text-gray-500 mb-8 leading-relaxed">{config.desc}</p>

                    <div className="bg-gray-50 rounded-xl p-4 mb-8 text-left border border-gray-100">
                        <div className="flex justify-between text-sm text-gray-500 mb-2 border-b border-gray-200 pb-2">
                            <span>Order ID</span>
                            <span className="font-mono font-bold">#{activeOrder.id.slice(0, 6)}</span>
                        </div>
                        <div className="space-y-1">
                            {activeOrder.items.map((item: any, idx: number) => (
                                <div key={idx} className="flex justify-between text-sm font-bold">
                                    <span>{item.quantity}x {item.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {currentStatus === 'completed' || currentStatus === 'cancelled' ? (
                        <button
                            onClick={handleClose}
                            className="w-full py-4 bg-forest text-gold font-bold rounded-xl hover:bg-forest-light transition flex items-center justify-center gap-2 transform hover:scale-[1.02]"
                        >
                            <Home size={20} />
                            Kembali ke Menu
                        </button>
                    ) : (
                        <div className="flex items-center justify-center gap-2 text-xs text-gray-400 uppercase tracking-widest animate-pulse">
                            <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                            Menunggu update...
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
