"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useCartStore } from "@/lib/store";
import { X, Minus, Plus, Trash2, MessageCircle } from "lucide-react";
import { useState } from "react";

interface CartDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
    const { items, removeFromCart, updateQuantity, total } = useCartStore();
    const [name, setName] = useState("");
    const [table, setTable] = useState("");

    const handleCheckout = () => {
        if (!name) {
            alert("Please enter your name");
            return;
        }

        let message = `*NEW ORDER - TEH RAJA*\n`;
        message += `Name: ${name}\n`;
        message += `Table: ${table || 'Takeaway'}\n`;
        message += `----------------\n`;
        items.forEach(item => {
            message += `${item.quantity}x ${item.name} (${item.quantity * item.price})\n`;
        });
        message += `----------------\n`;
        message += `Total: Rp ${total().toLocaleString('id-ID')}\n`;
        message += `Please process my order. Thank you!`;

        const url = `https://wa.me/6285166500741?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.5 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/80 z-40 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 h-full w-full max-w-md bg-forest z-50 border-l border-gold/20 shadow-2xl flex flex-col"
                    >
                        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-forest-light/50">
                            <h2 className="text-2xl font-serif text-gold">Your Tray</h2>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
                                <X />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {items.length === 0 ? (
                                <div className="text-center opacity-40 mt-20">
                                    <p>Your tray is empty.</p>
                                    <p className="text-sm">Go find some royal refreshments.</p>
                                </div>
                            ) : (
                                items.map((item) => (
                                    <div key={item.id} className="flex gap-4 items-center bg-white/5 p-4 rounded-xl">
                                        <img src={item.image} alt={item.name} className="w-16 h-16 rounded-lg object-cover bg-white/10" />
                                        <div className="flex-1">
                                            <h4 className="font-serif font-bold text-gold-light">{item.name}</h4>
                                            <p className="text-sm opacity-60">Rp {item.price.toLocaleString('id-ID')}</p>

                                            <div className="flex items-center gap-3 mt-2">
                                                <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-1 bg-white/10 rounded hover:bg-white/20"><Minus size={14} /></button>
                                                <span className="text-sm w-4 text-center">{item.quantity}</span>
                                                <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-1 bg-white/10 rounded hover:bg-white/20"><Plus size={14} /></button>
                                            </div>
                                        </div>
                                        <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-300">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="p-6 bg-forest-light border-t border-gold/20 space-y-4">
                            <div className="flex justify-between text-xl font-serif text-gold">
                                <span>Total</span>
                                <span>Rp {total().toLocaleString('id-ID')}</span>
                            </div>

                            <div className="space-y-2">
                                <input
                                    type="text"
                                    placeholder="Your Name (Required)"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full p-3 bg-black/20 border border-white/10 rounded-lg focus:outline-none focus:border-gold"
                                />
                                <input
                                    type="text"
                                    placeholder="Table Number (Optional)"
                                    value={table}
                                    onChange={(e) => setTable(e.target.value)}
                                    className="w-full p-3 bg-black/20 border border-white/10 rounded-lg focus:outline-none focus:border-gold"
                                />
                            </div>

                            <button
                                onClick={handleCheckout}
                                disabled={items.length === 0}
                                className="w-full py-4 bg-gold text-forest font-bold rounded-xl hover:bg-gold-light transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <MessageCircle size={20} />
                                Checkout via WhatsApp
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
