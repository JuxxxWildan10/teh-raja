"use client";

/**
 * ============================================================================
 * FILE: components/CustomerOrderTrackerModal.tsx
 * ============================================================================
 * FUNGSI UTAMA:
 * Modal **Lacak Pesanan & Struk Digital** untuk pembeli/pelanggan.
 *
 * FITUR PENTING:
 * 1. Memungkinkan pembeli mencari pesanan mereka berdasarkan **Nama Pemesan**, **ID Order (`#...`)**, atau **Nomor HP**.
 * 2. Menampilkan status pesanan terkini (*Menunggu Bayar*, *Verifikasi Kasir*, *Sedang Diracik*, *Siap Diambil*).
 * 3. Memungkinkan pembeli membuka kembali layar pantau *live* atau mengunduh/mencetak **Struk Digital (`ReceiptModal`)**.
 * ============================================================================
 */

import { useState, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    useSalesStore,
    useCartStore,
    Order,
    formatVariantLabel,
} from "@/lib/store";
import {
    Search,
    Receipt,
    Clock,
    CheckCircle2,
    X,
    Sparkles,
    XCircle,
    Eye,
    ShoppingBag,
} from "lucide-react";
import ReceiptModal from "./ReceiptModal";

interface CustomerOrderTrackerModalProps {
    isOpen: boolean;
    onClose: () => void;
}

function getStatusBadge(status?: Order["status"]) {
    switch (status) {
        case "completed":
            return {
                label: "Siap Diambil 🎉",
                cls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
                icon: CheckCircle2,
            };
        case "processing":
            return {
                label: "Sedang Diracik ✨",
                cls: "bg-blue-500/20 text-blue-300 border-blue-500/40",
                icon: Sparkles,
            };
        case "awaiting_payment":
            return {
                label: "Verifikasi Kasir 💳",
                cls: "bg-amber-500/20 text-amber-300 border-amber-500/40",
                icon: Clock,
            };
        case "cancelled":
            return {
                label: "Dibatalkan",
                cls: "bg-red-500/20 text-red-300 border-red-500/40",
                icon: XCircle,
            };
        default:
            return {
                label: "Menunggu Pembayaran",
                cls: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
                icon: Clock,
            };
    }
}

export default function CustomerOrderTrackerModal({
    isOpen,
    onClose,
}: CustomerOrderTrackerModalProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { orders } = useSalesStore();
    const { activeOrderId, setActiveOrder } = useCartStore();

    const [query, setQuery] = useState("");
    const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<Order | null>(null);

    const activeOrder = useMemo(
        () => (activeOrderId ? orders.find((o) => o.id === activeOrderId) || null : null),
        [activeOrderId, orders]
    );

    const filteredOrders = useMemo(() => {
        const q = query.trim().toLowerCase().replace(/^#/, "");
        if (!q) {
            // Show active order first, plus today's most recent customer orders (up to 5)
            const todayStr = new Date().toDateString();
            return orders
                .filter((o) => {
                    if (activeOrderId && o.id === activeOrderId) return true;
                    const d = new Date(o.date);
                    return !isNaN(d.getTime()) && d.toDateString() === todayStr;
                })
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 6);
        }

        return orders
            .filter((o) => {
                const matchId = o.id.toLowerCase().includes(q);
                const matchName = (o.customerName || "").toLowerCase().includes(q);
                const matchPhone = (o.customerPhone || "").toLowerCase().includes(q);
                return matchId || matchName || matchPhone;
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 10);
    }, [orders, query, activeOrderId]);

    const handleTrackLive = (order: Order) => {
        setActiveOrder(order.id);
        onClose();
        if (pathname !== "/menu") {
            router.push("/menu");
        } else {
            window.dispatchEvent(new CustomEvent("tehraja:open-order-overlay"));
        }
    };

    return (
        <AnimatePresence>
            {selectedReceiptOrder && (
                <div
                    key="customer-receipt-viewer"
                    className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                >
                    <ReceiptModal
                        order={selectedReceiptOrder}
                        onClose={() => setSelectedReceiptOrder(null)}
                    />
                </div>
            )}

            {isOpen && (
                <div
                    key="customer-tracker-modal"
                    className="fixed inset-0 z-[220] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md"
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.92, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.92, y: 20 }}
                        className="w-full max-w-lg bg-[#07221B] border border-amber-400/30 rounded-3xl shadow-2xl overflow-hidden text-white flex flex-col max-h-[90dvh]"
                    >
                        {/* Header */}
                        <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-400/15 via-emerald-900/30 to-transparent border-b border-white/10 flex items-center justify-between gap-2 flex-shrink-0">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-400 text-[#07221B] flex items-center justify-center shadow-lg shadow-amber-400/20 flex-shrink-0">
                                    <Receipt size={20} />
                                </div>
                                <div className="min-w-0">
                                    <h2 className="text-base sm:text-lg font-serif font-bold text-amber-400">
                                        Lacak Pesanan &amp; Struk
                                    </h2>
                                    <p className="text-xs text-white/60">
                                        Pantau status racikan minuman &amp; unduh struk digital Anda
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-full bg-white/5 hover:bg-white/15 text-white/60 hover:text-white transition flex-shrink-0"
                                aria-label="Tutup"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Search Input */}
                        <div className="p-3 sm:p-4 border-b border-white/10 bg-black/20 flex-shrink-0">
                            <div className="flex items-center gap-2.5 bg-white/10 border border-white/15 rounded-2xl px-3.5 sm:px-4 py-2.5 sm:py-3 focus-within:border-amber-400 transition">
                                <Search size={16} className="text-amber-400 flex-shrink-0" />
                                <input
                                    type="text"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Cari ID Pesanan (misal #A1B2), Nama, atau No. WA..."
                                    className="bg-transparent text-sm w-full focus:outline-none text-white placeholder:text-white/35 min-w-0"
                                />
                                {query && (
                                    <button
                                        onClick={() => setQuery("")}
                                        className="text-white/40 hover:text-white text-xs flex-shrink-0"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Order List */}
                        <div className="p-3 sm:p-4 overflow-y-auto space-y-3 flex-1 min-h-0">
                            {activeOrder && !query && (
                                <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-400/10 border-2 border-amber-400/50 space-y-3">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-400 text-[#07221B]">
                                            Pesanan Aktif Anda
                                        </span>
                                        <span className="text-xs font-mono font-bold text-amber-300">
                                            #{activeOrder.id.slice(0, 8).toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div>
                                            <p className="font-bold text-base text-white">
                                                {activeOrder.customerName || "Pelanggan"}
                                            </p>
                                            <p className="text-xs text-white/60">
                                                {activeOrder.items.reduce((s, i) => s + i.quantity, 0)} item · Rp{" "}
                                                {activeOrder.total.toLocaleString("id-ID")}
                                            </p>
                                        </div>
                                        {(() => {
                                            const badge = getStatusBadge(activeOrder.status);
                                            const BadgeIcon = badge.icon;
                                            return (
                                                <span
                                                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badge.cls}`}
                                                >
                                                    <BadgeIcon size={13} />
                                                    {badge.label}
                                                </span>
                                            );
                                        })()}
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-2 pt-1">
                                        <button
                                            onClick={() => handleTrackLive(activeOrder)}
                                            className="flex-1 py-2.5 px-3 bg-amber-400 hover:bg-amber-300 text-[#07221B] font-black rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-md"
                                        >
                                            <Eye size={14} /> Buka Live Tracker
                                        </button>
                                        <button
                                            onClick={() => setSelectedReceiptOrder(activeOrder)}
                                            className="flex-1 py-2.5 px-3 bg-white/10 hover:bg-white/20 text-white border border-white/15 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5"
                                        >
                                            <Receipt size={14} className="text-amber-400" /> Lihat &amp; Cetak Struk
                                        </button>
                                    </div>
                                </div>
                            )}

                            <p className="text-[11px] font-bold uppercase tracking-wider text-white/40 px-1">
                                {query ? `Hasil Pencarian (${filteredOrders.length})` : "Daftar Pesanan Terbaru Hari Ini"}
                            </p>

                            {filteredOrders.length === 0 ? (
                                <div className="text-center py-10 text-white/40 space-y-2">
                                    <ShoppingBag size={36} className="mx-auto opacity-40" />
                                    <p className="text-sm font-bold text-white/60">
                                        Belum ada pesanan yang ditemukan
                                    </p>
                                    <p className="text-xs max-w-xs mx-auto">
                                        Masukkan ID Pesanan, Nama Pemesan, atau Nomor WhatsApp Anda, atau buat pesanan baru di halaman Menu.
                                    </p>
                                </div>
                            ) : (
                                filteredOrders.map((order) => {
                                    const badge = getStatusBadge(order.status);
                                    const BadgeIcon = badge.icon;
                                    const orderTime = new Date(order.date);
                                    const timeStr = !isNaN(orderTime.getTime())
                                        ? orderTime.toLocaleTimeString("id-ID", {
                                              hour: "2-digit",
                                              minute: "2-digit",
                                          })
                                        : "";

                                    return (
                                        <div
                                            key={order.id}
                                            className="p-3.5 sm:p-4 rounded-2xl bg-white/5 hover:bg-white/8 border border-white/10 transition space-y-3"
                                        >
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                                        <span className="font-mono font-black text-xs text-amber-400">
                                                            #{order.id.slice(0, 8).toUpperCase()}
                                                        </span>
                                                        <span className="text-[11px] text-white/40">
                                                            · {timeStr}
                                                        </span>
                                                        {order.tableNumber && (
                                                            <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-white/70">
                                                                Meja {order.tableNumber}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="font-bold text-sm text-white mt-0.5">
                                                        {order.customerName || "Pelanggan"}
                                                    </p>
                                                </div>
                                                <span
                                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border flex-shrink-0 ${badge.cls}`}
                                                >
                                                    <BadgeIcon size={12} />
                                                    {badge.label}
                                                </span>
                                            </div>

                                            {/* Item list preview */}
                                            <div className="bg-black/20 rounded-xl p-2.5 space-y-1 text-xs text-white/70">
                                                {order.items.map((item, idx) => {
                                                    const vLabel = formatVariantLabel(item.variants);
                                                    return (
                                                        <div key={idx} className="flex justify-between gap-2">
                                                            <span className="min-w-0 break-words">
                                                                {item.quantity}× {item.name}{" "}
                                                                {vLabel ? (
                                                                    <span className="text-amber-300/70 text-[10px]">
                                                                        ({vLabel})
                                                                    </span>
                                                                ) : null}
                                                            </span>
                                                            <span className="font-semibold text-white/90 flex-shrink-0">
                                                                Rp{" "}
                                                                {(
                                                                    (item.finalPrice ?? item.price) * item.quantity
                                                                ).toLocaleString("id-ID")}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                                <div className="flex justify-between pt-1.5 mt-1 border-t border-white/10 font-bold text-amber-300">
                                                    <span>Total Bayar</span>
                                                    <span>Rp {order.total.toLocaleString("id-ID")}</span>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap gap-2">
                                                <button
                                                    onClick={() => handleTrackLive(order)}
                                                    className="min-w-[125px] flex-1 py-2 px-2.5 bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/30 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5"
                                                >
                                                    <Clock size={13} /> Lacak Status Live
                                                </button>
                                                <button
                                                    onClick={() => setSelectedReceiptOrder(order)}
                                                    className="min-w-[110px] flex-1 py-2 px-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/10 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5"
                                                >
                                                    <Receipt size={13} className="text-amber-400" /> Lihat Struk
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

