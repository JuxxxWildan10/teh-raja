"use client";

import { useState, useEffect } from "react";
import { useCartStore, useSalesStore, useAuthStore } from "@/lib/store";
import {
    ShoppingBag,
    Menu as MenuIcon,
    X,
    Clock,
    Receipt,
    ShieldCheck,
    Home,
} from "lucide-react";
import CartDrawer from "./CartDrawer";
import SecretStaffModal, { useSecretLogoTap } from "./SecretStaffModal";
import CustomerOrderTrackerModal from "./CustomerOrderTrackerModal";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSecretModalOpen, setIsSecretModalOpen] = useState(false);
    const [isTrackerModalOpen, setIsTrackerModalOpen] = useState(false);

    const user = useAuthStore((state) => state.user);
    const cartCount = useCartStore((state) => state.items.reduce((s, i) => s + i.quantity, 0));
    const isCartOpen = useCartStore((state) => state.isCartDrawerOpen);
    const setCartOpen = useCartStore((state) => state.setCartDrawerOpen);
    const activeOrderId = useCartStore((state) => state.activeOrderId);
    const orders = useSalesStore((state) => state.orders);

    const activeOrder = activeOrderId ? orders.find((o) => o.id === activeOrderId) : null;

    const handleLogoTap = useSecretLogoTap(() => {
        setIsSecretModalOpen(true);
    });

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        const handleOpenSecret = () => setIsSecretModalOpen(true);
        const handleOpenTracker = () => setIsTrackerModalOpen(true);

        window.addEventListener("scroll", handleScroll);
        window.addEventListener("tehraja:open-secret-modal", handleOpenSecret);
        window.addEventListener("tehraja:open-tracker-modal", handleOpenTracker);
        return () => {
            window.removeEventListener("scroll", handleScroll);
            window.removeEventListener("tehraja:open-secret-modal", handleOpenSecret);
            window.removeEventListener("tehraja:open-tracker-modal", handleOpenTracker);
        };
    }, []);

    return (
        <>
            <nav
                className={`fixed top-0 left-0 right-0 z-30 transition-all duration-300 ${
                    isScrolled
                        ? "py-4 bg-forest/90 backdrop-blur-md border-b border-white/5"
                        : "py-6 bg-transparent"
                }`}
            >
                <div className="container mx-auto px-6 flex justify-between items-center">
                    {/* Logo: Tap 5x for Secret Admin Login & Portal */}
                    <button
                        type="button"
                        onClick={handleLogoTap}
                        className="font-serif text-2xl font-bold tracking-widest text-gradient-gold select-none cursor-pointer active:scale-95 transition-transform focus:outline-none"
                        title="TEH RAJA"
                    >
                        TEH RAJA
                    </button>

                    <div className="flex items-center gap-3 md:gap-5">
                        {/* Desktop Menu (Customer-only links) */}
                        <div className="hidden md:flex items-center gap-6 text-sm">
                            <Link href="/" className="hover:text-gold transition flex items-center gap-1.5">
                                <Home size={14} /> Beranda
                            </Link>
                            <a href="#menu" className="hover:text-gold transition">
                                Menu Kami
                            </a>
                            <a href="#recommendation" className="hover:text-gold transition">
                                AI Sommelier
                            </a>
                            <button
                                type="button"
                                onClick={() => setIsTrackerModalOpen(true)}
                                className="text-gold hover:text-gold-light font-bold transition flex items-center gap-1.5 bg-gold/10 border border-gold/30 px-3.5 py-1.5 rounded-full"
                            >
                                <Receipt size={14} /> Lacak Pesanan &amp; Struk
                            </button>
                            {user && (
                                <button
                                    type="button"
                                    onClick={() => setIsSecretModalOpen(true)}
                                    className="text-emerald-300 hover:text-emerald-200 font-bold transition flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/30 px-3.5 py-1.5 rounded-full"
                                >
                                    <ShieldCheck size={14} /> Portal Admin
                                </button>
                            )}
                        </div>

                        {/* Active Order Indicator */}
                        {activeOrder && (
                            <button
                                onClick={() => {
                                    window.dispatchEvent(new CustomEvent("tehraja:open-order-overlay"));
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-400/20 border border-amber-400/50 text-amber-300 text-xs font-bold hover:bg-amber-400/30 transition animate-pulse"
                                title="Lihat Status Pesanan Aktif"
                            >
                                <Clock size={13} />
                                <span className="hidden sm:inline">Pesanan</span> #{activeOrder.id.slice(0, 5).toUpperCase()}
                            </button>
                        )}

                        {/* Mobile Track Order quick button */}
                        <button
                            type="button"
                            onClick={() => setIsTrackerModalOpen(true)}
                            className="md:hidden flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-gold text-xs font-bold hover:bg-white/15 transition"
                            title="Lacak Pesanan & Struk"
                        >
                            <Receipt size={13} />
                            <span className="hidden xs:inline">Struk</span>
                        </button>

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

                {/* Mobile Menu Dropdown (Customer-only links) */}
                <AnimatePresence>
                    {isMobileMenuOpen && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="md:hidden bg-forest/95 backdrop-blur-xl border-t border-white/10 overflow-hidden"
                        >
                            <div className="flex flex-col p-6 space-y-3 text-center">
                                <Link
                                    href="/"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="text-base py-2 border-b border-white/5 hover:text-gold"
                                >
                                    Beranda
                                </Link>
                                <a
                                    href="#menu"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="text-base py-2 border-b border-white/5 hover:text-gold"
                                >
                                    Menu Kami
                                </a>
                                <a
                                    href="#recommendation"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="text-base py-2 border-b border-white/5 hover:text-gold"
                                >
                                    AI Tea Sommelier
                                </a>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsMobileMenuOpen(false);
                                        setIsTrackerModalOpen(true);
                                    }}
                                    className="w-full py-3 bg-gold/15 border border-gold/40 rounded-xl text-sm font-bold text-gold hover:bg-gold/25 flex items-center justify-center gap-2"
                                >
                                    <Receipt size={16} /> Lacak Pesanan &amp; Struk
                                </button>
                                {user && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsMobileMenuOpen(false);
                                            setIsSecretModalOpen(true);
                                        }}
                                        className="w-full py-3 bg-emerald-500/15 border border-emerald-500/40 rounded-xl text-sm font-bold text-emerald-300 hover:bg-emerald-500/25 flex items-center justify-center gap-2"
                                    >
                                        <ShieldCheck size={16} /> Buka Portal Admin ({user.name})
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </nav>

            <CartDrawer isOpen={isCartOpen} onClose={() => setCartOpen(false)} />
            <CustomerOrderTrackerModal
                isOpen={isTrackerModalOpen}
                onClose={() => setIsTrackerModalOpen(false)}
            />
            <SecretStaffModal
                isOpen={isSecretModalOpen}
                onClose={() => setIsSecretModalOpen(false)}
            />
        </>
    );
}
