"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useCartStore, useSalesStore, useProductStore, Order, formatVariantLabel } from "@/lib/store";
import { X, Minus, Plus, Trash2, MessageCircle, Edit3, UtensilsCrossed, ShoppingBag } from "lucide-react";
import { useState } from "react";
import ReceiptModal from "./ReceiptModal";
import { nanoid } from "nanoid";
import NextImage from "next/image";
import { useToast } from "./Toast";

interface CartDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

type OrderType = 'dine-in' | 'take-away';

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
    const { items, removeFromCart, updateQuantity, updateNote, total, clearCart, setActiveOrder } = useCartStore();
    const { addOrder, addLog } = useSalesStore();
    const { products, decrementStock } = useProductStore();
    const toast = useToast();

    const [name, setName] = useState("");
    const [table, setTable] = useState("");
    const [orderType, setOrderType] = useState<OrderType>('dine-in');
    const [showReceipt, setShowReceipt] = useState(false);
    const [lastOrder, setLastOrder] = useState<Order | null>(null);

    const checkStock = () => {
        return items.filter(cartItem => {
            const product = products.find(p => p.id === cartItem.id);
            return !product || product.stock < cartItem.quantity;
        });
    };

    const handleCheckout = () => {
        if (!name.trim()) {
            toast.error("Mohon isi nama Anda dulu!");
            return;
        }
        const outOfStock = checkStock();
        if (outOfStock.length > 0) {
            toast.error(`Stok tidak cukup: ${outOfStock.map(i => i.name).join(", ")}`);
            return;
        }

        const newOrder: Order = {
            id: nanoid(),
            date: new Date().toISOString(),
            items: items.map(item => ({ ...item })),
            total: total(),
            customerName: name.trim(),
            cashierName: "Web Store",
            status: 'pending',
            orderType,
            tableNumber: table.trim() || undefined,
        };

        addOrder(newOrder);
        addLog("SALE", `Order ${newOrder.id.slice(0, 6)} by ${name}`, "Customer (Web)");
        decrementStock(items);
        setLastOrder(newOrder);
        setShowReceipt(true);
        setActiveOrder(newOrder.id);
        clearCart();
        toast.success(`Pesanan dikirim! 🍵 Menunggu konfirmasi kasir.`);
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
                        {/* Header */}
                        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-forest-light/50">
                            <div>
                                <h2 className="text-xl font-serif text-gold">Tray Pesanan</h2>
                                {items.length > 0 && (
                                    <p className="text-xs text-white/40 mt-0.5">{items.length} item · Rp {total().toLocaleString('id-ID')}</p>
                                )}
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
                                <X />
                            </button>
                        </div>

                        {/* Cart Items */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {items.length === 0 ? (
                                <div className="text-center opacity-40 mt-24 space-y-2">
                                    <ShoppingBag size={40} className="mx-auto" />
                                    <p className="font-serif">Tray Anda kosong.</p>
                                    <p className="text-sm">Silakan pilih minuman favorit Anda.</p>
                                </div>
                            ) : (
                                items.map((item) => {
                                    const productLive = products.find(p => p.id === item.id);
                                    const isAvailable = productLive ? (productLive.stock > 0 && productLive.isAvailable) : false;
                                    const currentStock = productLive?.stock || 0;
                                    const itemKey = item.cartItemId ?? item.id;
                                    const variantLabel = formatVariantLabel(item.variants);
                                    const unitPrice = item.finalPrice ?? item.price;

                                    return (
                                        <div key={itemKey} className={`bg-white/5 p-4 rounded-xl border ${!isAvailable ? 'border-red-500/50 bg-red-900/10' : 'border-white/5'}`}>
                                            <div className="flex gap-3 items-start">
                                                <div className="w-14 h-14 rounded-lg overflow-hidden relative bg-white/10 flex-shrink-0">
                                                    <NextImage src={item.image} alt={item.name} fill className="object-cover" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-bold text-gold-light text-sm truncate">{item.name}</h4>

                                                    {/* Variant label */}
                                                    {variantLabel && (
                                                        <p className="text-[10px] text-amber-400/80 font-medium mt-0.5">{variantLabel}</p>
                                                    )}

                                                    {!isAvailable ? (
                                                        <p className="text-xs text-red-400 font-bold uppercase tracking-wider mt-1">Stok Habis</p>
                                                    ) : (
                                                        <p className="text-xs text-white/50 mt-0.5">Rp {unitPrice.toLocaleString('id-ID')} / pcs</p>
                                                    )}

                                                    {/* Qty controls */}
                                                    <div className="flex items-center gap-3 mt-2">
                                                        <button
                                                            onClick={() => updateQuantity(itemKey, item.quantity - 1)}
                                                            className="p-1 bg-white/10 rounded hover:bg-white/20 transition"
                                                        >
                                                            <Minus size={12} />
                                                        </button>
                                                        <span className="text-sm font-bold w-5 text-center">{item.quantity}</span>
                                                        <button
                                                            onClick={() => {
                                                                const totalQty = items.filter(i => i.id === item.id).reduce((s, i) => s + i.quantity, 0);
                                                                if (totalQty < currentStock) {
                                                                    updateQuantity(itemKey, item.quantity + 1);
                                                                } else {
                                                                    toast.warning("Stok maksimal tercapai");
                                                                }
                                                            }}
                                                            disabled={items.filter(i => i.id === item.id).reduce((s, i) => s + i.quantity, 0) >= currentStock}
                                                            className="p-1 bg-white/10 rounded hover:bg-white/20 transition disabled:opacity-30"
                                                        >
                                                            <Plus size={12} />
                                                        </button>
                                                        <span className="ml-auto text-sm font-bold text-gold-light">
                                                            Rp {(unitPrice * item.quantity).toLocaleString('id-ID')}
                                                        </span>
                                                    </div>
                                                </div>

                                                <button onClick={() => removeFromCart(itemKey)} className="text-red-400 hover:text-red-300 transition flex-shrink-0 mt-0.5">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>

                                            {/* Note input */}
                                            <div className="flex items-center gap-2 bg-black/20 p-2 rounded-lg border border-white/5 focus-within:border-gold/50 transition mt-3">
                                                <Edit3 size={12} className="opacity-50 flex-shrink-0" />
                                                <input
                                                    type="text"
                                                    placeholder="Catatan khusus (opsional)"
                                                    className="bg-transparent text-xs w-full focus:outline-none placeholder:text-white/20"
                                                    value={item.note || ""}
                                                    onChange={(e) => updateNote(itemKey, e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Footer / Checkout */}
                        {items.length > 0 && (
                            <div className="p-4 bg-forest-light border-t border-gold/20 space-y-3">
                                {/* Total */}
                                <div className="flex justify-between text-lg font-serif text-gold">
                                    <span>Total</span>
                                    <span>Rp {total().toLocaleString('id-ID')}</span>
                                </div>

                                {/* Customer Name + Table */}
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Nama Pemesan (Wajib)"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="flex-1 p-3 bg-black/20 border border-white/10 rounded-lg focus:outline-none focus:border-gold text-white text-sm placeholder:text-white/30"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Meja"
                                        value={table}
                                        onChange={(e) => setTable(e.target.value)}
                                        className="w-20 p-3 bg-black/20 border border-white/10 rounded-lg focus:outline-none focus:border-gold text-white text-sm placeholder:text-white/30 text-center"
                                    />
                                </div>

                                {/* Order Type */}
                                <div className="flex gap-2">
                                    {(['dine-in', 'take-away'] as const).map(type => (
                                        <button
                                            key={type}
                                            onClick={() => setOrderType(type)}
                                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition border ${orderType === type
                                                ? 'bg-gold text-forest border-gold'
                                                : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'
                                                }`}
                                        >
                                            {type === 'dine-in'
                                                ? <><UtensilsCrossed size={13} /> Makan di Sini</>
                                                : <><ShoppingBag size={13} /> Bawa Pulang</>
                                            }
                                        </button>
                                    ))}
                                </div>

                                {/* Checkout button */}
                                <button
                                    onClick={handleCheckout}
                                    disabled={items.length === 0}
                                    className="w-full py-4 bg-gold text-forest font-bold rounded-xl hover:bg-gold-light transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                >
                                    <MessageCircle size={18} />
                                    Kirim Pesanan
                                </button>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
