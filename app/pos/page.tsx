"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    useAuthStore, useCartStore, useProductStore, useSalesStore,
    Order, ExtendedProduct
} from "@/lib/store";
import { nanoid } from "nanoid";
import ReceiptModal from "@/components/ReceiptModal";
import {
    LogOut, Search, Plus, Minus, Trash2, ShoppingCart,
    LayoutGrid, Coffee, Leaf, Citrus, Star,
    Banknote, QrCode, Building2, ChevronRight,
    RotateCcw, Users, Package, UtensilsCrossed, ShoppingBag
} from "lucide-react";

// ── Category Tabs ────────────────────────────────────────────
const CATEGORIES = [
    { id: 'all', label: 'Semua', icon: LayoutGrid },
    { id: 'signature', label: 'Signature', icon: Star },
    { id: 'milk', label: 'Milk Base', icon: Coffee },
    { id: 'classic', label: 'Classic', icon: Leaf },
    { id: 'fruit', label: 'Fruit', icon: Citrus },
] as const;

type PaymentMethod = 'cash' | 'qris' | 'transfer';
type OrderType = 'dine-in' | 'take-away';

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
    const { addOrder, addLog } = useSalesStore();

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

    useEffect(() => {
        setIsClient(true);
    }, []);

    // Auth guard: redirect if not logged in
    useEffect(() => {
        if (isClient && !user) {
            router.push('/admin');
        }
    }, [isClient, user, router]);

    // ── Filtered Products ──────────────────────────────────────
    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchCat = activeCategory === 'all' || p.category === activeCategory;
            const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
            return matchCat && matchSearch;
        });
    }, [products, activeCategory, search]);

    // ── Cart Calculations ─────────────────────────────────────
    const orderTotal = total();
    const cashIn = parseFloat(cashReceived.replace(/\D/g, '')) || 0;
    const change = paymentMethod === 'cash' ? Math.max(0, cashIn - orderTotal) : 0;
    const isInsufficientCash = paymentMethod === 'cash' && cashIn < orderTotal && cashIn > 0;

    // ── Checkout ──────────────────────────────────────────────
    const handleCheckout = () => {
        if (items.length === 0) return;
        if (!customerName.trim()) return alert('Mohon isi nama pelanggan');
        if (paymentMethod === 'cash' && cashIn < orderTotal) return alert('Uang yang diterima kurang dari total!');

        const itemsWithNotes = items.map(it => ({ ...it, note: notes[it.id] || '' }));

        const newOrder: Order = {
            id: nanoid(),
            date: new Date().toISOString(),
            items: itemsWithNotes,
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
    };

    const handleNewOrder = () => {
        setShowReceipt(false);
        setLastOrder(null);
    };

    const handleLogout = () => {
        addLog('LOGOUT', `${user?.name} logged out from POS`, user?.name || 'Kasir');
        logout();
        router.push('/admin');
    };

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
                <div className="flex items-center gap-3">
                    <div className="hidden sm:flex items-center gap-2 text-xs text-white/60">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        <span>{user.name}</span>
                        <span className="opacity-40">•</span>
                        <span className="uppercase text-[10px] tracking-wider opacity-60">{user.role}</span>
                    </div>
                    <a href="/admin" className="text-xs text-white/50 hover:text-white/80 transition hidden sm:block">Dashboard</a>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition px-2 py-1 rounded hover:bg-red-500/10"
                    >
                        <LogOut size={13} /> Keluar
                    </button>
                </div>
            </header>

            {/* ── MAIN AREA ─────────────────────────────────── */}
            <div className="flex flex-1 overflow-hidden">

                {/* ════════════════════════════════════════════
                    LEFT PANEL — Katalog Produk
                ════════════════════════════════════════════ */}
                <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

                    {/* Search + Category Bar */}
                    <div className="bg-white border-b border-gray-200 px-4 py-2.5 flex flex-col gap-2 flex-shrink-0 shadow-sm">
                        {/* Search */}
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Cari produk..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#0D2B20] transition"
                            />
                        </div>
                        {/* Category Tabs */}
                        <div className="flex gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
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
                    </div>
                </div>

                {/* ════════════════════════════════════════════
                    RIGHT PANEL — Keranjang & Pembayaran
                ════════════════════════════════════════════ */}
                <div className="w-80 xl:w-96 flex-shrink-0 bg-white border-l border-gray-200 flex flex-col shadow-xl z-10">

                    {/* Cart Header */}
                    <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between flex-shrink-0">
                        <div className="flex items-center gap-2">
                            <ShoppingCart size={16} className="text-[#0D2B20]" />
                            <span className="font-bold text-gray-800 text-sm">Pesanan</span>
                            {items.length > 0 && (
                                <span className="bg-[#0D2B20] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{items.length}</span>
                            )}
                        </div>
                        {items.length > 0 && (
                            <button
                                onClick={() => { clearCart(); setNotes({}); }}
                                className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition"
                            >
                                <RotateCcw size={11} /> Kosongkan
                            </button>
                        )}
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
                                                <div className="w-9 h-9 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                                    {item.image
                                                        ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
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
                                                        className="w-full text-[10px] bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 mt-1 focus:outline-none focus:border-gray-400"
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

                        {/* Total */}
                        <div className="px-4 py-2.5 flex justify-between items-center border-b border-gray-200">
                            <span className="text-sm font-bold text-gray-700">Total</span>
                            <span className="text-lg font-black text-[#0D2B20]">{formatRp(orderTotal)}</span>
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
                                        className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-[#0D2B20] transition"
                                    />
                                </div>
                                <div className="relative w-20">
                                    <input
                                        type="text"
                                        placeholder="Meja"
                                        value={tableNumber}
                                        onChange={e => setTableNumber(e.target.value)}
                                        className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-[#0D2B20] transition text-center"
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

                            {/* Cash Input (only for tunai) */}
                            <AnimatePresence>
                                {paymentMethod === 'cash' && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="overflow-hidden space-y-1"
                                    >
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-mono">Rp</span>
                                            <input
                                                type="number"
                                                placeholder="Uang Diterima"
                                                value={cashReceived}
                                                onChange={e => setCashReceived(e.target.value)}
                                                className={`w-full pl-9 pr-3 py-1.5 text-xs border rounded-lg bg-white focus:outline-none transition font-mono ${isInsufficientCash
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
                                                    className="text-[10px] px-2 py-0.5 bg-gray-100 hover:bg-gray-200 rounded font-mono border border-gray-200 transition"
                                                >
                                                    {n >= 1000 ? `${n / 1000}rb` : n}
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Checkout Button */}
                        <div className="px-3 pb-3">
                            <button
                                onClick={handleCheckout}
                                disabled={items.length === 0 || !customerName.trim() || (paymentMethod === 'cash' && (cashIn < orderTotal || cashIn === 0))}
                                className="w-full py-3 bg-[#0D2B20] text-amber-400 font-black text-sm rounded-xl hover:bg-[#1a4433] transition flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-[#0D2B20]/20 hover:scale-[1.01] active:scale-[0.99]"
                            >
                                <ChevronRight size={18} />
                                Proses & Cetak Struk
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── RECEIPT MODAL ─────────────────────────────── */}
            <AnimatePresence>
                {showReceipt && lastOrder && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="relative w-full max-w-sm"
                        >
                            <ReceiptModal
                                order={lastOrder}
                                onClose={handleNewOrder}
                            />
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ── Product Card ──────────────────────────────────────────────
function ProductCard({
    product,
    cartQty,
    onAdd,
    onRemove,
}: {
    product: ExtendedProduct;
    cartQty: number;
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
                : cartQty > 0
                    ? 'border-amber-400 shadow-md shadow-amber-100'
                    : 'border-gray-200 hover:border-[#0D2B20]/30 hover:shadow-md'
                }`}
        >
            {/* Image */}
            <div className="aspect-square relative overflow-hidden bg-gray-100">
                {product.image
                    ? <img src={product.image} alt={product.name} className={`w-full h-full object-cover transition duration-500 group-hover:scale-110 ${isOutOfStock ? 'grayscale' : ''}`} />
                    : <div className="w-full h-full flex items-center justify-center text-gray-300 text-3xl font-bold">{product.name[0]}</div>
                }

                {/* Badges */}
                <div className="absolute top-1.5 left-1.5 flex flex-col gap-1">
                    {isOutOfStock && (
                        <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">HABIS</span>
                    )}
                    {isLimited && (
                        <span className="bg-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">Sisa {product.stock}</span>
                    )}
                    {product.category === 'signature' && !isOutOfStock && (
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
                <p className="text-[10px] font-bold text-amber-600 mt-0.5">{formatRp(product.price)}</p>

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
