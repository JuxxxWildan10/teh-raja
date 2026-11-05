"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
    Leaf,
    Star,
    ChevronRight,
    ShoppingCart,
    LayoutDashboard,
    Sparkles,
    Clock,
    Award,
    Coffee,
    ChefHat,
    Presentation,
    ShieldCheck,
    Receipt,
    QrCode,
} from "lucide-react";
import { useAuthStore, useCartStore, useSalesStore } from "@/lib/store";
import SecretStaffModal, { useSecretLogoTap } from "@/components/SecretStaffModal";
import CustomerOrderTrackerModal from "@/components/CustomerOrderTrackerModal";

const FEATURED_TEAS = [
    {
        name: "Royale Milk Tea",
        desc: "Teh melati signature dengan susu segar premium",
        price: "Rp 5.000",
        badge: "Terlaris",
        img: "https://i.pinimg.com/736x/0b/e7/b8/0be7b87d66b4d16ec60455d1d81abbe8.jpg",
        color: "from-amber-700 to-amber-900",
    },
    {
        name: "The Great Matcha Latte",
        desc: "Matcha otentik dengan susu segar, pekat & bersahaja",
        price: "Rp 7.000",
        badge: "New",
        img: "https://i.pinimg.com/736x/dc/c9/ce/dcc9cece545e7f612d6ad61fd4f3f552.jpg",
        color: "from-green-700 to-green-900",
    },
    {
        name: "Tropical Mango Tea",
        desc: "Teh mangga tropis yang menyegarkan dan creamy",
        price: "Rp 7.000",
        badge: "Favorit",
        img: "https://i.pinimg.com/1200x/88/ea/83/88ea83064077c3bc9aac22a359f02180.jpg",
        color: "from-orange-600 to-orange-900",
    },
];

const CUSTOMER_FEATURES = [
    {
        icon: Sparkles,
        title: "AI Tea Sommelier",
        desc: "Bingung memilih varian teh? Jawab kuis singkat dan temukan racikan minuman yang paling pas dengan mood Anda hari ini.",
    },
    {
        icon: Coffee,
        title: "Kustomisasi Rasa & Topping",
        desc: "Atur ukuran cup, tingkat kemanisan, es batu, hingga pilihan topping favorit sesuai selera Anda.",
    },
    {
        icon: QrCode,
        title: "Pembayaran QRIS & Tunai Mudah",
        desc: "Bayar praktis langsung dari ponsel Anda menggunakan QRIS semua e-wallet/m-banking atau bayar tunai di kasir.",
    },
    {
        icon: Receipt,
        title: "Lacak Pesanan & Struk Digital",
        desc: "Pantau status racikan minuman Anda secara real-time dari meja dan unduh struk digital kapan saja.",
    },
];

const PORTAL_MODULES = [
    {
        title: "Self-Order Pelanggan",
        subtitle: "/menu",
        desc: "Katalog interaktif, AI Tea Sommelier Quiz, keranjang promo otomatis, & tracker pesanan live.",
        href: "/menu",
        icon: Coffee,
        badge: "Pelanggan",
        color: "border-amber-400/30 hover:border-amber-400 bg-amber-400/5",
    },
    {
        title: "Kasir Point of Sale (POS)",
        subtitle: "/pos",
        desc: "Transaksi cepat, AI Voice POS, CRM Loyalty & Upsell, Hold Order, Kas Kecil, & Cetak Struk Thermal/WA.",
        href: "/pos",
        icon: ShoppingCart,
        badge: "Kasir",
        color: "border-emerald-400/30 hover:border-emerald-400 bg-emerald-400/5",
    },
    {
        title: "Kitchen Display (KDS)",
        subtitle: "/kds",
        desc: "Layar antrean barista real-time dengan indikator SLA waktu tunggu dan penyelesaian pesanan satu klik.",
        href: "/kds",
        icon: ChefHat,
        badge: "Barista / Dapur",
        color: "border-blue-400/30 hover:border-blue-400 bg-blue-400/5",
    },
    {
        title: "Admin ERP & AI Forecast",
        subtitle: "/admin",
        desc: "Manajemen Menu & Resep BOM, Inventori & Opname, Promo, CRM, Multi-Cabang, Analitik BI, & AI Prediksi.",
        href: "/admin",
        icon: LayoutDashboard,
        badge: "Manajemen",
        color: "border-purple-400/30 hover:border-purple-400 bg-purple-400/5",
    },
];

export default function LandingPage() {
    const router = useRouter();
    const { user, logout } = useAuthStore();
    const activeOrderId = useCartStore((state) => state.activeOrderId);
    const orders = useSalesStore((state) => state.orders);
    const activeOrder = activeOrderId ? orders.find((o) => o.id === activeOrderId) : null;

    const [currentTea, setCurrentTea] = useState(0);
    const [mounted, setMounted] = useState(false);
    const [isSecretModalOpen, setIsSecretModalOpen] = useState(false);
    const [isTrackerModalOpen, setIsTrackerModalOpen] = useState(false);

    const handleLogoTap = useSecretLogoTap(() => {
        setIsSecretModalOpen(true);
    });

    useEffect(() => {
        setMounted(true);
        const interval = setInterval(() => {
            setCurrentTea((v) => (v + 1) % FEATURED_TEAS.length);
        }, 3500);
        return () => clearInterval(interval);
    }, []);

    if (!mounted) return null;

    return (
        <div className="min-h-screen bg-[#07221B] text-white overflow-x-hidden">
            {/* ── NAVBAR ─────────────────────────────────── */}
            <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 glass">
                {/* Logo: Tap 5x to open Secret Admin Login / Portal */}
                <button
                    type="button"
                    onClick={handleLogoTap}
                    className="flex items-center gap-2.5 cursor-pointer select-none focus:outline-none group"
                    title="Teh Raja"
                >
                    <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center transition-transform group-active:scale-90">
                        <Leaf size={16} className="text-[#07221B]" />
                    </div>
                    <span className="font-bold text-amber-400 tracking-widest text-sm uppercase font-sans select-none">
                        Teh Raja
                    </span>
                </button>

                <div className="flex items-center gap-2 sm:gap-3">
                    {user && (
                        <button
                            type="button"
                            onClick={() => setIsSecretModalOpen(true)}
                            className="flex items-center gap-1.5 text-xs font-bold bg-emerald-500/20 text-emerald-300 px-3.5 py-2 rounded-full hover:bg-emerald-500/30 transition border border-emerald-500/40"
                        >
                            <ShieldCheck size={13} />
                            <span className="hidden sm:inline">Portal Admin ({user.name})</span>
                            <span className="sm:hidden">Admin</span>
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={() => setIsTrackerModalOpen(true)}
                        className={`flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-full transition border ${
                            activeOrder
                                ? "bg-amber-400/20 text-amber-300 border-amber-400/50 animate-pulse"
                                : "bg-white/10 text-white border-white/15 hover:bg-white/20"
                        }`}
                    >
                        {activeOrder ? <Clock size={13} /> : <Receipt size={13} className="text-amber-400" />}
                        <span>
                            {activeOrder
                                ? `Pesanan #${activeOrder.id.slice(0, 5).toUpperCase()}`
                                : "Lacak Pesanan & Struk"}
                        </span>
                    </button>

                    <button
                        onClick={() => router.push("/menu")}
                        className="flex items-center gap-1.5 text-xs font-bold bg-amber-400 text-[#07221B] px-4 py-2 rounded-full hover:bg-amber-300 transition hover:scale-105 active:scale-95 shadow-lg shadow-amber-400/20"
                    >
                        <Coffee size={13} /> Pesan Menu
                    </button>
                </div>
            </nav>

            {/* ── HERO SECTION ──────────────────────────── */}
            <section className="min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-16 relative overflow-hidden">
                {/* Background orbs */}
                <div className="absolute top-1/4 -left-32 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-green-400/10 rounded-full blur-3xl pointer-events-none" />

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7 }}
                    className="text-center max-w-3xl mx-auto mb-12"
                >
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 bg-amber-400/10 border border-amber-400/30 text-amber-400 text-xs font-bold px-4 py-2 rounded-full mb-6">
                        <Award size={13} />
                        Authentic Tea &amp; Signature Blends
                    </div>

                    <h1 className="text-5xl sm:text-6xl md:text-7xl font-serif font-bold leading-tight mb-6">
                        <span className="text-gradient-gold">Teh Raja</span>
                        <br />
                        <span className="text-white/80 text-3xl sm:text-4xl md:text-5xl">
                            Kemewahan dalam Setiap Tegukan
                        </span>
                    </h1>

                    <p className="text-white/60 text-base sm:text-lg leading-relaxed mb-10 max-w-xl mx-auto">
                        Nikmati racikan teh melati autentik, matcha pilihan, dan teh buah segar. Pesan langsung dari meja Anda, pantau proses peracikan secara live, dan unduh struk digital dengan mudah.
                    </p>

                    <div className="flex flex-wrap gap-3 justify-center">
                        <motion.button
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => router.push("/menu")}
                            className="flex items-center justify-center gap-2 bg-amber-400 text-[#07221B] font-black text-base px-8 py-4 rounded-2xl shadow-2xl shadow-amber-400/30 hover:bg-amber-300 transition"
                        >
                            <Coffee size={20} />
                            Lihat Menu &amp; Pesan Sekarang
                            <ChevronRight size={18} />
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => setIsTrackerModalOpen(true)}
                            className="flex items-center justify-center gap-2 bg-white/10 text-white border border-white/20 font-bold text-base px-6 py-4 rounded-2xl hover:bg-white/15 transition"
                        >
                            <Receipt size={18} className="text-amber-400" />
                            Lacak Pesanan &amp; Struk
                        </motion.button>
                    </div>
                </motion.div>

                {/* Featured Tea Carousel */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.2 }}
                    className="w-full max-w-sm"
                >
                    <div className="relative h-72 rounded-3xl overflow-hidden shadow-2xl">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentTea}
                                initial={{ opacity: 0, scale: 1.05 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.5 }}
                                className="absolute inset-0"
                            >
                                <Image
                                    src={FEATURED_TEAS[currentTea].img}
                                    alt={FEATURED_TEAS[currentTea].name}
                                    fill
                                    className="object-cover"
                                    unoptimized
                                />
                                <div
                                    className={`absolute inset-0 bg-gradient-to-t ${FEATURED_TEAS[currentTea].color} opacity-60`}
                                />
                                <div className="absolute bottom-0 left-0 right-0 p-5">
                                    <span className="bg-amber-400 text-[#07221B] text-[10px] font-black px-2 py-0.5 rounded-full mb-2 inline-block">
                                        {FEATURED_TEAS[currentTea].badge}
                                    </span>
                                    <h3 className="text-xl font-serif font-bold text-white">
                                        {FEATURED_TEAS[currentTea].name}
                                    </h3>
                                    <p className="text-white/70 text-xs mt-1">
                                        {FEATURED_TEAS[currentTea].desc}
                                    </p>
                                    <p className="text-amber-400 font-black text-lg mt-2">
                                        {FEATURED_TEAS[currentTea].price}
                                    </p>
                                </div>
                            </motion.div>
                        </AnimatePresence>

                        {/* Dots */}
                        <div className="absolute top-4 right-4 flex gap-1.5">
                            {FEATURED_TEAS.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setCurrentTea(i)}
                                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                                        i === currentTea ? "bg-amber-400 w-4" : "bg-white/40"
                                    }`}
                                />
                            ))}
                        </div>
                    </div>
                </motion.div>
            </section>

            {/* ── PORTAL MODUL TERINTEGRASI (HANYA TAMPIL JIKA ADMIN LOGIN VIA 5x TAP) ── */}
            {user && (
                <section className="px-6 py-16 bg-black/30 border-y border-amber-400/20">
                    <div className="max-w-5xl mx-auto">
                        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                            <div>
                                <span className="text-xs font-bold uppercase tracking-widest text-emerald-300 bg-emerald-500/15 px-3 py-1 rounded-full border border-emerald-500/30">
                                    Mode Staf &amp; Administrator Aktif ({user.name})
                                </span>
                                <h2 className="text-3xl font-serif font-bold text-white mt-3">
                                    Portal Akses Cepat Sistem
                                </h2>
                                <p className="text-white/50 text-sm mt-1">
                                    Panel ini disembunyikan dari pelanggan dan hanya terlihat karena Anda telah login
                                </p>
                            </div>
                            <button
                                onClick={() => logout()}
                                className="px-4 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 text-xs font-bold transition"
                            >
                                Kunci &amp; Sembunyikan Portal
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {PORTAL_MODULES.map((mod) => {
                                const Icon = mod.icon;
                                return (
                                    <Link
                                        key={mod.href}
                                        href={mod.href}
                                        className={`group p-5 rounded-2xl border transition flex items-start gap-4 ${mod.color}`}
                                    >
                                        <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition">
                                            <Icon size={22} className="text-amber-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-white/10 text-amber-300">
                                                    {mod.badge}
                                                </span>
                                                <span className="text-xs font-mono text-white/40">{mod.subtitle}</span>
                                            </div>
                                            <h3 className="font-bold text-white text-base group-hover:text-amber-400 transition flex items-center justify-between">
                                                {mod.title}
                                                <ChevronRight
                                                    size={16}
                                                    className="opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition"
                                                />
                                            </h3>
                                            <p className="text-white/60 text-xs leading-relaxed mt-1">{mod.desc}</p>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>

                        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 bg-white/5 border border-white/10 rounded-2xl p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-400/20 flex items-center justify-center text-amber-400">
                                    <ShieldCheck size={20} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-white">Dokumen Presentasi PKL &amp; Sempro</p>
                                    <p className="text-[11px] text-white/60">
                                        Akses khusus slide presentasi Seminar Proposal &amp; Laporan Akhir POS
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <a
                                    href="/presentasi_sempro_tehraja.html"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-4 py-2 bg-amber-400 text-[#07221B] hover:bg-amber-300 rounded-xl text-xs font-black transition shadow-lg shadow-amber-400/20"
                                >
                                    <Sparkles size={14} /> Slide Seminar Proposal (Sempro)
                                </a>
                                <a
                                    href="/presentasi_pkl_tehraja.html"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-4 py-2 bg-amber-400/15 hover:bg-amber-400/25 text-amber-300 border border-amber-400/30 rounded-xl text-xs font-bold transition"
                                >
                                    <Presentation size={14} /> Slide Laporan Akhir (POS)
                                </a>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* ── CUSTOMER FEATURES SECTION ──────────────── */}
            <section className="px-6 py-16 bg-black/20">
                <div className="max-w-4xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-12"
                    >
                        <h2 className="text-3xl font-serif font-bold text-amber-400 mb-3">
                            Pengalaman Memesan Lebih Praktis
                        </h2>
                        <p className="text-white/50 text-sm">
                            Pilih menu favorit, sesuaikan racikan, dan pantau status pesanan serta struk langsung dari ponsel Anda
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        {CUSTOMER_FEATURES.map(({ icon: Icon, title, desc }, i) => (
                            <motion.div
                                key={title}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className="flex gap-4 p-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/8 transition"
                            >
                                <div className="w-10 h-10 rounded-xl bg-amber-400/15 flex items-center justify-center flex-shrink-0">
                                    <Icon size={20} className="text-amber-400" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white mb-1">{title}</h3>
                                    <p className="text-white/50 text-sm leading-relaxed">{desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA SECTION ───────────────────────────── */}
            <section className="px-6 py-20 text-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    className="max-w-lg mx-auto bg-gradient-to-br from-amber-400/10 to-green-900/30 border border-amber-400/20 rounded-3xl p-10"
                >
                    <button
                        type="button"
                        onClick={handleLogoTap}
                        className="w-14 h-14 mx-auto bg-amber-400 rounded-2xl flex items-center justify-center mb-5 cursor-pointer active:scale-90 transition-transform"
                        title="Teh Raja"
                    >
                        <Leaf size={28} className="text-[#07221B]" />
                    </button>
                    <h2 className="text-2xl font-serif font-bold text-white mb-3">
                        Mulai Pengalaman Teh Raja
                    </h2>
                    <p className="text-white/50 text-sm mb-8">
                        Pesan minuman teh otentik dengan resep signature kami atau lacak status pesanan dan struk pembelian Anda.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={() => router.push("/menu")}
                            className="flex-1 py-4 bg-amber-400 text-[#07221B] font-black rounded-xl hover:bg-amber-300 transition hover:scale-[1.02] active:scale-[0.98] shadow-lg"
                        >
                            Buka Menu Pelanggan
                        </button>
                        <button
                            onClick={() => setIsTrackerModalOpen(true)}
                            className="flex-1 py-4 bg-white/10 text-white border border-white/20 font-bold rounded-xl hover:bg-white/20 transition flex items-center justify-center gap-2"
                        >
                            <Receipt size={16} className="text-amber-400" />
                            Lacak Pesanan &amp; Struk
                        </button>
                    </div>
                </motion.div>
            </section>

            {/* ── FOOTER ────────────────────────────────── */}
            <footer className="px-6 py-6 border-t border-white/10 text-center text-white/40 text-xs">
                <p>TEH RAJA &copy; 2026 · Authentic Tea &amp; Blends</p>
            </footer>

            {/* Modals */}
            <CustomerOrderTrackerModal
                isOpen={isTrackerModalOpen}
                onClose={() => setIsTrackerModalOpen(false)}
            />
            <SecretStaffModal
                isOpen={isSecretModalOpen}
                onClose={() => setIsSecretModalOpen(false)}
            />
        </div>
    );
}
