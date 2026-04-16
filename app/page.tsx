"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Leaf, Star, ChevronRight, ShoppingCart, LayoutDashboard, Sparkles, Clock, Award, Coffee } from "lucide-react";
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
    { icon: Sparkles, title: "Smart Recommendation", desc: "Temukan minuman sesuai selera dengan teknologi algoritma canggih" },
    { icon: Clock, title: "Order Cepat", desc: "Proses pesanan dengan cepat, struk langsung dicetak atau dikirim via WhatsApp" },
    { icon: Award, title: "Premium Quality", desc: "Bahan baku teh pilihan, disajikan dengan standar kualitas tertinggi" },
    { icon: Coffee, title: "50+ Varian Menu", desc: "Pilihan minuman teh, milk tea, fruit tea, hingga makanan pendamping" },
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
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center">
                        <Leaf size={16} className="text-[#07221B]" />
                    </div>
                    <span className="font-bold text-amber-400 tracking-widest text-sm uppercase font-sans">Teh Raja</span>
                </div>
                <div className="flex items-center gap-3">
                    {user && (
                        <span className="text-white/50 text-xs hidden sm:block">
                            Halo, {user.name} 👋
                        </span>
                    )}
                    <button
                        onClick={() => router.push('/admin')}
                        className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition px-3 py-1.5 rounded-lg hover:bg-white/10"
                    >
                        <LayoutDashboard size={13} /> Admin
                    </button>
                    <button
                        onClick={() => router.push('/pos')}
                        className="flex items-center gap-1.5 text-xs font-bold bg-amber-400 text-[#07221B] px-4 py-2 rounded-full hover:bg-amber-300 transition hover:scale-105 active:scale-95 shadow-lg shadow-amber-400/20"
                    >
                        <ShoppingCart size={13} /> Buka POS
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
                        Premium Tea Experience
                    </div>

                    <h1 className="text-5xl sm:text-6xl md:text-7xl font-serif font-bold leading-tight mb-6">
                        <span className="text-gradient-gold">Teh Raja</span>
                        <br />
                        <span className="text-white/80 text-3xl sm:text-4xl md:text-5xl">Authentic Tea &amp; Blends</span>
                    </h1>

                    <p className="text-white/60 text-base sm:text-lg leading-relaxed mb-10 max-w-xl mx-auto">
                        Nikmati pengalaman teh premium dengan sistem pemesanan cerdas berbasis AI.
                        Temukan minuman yang sesuai selera Anda dalam hitungan detik.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <motion.button
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => router.push('/pos')}
                            className="flex items-center justify-center gap-2 bg-amber-400 text-[#07221B] font-black text-base px-8 py-4 rounded-2xl shadow-2xl shadow-amber-400/30 hover:bg-amber-300 transition"
                        >
                            <ShoppingCart size={20} />
                            Buka POS Kasir
                            <ChevronRight size={18} />
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => router.push('/admin')}
                            className="flex items-center justify-center gap-2 bg-white/10 border border-white/20 text-white font-bold text-base px-8 py-4 rounded-2xl hover:bg-white/15 transition"
                        >
                            <LayoutDashboard size={18} />
                            Dashboard Admin
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

            {/* ── FEATURES SECTION ──────────────────────── */}
            <section className="px-6 py-16 bg-black/20">
                <div className="max-w-4xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-12"
                    >
                        <h2 className="text-3xl font-serif font-bold text-amber-400 mb-3">Kenapa Teh Raja?</h2>
                        <p className="text-white/50 text-sm">Sistem POS modern yang dirancang khusus untuk UMKM teh &amp; minuman</p>
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
                    <h2 className="text-2xl font-serif font-bold text-white mb-3">Mulai Jualan Sekarang</h2>
                    <p className="text-white/50 text-sm mb-8">Login sebagai kasir atau admin untuk mengakses sistem POS lengkap.</p>
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => router.push('/pos')}
                            className="w-full py-4 bg-amber-400 text-[#07221B] font-black rounded-xl hover:bg-amber-300 transition hover:scale-[1.02] active:scale-[0.98] shadow-lg"
                        >
                            Masuk sebagai Kasir → /pos
                        </button>
                        <button
                            onClick={() => router.push('/admin')}
                            className="w-full py-4 bg-white/10 border border-white/20 text-white font-bold rounded-xl hover:bg-white/15 transition"
                        >
                            Masuk sebagai Admin → /admin
                        </button>
                    </div>
                </motion.div>
            </section>

            {/* ── FOOTER ────────────────────────────────── */}
            <footer className="px-6 py-6 border-t border-white/10 text-center text-white/30 text-xs">
                <p>© 2024 Teh Raja · Authentic Tea &amp; Blends · Dibuat dengan ❤</p>
                <p className="mt-1">PWA v3.0.0 · Powered by Next.js + Firebase</p>
            </footer>
        </div>
    );
}
