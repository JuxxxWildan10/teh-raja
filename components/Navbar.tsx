"use client";

import { useState, useEffect } from "react";
import { useCartStore, useSalesStore } from "@/lib/store";
import { ShoppingBag, Menu as MenuIcon, X, Clock, LayoutDashboard, ShoppingCart } from "lucide-react";
import CartDrawer from "./CartDrawer";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const cartCount = useCartStore((state) => state.items.reduce((s, i) => s + i.quantity, 0));
    const isCartOpen = useCartStore((state) => state.isCartDrawerOpen);
    const setCartOpen = useCartStore((state) => state.setCartDrawerOpen);
    const activeOrderId = useCartStore((state) => state.activeOrderId);
    const orders = useSalesStore((state) => state.orders);

    const activeOrder = activeOrderId ? orders.find(o => o.id === activeOrderId) : null;

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <>
            <nav
                className={`fixed top-0 left-0 right-0 z-30 transition-all duration-300 ${isScrolled ? "py-4 bg-forest/90 backdrop-blur-md border-b border-white/5" : "py-6 bg-transparent"}`}
            >
                <div className="container mx-auto px-6 flex justify-between items-center">
                    {/* Logo */}
                    <Link href="/" className="font-serif text-2xl font-bold tracking-widest text-gradient-gold">
                        TEH RAJA
                    </Link>

                    <div className="flex items-center gap-4 md:gap-6">
                        {/* Desktop Menu */}
                        <div className="hidden md:flex items-center gap-6 text-sm">
                            <a href="#menu" className="hover:text-gold transition">Menu Kami</a>
                            <a href="#recommendation" className="hover:text-gold transition">AI Sommelier</a>
                            <Link href="/pos" className="text-white/60 hover:text-gold transition flex items-center gap-1">
                                <ShoppingCart size={14} /> Kasir POS
                            </Link>
                            <Link href="/admin" className="text-white/60 hover:text-gold transition flex items-center gap-1">
                                <LayoutDashboard size={14} /> Admin
                            </Link>
                        </div>

                        {/* Active Order Indicator */}
                        {activeOrder && (
                            <button
                                onClick={() => {
                                    window.dispatchEvent(new CustomEvent('tehraja:open-order-overlay'));
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-400/20 border border-amber-400/50 text-amber-300 text-xs font-bold hover:bg-amber-400/30 transition animate-pulse"
                                title="Lihat Status Pesanan Aktif"
                            >
                                <Clock size={13} />
                                <span className="hidden sm:inline">Pesanan</span> #{activeOrder.id.slice(0, 5).toUpperCase()}
                            </button>
                        )}

                        {/* Cart Button */}
                        <button
                            onClick={() => setCartOpen(true)}
                            className="relative p-2 hover:bg-white/10 rounded-full transition"
                            aria-label="Buka Keranjang"
                        >
                            <ShoppingBag className="text-gold" />
                            {cartCount > 0 && (
                                <motion.span
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs flex items-center justify-center rounded-full font-bold border-2 border-forest"
                                >
                                    {cartCount}
                                </motion.span>
                            )}
                        </button>

                        {/* Mobile Hamburger */}
                        <button
                            className="md:hidden p-2 text-gold hover:bg-white/10 rounded-full"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        >
                            {isMobileMenuOpen ? <X /> : <MenuIcon />}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu Dropdown */}
                <AnimatePresence>
                    {isMobileMenuOpen && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="md:hidden bg-forest/95 backdrop-blur-xl border-t border-white/10 overflow-hidden"
                        >
                            <div className="flex flex-col p-6 space-y-4 text-center">
                                <a
                                    href="#menu"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="text-lg py-2 border-b border-white/5 hover:text-gold"
                                >
                                    Menu Kami
                                </a>
                                <a
                                    href="#recommendation"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="text-lg py-2 border-b border-white/5 hover:text-gold"
                                >
                                    AI Tea Sommelier
                                </a>
                                <div className="flex gap-2 pt-2">
                                    <Link
                                        href="/pos"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className="flex-1 py-2.5 bg-white/10 rounded-xl text-xs font-bold text-gold hover:bg-white/15"
                                    >
                                        Kasir POS
                                    </Link>
                                    <Link
                                        href="/kds"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className="flex-1 py-2.5 bg-white/10 rounded-xl text-xs font-bold text-gold hover:bg-white/15"
                                    >
                                        Dapur KDS
                                    </Link>
                                    <Link
                                        href="/admin"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className="flex-1 py-2.5 bg-white/10 rounded-xl text-xs font-bold text-gold hover:bg-white/15"
                                    >
                                        Admin
                                    </Link>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </nav>
            <CartDrawer isOpen={isCartOpen} onClose={() => setCartOpen(false)} />
        </>
    );
}
