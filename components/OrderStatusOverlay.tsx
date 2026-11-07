"use client";

/**
 * ============================================================================
 * FILE: components/OrderStatusOverlay.tsx
 * ============================================================================
 * @file Order Status Overlay (Customer-Facing)
 * @description Overlay tampilan status pesanan untuk pelanggan.
 * Flow: Pesanan Diterima → Pilih Metode Bayar → Menunggu Konfirmasi Kasir → Sedang Diracik → Siap
 *
 * FUNGSI UTAMA:
 * 1. Menampilkan pilihan pembayaran mandiri pelanggan setelah checkout: **Scan QRIS Dinamis** atau **Bayar Tunai di Kasir**.
 * 2. Menampilkan *stepper* progres pesanan 4 tahap secara *real-time* yang tersinkronisasi dengan tombol kasir di `/pos`.
 * 3. Menyediakan tombol **Lihat / Cetak Struk (`ReceiptModal`)** untuk bukti pembayaran pelanggan.
 * ============================================================================
 */

import { useSalesStore, useCartStore, formatVariantLabel } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import {
    CheckCircle, Clock, Loader, XCircle, Home, Receipt,
    QrCode, UserCheck, ChevronRight, Minimize2
} from "lucide-react";
import { useState, useEffect } from "react";
import ReceiptModal from "./ReceiptModal";
import Image from "next/image";

const STEPS = [
    { key: 'pending',          label: 'Diterima',   icon: '🍵' },
    { key: 'awaiting_payment', label: 'Pembayaran', icon: '💳' },
    { key: 'processing',       label: 'Diracik',    icon: '✨' },
    { key: 'completed',        label: 'Siap',       icon: '🎉' },
];

type PaymentLocalStep = 'choose' | 'qris' | 'cashier' | 'waiting';

function QRISDisplay({
    orderId,
    total,
    onConfirmPaid,
    onClose,
}: {
    orderId: string;
    total: number;
    onConfirmPaid: () => void;
    onClose: () => void;
}) {
    const [qrSrc, setQrSrc] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        fetch('/api/payment/qris', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId, total, items: [] }),
        })
            .then(r => r.json())
            .then(d => {
                setQrSrc(d.qrCodeUrl || d.qr_image_url || d.qrImageUrl || null);
            })
            .catch(() => setQrSrc(null))
            .finally(() => setIsLoading(false));
    }, [orderId, total]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center"
        >
            <div className="w-full bg-gradient-to-br from-[#0D2B20] to-[#1a4433] rounded-2xl p-3.5 mb-3 text-center">
                <p className="text-amber-400 font-black text-xs tracking-widest uppercase mb-0.5">Scan QRIS Resmi Teh Raja</p>
                <p className="text-white/60 text-[10px]">GoPay · OVO · Dana · ShopeePay · BCA · Mandiri · BRI</p>
            </div>

            <div className="bg-white border-4 border-[#0D2B20] rounded-2xl p-3 mb-3 shadow-xl">
                {isLoading ? (
                    <div className="w-44 h-44 flex items-center justify-center">
                        <Loader size={32} className="animate-spin text-[#0D2B20]" />
                    </div>
                ) : qrSrc ? (
                    <Image src={qrSrc} alt="QRIS Payment" width={176} height={176} className="rounded-lg" unoptimized />
                ) : (
                    <div className="w-44 h-44 flex flex-col items-center justify-center gap-2 text-gray-400">
                        <Image
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=176x176&data=TEHRAJA-${orderId.slice(0, 8).toUpperCase()}-${total}`}
                            alt="QRIS"
                            width={176}
                            height={176}
                            unoptimized
                            className="rounded-lg"
                        />
                    </div>
                )}
            </div>

            <div className="w-full bg-amber-50 border border-amber-200 rounded-xl p-3 text-center mb-3">
                <p className="text-xs text-amber-700 font-medium">Total Tagihan</p>
                <p className="text-2xl font-black text-amber-900">Rp {total.toLocaleString('id-ID')}</p>
                <p className="text-[10px] text-amber-600 mt-0.5">Order ID: #{orderId.slice(0, 8).toUpperCase()}</p>
            </div>

            <div className="flex gap-2 w-full mb-2">
                <button
                    onClick={onClose}
                    className="px-3 py-2.5 border-2 border-gray-200 text-gray-500 rounded-xl font-bold text-xs hover:bg-gray-50 transition"
                >
                    ← Ganti
                </button>
                <button
                    onClick={onConfirmPaid}
                    className="flex-1 py-2.5 bg-green-600 text-white rounded-xl font-bold text-xs hover:bg-green-700 transition flex items-center justify-center gap-1.5 shadow-md"
                >
                    <CheckCircle size={15} /> Saya Sudah Scan &amp; Bayar
                </button>
            </div>
        </motion.div>
    );
}

export default function OrderStatusOverlay() {
    const { activeOrderId, setActiveOrder } = useCartStore();
    const { orders, updateOrder } = useSalesStore();
    const activeOrder = activeOrderId ? orders.find(o => o.id === activeOrderId) : null;
    const [showReceipt, setShowReceipt] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [payStep, setPayStep] = useState<PaymentLocalStep>('choose');

    useEffect(() => {
        const handleOpen = () => setIsMinimized(false);
        window.addEventListener('tehraja:open-order-overlay', handleOpen);
        return () => window.removeEventListener('tehraja:open-order-overlay', handleOpen);
    }, []);

    // Reset local step when order ID changes
    useEffect(() => {
        setPayStep('choose');
        setIsMinimized(false);
    }, [activeOrderId]);

    if (!activeOrderId || !activeOrder) return null;

    const currentStatus = activeOrder.status || 'pending';
    const isCancelled = currentStatus === 'cancelled';

    if (isMinimized) {
        return (
            <button
                onClick={() => setIsMinimized(false)}
                className="fixed bottom-24 sm:bottom-20 right-3 left-3 sm:left-auto sm:right-4 z-[95] bg-[#0D2B20] text-amber-400 border-2 border-amber-400 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 font-bold text-xs hover:scale-105 transition sm:max-w-xs"
            >
                <Clock size={16} className="animate-spin flex-shrink-0" />
                <div className="text-left min-w-0">
                    <p className="text-[10px] text-white/60 uppercase truncate">Status Pesanan #{activeOrder.id.slice(0, 5).toUpperCase()}</p>
                    <p className="text-xs font-black text-amber-400 truncate">
                        {currentStatus === 'pending' ? 'Pilih Pembayaran' :
                         currentStatus === 'awaiting_payment' ? 'Menunggu Verifikasi Kasir' :
                         currentStatus === 'processing' ? 'Sedang Diracik Barista ✨' :
                         currentStatus === 'completed' ? 'Pesanan Siap Diambil! 🎉' : 'Dibatalkan'}
                    </p>
                </div>
            </button>
        );
    }

    const stepKeyMap: Record<string, number> = {
        pending: 0,
        awaiting_payment: 1,
        payment: 1,
        processing: 2,
        completed: 3,
    };
    const isPaymentStage = currentStatus === 'pending' && payStep !== 'choose';
    const progressStepIndex = isPaymentStage ? 1 : (stepKeyMap[currentStatus] ?? 0);

    const statusConfig: Record<string, { title: string; desc: string; icon: React.ReactNode; gradient: string }> = {
        pending_choose: {
            title: "Pesanan Diterima! 🍵",
            desc: "Pilih metode pembayaran Anda untuk melanjutkan.",
            icon: <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center"><span className="text-3xl">🍵</span></div>,
            gradient: "from-amber-400 to-amber-600",
        },
        pending_pay: {
            title: "Silakan Scan QRIS",
            desc: "Scan kode QR di bawah lalu klik tombol konfirmasi.",
            icon: <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center"><QrCode size={36} className="text-green-700" /></div>,
            gradient: "from-green-500 to-green-700",
        },
        pending_cashier: {
            title: "Datangi Kasir",
            desc: "Silakan menuju kasir terdekat untuk melakukan pembayaran.",
            icon: <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center"><UserCheck size={36} className="text-blue-700" /></div>,
            gradient: "from-blue-500 to-blue-700",
        },
        pending_waiting: {
            title: "Menunggu Konfirmasi Kasir",
            desc: "Kasir sedang memverifikasi pembayaran Anda...",
            icon: <Clock size={56} className="text-yellow-500 animate-pulse" />,
            gradient: "from-yellow-400 to-yellow-600",
        },
        awaiting_payment: {
            title: "Menunggu Verifikasi Kasir 💳",
            desc: "Pembayaran Anda sedang diverifikasi oleh kasir untuk diteruskan ke dapur.",
            icon: <Clock size={56} className="text-amber-500 animate-pulse" />,
            gradient: "from-amber-400 to-amber-600",
        },
        processing: {
            title: "Sedang Diracik ✨",
            desc: "Barista kami sedang menyiapkan minuman spesial Anda di KDS.",
            icon: <Loader size={56} className="text-blue-500 animate-spin" />,
            gradient: "from-blue-500 to-blue-700",
        },
        completed: {
            title: "Pesanan Siap! 🎉",
            desc: "Minuman Anda sudah siap. Silakan ambil di counter kasir.",
            icon: <CheckCircle size={56} className="text-green-500" />,
            gradient: "from-green-500 to-green-700",
        },
        cancelled: {
            title: "Pesanan Dibatalkan",
            desc: "Maaf, pesanan dibatalkan. Silakan hubungi kasir.",
            icon: <XCircle size={56} className="text-red-500" />,
            gradient: "from-red-500 to-red-700",
        },
    };

    let configKey: string = currentStatus;
    if (currentStatus === 'pending') {
        if (payStep === 'qris') configKey = 'pending_pay';
        else if (payStep === 'cashier') configKey = 'pending_cashier';
        else if (payStep === 'waiting') configKey = 'pending_waiting';
        else configKey = 'pending_choose';
    }

    const config = statusConfig[configKey] ?? statusConfig['pending_choose'];

    const handleConfirmQRIS = () => {
        updateOrder(activeOrder.id, {
            paymentMethod: 'qris',
            paymentNote: 'qris',
            status: 'awaiting_payment',
        });
        setPayStep('waiting');
    };

    const handleConfirmCashier = () => {
        updateOrder(activeOrder.id, {
            paymentMethod: 'cash',
            paymentNote: 'cash',
            status: 'awaiting_payment',
        });
        setPayStep('waiting');
    };

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
                className="fixed inset-0 z-[100] bg-[#07221B]/95 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-4"
            >
                <motion.div
                    initial={{ scale: 0.85, y: 30 }}
                    animate={{ scale: 1, y: 0 }}
                    className="bg-white text-forest w-full max-w-sm max-h-[90dvh] flex flex-col rounded-3xl shadow-2xl overflow-hidden"
                >
                    <div className={`h-1.5 w-full flex-shrink-0 bg-gradient-to-r ${config.gradient}`} />

                    {/* Top actions */}
                    <div className="flex justify-between items-center px-4 sm:px-5 pt-3.5 sm:pt-4 pb-2 flex-shrink-0">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Live Order Tracker</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => setShowReceipt(true)}
                                className="px-2.5 py-1 bg-gray-100 rounded-full hover:bg-gray-200 text-gray-600 transition flex items-center gap-1 text-[11px] font-bold"
                                title="Lihat Struk"
                            >
                                <Receipt size={13} /> Struk
                            </button>
                            <button
                                onClick={() => setIsMinimized(true)}
                                className="p-1.5 bg-gray-100 rounded-full hover:bg-gray-200 text-gray-500 transition"
                                title="Sembunyikan ke Latar"
                            >
                                <Minimize2 size={14} />
                            </button>
                        </div>
                    </div>

                    <div className="px-4 sm:px-5 pt-2 pb-5 overflow-y-auto flex-1 min-h-0">
                        {/* Stepper */}
                        {!isCancelled && (
                            <div className="flex items-start justify-between mb-5">
                                {STEPS.map((step, i) => {
                                    const done = i < progressStepIndex || currentStatus === 'completed';
                                    const active = i === progressStepIndex && currentStatus !== 'completed';
                                    const isLast = i === STEPS.length - 1;
                                    return (
                                        <div key={step.key} className="flex-1 flex flex-col items-center relative">
                                            {!isLast && (
                                                <div className={`absolute top-4 left-1/2 w-full h-0.5 ${done ? 'bg-green-400' : 'bg-gray-200'} transition-all`} />
                                            )}
                                            <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all ${done
                                                ? 'bg-green-500 border-green-500 text-white'
                                                : active
                                                    ? 'bg-amber-400 border-amber-400 text-white shadow-lg shadow-amber-300/40 animate-pulse'
                                                    : 'bg-gray-100 border-gray-200 text-gray-400'
                                                }`}>
                                                {done ? '✓' : step.icon}
                                            </div>
                                            <p className={`text-[9px] mt-1.5 font-bold text-center leading-tight ${active ? 'text-amber-600' : done ? 'text-green-600' : 'text-gray-400'}`}>
                                                {step.label}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <div className="flex justify-center mb-3">
                            {config.icon}
                        </div>
                        <h2 className="text-xl font-serif font-black text-center mb-1">{config.title}</h2>
                        <p className="text-gray-500 text-xs text-center mb-4 leading-relaxed">{config.desc}</p>

                        {/* PAYMENT STEP: Choose */}
                        {currentStatus === 'pending' && payStep === 'choose' && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 mb-4">
                                <button
                                    onClick={() => {
                                        updateOrder(activeOrder.id, { paymentMethod: 'qris', paymentNote: 'qris' });
                                        setPayStep('qris');
                                    }}
                                    className="w-full flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl hover:border-green-400 hover:shadow-md transition group"
                                >
                                    <div className="w-11 h-11 bg-green-500 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition">
                                        <QrCode size={22} className="text-white" />
                                    </div>
                                    <div className="text-left flex-1">
                                        <p className="font-black text-green-800 text-sm">Bayar via QRIS</p>
                                        <p className="text-[11px] text-green-600 mt-0.5">GoPay · OVO · Dana · ShopeePay · m-Banking</p>
                                    </div>
                                    <ChevronRight size={18} className="text-green-400 group-hover:translate-x-1 transition" />
                                </button>

                                <button
                                    onClick={() => {
                                        updateOrder(activeOrder.id, { paymentMethod: 'cash', paymentNote: 'cash' });
                                        setPayStep('cashier');
                                    }}
                                    className="w-full flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl hover:border-blue-400 hover:shadow-md transition group"
                                >
                                    <div className="w-11 h-11 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition">
                                        <UserCheck size={22} className="text-white" />
                                    </div>
                                    <div className="text-left flex-1">
                                        <p className="font-black text-blue-800 text-sm">Bayar Tunai di Kasir</p>
                                        <p className="text-[11px] text-blue-600 mt-0.5">Tunjukkan ID pesanan di counter kasir</p>
                                    </div>
                                    <ChevronRight size={18} className="text-blue-400 group-hover:translate-x-1 transition" />
                                </button>
                            </motion.div>
                        )}

                        {/* PAYMENT STEP: QRIS Display */}
                        {currentStatus === 'pending' && payStep === 'qris' && (
                            <QRISDisplay
                                orderId={activeOrder.id}
                                total={activeOrder.total}
                                onConfirmPaid={handleConfirmQRIS}
                                onClose={() => setPayStep('choose')}
                            />
                        )}

                        {/* PAYMENT STEP: Cashier Instructions */}
                        {currentStatus === 'pending' && payStep === 'cashier' && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
                                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-4">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="text-center">
                                            <p className="font-black text-blue-900 text-base mb-1">Tunjukkan ke Kasir</p>
                                            <p className="text-xs text-blue-700 leading-relaxed">
                                                Sebutkan nama <strong>{activeOrder.customerName}</strong> atau ID pesanan berikut di kasir:
                                            </p>
                                        </div>
                                        <div className="bg-white border-2 border-blue-300 rounded-xl px-6 py-2.5 text-center">
                                            <p className="text-[10px] text-blue-500 font-bold uppercase tracking-wider">ID Pesanan</p>
                                            <p className="font-black text-2xl text-blue-900 tracking-wider font-mono">
                                                #{activeOrder.id.slice(0, 8).toUpperCase()}
                                            </p>
                                        </div>
                                        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-center w-full">
                                            <p className="text-xs text-amber-700 font-medium">Total Bayar</p>
                                            <p className="font-black text-xl text-amber-900">Rp {activeOrder.total.toLocaleString('id-ID')}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setPayStep('choose')}
                                        className="flex-1 py-2.5 border-2 border-gray-200 text-gray-500 rounded-xl font-bold text-xs hover:bg-gray-50 transition"
                                    >
                                        ← Ganti Metode
                                    </button>
                                    <button
                                        onClick={handleConfirmCashier}
                                        className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 transition flex items-center justify-center gap-1.5"
                                    >
                                        <CheckCircle size={14} /> Konfirmasi ke Kasir
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* PAYMENT STEP: Waiting for cashier confirm */}
                        {((currentStatus === 'pending' && payStep === 'waiting') || currentStatus === 'awaiting_payment') && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
                                <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-3 text-center">
                                    <Loader size={28} className="text-yellow-600 animate-spin mx-auto mb-2" />
                                    <p className="font-bold text-yellow-800 text-sm mb-1">
                                        Metode: {activeOrder.paymentMethod === 'qris' ? 'QRIS' : 'Tunai di Kasir'}
                                    </p>
                                    <p className="text-xs text-yellow-700 leading-relaxed">
                                        Notifikasi sudah masuk ke layar Kasir POS. Pesanan Anda segera diproses begitu kasir menekan tombol terima.
                                    </p>
                                </div>
                            </motion.div>
                        )}

                        {currentStatus === 'processing' && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4">
                                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-center">
                                    <div className="flex justify-center gap-2 mb-2">
                                        <span className="text-2xl animate-bounce" style={{ animationDelay: '0ms' }}>☕</span>
                                        <span className="text-2xl animate-bounce" style={{ animationDelay: '150ms' }}>✨</span>
                                        <span className="text-2xl animate-bounce" style={{ animationDelay: '300ms' }}>🍵</span>
                                    </div>
                                    <p className="text-xs text-blue-700 font-medium leading-relaxed">
                                        Barista sedang meracik minuman Anda di layar Kitchen Display System (KDS).
                                    </p>
                                </div>
                            </motion.div>
                        )}

                        {currentStatus === 'completed' && (
                            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="mb-4">
                                <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
                                    <p className="text-3xl mb-1">🎉</p>
                                    <p className="font-black text-green-800 text-sm mb-1">Minuman Anda Siap!</p>
                                    <p className="text-xs text-green-700">Silakan ambil pesanan Anda di counter atau tunggu diantar ke meja.</p>
                                </div>
                            </motion.div>
                        )}

                        {/* Order Summary */}
                        <div className="bg-gray-50 rounded-xl p-3 mb-4 border border-gray-100 text-sm">
                            <div className="flex justify-between text-gray-500 text-xs mb-2 pb-2 border-b border-gray-200">
                                <span>Pemesan: <strong>{activeOrder.customerName}</strong></span>
                                <span className="font-mono font-bold">#{activeOrder.id.slice(0, 8).toUpperCase()}</span>
                            </div>
                            <div className="space-y-1.5">
                                {activeOrder.items.map((item, idx) => {
                                    const vLabel = formatVariantLabel(item.variants);
                                    return (
                                        <div key={idx}>
                                            <div className="flex justify-between font-bold text-gray-800 text-xs">
                                                <span>{item.quantity}× {item.name}</span>
                                                <span>Rp {((item.finalPrice ?? item.price) * item.quantity).toLocaleString('id-ID')}</span>
                                            </div>
                                            {vLabel && (
                                                <p className="text-[10px] text-amber-600 pl-3">{vLabel}</p>
                                            )}
                                        </div>
                                    );
                                })}
                                {activeOrder.discount && activeOrder.discount > 0 ? (
                                    <div className="flex justify-between text-xs text-emerald-600 font-bold pt-1">
                                        <span>Diskon Promo / Poin</span>
                                        <span>-Rp {activeOrder.discount.toLocaleString('id-ID')}</span>
                                    </div>
                                ) : null}
                                <div className="flex justify-between font-black text-[#0D2B20] border-t border-gray-200 pt-2 mt-2">
                                    <span>Total</span>
                                    <span>Rp {activeOrder.total.toLocaleString('id-ID')}</span>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        {currentStatus === 'completed' || currentStatus === 'cancelled' ? (
                            <button
                                onClick={() => { setActiveOrder(null); setPayStep('choose'); }}
                                className="w-full py-3.5 bg-[#0D2B20] text-amber-400 font-bold rounded-xl hover:bg-[#1a4433] transition flex items-center justify-center gap-2 shadow-lg shadow-green-900/20"
                            >
                                <Home size={18} />
                                Selesai &amp; Buat Pesanan Baru
                            </button>
                        ) : (
                            <button
                                onClick={() => setIsMinimized(true)}
                                className="w-full py-2.5 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition text-xs"
                            >
                                Lihat Menu Sambil Menunggu
                            </button>
                        )}
                    </div>
                </motion.div>

                <p className="text-white/30 text-[10px] mt-2 text-center font-medium tracking-wider">
                    TEH RAJA POS · Real-time Order Tracker
                </p>
            </motion.div>
        </AnimatePresence>
    );
}
