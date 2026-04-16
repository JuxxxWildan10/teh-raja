"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    useAuthStore, useCartStore, useProductStore, useSalesStore,
    Order, ExtendedProduct
} from "@/lib/store";
import { nanoid } from "nanoid";
import Image from "next/image";
import ReceiptModal from "@/components/ReceiptModal";
import ConfirmModal from "@/components/ConfirmModal";
import ShiftSummaryModal from "@/components/ShiftSummaryModal";
import { useToast } from "@/components/Toast";
import {
    LogOut, Search, Plus, Minus, Trash2, ShoppingCart,
    LayoutGrid, Coffee, Leaf, Citrus, Star,
    Banknote, QrCode, Building2, ChevronRight,
    RotateCcw, Users, Package, UtensilsCrossed, ShoppingBag, X, Cookie,
    Wand2, Sparkles, ChevronDown, Pause, Play, Trash, Tag, Percent,
} from "lucide-react";

// ── Category Tabs ────────────────────────────────────────────
const CATEGORIES = [
    { id: 'all', label: 'Semua', icon: LayoutGrid },
    { id: 'signature', label: 'Signature', icon: Star },
    { id: 'milk', label: 'Milk Base', icon: Coffee },
    { id: 'classic', label: 'Classic', icon: Leaf },
    { id: 'fruit', label: 'Fruit', icon: Citrus },
    { id: 'snack', label: 'Snack', icon: Cookie },
    { id: 'food', label: 'Makanan', icon: UtensilsCrossed },
] as const;

type PaymentMethod = 'cash' | 'qris' | 'transfer';
type OrderType = 'dine-in' | 'take-away';
type DiscountMode = 'none' | 'amount' | 'percent';

const PAYMENT_METHODS: { id: PaymentMethod; label: string; icon: React.ElementType }[] = [
    { id: 'cash', label: 'Tunai', icon: Banknote },
    { id: 'qris', label: 'QRIS', icon: QrCode },
    { id: 'transfer', label: 'Transfer', icon: Building2 },
];

// ── Helpers ───────────────────────────────────────────────────
function formatRp(n: number) {
    return 'Rp ' + n.toLocaleString('id-ID');
}

// ── Main Component ────────────────────────────────────────────
export default function POSPage() {
    const router = useRouter();
    const { user, logout } = useAuthStore();
    const { items, addToCart, removeFromCart, updateQuantity, clearCart, total } = useCartStore();
    const { products, decrementStock } = useProductStore();
    const { addOrder, addLog, isStoreOpen, openStore, closeStore, heldOrders, holdOrder, resumeOrder, deleteHeldOrder, orders } = useSalesStore();
    const toast = useToast();

    const [isClient, setIsClient] = useState(false);
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [customerName, setCustomerName] = useState('');
    const [tableNumber, setTableNumber] = useState('');
    const [orderType, setOrderType] = useState<OrderType>('dine-in');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
    const [cashReceived, setCashReceived] = useState('');
    const [showReceipt, setShowReceipt] = useState(false);
    const [lastOrder, setLastOrder] = useState<Order | null>(null);
    const [notes, setNotes] = useState<Record<string, string>>({});
    const [mobileCartOpen, setMobileCartOpen] = useState(false);

    // Discount
    const [discountMode, setDiscountMode] = useState<DiscountMode>('none');
    const [discountValue, setDiscountValue] = useState('');

    // Confirm Modals
    const [confirmClearCart, setConfirmClearCart] = useState(false);
    const [confirmLogout, setConfirmLogout] = useState(false);
    const [confirmCloseStore, setConfirmCloseStore] = useState(false);

    // Shift summary modal
    const [shiftSummary, setShiftSummary] = useState<import("@/lib/store").StoreSession | null>(null);

    // Hold Order panel
    const [showHeldOrders, setShowHeldOrders] = useState(false);

    // ── Flavor Finder (Euclidean Distance) ────────────────────
    const [showFlavorFinder, setShowFlavorFinder] = useState(false);
    const [flavorPref, setFlavorPref] = useState({ sweet: 5, creamy: 5, fruity: 5 });

    const flavorRecommendations = useMemo(() => {
        if (!showFlavorFinder) return new Set<string>();
        const scored = products
            .filter(p => p.stock > 0)
            .map(p => {
                const attr = p.attributes || { sweet: 0, creamy: 0, fruity: 0 };
                const dist = Math.sqrt(
                    Math.pow(attr.sweet - flavorPref.sweet, 2) +
                    Math.pow(attr.creamy - flavorPref.creamy, 2) +
                    Math.pow(attr.fruity - flavorPref.fruity, 2)
                );
                return { id: p.id, dist };
            })
            .sort((a, b) => a.dist - b.dist)
            .slice(0, 3);
        return new Set(scored.map(s => s.id));
    }, [showFlavorFinder, products, flavorPref]);

    useEffect(() => {
        setIsClient(true);
    }, []);

    // Auth guard
    useEffect(() => {
        if (isClient && !user) {
            router.push('/admin');
        }
    }, [isClient, user, router]);

    // Keyboard shortcuts
    const searchRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setMobileCartOpen(false);
                setShowReceipt(false);
                setShowHeldOrders(false);
            }
            // Ctrl+F → focus search
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                searchRef.current?.focus();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    // ── Filtered & Sorted Products ─────────────────────────────
    const filteredProducts = useMemo(() => {
        let list = products.filter(p => {
            const matchCat = activeCategory === 'all' || p.category === activeCategory;
            const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
            return matchCat && matchSearch;
        });
        // Sort: recommended first when flavor finder active
        if (showFlavorFinder && flavorRecommendations.size > 0) {
            list = [
                ...list.filter(p => flavorRecommendations.has(p.id)),
                ...list.filter(p => !flavorRecommendations.has(p.id)),
            ];
        }
        return list;
    }, [products, activeCategory, search, showFlavorFinder, flavorRecommendations]);

    // ── Cart Calculations ─────────────────────────────────────
    const subtotal = total();
    const discountAmount = useMemo(() => {
        const v = parseFloat(discountValue) || 0;
        if (discountMode === 'amount') return Math.min(v, subtotal);
        if (discountMode === 'percent') return Math.min(Math.round(subtotal * v / 100), subtotal);
        return 0;
    }, [discountMode, discountValue, subtotal]);
    const orderTotal = subtotal - discountAmount;
    const cashIn = parseFloat(cashReceived.replace(/\D/g, '')) || 0;
    const change = paymentMethod === 'cash' ? Math.max(0, cashIn - orderTotal) : 0;
    const isInsufficientCash = paymentMethod === 'cash' && cashIn < orderTotal && cashIn > 0;

    // ── Hold Order ────────────────────────────────────────────
    const handleHoldOrder = useCallback(() => {
        if (items.length === 0) {
            toast.warning('Keranjang kosong, tidak bisa di-hold.');
            return;
        }
        const heldOrder: Order = {
            id: nanoid(),
            date: new Date().toISOString(),
            items: items.map(it => ({ ...it, note: notes[it.id] || '' })),
            total: orderTotal,
            subtotal,
            discount: discountAmount,
            discountType: discountMode !== 'none' ? discountMode : undefined,
            discountValue: discountMode !== 'none' ? parseFloat(discountValue) : undefined,
            customerName: customerName || '(hold)',
            cashierName: user?.name || 'Kasir',
            status: 'pending',
            orderType,
            tableNumber: tableNumber || undefined,
        };
        holdOrder(heldOrder);
        clearCart();
        setNotes({});
        setCustomerName('');
        setTableNumber('');
        setCashReceived('');
        setDiscountMode('none');
        setDiscountValue('');
        toast.info(`Pesanan "${heldOrder.customerName}" di-hold. Total: ${formatRp(orderTotal)}`);
    }, [items, notes, orderTotal, subtotal, discountAmount, discountMode, discountValue,
        customerName, orderType, tableNumber, user, holdOrder, clearCart, toast]);

    const handleResumeOrder = useCallback((heldId: string) => {
        const held = resumeOrder(heldId);
        if (!held) return;
        // Restore items to cart
        held.items.forEach(it => {
            const product = products.find(p => p.id === it.id);
            if (product) {
                for (let i = 0; i < it.quantity; i++) addToCart(product);
            }
            if (it.note) setNotes(prev => ({ ...prev, [it.id]: it.note || '' }));
        });
        setCustomerName(held.customerName || '');
        setTableNumber(held.tableNumber || '');
        setOrderType((held.orderType as OrderType) || 'dine-in');
        if (held.discountType) {
            setDiscountMode(held.discountType);
            setDiscountValue(String(held.discountValue || ''));
        }
        setShowHeldOrders(false);
        toast.success(`Pesanan "${held.customerName}" dilanjutkan!`);
    }, [resumeOrder, products, addToCart, toast]);

    // ── Checkout ──────────────────────────────────────────────
    const handleCheckout = useCallback(() => {
        if (!isStoreOpen) {
            toast.error('Toko harus dibuka sebelum memproses pesanan!');
            return;
        }
        if (items.length === 0) return;
        if (!customerName.trim()) {
            toast.error('Mohon isi nama pelanggan terlebih dahulu.');
            return;
        }
        if (paymentMethod === 'cash' && cashIn < orderTotal) {
            toast.error(`Uang yang diterima kurang! Kurang ${formatRp(orderTotal - cashIn)}`);
            return;
        }

        const itemsWithNotes = items.map(it => ({ ...it, note: notes[it.id] || '' }));

        const newOrder: Order = {
            id: nanoid(),
            date: new Date().toISOString(),
            items: itemsWithNotes,
            subtotal,
            discount: discountAmount,
            discountType: discountMode !== 'none' ? discountMode : undefined,
            discountValue: discountMode !== 'none' ? parseFloat(discountValue) : undefined,
            total: orderTotal,
            customerName: customerName.trim(),
            cashierName: user?.name || 'Kasir',
            status: 'completed',
            paymentMethod,
            cashReceived: paymentMethod === 'cash' ? cashIn : undefined,
            changeAmount: paymentMethod === 'cash' ? change : undefined,
            tableNumber: tableNumber.trim() || undefined,
            orderType,
        };

        addOrder(newOrder);
        addLog('SALE', `Order #${newOrder.id.slice(0, 6)} - ${formatRp(orderTotal)} via ${paymentMethod}`, user?.name || 'Kasir');
        decrementStock(itemsWithNotes);

        setLastOrder(newOrder);
        setShowReceipt(true);
        clearCart();
        setNotes({});
        setCustomerName('');
        setTableNumber('');
        setCashReceived('');
        setDiscountMode('none');
        setDiscountValue('');
        setMobileCartOpen(false);
        toast.success(`Order #${newOrder.id.slice(0, 6)} berhasil! ${formatRp(orderTotal)}`);
    }, [isStoreOpen, items, customerName, paymentMethod, cashIn, orderTotal, notes,
        subtotal, discountAmount, discountMode, discountValue, change, tableNumber,
        orderType, user, addOrder, addLog, decrementStock, clearCart, toast]);

    const handleNewOrder = () => {
        setShowReceipt(false);
        setLastOrder(null);
    };

    const handleLogout = () => {
        addLog('LOGOUT', `${user?.name} logged out from POS`, user?.name || 'Kasir');
        logout();
        router.push('/admin');
    };

    const handleTutupToko = () => {
        const summary = closeStore();
        if (summary) {
            setShiftSummary(summary);
            addLog('STORE_CLOSE', `Store closed. Total: ${formatRp(summary.totalSales)}`, user?.name || 'Kasir');
            toast.success('Toko berhasil ditutup. Lihat ringkasan shift.');
        }
    };

    // Checkout button disabled check
    const checkoutDisabled = items.length === 0
        || !customerName.trim()
        || (paymentMethod === 'cash' && (cashIn < orderTotal || cashIn === 0));

    const checkoutDisabledReason = !customerName.trim()
        ? 'Isi nama pelanggan'
        : paymentMethod === 'cash' && cashIn === 0
            ? 'Masukkan nominal uang diterima'
            : paymentMethod === 'cash' && cashIn < orderTotal
                ? `Uang kurang ${formatRp(orderTotal - cashIn)}`
                : '';

    if (!isClient || !user) return null;

    return (
        <div className="h-screen bg-gray-100 flex flex-col overflow-hidden select-none">

            {/* ── TOP BAR ───────────────────────────────────── */}
            <header className="h-12 bg-[#0D2B20] text-white flex items-center justify-between px-4 shadow-xl z-20 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-amber-400 flex items-center justify-center">
                        <Leaf size={14} className="text-[#0D2B20]" />
                    </div>
                    <span className="font-bold text-amber-400 tracking-widest text-sm uppercase">Teh Raja</span>
                    <span className="hidden sm:block text-white/30 text-xs border-l border-white/20 pl-3 tracking-wider uppercase">Point of Sale</span>
                </div>
                <div className="flex items-center gap-2">
                    {/* Hold Orders indicator */}
                    {heldOrders.length > 0 && (
                        <button
                            onClick={() => setShowHeldOrders(true)}
                            className="relative flex items-center gap-1.5 text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-1 rounded-lg hover:bg-amber-500/30 transition"
                        >
                            <Pause size={12} />
                            <span className="hidden sm:inline">Hold</span>
                            <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-[#0D2B20] text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">{heldOrders.length}</span>
                        </button>
                    )}
                    <div className="hidden sm:flex items-center gap-2 text-xs text-white/60">
                        <div className={`w-2 h-2 rounded-full animate-pulse ${isStoreOpen ? 'bg-green-400' : 'bg-red-400'}`} />
                        <span>{user.name}</span>
                        <span className="opacity-40">•</span>
                        <span className="uppercase text-[10px] tracking-wider opacity-60">{user.role}</span>
                    </div>
                    {isStoreOpen ? (
                        <button
                            onClick={() => setConfirmCloseStore(true)}
                            className="text-[10px] sm:text-xs font-bold bg-amber-400 text-[#0D2B20] hover:bg-amber-300 transition px-2 py-1 rounded-md"
                        >
                            Tutup Toko
                        </button>
                    ) : null}
                    <a href="/admin" className="text-xs text-white/50 hover:text-white/80 transition hidden sm:block">Dashboard</a>
                    <button
                        onClick={() => setConfirmLogout(true)}
                        className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition px-2 py-1 rounded hover:bg-red-500/10"
                    >
                        <LogOut size={13} /> Keluar
                    </button>
                </div>
            </header>

            {/* ── MAIN AREA ─────────────────────────────────── */}
            <div className="flex flex-1 overflow-hidden relative">

                {/* ── STORE CLOSED OVERLAY ── */}
                {!isStoreOpen && (
                    <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center flex flex-col items-center">
                            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-4">
                                <Building2 size={32} />
                            </div>
                            <h2 className="text-2xl font-black text-[#0D2B20] mb-2">Toko Masih Tutup</h2>
                            <p className="text-sm text-gray-500 mb-6">
                                Anda harus memulai sesi toko terlebih dahulu untuk dapat menerima pesanan.
                            </p>
                            <button
                                onClick={() => {
                                    openStore(user.name);
                                    addLog('STORE_OPEN', 'Store opened for orders', user.name);
                                    toast.success('Toko berhasil dibuka! Selamat berjualan 🍵');
                                }}
                                className="w-full py-3 bg-[#0D2B20] text-amber-400 font-bold rounded-xl hover:bg-[#1a4433] hover:scale-105 active:scale-95 transition shadow-lg"
                            >
                                Buka Toko Sekarang
                            </button>
                        </div>
                    </div>
                )}

                {/* ════════════════════════════════════════════
                    LEFT PANEL — Katalog Produk
                ════════════════════════════════════════════ */}
                <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

                    {/* Search + Category Bar */}
                    <div className="bg-white border-b border-gray-200 px-4 py-2.5 flex flex-col gap-2 flex-shrink-0 shadow-sm">
                        {/* Search + Flavor Finder toggle */}
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    ref={searchRef}
                                    type="text"
                                    placeholder="Cari produk... (Ctrl+F)"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="w-full text-gray-900 pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#0D2B20] transition"
                                />
                            </div>
                            <button
                                onClick={() => setShowFlavorFinder(v => !v)}
                                title="Temukan Minuman Sesuai Selera"
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex-shrink-0 ${showFlavorFinder
                                    ? 'bg-[#0D2B20] text-amber-400 border-[#0D2B20] shadow-md'
                                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-[#0D2B20] hover:text-[#0D2B20]'
                                    }`}
                            >
                                <Wand2 size={13} />
                                <span className="hidden sm:inline">Pilih Rasa</span>
                                <ChevronDown size={11} className={`transition-transform ${showFlavorFinder ? 'rotate-180' : ''}`} />
                            </button>
                        </div>

                        {/* Flavor Finder Panel */}
                        <AnimatePresence>
                            {showFlavorFinder && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                >
                                    <div className="bg-gradient-to-br from-amber-50 to-green-50 border border-amber-200 rounded-xl p-3 space-y-2">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <Sparkles size={12} className="text-amber-600" />
                                            <span className="text-[11px] font-bold text-[#0D2B20]">Temukan Minuman Sesuai Selera Kamu</span>
                                            <span className="ml-auto text-[9px] text-gray-400 italic">Smart Matching</span>
                                        </div>
                                        {([
                                            { key: 'sweet', label: '🍯 Kemanisan', color: 'amber' },
                                            { key: 'creamy', label: '🥛 Creamy', color: 'blue' },
                                            { key: 'fruity', label: '🍊 Buah-buahan', color: 'orange' },
                                        ] as const).map(({ key, label, color }) => (
                                            <div key={key} className="flex items-center gap-2">
                                                <span className="text-[10px] w-28 flex-shrink-0 text-gray-700 font-medium">{label}</span>
                                                <input
                                                    type="range"
                                                    min={0} max={10} step={1}
                                                    value={flavorPref[key]}
                                                    onChange={e => setFlavorPref(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                                                    className="flex-1 h-1.5 accent-amber-500 cursor-pointer"
                                                />
                                                <span className={`text-[11px] font-black w-5 text-center ${color === 'amber' ? 'text-amber-600' : color === 'blue' ? 'text-blue-600' : 'text-orange-600'}`}>{flavorPref[key]}</span>
                                            </div>
                                        ))}
                                        <div className="pt-1 flex items-center gap-1.5">
                                            <Sparkles size={10} className="text-amber-500" />
                                            <span className="text-[10px] text-amber-700 font-semibold">
                                                {flavorRecommendations.size > 0
                                                    ? `${flavorRecommendations.size} minuman terbaik untukmu ditampilkan di atas ✨`
                                                    : 'Geser slider untuk menemukan minuman yang cocok!'
                                                }
                                            </span>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Category Tabs */}
                        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
                            {CATEGORIES.map(cat => {
                                const Icon = cat.icon;
                                const isActive = activeCategory === cat.id;
                                return (
                                    <button
                                        key={cat.id}
                                        onClick={() => setActiveCategory(cat.id)}
                                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${isActive
                                            ? 'bg-[#0D2B20] text-amber-400 shadow-md'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                    >
                                        <Icon size={11} />
                                        {cat.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Product Grid */}
                    <div className="flex-1 overflow-y-auto p-3">
                        {filteredProducts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full opacity-40 gap-2">
                                <Package size={40} />
                                <p className="text-sm">Produk tidak ditemukan</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
                                {filteredProducts.map(product => (
                                    <ProductCard
                                        key={product.id}
                                        product={product}
                                        cartQty={items.find(i => i.id === product.id)?.quantity || 0}
                                        isRecommended={flavorRecommendations.has(product.id)}
                                        onAdd={() => addToCart(product)}
                                        onRemove={() => {
                                            const existing = items.find(i => i.id === product.id);
                                            if (existing) updateQuantity(product.id, existing.quantity - 1);
                                        }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Bottom Quick Stats */}
                    <div className="bg-white border-t border-gray-200 px-4 py-1.5 flex items-center gap-4 text-xs text-gray-400 flex-shrink-0">
                        <span>{filteredProducts.length} produk</span>
                        <span>•</span>
                        <span className="text-green-600 font-medium">{products.filter(p => p.stock > 0).length} tersedia</span>
                        <span>•</span>
                        <span className="text-red-500">{products.filter(p => p.stock <= 0).length} habis</span>
                        <span className="ml-auto text-gray-300 hidden sm:block">ESC: tutup · Ctrl+F: cari</span>
                    </div>
                </div>

                {/* ════════════════════════════════════════════
                    RIGHT PANEL — Keranjang & Pembayaran
                ════════════════════════════════════════════ */}
                {/* Mobile Overlay */}
                <AnimatePresence>
                    {mobileCartOpen && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setMobileCartOpen(false)}
                            className="lg:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
                        />
                    )}
                </AnimatePresence>

                <div className={`fixed lg:relative right-0 top-0 h-full lg:h-auto w-80 sm:w-96 flex-shrink-0 bg-white border-l border-gray-200 flex flex-col shadow-2xl lg:shadow-xl z-40 transition-transform duration-300 lg:translate-x-0 ${mobileCartOpen ? 'translate-x-0' : 'translate-x-full'}`}>

                    {/* Cart Header */}
                    <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between flex-shrink-0">
                        <div className="flex items-center gap-2">
                            <button onClick={() => setMobileCartOpen(false)} className="lg:hidden p-1 bg-gray-200 rounded-full hover:bg-gray-300 text-gray-700">
                                <X size={14} />
                            </button>
                            <ShoppingCart size={16} className="text-[#0D2B20] hidden lg:block" />
                            <span className="font-bold text-gray-800 text-sm">Pesanan</span>
                            {items.length > 0 && (
                                <span className="bg-[#0D2B20] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{items.length}</span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Hold button */}
                            {items.length > 0 && (
                                <button
                                    onClick={handleHoldOrder}
                                    title="Tahan pesanan (Hold)"
                                    className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 transition border border-amber-200 bg-amber-50 px-2 py-0.5 rounded-lg"
                                >
                                    <Pause size={11} /> Hold
                                </button>
                            )}
                            {items.length > 0 && (
                                <button
                                    onClick={() => setConfirmClearCart(true)}
                                    className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition"
                                >
                                    <RotateCcw size={11} /> Kosongkan
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Cart Items (Scrollable) */}
                    <div className="flex-1 overflow-y-auto">
                        {items.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full opacity-30 gap-2 p-8 text-center">
                                <ShoppingCart size={36} />
                                <p className="text-sm font-medium">Tray kosong</p>
                                <p className="text-xs">Pilih produk dari menu</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {items.map(item => {
                                    const live = products.find(p => p.id === item.id);
                                    return (
                                        <div key={item.id} className="px-3 py-2.5">
                                            <div className="flex items-start gap-2">
                                                {/* Thumbnail */}
                                                <div className="w-9 h-9 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 relative">
                                                    {item.image
                                                        ? <Image src={item.image} alt={item.name} fill className="object-cover" />
                                                        : <div className="w-full h-full flex items-center justify-center text-gray-300 text-lg font-bold">{item.name[0]}</div>
                                                    }
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold text-gray-800 truncate">{item.name}</p>
                                                    <p className="text-[10px] text-amber-600 font-medium">{formatRp(item.price)}</p>
                                                    {/* Note input */}
                                                    <input
                                                        type="text"
                                                        placeholder="Catatan (opsional)"
                                                        value={notes[item.id] || ''}
                                                        onChange={e => setNotes({ ...notes, [item.id]: e.target.value })}
                                                        className="w-full text-gray-900 text-[10px] bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 mt-1 focus:outline-none focus:border-gray-400"
                                                    />
                                                </div>
                                                {/* Qty Controls */}
                                                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                                    <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-500 transition">
                                                        <Trash2 size={12} />
                                                    </button>
                                                    <div className="flex items-center gap-1 bg-gray-50 rounded-lg border border-gray-200 px-1">
                                                        <button
                                                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                            className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-red-500 transition"
                                                        >
                                                            <Minus size={10} />
                                                        </button>
                                                        <span className="text-xs font-bold text-gray-800 w-4 text-center">{item.quantity}</span>
                                                        <button
                                                            onClick={() => {
                                                                if (live && item.quantity < live.stock) updateQuantity(item.id, item.quantity + 1);
                                                            }}
                                                            disabled={!live || item.quantity >= live.stock}
                                                            className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-green-600 transition disabled:opacity-30"
                                                        >
                                                            <Plus size={10} />
                                                        </button>
                                                    </div>
                                                    <span className="text-[10px] font-bold text-gray-700">{formatRp(item.price * item.quantity)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* ── CHECKOUT PANEL ─────────────────────── */}
                    <div className="border-t border-gray-200 flex-shrink-0 bg-gray-50">

                        {/* Subtotal + Diskon + Total */}
                        <div className="px-4 pt-2.5 pb-1 space-y-1 border-b border-gray-200">
                            {discountAmount > 0 && (
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-500">Subtotal</span>
                                    <span className="text-gray-600">{formatRp(subtotal)}</span>
                                </div>
                            )}
                            {discountAmount > 0 && (
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-red-500 font-medium">Diskon{discountMode === 'percent' ? ` (${discountValue}%)` : ''}</span>
                                    <span className="text-red-500 font-bold">-{formatRp(discountAmount)}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-bold text-gray-700">Total</span>
                                <span className="text-lg font-black text-[#0D2B20]">{formatRp(orderTotal)}</span>
                            </div>
                        </div>

                        {/* Form */}
                        <div className="px-3 py-2.5 space-y-2">

                            {/* Customer + Table */}
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Users size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Nama Pelanggan *"
                                        value={customerName}
                                        onChange={e => setCustomerName(e.target.value)}
                                        className="w-full text-gray-900 pl-7 pr-2 py-1.5 text-xs border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-[#0D2B20] transition"
                                    />
                                </div>
                                <div className="relative w-20">
                                    <input
                                        type="text"
                                        placeholder="Meja"
                                        value={tableNumber}
                                        onChange={e => setTableNumber(e.target.value)}
                                        className="w-full text-gray-900 px-2 py-1.5 text-xs border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-[#0D2B20] transition text-center"
                                    />
                                </div>
                            </div>

                            {/* Order Type */}
                            <div className="flex gap-1.5">
                                <button
                                    onClick={() => setOrderType('dine-in')}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition border ${orderType === 'dine-in'
                                        ? 'bg-[#0D2B20] text-amber-400 border-[#0D2B20]'
                                        : 'bg-white text-gray-500 border-gray-300 hover:border-gray-400'
                                        }`}
                                >
                                    <UtensilsCrossed size={12} /> Dine In
                                </button>
                                <button
                                    onClick={() => setOrderType('take-away')}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition border ${orderType === 'take-away'
                                        ? 'bg-[#0D2B20] text-amber-400 border-[#0D2B20]'
                                        : 'bg-white text-gray-500 border-gray-300 hover:border-gray-400'
                                        }`}
                                >
                                    <ShoppingBag size={12} /> Take Away
                                </button>
                            </div>

                            {/* Diskon */}
                            <div className="flex gap-1.5">
                                <button
                                    onClick={() => { setDiscountMode('none'); setDiscountValue(''); }}
                                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition border ${discountMode === 'none'
                                        ? 'bg-gray-200 text-gray-700 border-gray-300'
                                        : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'}`}
                                >
                                    No Diskon
                                </button>
                                <button
                                    onClick={() => setDiscountMode('amount')}
                                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-bold transition border ${discountMode === 'amount'
                                        ? 'bg-red-600 text-white border-red-600'
                                        : 'bg-white text-gray-500 border-gray-200 hover:border-red-300 hover:text-red-500'}`}
                                >
                                    <Tag size={10} /> Nominal
                                </button>
                                <button
                                    onClick={() => setDiscountMode('percent')}
                                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-bold transition border ${discountMode === 'percent'
                                        ? 'bg-red-600 text-white border-red-600'
                                        : 'bg-white text-gray-500 border-gray-200 hover:border-red-300 hover:text-red-500'}`}
                                >
                                    <Percent size={10} /> Persen
                                </button>
                            </div>

                            {/* Discount Input */}
                            <AnimatePresence>
                                {discountMode !== 'none' && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-bold">
                                                {discountMode === 'percent' ? '%' : 'Rp'}
                                            </span>
                                            <input
                                                type="tel"
                                                placeholder={discountMode === 'percent' ? 'contoh: 10' : 'contoh: 5000'}
                                                value={discountValue}
                                                onChange={e => setDiscountValue(e.target.value.replace(/[^0-9]/g, ''))}
                                                className="w-full text-gray-900 pl-8 pr-3 py-1.5 text-xs border border-red-300 rounded-lg bg-red-50 focus:outline-none focus:border-red-500 transition font-mono"
                                            />
                                        </div>
                                        {discountAmount > 0 && (
                                            <p className="text-[10px] text-red-600 font-bold mt-0.5 text-right">
                                                Hemat {formatRp(discountAmount)}
                                            </p>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Payment Method */}
                            <div className="flex gap-1.5">
                                {PAYMENT_METHODS.map(pm => {
                                    const Icon = pm.icon;
                                    return (
                                        <button
                                            key={pm.id}
                                            onClick={() => setPaymentMethod(pm.id)}
                                            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 rounded-lg text-[10px] font-bold transition border ${paymentMethod === pm.id
                                                ? 'bg-amber-50 text-amber-700 border-amber-400 shadow-sm'
                                                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                                                }`}
                                        >
                                            <Icon size={14} />
                                            {pm.label}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* QRIS */}
                            <AnimatePresence>
                                {paymentMethod === 'qris' && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden space-y-3 pt-2 pb-1">
                                        <div className="bg-white p-3 rounded-xl border border-gray-200 flex flex-col items-center text-center gap-2">
                                            <p className="text-[11px] font-bold text-gray-800">Scan QRIS GoPay Merchant</p>
                                            <div className="w-40 h-40 bg-gray-50 rounded-lg p-2 border-2 border-dashed border-gray-300 flex items-center justify-center relative overflow-hidden">
                                                <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-0 p-2">
                                                    <QrCode size={24} className="text-gray-300 mb-1" />
                                                    <span className="text-[9px] text-gray-400 leading-tight">Upload <b className="text-gray-500">qris-gopay.jpg</b><br />ke <b className="text-amber-600">public/images/</b></span>
                                                </div>
                                                <Image src="/images/qris-gopay.jpg" alt="QRIS" fill className="object-contain relative z-10 bg-white" unoptimized />
                                            </div>
                                            <div className="text-[10px] text-amber-900 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg w-full flex flex-col">
                                                <span className="uppercase tracking-widest text-[9px] font-bold text-amber-950/80">Total Tagihan</span>
                                                <b className="text-base text-[#0D2B20] font-black">{formatRp(orderTotal)}</b>
                                            </div>
                                            <p className="text-[9px] text-[#0D2B20] leading-tight bg-gray-100 p-1.5 rounded text-left">
                                                💡 Minta pelanggan scan QR untuk membayar.<br /><br />
                                                ⚠ <b>PERHATIAN:</b> Pastikan saldo sudah masuk sebelum klik Proses!
                                            </p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Cash Input */}
                            <AnimatePresence>
                                {paymentMethod === 'cash' && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden space-y-1">
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-600 font-mono font-bold">Rp</span>
                                            <input
                                                type="tel"
                                                placeholder="Uang Diterima"
                                                value={cashReceived}
                                                onChange={e => setCashReceived(e.target.value.replace(/[^0-9]/g, ''))}
                                                className={`w-full text-gray-900 pl-9 pr-3 py-1.5 text-xs border rounded-lg bg-white focus:outline-none transition font-mono ${isInsufficientCash
                                                    ? 'border-red-400 bg-red-50 text-red-700 focus:border-red-500'
                                                    : 'border-gray-300 focus:border-[#0D2B20]'
                                                    }`}
                                            />
                                        </div>
                                        {cashIn >= orderTotal && cashIn > 0 && (
                                            <div className="flex justify-between items-center bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
                                                <span className="text-xs text-green-700 font-medium">Kembalian</span>
                                                <span className="text-sm font-black text-green-700">{formatRp(change)}</span>
                                            </div>
                                        )}
                                        {isInsufficientCash && (
                                            <p className="text-[10px] text-red-500 text-center">⚠ Uang kurang {formatRp(orderTotal - cashIn)}</p>
                                        )}
                                        {/* Nominal Cepat */}
                                        <div className="flex gap-1 flex-wrap">
                                            {[5000, 10000, 20000, 50000, 100000].filter(n => n >= orderTotal).slice(0, 4).map(n => (
                                                <button
                                                    key={n}
                                                    onClick={() => setCashReceived(String(n))}
                                                    className="text-gray-900 text-[10px] px-2 py-0.5 bg-gray-100 hover:bg-gray-200 rounded font-mono border border-gray-200 transition"
                                                >
                                                    {n >= 1000 ? `${n / 1000}rb` : n}
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Transfer */}
                            <AnimatePresence>
                                {paymentMethod === 'transfer' && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden space-y-3 pt-2 pb-1">
                                        <div className="bg-white p-3 rounded-xl border border-gray-200 flex flex-col items-center text-center gap-2">
                                            <p className="text-[11px] font-bold text-gray-800">Transfer Bank / VA</p>
                                            <Building2 size={32} className="text-gray-300 my-2" />
                                            <div className="text-amber-900 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg w-full flex flex-col">
                                                <span className="uppercase tracking-widest text-[9px] font-bold opacity-60">Total Tagihan</span>
                                                <b className="text-base text-[#0D2B20] font-black">{formatRp(orderTotal)}</b>
                                            </div>
                                            <p className="text-[9px] text-[#0D2B20] leading-tight bg-gray-100 p-1.5 rounded text-left">
                                                💡 Pastikan Bukti Transfer dana sudah masuk ke rekening sebelum klik Proses.
                                            </p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Checkout Button */}
                        <div className="px-3 pb-3">
                            <div className="relative group">
                                <button
                                    onClick={handleCheckout}
                                    disabled={checkoutDisabled}
                                    className="w-full py-3 bg-[#0D2B20] text-amber-400 font-black text-sm rounded-xl hover:bg-[#1a4433] transition flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-[#0D2B20]/20 hover:scale-[1.01] active:scale-[0.99]"
                                >
                                    <ChevronRight size={18} />
                                    Proses &amp; Cetak Struk
                                </button>
                                {/* Tooltip when disabled */}
                                {checkoutDisabled && checkoutDisabledReason && (
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-[10px] rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none z-50">
                                        ⚠ {checkoutDisabledReason}
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── MOBILE FAB ─────────────────────────────────────── */}
            <AnimatePresence>
                {!mobileCartOpen && items.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className="fixed lg:hidden bottom-6 w-full px-4 z-20"
                    >
                        <button
                            onClick={() => setMobileCartOpen(true)}
                            className="w-full bg-[#0D2B20] text-amber-400 py-3.5 rounded-2xl shadow-2xl flex items-center justify-between px-6 border border-amber-500/30"
                        >
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <ShoppingCart size={20} />
                                    <span className="absolute -top-2 -right-3 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                                        {items.length}
                                    </span>
                                </div>
                                <span className="font-bold text-sm ml-2">Lihat Tray ({items.length} item)</span>
                            </div>
                            <span className="font-black text-amber-400 text-sm">{formatRp(orderTotal)}</span>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── RECEIPT MODAL ─────────────────────────────── */}
            <AnimatePresence>
                {showReceipt && lastOrder && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                        <ReceiptModal order={lastOrder} onClose={handleNewOrder} />
                    </div>
                )}
            </AnimatePresence>

            {/* ── HELD ORDERS PANEL ─────────────────────────── */}
            <AnimatePresence>
                {showHeldOrders && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} onClick={() => setShowHeldOrders(false)} className="fixed inset-0 bg-black z-40" />
                        <motion.div
                            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed right-0 top-0 h-full w-80 bg-white z-50 shadow-2xl flex flex-col"
                        >
                            <div className="px-4 py-3 border-b border-gray-100 bg-amber-50 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Pause size={16} className="text-amber-600" />
                                    <span className="font-bold text-gray-800 text-sm">Pesanan Ditahan ({heldOrders.length})</span>
                                </div>
                                <button onClick={() => setShowHeldOrders(false)} className="p-1 hover:bg-gray-200 rounded-full">
                                    <X size={16} />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                                {heldOrders.length === 0 && (
                                    <div className="text-center text-gray-400 py-10 text-sm">Tidak ada pesanan yang ditahan.</div>
                                )}
                                {heldOrders.map(held => (
                                    <div key={held.id} className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                                        <div className="flex items-start justify-between mb-2">
                                            <div>
                                                <p className="font-bold text-gray-800 text-sm">{held.customerName}</p>
                                                <p className="text-[10px] text-gray-400">{new Date(held.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} · {held.items.length} item</p>
                                            </div>
                                            <p className="font-black text-[#0D2B20] text-sm">{formatRp(held.total)}</p>
                                        </div>
                                        <div className="text-xs text-gray-500 mb-2 space-y-0.5">
                                            {held.items.slice(0, 3).map((it, i) => (
                                                <div key={i}>{it.quantity}x {it.name}</div>
                                            ))}
                                            {held.items.length > 3 && <div className="text-gray-400">+{held.items.length - 3} lainnya</div>}
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleResumeOrder(held.id)}
                                                className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-[#0D2B20] text-amber-400 rounded-lg text-xs font-bold hover:bg-[#1a4433] transition"
                                            >
                                                <Play size={11} /> Lanjutkan
                                            </button>
                                            <button
                                                onClick={() => deleteHeldOrder(held.id)}
                                                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                            >
                                                <Trash size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* ── CONFIRM MODALS ────────────────────────────── */}
            <ConfirmModal
                isOpen={confirmClearCart}
                title="Kosongkan Keranjang?"
                message="Semua item dalam tray akan dihapus. Gunakan tombol Hold jika ingin menyimpan pesanan ini."
                confirmLabel="Ya, Kosongkan"
                danger
                onConfirm={() => { clearCart(); setNotes({}); setConfirmClearCart(false); toast.info('Keranjang dikosongkan.'); }}
                onCancel={() => setConfirmClearCart(false)}
            />
            <ConfirmModal
                isOpen={confirmLogout}
                title="Keluar dari POS?"
                message={`Anda akan keluar sebagai ${user?.name}. Pastikan toko sudah ditutup sebelum keluar.`}
                confirmLabel="Ya, Keluar"
                danger
                onConfirm={() => { setConfirmLogout(false); handleLogout(); }}
                onCancel={() => setConfirmLogout(false)}
            />
            <ConfirmModal
                isOpen={confirmCloseStore}
                title="Tutup Toko Sekarang?"
                message="Sesi penjualan akan direkap. Pastikan semua pesanan sudah selesai diproses."
                confirmLabel="Tutup Toko"
                onConfirm={() => { setConfirmCloseStore(false); handleTutupToko(); }}
                onCancel={() => setConfirmCloseStore(false)}
            />

            {/* ── SHIFT SUMMARY MODAL ───────────────────────── */}
            {shiftSummary && (
                <ShiftSummaryModal
                    isOpen={!!shiftSummary}
                    session={shiftSummary}
                    orders={orders}
                    onClose={() => setShiftSummary(null)}
                />
            )}
        </div>
    );
}

// ── Product Card ──────────────────────────────────────────────
function ProductCard({
    product,
    cartQty,
    isRecommended,
    onAdd,
    onRemove,
}: {
    product: ExtendedProduct;
    cartQty: number;
    isRecommended?: boolean;
    onAdd: () => void;
    onRemove: () => void;
}) {
    const isOutOfStock = product.stock <= 0;
    const isLimited = !isOutOfStock && product.stock <= (product.minStockThreshold || 5);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`bg-white rounded-xl overflow-hidden shadow-sm border transition-all group relative ${isOutOfStock
                ? 'border-gray-200 opacity-60'
                : isRecommended
                    ? 'border-amber-400 shadow-lg shadow-amber-200 ring-2 ring-amber-300/50'
                    : cartQty > 0
                        ? 'border-amber-400 shadow-md shadow-amber-100'
                        : 'border-gray-200 hover:border-[#0D2B20]/30 hover:shadow-md'
                }`}
        >
            {/* Image */}
            <div className="aspect-square relative overflow-hidden bg-gray-100">
                {product.image
                    ? <Image src={product.image} alt={product.name} fill className={`object-cover transition duration-500 group-hover:scale-110 ${isOutOfStock ? 'grayscale' : ''}`} />
                    : <div className="w-full h-full flex items-center justify-center text-gray-300 text-3xl font-bold">{product.name[0]}</div>
                }

                {/* Badges */}
                <div className="absolute top-1.5 left-1.5 flex flex-col gap-1">
                    {isRecommended && !isOutOfStock && (
                        <span className="bg-gradient-to-r from-amber-400 to-yellow-300 text-[#0D2B20] text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-sm">✨ Cocok!</span>
                    )}
                    {isOutOfStock && (
                        <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">HABIS</span>
                    )}
                    {isLimited && (
                        <span className="bg-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">Sisa {product.stock}</span>
                    )}
                    {product.category === 'signature' && !isOutOfStock && !isRecommended && (
                        <span className="bg-amber-400 text-[#0D2B20] text-[9px] font-bold px-1.5 py-0.5 rounded-full">★</span>
                    )}
                </div>

                {/* Cart Qty Badge */}
                {cartQty > 0 && (
                    <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-[#0D2B20] rounded-full flex items-center justify-center">
                        <span className="text-amber-400 text-[10px] font-black">{cartQty}</span>
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="p-2">
                <p className="text-[11px] font-bold text-gray-800 truncate leading-tight">{product.name}</p>
                <p className="text-[10px] font-bold text-amber-600 mt-0.5">Rp {product.price.toLocaleString('id-ID')}</p>

                {/* Add/Remove buttons */}
                <div className="flex items-center justify-between mt-1.5 gap-1">
                    {cartQty > 0 ? (
                        <>
                            <button
                                onClick={onRemove}
                                className="w-6 h-6 flex items-center justify-center bg-gray-100 hover:bg-red-100 hover:text-red-500 rounded-lg transition text-gray-500"
                            >
                                <Minus size={10} />
                            </button>
                            <span className="text-xs font-black text-[#0D2B20]">{cartQty}</span>
                            <button
                                onClick={onAdd}
                                disabled={isOutOfStock}
                                className="w-6 h-6 flex items-center justify-center bg-[#0D2B20] hover:bg-[#1a4433] text-amber-400 rounded-lg transition disabled:opacity-40"
                            >
                                <Plus size={10} />
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={onAdd}
                            disabled={isOutOfStock}
                            className="w-full h-6 flex items-center justify-center gap-1 bg-[#0D2B20] hover:bg-[#1a4433] text-amber-400 rounded-lg transition text-[10px] font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <Plus size={10} /> Tambah
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
