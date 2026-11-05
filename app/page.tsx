"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
    Leaf, Star, ChevronRight, ShoppingCart, LayoutDashboard,
    Sparkles, Clock, Award, Coffee, ChefHat, Presentation, ShieldCheck
} from "lucide-react";
import { useAuthStore } from "@/lib/store";

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

const FEATURES = [
    { icon: Sparkles, title: "AI Tea Sommelier & Forecasting", desc: "Rekomendasi minuman cerdas untuk pelanggan & prediksi stok berbasis AI Gemini + WMA untuk admin" },
    { icon: Clock, title: "Realtime Order & KDS", desc: "Pesanan dari meja pelanggan langsung terhubung ke Kasir POS dan layar Kitchen Display System (KDS)" },
    { icon: Award, title: "Inventory BOM & Loyalty CRM", desc: "Pemotongan bahan baku otomatis sesuai resep (BOM), poin member otomatis, dan AI CRM Upsell" },
    { icon: Coffee, title: "Offline-First PWA & QRIS", desc: "Tetap berjalan lancar saat internet terputus dengan IndexedDB queue dan pembayaran QRIS instan" },
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
    const { user } = useAuthStore();
    const [currentTea, setCurrentTea] = useState(0);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const interval = setInterval(() => {
            setCurrentTea(v => (v + 1) % FEATURED_TEAS.length);
        }, 3500);
        return () => clearInterval(interval);
    }, []);

    if (!mounted) return null;

    return (
        <div className="min-h-screen bg-[#07221B] text-white overflow-x-hidden">

            {/* ── NAVBAR ─────────────────────────────────── */}
            <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 glass">
                <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => router.push('/')}>
                    <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center transition-transform active:scale-90">
                        <Leaf size={16} className="text-[#07221B]" />
                    </div>
                    <span className="font-bold text-amber-400 tracking-widest text-sm uppercase font-sans select-none">Teh Raja</span>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                    {user && (
                        <span className="text-white/60 text-xs hidden md:block">
                            Halo, {user.name} ({user.role}) 👋
                        </span>
                    )}
                    <Link
                        href="/pos"
                        className="hidden sm:flex items-center gap-1.5 text-xs font-bold bg-white/10 text-white px-3.5 py-2 rounded-full hover:bg-white/20 transition border border-white/10"
                    >
                        <ShoppingCart size={13} /> Kasir POS
                    </Link>
                    <Link
                        href="/kds"
                        className="hidden md:flex items-center gap-1.5 text-xs font-bold bg-white/10 text-white px-3.5 py-2 rounded-full hover:bg-white/20 transition border border-white/10"
                    >
                        <ChefHat size={13} /> Dapur KDS
                    </Link>
                    <Link
                        href="/admin"
                        className="flex items-center gap-1.5 text-xs font-bold bg-white/10 text-amber-300 px-3.5 py-2 rounded-full hover:bg-white/20 transition border border-amber-400/30"
                    >
                        <LayoutDashboard size={13} /> Admin
                    </Link>
                    <button
                        onClick={() => router.push('/menu')}
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
                        <Star size={12} className="fill-current" />
                        Smart Web POS &amp; AI ERP Ecosystem
                    </div>

                    <h1 className="text-5xl sm:text-6xl md:text-7xl font-serif font-bold leading-tight mb-6">
                        <span className="text-gradient-gold">Teh Raja</span>
                        <br />
                        <span className="text-white/80 text-3xl sm:text-4xl md:text-5xl">Authentic Tea &amp; Blends</span>
                    </h1>

                    <p className="text-white/60 text-base sm:text-lg leading-relaxed mb-10 max-w-xl mx-auto">
                        Sistem Point of Sale (POS) terintegrasi dari hulu ke hilir: Self-Order Pelanggan, Kasir Cerdas AI, Kitchen Display System (KDS), Manajemen BOM Inventori, hingga AI Demand Forecasting.
                    </p>

                    <div className="flex flex-wrap gap-3 justify-center">
                        <motion.button
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => router.push('/menu')}
                            className="flex items-center justify-center gap-2 bg-amber-400 text-[#07221B] font-black text-base px-8 py-4 rounded-2xl shadow-2xl shadow-amber-400/30 hover:bg-amber-300 transition"
                        >
                            <Coffee size={20} />
                            Pesan Sekarang (Pelanggan)
                            <ChevronRight size={18} />
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => router.push('/pos')}
                            className="flex items-center justify-center gap-2 bg-white/10 text-white border border-white/20 font-bold text-base px-6 py-4 rounded-2xl hover:bg-white/15 transition"
                        >
                            <ShoppingCart size={18} className="text-amber-400" />
                            Buka Kasir POS
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
                                <div className={`absolute inset-0 bg-gradient-to-t ${FEATURED_TEAS[currentTea].color} opacity-60`} />
                                <div className="absolute bottom-0 left-0 right-0 p-5">
                                    <span className="bg-amber-400 text-[#07221B] text-[10px] font-black px-2 py-0.5 rounded-full mb-2 inline-block">
                                        {FEATURED_TEAS[currentTea].badge}
                                    </span>
                                    <h3 className="text-xl font-serif font-bold text-white">{FEATURED_TEAS[currentTea].name}</h3>
                                    <p className="text-white/70 text-xs mt-1">{FEATURED_TEAS[currentTea].desc}</p>
                                    <p className="text-amber-400 font-black text-lg mt-2">{FEATURED_TEAS[currentTea].price}</p>
                                </div>
                            </motion.div>
                        </AnimatePresence>

                        {/* Dots */}
                        <div className="absolute top-4 right-4 flex gap-1.5">
                            {FEATURED_TEAS.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setCurrentTea(i)}
                                    className={`w-1.5 h-1.5 rounded-full transition-all ${i === currentTea ? 'bg-amber-400 w-4' : 'bg-white/40'}`}
                                />
                            ))}
                        </div>
                    </div>
                </motion.div>
            </section>

            {/* ── PORTAL MODUL TERINTEGRASI ─────────────── */}
            <section className="px-6 py-16 bg-black/30 border-y border-white/10">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-10">
                        <span className="text-xs font-bold uppercase tracking-widest text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20">
                            Ekosistem Terhubung Real-Time
                        </span>
                        <h2 className="text-3xl font-serif font-bold text-white mt-3">Portal Akses Cepat Sistem</h2>
                        <p className="text-white/50 text-sm mt-1">
                            Semua modul saling terhubung secara instan melalui Firebase Realtime Database &amp; Offline-First IndexedDB
                        </p>
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
                                            <ChevronRight size={16} className="opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition" />
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
                                <p className="text-xs font-bold text-white">Akun Demo Akses Staf &amp; Admin</p>
                                <p className="text-[11px] text-white/60">
                                    Admin: <code className="text-amber-300">admin</code> / <code className="text-amber-300">123</code> &nbsp;·&nbsp;
                                    Kasir: <code className="text-amber-300">kasir</code> / <code className="text-amber-300">123</code> &nbsp;·&nbsp;
                                    Member Demo: <code className="text-amber-300">081234567890</code>
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

            {/* ── FEATURES SECTION ──────────────────────── */}
            <section className="px-6 py-16 bg-black/20">
                <div className="max-w-4xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-12"
                    >
                        <h2 className="text-3xl font-serif font-bold text-amber-400 mb-3">Keunggulan Arsitektur Teh Raja</h2>
                        <p className="text-white/50 text-sm">Sistem POS modern yang dirancang khusus untuk operasional UMKM teh &amp; minuman</p>
                    </motion.div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        {FEATURES.map(({ icon: Icon, title, desc }, i) => (
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
                    <div className="w-14 h-14 mx-auto bg-amber-400 rounded-2xl flex items-center justify-center mb-5">
                        <Leaf size={28} className="text-[#07221B]" />
                    </div>
                    <h2 className="text-2xl font-serif font-bold text-white mb-3">Mulai Pengalaman Teh Raja</h2>
                    <p className="text-white/50 text-sm mb-8">Pesan minuman teh otentik dengan resep signature kami atau kelola toko melalui dashboard terpadu.</p>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={() => router.push('/menu')}
                            className="flex-1 py-4 bg-amber-400 text-[#07221B] font-black rounded-xl hover:bg-amber-300 transition hover:scale-[1.02] active:scale-[0.98] shadow-lg"
                        >
                            Katalog Pelanggan
                        </button>
                        <button
                            onClick={() => router.push('/admin')}
                            className="flex-1 py-4 bg-white/10 text-white border border-white/20 font-bold rounded-xl hover:bg-white/20 transition"
                        >
                            Dashboard Admin
                        </button>
                    </div>
                </motion.div>
            </section>

            {/* ── FOOTER ────────────────────────────────── */}
            <footer className="px-6 py-6 border-t border-white/10 text-center text-white/40 text-xs">
                <p>TEH RAJA &copy; 2026 · M. YARZUQ WILDANI [0402231058] · Project Praktik Kerja Lapangan (PKL)</p>
                <p className="mt-1">Smart Web POS &amp; AI Forecasting v3.0 · Next.js + Firebase Realtime DB + Gemini AI</p>
            </footer>
        </div>
    );
}
