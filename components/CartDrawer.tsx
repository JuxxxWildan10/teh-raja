"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useCartStore, useSalesStore, useProductStore } from "@/lib/store";
import { X, Minus, Plus, Trash2, MessageCircle, Edit3 } from "lucide-react";
import { useState } from "react";
import ReceiptModal from "./ReceiptModal";
import { nanoid } from "nanoid";

interface CartDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
    const { items, removeFromCart, updateQuantity, total, clearCart } = useCartStore();
    const { addOrder, addLog } = useSalesStore();
    const { products, decrementStock } = useProductStore();

    const [name, setName] = useState("");
    const [table, setTable] = useState("");
    const [notes, setNotes] = useState<Record<string, string>>({});
    const [showReceipt, setShowReceipt] = useState(false);
    const [lastOrder, setLastOrder] = useState<any>(null);

    const checkStock = () => {
        const outOfStockItems = items.filter(cartItem => {
            const product = products.find(p => p.id === cartItem.id);
            return !product || product.stock < cartItem.quantity;
        });
        return outOfStockItems;
    };

    const handleCheckout = () => {
        if (!name) {
            alert("Mohon isi nama Anda");
            return;
        }

        const outOfStock = checkStock();
        if (outOfStock.length > 0) {
            alert(`Maaf, stok tidak cukup untuk: ${outOfStock.map(i => i.name).join(", ")}`);
            return;
        }

        const itemsWithNotes = items.map(item => ({
            ...item,
            note: notes[item.id] || ""
        }));

        const newOrder = {
            id: nanoid(),
            date: new Date().toISOString(),
            items: itemsWithNotes,
            total: total(),
            customerName: name,
            cashierName: "Web Store"
        };

        addOrder(newOrder);
        addLog("SALE", `Order ${newOrder.id.slice(0, 6)} by ${name}`, "Customer (Web)");
        decrementStock(itemsWithNotes);

        setLastOrder(newOrder);

        let message = `*PESANAN BARU - TEH RAJA*\n`;
        message += `Nama: ${name}\n`;
        message += `Meja: ${table || 'Takeaway/Bungkus'}\n`;
        message += `Order ID: ${newOrder.id.slice(0, 6)}\n`;
        message += `----------------\n`;
        itemsWithNotes.forEach(item => {
            message += `${item.quantity}x ${item.name} (${(item.quantity * item.price).toLocaleString('id-ID')})\n`;
            if (item.note) message += `   _catatan: ${item.note}_\n`;
        });
        message += `----------------\n`;
        message += `Total: Rp ${total().toLocaleString('id-ID')}\n`;
        message += `Mohon diproses pesanan saya. Terima kasih!`;

        const url = `https://wa.me/6285166500741?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');

        setShowReceipt(true);
        clearCart();
        setNotes({});
    };

    return (
        <AnimatePresence>
            {showReceipt && lastOrder && (
                <ReceiptModal
                    order={lastOrder}
                    onClose={() => {
                        setShowReceipt(false);
                        onClose();
                        setName("");
                        setTable("");
                    }}
                />
            )}

            {isOpen && !showReceipt && (
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
                            <h2 className="text-2xl font-serif text-gold">Tray Pesanan</h2>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
                                <X />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {items.length === 0 ? (
                                <div className="text-center opacity-40 mt-20">
                                    <p>Tray Anda kosong.</p>
                                    <p className="text-sm">Silakan pilih minuman kesukaan Anda.</p>
                                </div>
                            ) : (
                                items.map((item) => {
                                    const productLive = products.find(p => p.id === item.id);
                                    const isAvailable = productLive ? (productLive.stock > 0 && productLive.isAvailable) : false;
                                    const currentStock = productLive?.stock || 0;

                                    return (
                                        <div key={item.id} className={`bg-white/5 p-4 rounded-xl ${!isAvailable ? 'border border-red-500/50 bg-red-900/10' : ''}`}>
                                            <div className="flex gap-4 items-center mb-3">
                                                <img src={item.image} alt={item.name} className="w-16 h-16 rounded-lg object-cover bg-white/10" />
                                                <div className="flex-1">
                                                    <h4 className="font-serif font-bold text-gold-light">{item.name}</h4>

                                                    {!isAvailable ? (
                                                        <p className="text-xs text-red-400 font-bold uppercase tracking-wider">Stok Habis</p>
                                                    ) : (
                                                        <p className="text-sm opacity-60">Rp {item.price.toLocaleString('id-ID')}</p>
                                                    )}

                                                    <div className="flex items-center gap-3 mt-2">
                                                        <button
                                                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                            className="p-1 bg-white/10 rounded hover:bg-white/20"
                                                        >
                                                            <Minus size={14} />
                                                        </button>
                                                        <span className="text-sm w-4 text-center">{item.quantity}</span>
                                                        <button
                                                            onClick={() => {
                                                                if (item.quantity < currentStock) {
                                                                    updateQuantity(item.id, item.quantity + 1);
                                                                } else {
                                                                    alert("Stok maksimal tercapai");
                                                                }
                                                            }}
                                                            className={`p-1 bg-white/10 rounded hover:bg-white/20 ${item.quantity >= currentStock ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        >
                                                            <Plus size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                                <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-300">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-2 bg-black/20 p-2 rounded-lg border border-white/5 focus-within:border-gold/50 transition">
                                                <Edit3 size={14} className="opacity-50" />
                                                <input
                                                    type="text"
                                                    placeholder="Catatan (misal: Less Ice, Gula Sedikit)"
                                                    className="bg-transparent text-sm w-full focus:outline-none placeholder:text-white/20"
                                                    value={notes[item.id] || ""}
                                                    onChange={(e) => setNotes({ ...notes, [item.id]: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    );
                                })
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
                                    placeholder="Nama Pemesan (Wajib)"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full p-3 bg-black/20 border border-white/10 rounded-lg focus:outline-none focus:border-gold text-white placeholder:text-white/30"
                                />
                                <input
                                    type="text"
                                    placeholder="Nomor Meja (Opsional)"
                                    value={table}
                                    onChange={(e) => setTable(e.target.value)}
                                    className="w-full p-3 bg-black/20 border border-white/10 rounded-lg focus:outline-none focus:border-gold text-white placeholder:text-white/30"
                                />
                            </div>

                            <button
                                onClick={handleCheckout}
                                disabled={items.length === 0}
                                className="w-full py-4 bg-gold text-forest font-bold rounded-xl hover:bg-gold-light transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <MessageCircle size={20} />
                                Pesan via WhatsApp
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
