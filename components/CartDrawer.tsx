"use client";

/**
 * ============================================================================
 * FILE: components/CartDrawer.tsx
 * ============================================================================
 * FUNGSI UTAMA:
 * Laci keranjang belanja (*Slide-Over Cart Drawer*) untuk pemesanan mandiri pelanggan (`/menu`).
 *
 * ALUR KERJA SAAT PELANGGAN CHECKOUT (`handleCheckout`):
 * 1. Memvalidasi nama pelanggan, tipe pesanan (*Dine-In* / *Take-Away*), nomor meja, dan kecukupan stok BOM.
 * 2. Menyimpan objek pesanan baru (`addOrder`) ke IndexedDB & Firebase Realtime Database.
 * 3. Memotong stok produk (`decrementStock`) dan **memotong takaran bahan baku resep BOM otomatis (`decrementIngredientsForOrder`)**.
 * 4. Mengaktifkan `OrderStatusOverlay` (`setActiveOrder`) agar pelanggan bisa memilih bayar QRIS/Kasir dan melacak status racikan.
 * ============================================================================
 */

import { motion, AnimatePresence } from "framer-motion";
import {
    useAuthStore,
    useCartStore,
    useSalesStore,
    useProductStore,
    usePromoStore,
    useCustomerStore,
    useInventoryStore,
    Order,
    formatVariantLabel,
    POINTS_REDEEM_VALUE,
    getInsufficientBomIngredients,
} from "@/lib/store";
import { X, Minus, Plus, Trash2, MessageCircle, Edit3, UtensilsCrossed, ShoppingBag, Tag, Gift, Phone } from "lucide-react";
import { useState, useEffect } from "react";
import { nanoid } from "nanoid";
import NextImage from "next/image";
import { useToast } from "./Toast";

interface CartDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

type OrderType = 'dine-in' | 'take-away';

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
    const { isAdvancedUnlocked } = useAuthStore();
    const { items, removeFromCart, updateQuantity, updateNote, total, clearCart, setActiveOrder } = useCartStore();
    const { addOrder, addLog, branchId } = useSalesStore();
    const { products, decrementStock } = useProductStore();
    const { ingredients, decrementIngredientsForOrder } = useInventoryStore();
    const { getApplicablePromo } = usePromoStore();
    const { findByPhone, addCustomer, addPoints, redeemPoints, getPointsForOrder } = useCustomerStore();
    const toast = useToast();

    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [table, setTable] = useState("");
    const [orderType, setOrderType] = useState<OrderType>('dine-in');
    const [usePoints, setUsePoints] = useState(false);

    // Auto-detect No. Meja from URL (?table= atau ?meja=)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const tableParam = params.get('table') || params.get('meja');
            if (tableParam) {
                setTable(tableParam.trim());
                setOrderType('dine-in');
            }
        }
    }, [isOpen]);

    // Auto-fill member name if phone matches
    const member = phone.trim().length >= 8 ? findByPhone(phone.trim()) : undefined;
    useEffect(() => {
        if (member && !name.trim()) {
            setName(member.name);
        }
        if (!member) {
            setUsePoints(false);
        }
    }, [member, name]);

    const subtotal = total();
    // Promo Engine & Loyalty CRM hanya aktif jika Mode Pengembangan Lanjutan dibuka (isAdvancedUnlocked)
    const activePromoMatch = isAdvancedUnlocked ? getApplicablePromo(subtotal) : null;
    const promoDiscount = activePromoMatch ? activePromoMatch.discountAmount : 0;
    const afterPromo = Math.max(0, subtotal - promoDiscount);

    const maxMemberPointDiscount = (isAdvancedUnlocked && member) ? member.points * POINTS_REDEEM_VALUE : 0;
    const pointsDiscount = (isAdvancedUnlocked && usePoints && member) ? Math.min(maxMemberPointDiscount, afterPromo) : 0;
    const pointsRedeemed = Math.ceil(pointsDiscount / POINTS_REDEEM_VALUE);
    const totalDiscount = promoDiscount + pointsDiscount;
    const grandTotal = Math.max(0, subtotal - totalDiscount);
    const earnedPoints = isAdvancedUnlocked ? getPointsForOrder(grandTotal) : 0;

    const checkStock = () => {
        // Check direct product stock (aggregated across variants)
        const qtyByProd = new Map<string, number>();
        items.forEach(i => qtyByProd.set(i.id, (qtyByProd.get(i.id) || 0) + i.quantity));
        return items.filter(cartItem => {
            const product = products.find(p => p.id === cartItem.id);
            const needed = qtyByProd.get(cartItem.id) || cartItem.quantity;
            if (!product || !product.isAvailable || product.stock < needed) return true;
            return false;
        });
    };

    const handleCheckout = () => {
        if (!name.trim()) {
            toast.error("Mohon isi nama Anda dulu!");
            return;
        }
        const outOfStock = checkStock();
        if (outOfStock.length > 0) {
            toast.error(`Stok produk tidak cukup: ${Array.from(new Set(outOfStock.map(i => i.name))).join(", ")}`);
            return;
        }
        const bomShortages = getInsufficientBomIngredients(items, products, ingredients);
        if (bomShortages.length > 0) {
            toast.error(
                `Bahan baku habis/kurang: ${bomShortages.map(s => `${s.name} (sisa ${s.available} ${s.unit})`).join(", ")}`
            );
            return;
        }

        const cleanPhone = phone.trim();
        if (isAdvancedUnlocked && cleanPhone.length >= 8) {
            if (!member) {
                addCustomer({
                    id: nanoid(),
                    name: name.trim(),
                    phone: cleanPhone,
                    points: earnedPoints,
                    totalSpent: grandTotal,
                    createdAt: new Date().toISOString(),
                    lastVisit: new Date().toISOString(),
                });
            } else {
                if (usePoints && pointsRedeemed > 0) {
                    redeemPoints(cleanPhone, pointsRedeemed);
                }
                addPoints(cleanPhone, grandTotal);
            }
        }

        const newOrder: Order = {
            id: nanoid(),
            date: new Date().toISOString(),
            items: items.map(item => ({ ...item })),
            subtotal,
            discount: totalDiscount > 0 ? totalDiscount : undefined,
            discountType: 'amount',
            discountValue: totalDiscount > 0 ? totalDiscount : undefined,
            total: grandTotal,
            customerName: name.trim(),
            customerPhone: cleanPhone || undefined,
            cashierName: "Web Store",
            status: 'pending',
            paymentMethod: 'qris',
            orderType,
            tableNumber: orderType === 'dine-in' ? (table.trim() || undefined) : undefined,
            branchId: branchId || 'main',
        };

        addOrder(newOrder);
        addLog("SALE", `Web Order #${newOrder.id.slice(0, 6).toUpperCase()} oleh ${name.trim()} (Rp ${grandTotal.toLocaleString('id-ID')})`, "Customer (Web)");
        decrementStock(items);
        decrementIngredientsForOrder(items, products);
        setActiveOrder(newOrder.id);
        clearCart();
        setUsePoints(false);
        onClose();
        toast.success(`Pesanan dikirim! Silakan pilih metode pembayaran.`);
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
                        {/* Header */}
                        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-forest-light/50">
                            <div>
                                <h2 className="text-xl font-serif text-gold">Tray Pesanan</h2>
                                {items.length > 0 && (
                                    <p className="text-xs text-white/40 mt-0.5">{items.reduce((s, i) => s + i.quantity, 0)} item · Rp {grandTotal.toLocaleString('id-ID')}</p>
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

                                                    {variantLabel && (
                                                        <p className="text-[10px] text-amber-400/80 font-medium mt-0.5">{variantLabel}</p>
                                                    )}

                                                    {!isAvailable ? (
                                                        <p className="text-xs text-red-400 font-bold uppercase tracking-wider mt-1">Stok Habis</p>
                                                    ) : (
                                                        <p className="text-xs text-white/50 mt-0.5">Rp {unitPrice.toLocaleString('id-ID')} / pcs</p>
                                                    )}

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
                                {/* Promo & Loyalty Summary */}
                                <div className="space-y-1 text-xs">
                                    {activePromoMatch && (
                                        <div className="flex justify-between items-center text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg">
                                            <span className="flex items-center gap-1.5 font-bold">
                                                <Tag size={12} /> {activePromoMatch.promo.name}
                                            </span>
                                            <span className="font-bold">-Rp {promoDiscount.toLocaleString('id-ID')}</span>
                                        </div>
                                    )}
                                    {isAdvancedUnlocked && member && member.points > 0 && (
                                        <div className="flex justify-between items-center bg-amber-400/10 border border-amber-400/25 px-2.5 py-1.5 rounded-lg text-amber-300">
                                            <div className="flex items-center gap-1.5">
                                                <Gift size={12} />
                                                <span>Member <strong>{member.name}</strong> ({member.points} poin)</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setUsePoints(!usePoints)}
                                                className={`px-2 py-0.5 rounded font-bold text-[10px] transition ${usePoints ? 'bg-amber-400 text-forest' : 'bg-white/10 text-white hover:bg-white/20'}`}
                                            >
                                                {usePoints ? `Dipakai (-Rp ${pointsDiscount.toLocaleString('id-ID')})` : 'Tukar Poin'}
                                            </button>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-lg font-serif text-gold pt-1">
                                        <span>Total Bayar</span>
                                        <span>Rp {grandTotal.toLocaleString('id-ID')}</span>
                                    </div>
                                    {isAdvancedUnlocked && phone.trim().length >= 8 && earnedPoints > 0 && (
                                        <p className="text-[10px] text-amber-300/80 text-right">
                                            ✨ Dapat +{earnedPoints} Poin Member dari pesanan ini
                                        </p>
                                    )}
                                </div>

                                {/* Customer Name + Table */}
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Nama Pemesan (Wajib)"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="flex-1 p-2.5 bg-black/20 border border-white/10 rounded-lg focus:outline-none focus:border-gold text-white text-sm placeholder:text-white/30"
                                    />
                                    {orderType === 'dine-in' && (
                                        <input
                                            type="text"
                                            placeholder="Meja"
                                            value={table}
                                            onChange={(e) => setTable(e.target.value)}
                                            className="w-20 p-2.5 bg-black/20 border border-white/10 rounded-lg focus:outline-none focus:border-gold text-white text-sm placeholder:text-white/30 text-center"
                                        />
                                    )}
                                </div>

                                {/* Optional WhatsApp / Member Phone */}
                                <div className="flex items-center gap-2 bg-black/20 px-3 py-2 rounded-lg border border-white/10 focus-within:border-gold">
                                    <Phone size={13} className="text-white/40 flex-shrink-0" />
                                    <input
                                        type="tel"
                                        placeholder={isAdvancedUnlocked ? "No. WhatsApp / Member (Opsional - dapat poin)" : "No. WhatsApp (Opsional - untuk struk & lacak pesanan)"}
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        className="bg-transparent text-xs w-full focus:outline-none text-white placeholder:text-white/30"
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
                                    className="w-full py-3.5 bg-gold text-forest font-bold rounded-xl hover:bg-gold-light transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-lg"
                                >
                                    <MessageCircle size={18} />
                                    Kirim Pesanan Sekarang
                                </button>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
