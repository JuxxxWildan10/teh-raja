"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, TrendingUp, CreditCard, Banknote, QrCode, Building2, Clock, CheckCircle2, ShoppingBag } from "lucide-react";
import { StoreSession, Order } from "@/lib/store";

interface ShiftSummaryModalProps {
    isOpen: boolean;
    session: StoreSession;
    orders: Order[];
    onClose: () => void;
}

function formatRp(n: number) {
    return 'Rp ' + n.toLocaleString('id-ID');
}

export default function ShiftSummaryModal({ isOpen, session, orders, onClose }: ShiftSummaryModalProps) {
    // Filter orders during this session
    const sessionOrders = orders.filter(
        o => o.date >= session.startTime && o.status !== 'cancelled'
    );

    // Breakdown per payment method
    const paymentSummary = {
        cash: sessionOrders.filter(o => o.paymentMethod === 'cash').reduce((s, o) => s + o.total, 0),
        qris: sessionOrders.filter(o => o.paymentMethod === 'qris').reduce((s, o) => s + o.total, 0),
        transfer: sessionOrders.filter(o => o.paymentMethod === 'transfer').reduce((s, o) => s + o.total, 0),
    };

    const cashCount = sessionOrders.filter(o => o.paymentMethod === 'cash').length;
    const qrisCount = sessionOrders.filter(o => o.paymentMethod === 'qris').length;
    const transferCount = sessionOrders.filter(o => o.paymentMethod === 'transfer').length;
    const cancelledCount = orders.filter(o => o.date >= session.startTime && o.status === 'cancelled').length;

    const avgTransaction = sessionOrders.length > 0 ? session.totalSales / sessionOrders.length : 0;

    const duration = session.endTime
        ? Math.round((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 60000)
        : 0;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 280, damping: 25 }}
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-br from-[#0D2B20] to-[#1a4433] p-6 text-white rounded-t-2xl relative">
                            <button onClick={onClose} className="absolute top-4 right-4 p-1.5 bg-white/10 rounded-full hover:bg-white/20 transition">
                                <X size={16} />
                            </button>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2.5 bg-amber-400 rounded-xl">
                                    <TrendingUp size={20} className="text-[#0D2B20]" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black">Ringkasan Shift</h2>
                                    <p className="text-white/60 text-xs">Kasir: {session.cashierName}</p>
                                </div>
                            </div>
                            {/* Total Pendapatan */}
                            <div className="bg-white/10 rounded-xl p-4 text-center border border-white/10">
                                <p className="text-white/60 text-xs uppercase tracking-widest mb-1">Total Pendapatan</p>
                                <p className="text-3xl font-black text-amber-400">{formatRp(session.totalSales)}</p>
                            </div>
                        </div>

                        <div className="p-5 space-y-4">
                            {/* Statistik Singkat */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center">
                                    <p className="text-2xl font-black text-green-700">{session.totalOrders}</p>
                                    <p className="text-xs text-green-600 font-medium mt-0.5">Transaksi</p>
                                </div>
                                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
                                    <p className="text-xs font-black text-blue-700 leading-tight">{formatRp(avgTransaction)}</p>
                                    <p className="text-xs text-blue-600 font-medium mt-0.5">Rata-rata</p>
                                </div>
                                <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 text-center">
                                    <p className="text-2xl font-black text-purple-700">{duration}</p>
                                    <p className="text-xs text-purple-600 font-medium mt-0.5">Menit</p>
                                </div>
                            </div>

                            {/* Waktu Operasional */}
                            <div className="bg-gray-50 rounded-xl p-4 space-y-2 border border-gray-100">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Waktu Operasional</p>
                                <div className="flex justify-between text-sm">
                                    <div className="flex items-center gap-1.5 text-gray-600">
                                        <Clock size={14} className="text-green-500" />
                                        <span>Buka:</span>
                                        <span className="font-bold text-gray-800">
                                            {new Date(session.startTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-gray-600">
                                        <CheckCircle2 size={14} className="text-red-500" />
                                        <span>Tutup:</span>
                                        <span className="font-bold text-gray-800">
                                            {session.endTime ? new Date(session.endTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Breakdown Metode Bayar */}
                            <div className="space-y-2">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Breakdown Metode Bayar</p>
                                {[
                                    { label: 'Tunai', icon: Banknote, count: cashCount, total: paymentSummary.cash, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
                                    { label: 'QRIS', icon: QrCode, count: qrisCount, total: paymentSummary.qris, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
                                    { label: 'Transfer', icon: Building2, count: transferCount, total: paymentSummary.transfer, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
                                ].map(({ label, icon: Icon, count, total, color, bg, border }) => (
                                    <div key={label} className={`flex items-center justify-between p-3 rounded-xl border ${bg} ${border}`}>
                                        <div className="flex items-center gap-2.5">
                                            <Icon size={16} className={color} />
                                            <div>
                                                <p className="text-sm font-bold text-gray-800">{label}</p>
                                                <p className="text-xs text-gray-500">{count} transaksi</p>
                                            </div>
                                        </div>
                                        <p className={`font-black text-sm ${color}`}>{formatRp(total)}</p>
                                    </div>
                                ))}
                                {cancelledCount > 0 && (
                                    <div className="flex items-center justify-between p-3 rounded-xl border bg-red-50 border-red-100">
                                        <div className="flex items-center gap-2.5">
                                            <ShoppingBag size={16} className="text-red-500" />
                                            <div>
                                                <p className="text-sm font-bold text-gray-800">Dibatalkan</p>
                                                <p className="text-xs text-gray-500">{cancelledCount} order</p>
                                            </div>
                                        </div>
                                        <p className="font-black text-sm text-red-500">-</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-5 pb-5">
                            <button
                                onClick={onClose}
                                className="w-full py-3 bg-[#0D2B20] text-amber-400 font-black rounded-xl hover:bg-[#1a4433] transition hover:scale-[1.01] active:scale-[0.99] shadow-lg"
                            >
                                Selesai
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
