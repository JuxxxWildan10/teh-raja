"use client";

import { useState, useEffect } from "react";
import { useCartStore } from "@/lib/store";
import { ShoppingBag, Menu as MenuIcon } from "lucide-react";
import CartDrawer from "./CartDrawer";
import Link from "next/link";
import { motion } from "framer-motion";

export default function Navbar() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isCartOpen, setIsCartOpen] = useState(false);
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
                    <Link href="/" className="font-serif text-2xl font-bold tracking-widest text-gradient-gold">
                        TEH RAJA
                    </Link>

                    <div className="flex items-center gap-6">
                        <Link href="#menu" className="hidden md:block hover:text-gold transition">Our Menu</Link>
                        <Link href="#recommendation" className="hidden md:block hover:text-gold transition">Find Match</Link>

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
                    </div>
                </div>
            </nav>
            <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
        </>
    );
}
