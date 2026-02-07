"use client";

import { useState, useEffect } from "react";
import { useCartStore } from "@/lib/store";
import { ShoppingBag, Menu as MenuIcon, X } from "lucide-react";
import CartDrawer from "./CartDrawer";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const cartCount = useCartStore((state) => state.items.length);

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

                    <div className="flex items-center gap-6">
                        {/* Desktop Menu */}
                        <div className="hidden md:flex items-center gap-6">
                            <Link href="#menu" className="hover:text-gold transition">Menu Kami</Link>
                            <Link href="#recommendation" className="hover:text-gold transition">Cari Teh</Link>
                        </div>

                        {/* Cart Button */}
                        <button
                            onClick={() => setIsCartOpen(true)}
                            className="relative p-2 hover:bg-white/10 rounded-full transition"
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
                                <Link
                                    href="#menu"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="text-lg py-2 border-b border-white/5 hover:text-gold"
                                >
                                    Menu Kami
                                </Link>
                                <Link
                                    href="#recommendation"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="text-lg py-2 border-b border-white/5 hover:text-gold"
                                >
                                    Cari Teh Favorit
                                </Link>
                                <Link
                                    href="/admin"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="text-sm py-2 opacity-50 hover:opacity-100"
                                >
                                    Login Admin
                                </Link>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </nav>
            <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
        </>
    );
}
