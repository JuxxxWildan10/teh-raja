"use client";

import { useSalesStore, useCartStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Clock, Loader, XCircle, Home, Receipt } from "lucide-react"; // [NEW] Receipt icon
import { useState } from "react";
import ReceiptModal from "./ReceiptModal"; // [NEW]

// Komponen Overlay untuk menampilkan status pesanan secara real-time.
// Muncul menutupi layar setelah pengguna melakukan checkout.
export default function OrderStatusOverlay() {
    // Mengambil `activeOrderId` (ID pesanan yang sedang aktif) dan fungsi pembarunya dari keranjang
    const { activeOrderId, setActiveOrder } = useCartStore();
    // Mengambil daftar seluruh pesanan dari store penjualan
    const { orders } = useSalesStore();

    // State lokal untuk melacak detail pesanan yang sedang aktif dan kontrol modal struk
    const activeOrder = activeOrderId ? orders.find(o => o.id === activeOrderId) : null;
    const [showReceipt, setShowReceipt] = useState(false); // [NEW]

    // Jika tidak ada ID pesanan aktif atau data tidak ditemukan, sembunyikan overlay (return null)
    if (!activeOrderId || !activeOrder) return null;

    // Konfigurasi tampilan berdasarkan status pesanan
    // Menentukan judul, deskripsi, ikon, dan warna yang akan ditampilkan
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

    // Tentukan status saat ini, default ke 'pending'
    const currentStatus = activeOrder.status || 'pending';
    const config = statusConfig[currentStatus as keyof typeof statusConfig];

    // Fungsi untuk menutup overlay (kembali ke menu) saat pesanan selesai/batal
    const handleClose = () => {
        setActiveOrder(null);
    };

    return (
        <AnimatePresence>
            {/* Tampilkan modal struk jika tombol receipt diklik */}
            {showReceipt && activeOrder && (
                <div key="receipt-modal">
                    <ReceiptModal
                        order={activeOrder}
                        onClose={() => setShowReceipt(false)}
                    />
                </div>
            )}

            {/* Container utama overlay dengan animasi dari framer-motion */}
            <motion.div
                key="status-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-forest/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center"
            >
                {/* Kotak detail status modal */}
                <motion.div
                    initial={{ scale: 0.8, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    className={`bg-white text-forest w-full max-w-md rounded-3xl p-8 shadow-2xl relative overflow-hidden`}
                >
                    {/* Status Indicator Line (Garis berwarna di bagian atas kartu) */}
                    <div className={`absolute top-0 left-0 w-full h-2 ${config.color}`} />

                    {/* Tombol panggil tanda terima struk */}
                    <div className="absolute top-4 right-4">
                        <button
                            onClick={() => setShowReceipt(true)}
                            className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 text-gray-600 transition"
                            title="Lihat Struk"
                        >
                            <Receipt size={20} />
                        </button>
                    </div>

                    {/* Ikon besar menandakan state pesanan */}
                    <div className="mb-8 flex justify-center">
                        <div className={`p-6 rounded-full ${config.bg} border-4 border-white shadow-inner`}>
                            {config.icon}
                        </div>
                    </div>

                    {/* Judul dan subjudul status yang responsif terhadap state */}
                    <h2 className="text-3xl font-serif font-bold mb-4">{config.title}</h2>
                    <p className="text-gray-500 mb-8 leading-relaxed">{config.desc}</p>

                    {/* Detail pesanan (ID dan item yang dipesan) */}
                    <div className="bg-gray-50 rounded-xl p-4 mb-8 text-left border border-gray-100">
                        <div className="flex justify-between text-sm text-gray-500 mb-2 border-b border-gray-200 pb-2">
                            <span>Order ID</span>
                            <span className="font-mono font-bold">#{activeOrder.id.slice(0, 6)}</span>
                        </div>
                        <div className="space-y-1">
                            {activeOrder.items.map((item: { quantity: number; name: string }, idx: number) => (
                                <div key={idx} className="flex justify-between text-sm font-bold">
                                    <span>{item.quantity}x {item.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Tombol kembali ke menu, hanya muncul jika status pesanan adalah 'completed' (selesai) atau 'cancelled' (batal) */}
                    {currentStatus === 'completed' || currentStatus === 'cancelled' ? (
                        <button
                            onClick={handleClose}
                            className="w-full py-4 bg-forest text-gold font-bold rounded-xl hover:bg-forest-light transition flex items-center justify-center gap-2 transform hover:scale-[1.02]"
                        >
                            <Home size={20} />
                            Kembali ke Menu
                        </button>
                    ) : (
                        // Indikator loading menunggu upate dari sisi kasir
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
