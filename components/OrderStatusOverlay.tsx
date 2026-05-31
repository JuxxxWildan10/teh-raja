"use client";

import { useSalesStore, useCartStore, formatVariantLabel } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Clock, Loader, XCircle, Home, Receipt } from "lucide-react";
import { useState } from "react";
import ReceiptModal from "./ReceiptModal";

const STEPS = [
    { key: 'pending',    label: 'Diterima',  desc: 'Pesanan masuk' },
    { key: 'processing', label: 'Diracik',   desc: 'Barista meracik' },
    { key: 'completed',  label: 'Siap',      desc: 'Silakan ambil' },
];

export default function OrderStatusOverlay() {
    const { activeOrderId, setActiveOrder } = useCartStore();
    const { orders } = useSalesStore();
    const activeOrder = activeOrderId ? orders.find(o => o.id === activeOrderId) : null;
    const [showReceipt, setShowReceipt] = useState(false);

    if (!activeOrderId || !activeOrder) return null;

    const currentStatus = activeOrder.status || 'pending';
    const isCancelled = currentStatus === 'cancelled';

    const stepIndex = STEPS.findIndex(s => s.key === currentStatus);

    const statusConfig = {
        pending: {
            title: "Pesanan Diterima! 🍵",
            desc: "Mohon tunggu, pesanan Anda dalam antrean.",
            icon: <Clock size={56} className="text-yellow-500 animate-pulse" />,
            headerColor: "bg-yellow-500",
        },
        processing: {
            title: "Sedang Diracik ✨",
            desc: "Barista kami sedang menyiapkan minuman spesial Anda.",
            icon: <Loader size={56} className="text-blue-500 animate-spin" />,
            headerColor: "bg-blue-500",
        },
        completed: {
            title: "Pesanan Siap! 🎉",
            desc: "Minuman Anda sudah siap. Silakan ambil di kasir.",
            icon: <CheckCircle size={56} className="text-green-500" />,
            headerColor: "bg-green-500",
        },
        cancelled: {
            title: "Pesanan Dibatalkan",
            desc: "Maaf, pesanan dibatalkan. Silakan hubungi kasir.",
            icon: <XCircle size={56} className="text-red-500" />,
            headerColor: "bg-red-500",
        },
    };

    const config = statusConfig[currentStatus as keyof typeof statusConfig] ?? statusConfig.pending;

    return (
        <AnimatePresence>
            {showReceipt && activeOrder && (
                <div key="receipt-modal" className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <ReceiptModal order={activeOrder} onClose={() => setShowReceipt(false)} />
                </div>
            )}

            <motion.div
                key="status-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-forest/95 backdrop-blur-md flex flex-col items-center justify-center p-4"
            >
                <motion.div
                    initial={{ scale: 0.85, y: 30 }}
                    animate={{ scale: 1, y: 0 }}
                    className="bg-white text-forest w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden"
                >
                    {/* Color header bar */}
                    <div className={`h-2 w-full ${config.headerColor}`} />

                    <div className="p-6">
                        {/* Receipt button */}
                        <div className="flex justify-end mb-2">
                            <button
                                onClick={() => setShowReceipt(true)}
                                className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 text-gray-500 transition"
                                title="Lihat Struk"
                            >
                                <Receipt size={18} />
                            </button>
                        </div>

                        {/* Icon */}
                        <div className="flex justify-center mb-5">
                            {config.icon}
                        </div>

                        {/* Title */}
                        <h2 className="text-2xl font-serif font-bold text-center mb-1">{config.title}</h2>
                        <p className="text-gray-500 text-sm text-center mb-5 leading-relaxed">{config.desc}</p>

                        {/* Progress Steps (non-cancelled) */}
                        {!isCancelled && (
                            <div className="flex items-center justify-between mb-5 px-2">
                                {STEPS.map((step, i) => {
                                    const isCompleted = currentStatus === 'completed';
                                    const done = i < stepIndex || isCompleted;
                                    const active = i === stepIndex && !isCompleted;
                                    return (
                                        <div key={step.key} className="flex-1 flex flex-col items-center">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all ${
                                                done
                                                    ? 'bg-green-500 border-green-500 text-white'
                                                    : active
                                                        ? 'bg-blue-500 border-blue-500 text-white animate-pulse'
                                                        : 'bg-gray-100 border-gray-200 text-gray-400'
                                            }`}>
                                                {done ? '✓' : i + 1}
                                            </div>
                                            <p className={`text-[10px] mt-1 font-bold text-center ${
                                                active ? 'text-blue-600' : done ? 'text-green-600' : 'text-gray-400'
                                            }`}>{step.label}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Order detail */}
                        <div className="bg-gray-50 rounded-xl p-3 mb-5 border border-gray-100 text-sm">
                            <div className="flex justify-between text-gray-500 text-xs mb-2 pb-2 border-b border-gray-200">
                                <span>Order ID</span>
                                <span className="font-mono font-bold">#{activeOrder.id.slice(0, 8).toUpperCase()}</span>
                            </div>
                            <div className="space-y-1.5">
                                {activeOrder.items.map((item, idx) => {
                                    const vLabel = formatVariantLabel(item.variants);
                                    return (
                                        <div key={idx}>
                                            <div className="flex justify-between font-bold text-gray-800">
                                                <span>{item.quantity}× {item.name}</span>
                                                <span>Rp {((item.finalPrice ?? item.price) * item.quantity).toLocaleString('id-ID')}</span>
                                            </div>
                                            {vLabel && (
                                                <p className="text-[10px] text-amber-600 pl-3">{vLabel}</p>
                                            )}
                                        </div>
                                    );
                                })}
                                <div className="flex justify-between font-black text-forest border-t border-gray-200 pt-2 mt-2">
                                    <span>Total</span>
                                    <span>Rp {activeOrder.total.toLocaleString('id-ID')}</span>
                                </div>
                            </div>
                        </div>

                        {/* Action button */}
                        {currentStatus === 'completed' || currentStatus === 'cancelled' ? (
                            <button
                                onClick={() => setActiveOrder(null)}
                                className="w-full py-3.5 bg-forest text-gold font-bold rounded-xl hover:bg-forest-light transition flex items-center justify-center gap-2"
                            >
                                <Home size={18} />
                                Kembali ke Menu
                            </button>
                        ) : (
                            <div className="flex items-center justify-center gap-2 text-xs text-gray-400 uppercase tracking-widest animate-pulse py-2">
                                <span className="w-2 h-2 rounded-full bg-gray-400 inline-block"></span>
                                Menunggu update kasir...
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
