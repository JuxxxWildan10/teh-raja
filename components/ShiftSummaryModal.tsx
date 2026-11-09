"use client";

/**
 * ============================================================================
 * FILE: components/ShiftSummaryModal.tsx
 * ============================================================================
 * FUNGSI UTAMA:
 * Modal laporan ringkasan penutupan shift kasir (*End-of-Shift Cash Reconciliation*).
 *
 * FITUR PENTING:
 * 1. Menghitung rincian penjualan selama shift berlangsung per metode bayar (Tunai, QRIS, Transfer).
 * 2. Menampilkan rekonsiliasi uang tunai laci kasir:
 *    `Kas Diharapkan = Modal Awal Shift + Penjualan Tunai - Kas Keluar (Petty Cash)`
 * 3. Menampilkan selisih (*Variance*) antara Uang Fisik Aktual dengan Kas Diharapkan Sistem (`Klop Rp 0`, `Lebih`, atau `Kurang/Tekor`).
 * ============================================================================
 */

import { useSyncExternalStore } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, TrendingUp, Banknote, QrCode, Building2, Clock, CheckCircle2, ShoppingBag } from "lucide-react";
import { StoreSession, Order, isOrderInSession, isExpenseInSession, getEnrichedSessions, useSalesStore, useExpenseStore } from "@/lib/store";

const subscribeTime = (cb: () => void) => {
    const timer = setInterval(cb, 60000);
    return () => clearInterval(timer);
};
const getClientTime = () => Date.now();
const getServerTime = () => 0;

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
    const allSessions = useSalesStore(s => s.sessions);
    const enrichedInfo = getEnrichedSessions(allSessions).find(es => es.id === session.id);

    // Filter pesanan khusus pada sesi shift ini saja (tidak bocor antar Shift 1 & Shift 2 di hari yang sama)
    const sessionOrders = orders.filter(o => o.status !== 'cancelled' && isOrderInSession(o, session));

    const displayTotalSales = session.status === 'open'
        ? sessionOrders.reduce((s, o) => s + o.total, 0)
        : session.totalSales;
    const displayTotalOrders = session.status === 'open'
        ? sessionOrders.length
        : session.totalOrders;

    // Breakdown per payment method
    const paymentSummary = {
        cash: sessionOrders.filter(o => o.paymentMethod === 'cash' || (!o.paymentMethod && o.cashReceived)).reduce((s, o) => s + o.total, 0),
        qris: sessionOrders.filter(o => o.paymentMethod === 'qris').reduce((s, o) => s + o.total, 0),
        transfer: sessionOrders.filter(o => o.paymentMethod === 'transfer').reduce((s, o) => s + o.total, 0),
    };

    const cashCount = sessionOrders.filter(o => o.paymentMethod === 'cash' || !o.paymentMethod).length;
    const qrisCount = sessionOrders.filter(o => o.paymentMethod === 'qris').length;
    const transferCount = sessionOrders.filter(o => o.paymentMethod === 'transfer').length;
    const cancelledCount = orders.filter(o => o.status === 'cancelled' && isOrderInSession(o, session)).length;

    const avgTransaction = displayTotalOrders > 0 ? Math.round(displayTotalSales / displayTotalOrders) : 0;

    const currentTime = useSyncExternalStore(subscribeTime, getClientTime, getServerTime);
    const duration = session.endTime
        ? Math.round((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 60000)
        : Math.max(0, Math.round(((currentTime || new Date(session.startTime).getTime()) - new Date(session.startTime).getTime()) / 60000));

    const allExpenses = useExpenseStore(s => s.expenses);
    const isSessionOpen = session.status === 'open';
    const displayCashExpenses = isSessionOpen
        ? allExpenses
            .filter(e => e.paidVia === 'kas_laci' && isExpenseInSession(e, session))
            .reduce((sum, e) => sum + e.amount, 0)
        : (session.cashExpenses || 0);
    const displayExpectedCash = isSessionOpen
        ? Math.max(0, (session.startingCash || 0) + paymentSummary.cash - displayCashExpenses)
        : (session.expectedCash || 0);

    const diffCash = (session.actualCash || 0) - displayExpectedCash;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 280, damping: 25 }}
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90dvh] overflow-y-auto"
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-br from-[#0D2B20] to-[#1a4433] p-4 sm:p-6 text-white rounded-t-2xl relative">
                            <button onClick={onClose} className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 p-1.5 bg-white/10 rounded-full hover:bg-white/20 transition">
                                <X size={16} />
                            </button>
                            <div className="flex items-center gap-3 mb-4 pr-7">
                                <div className="p-2.5 bg-amber-400 rounded-xl flex-shrink-0">
                                    <TrendingUp size={20} className="text-[#0D2B20]" />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                        <h2 className="text-base sm:text-lg font-black">Ringkasan {enrichedInfo ? enrichedInfo.shiftBadge : 'Shift'}</h2>
                                        {enrichedInfo && enrichedInfo.totalShiftsOnDay > 1 && (
                                            <span className="text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded-full whitespace-nowrap">
                                                Sesi {enrichedInfo.shiftNumber} dari {enrichedInfo.totalShiftsOnDay}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-white/60 text-xs">
                                        Kasir: {session.cashierName} · {new Date(session.startTime).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                                    </p>
                                </div>
                            </div>
                            {/* Total Pendapatan */}
                            <div className="bg-white/10 rounded-xl p-3.5 sm:p-4 text-center border border-white/10">
                                <p className="text-white/60 text-xs uppercase tracking-widest mb-1">Total Pendapatan Shift</p>
                                <p className="text-2xl sm:text-3xl font-black text-amber-400">{formatRp(displayTotalSales)}</p>
                            </div>
                        </div>

                        <div className="p-4 sm:p-5 space-y-4">
                            {/* Statistik Singkat */}
                            <div className="grid grid-cols-3 gap-2 sm:gap-3">
                                <div className="bg-green-50 border border-green-100 rounded-xl p-2.5 sm:p-3 text-center">
                                    <p className="text-xl sm:text-2xl font-black text-green-700">{displayTotalOrders}</p>
                                    <p className="text-[11px] sm:text-xs text-green-600 font-medium mt-0.5">Transaksi</p>
                                </div>
                                <div className="bg-blue-50 border border-blue-100 rounded-xl p-2.5 sm:p-3 text-center flex flex-col justify-center">
                                    <p className="text-[11px] sm:text-xs font-black text-blue-700 leading-tight">{formatRp(avgTransaction)}</p>
                                    <p className="text-[11px] sm:text-xs text-blue-600 font-medium mt-0.5">Rata-rata</p>
                                </div>
                                <div className="bg-purple-50 border border-purple-100 rounded-xl p-2.5 sm:p-3 text-center">
                                    <p className="text-xl sm:text-2xl font-black text-purple-700">{duration}</p>
                                    <p className="text-[11px] sm:text-xs text-purple-600 font-medium mt-0.5">Menit</p>
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

                            {/* Pencocokan Kas (Cash Matching) */}
                            <div className="bg-amber-50 rounded-xl p-4 space-y-3 border border-amber-200">
                                <p className="text-xs font-bold text-amber-800 uppercase tracking-wider text-center">Rekap Laci Kasir (Cash)</p>
                                
                                <div className="space-y-1.5 text-sm">
                                    <div className="flex justify-between items-center text-gray-600">
                                        <span>Modal Awal</span>
                                        <span className="font-bold">{formatRp(session.startingCash || 0)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-gray-600">
                                        <span>Pemasukan Tunai</span>
                                        <span className="font-bold text-green-600">+{formatRp(paymentSummary.cash)}</span>
                                    </div>
                                    {displayCashExpenses > 0 && (
                                        <div className="flex justify-between items-center text-gray-600">
                                            <span>Kas Keluar (Petty Cash)</span>
                                            <span className="font-bold text-red-600">-{formatRp(displayCashExpenses)}</span>
                                        </div>
                                    )}
                                    <div className="border-t border-amber-200/50 my-1 pt-1 flex justify-between items-center">
                                        <span className="font-bold text-gray-800">Kas Seharusnya (Expected)</span>
                                        <span className="font-black text-gray-800">{formatRp(displayExpectedCash)}</span>
                                    </div>
                                    {!isSessionOpen && (
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold text-gray-800">Uang Fisik Aktual</span>
                                            <span className="font-black text-gray-800">{formatRp(session.actualCash || 0)}</span>
                                        </div>
                                    )}
                                </div>

                                {isSessionOpen ? (
                                    <div className="mt-2 p-2 rounded-lg text-center font-bold text-xs border bg-amber-100/80 border-amber-300 text-amber-900">
                                        ⏳ Shift Masih Berjalan — Hitung fisik aktual dilakukan saat Tutup Shift
                                    </div>
                                ) : (
                                    <div className={`mt-2 p-2 rounded-lg text-center font-bold text-sm border ${diffCash === 0 ? 'bg-green-100 border-green-200 text-green-700' : diffCash > 0 ? 'bg-blue-100 border-blue-200 text-blue-700' : 'bg-red-100 border-red-200 text-red-700'}`}>
                                        {diffCash === 0 ? '✓ Uang Kas Sesuai (Balance)' : `Selisih: ${diffCash > 0 ? '+' : ''}${formatRp(diffCash)}`}
                                    </div>
                                )}
                                {session.notes && (
                                    <p className="text-[10px] text-gray-500 italic text-center mt-1">Catatan: {session.notes}</p>
                                )}
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
