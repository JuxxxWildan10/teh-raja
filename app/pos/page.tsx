"use client";

/**
 * @file POS (Point of Sale) Page
 * @description Halaman utama Kasir untuk memproses pesanan, memilih metode pembayaran, dan sinkronisasi data offline-first.
 * Menggunakan Zustand untuk state management lokal dan Firebase untuk sinkronisasi Realtime.
 */


import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    useAuthStore, useCartStore, useProductStore, useSalesStore,
    usePromoStore, useCustomerStore, useInventoryStore, // [NEW] Promo & Customer & Inventory
    Order, ExtendedProduct, formatVariantLabel
} from "@/lib/store";
import { nanoid } from "nanoid";
import Image from "next/image";
import ReceiptModal from "@/components/ReceiptModal";
import ConfirmModal from "@/components/ConfirmModal";
import ShiftSummaryModal from "@/components/ShiftSummaryModal";
import VariantModal from "@/components/VariantModal";
import { useToast } from "@/components/Toast";
import {
    LogOut, Search, Plus, Minus, Trash2, ShoppingCart,
    LayoutGrid, LayoutDashboard, Coffee, Leaf, Citrus, Star,
    Banknote, QrCode, Building2, ChevronRight,
    RotateCcw, Users, Package, UtensilsCrossed, ShoppingBag, X, Cookie,
    Wand2, Sparkles, ChevronDown, Pause, Play, Trash, Tag, Percent, Mic, MicOff, Loader2,
    CheckCircle, RefreshCw
} from "lucide-react";

// ── Category Tabs ─────────────────────────────────────────────
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

function formatRp(n: number) { return 'Rp ' + n.toLocaleString('id-ID'); }

// ── Main Component ────────────────────────────────────────────
export default function POSPage() {
    const router = useRouter();
    const { user, logout } = useAuthStore();
    const { items, addToCart, removeFromCart, updateQuantity, updateNote, clearCart, total } = useCartStore();
    const { products, decrementStock } = useProductStore();
    const { addOrder, addLog, isStoreOpen, openStore, closeStore, heldOrders, holdOrder, resumeOrder, deleteHeldOrder, orders } = useSalesStore();
    const { getApplicablePromo } = usePromoStore(); // [NEW] Promo
    const { findByPhone, addCustomer, addPoints, getPointsForOrder, redeemPoints } = useCustomerStore(); // [NEW] Loyalty
    const { decrementIngredientsForOrder } = useInventoryStore(); // [NEW] BOM
    const toast = useToast();

    const [isClient, setIsClient] = useState(false);
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState<string>('all');
    // Customer Info
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [usePoints, setUsePoints] = useState(false);
    
    const [tableNumber, setTableNumber] = useState('');
    const [orderType, setOrderType] = useState<OrderType>('dine-in');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
    const [cashReceived, setCashReceived] = useState('');
    // QRIS State
    const [qrisGenerated, setQrisGenerated] = useState(false);
    const [isCheckingQris, setIsCheckingQris] = useState(false);
    const [qrisSuccess, setQrisSuccess] = useState(false);
    
    const [showReceipt, setShowReceipt] = useState(false);
    const [lastOrder, setLastOrder] = useState<Order | null>(null);
    const [mobileCartOpen, setMobileCartOpen] = useState(false);
    const [startingCash, setStartingCash] = useState('');
    const [actualCash, setActualCash] = useState('');
    const [closeNotes, setCloseNotes] = useState('');

    // Variant Modal
    const [variantProduct, setVariantProduct] = useState<ExtendedProduct | null>(null);

    // Voice Command
    const [isListening, setIsListening] = useState(false);
    const [isProcessingVoice, setIsProcessingVoice] = useState(false);

    // Discount
    const [discountMode, setDiscountMode] = useState<DiscountMode>('none');
    const [discountValue, setDiscountValue] = useState('');

    // Confirm Modals
    const [confirmClearCart, setConfirmClearCart] = useState(false);
    const [confirmLogout, setConfirmLogout] = useState(false);
    const [confirmCloseStore, setConfirmCloseStore] = useState(false);

    // Shift summary
    const [shiftSummary, setShiftSummary] = useState<import("@/lib/store").StoreSession | null>(null);

    // Hold Order panel
    const [showHeldOrders, setShowHeldOrders] = useState(false);

    // ── Flavor Finder ─────────────────────────────────────────
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

    useEffect(() => { setIsClient(true); }, []);

    useEffect(() => {
        if (isClient && !user) router.push('/admin');
    }, [isClient, user, router]);

    // Keyboard shortcuts
    const searchRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setMobileCartOpen(false);
                setShowReceipt(false);
                setShowHeldOrders(false);
                setVariantProduct(null);
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                searchRef.current?.focus();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    // ── Filtered & Sorted Products ────────────────────────────
    const filteredProducts = useMemo(() => {
        let list = products.filter(p => {
            const matchCat = activeCategory === 'all' || p.category === activeCategory;
            const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
            return matchCat && matchSearch;
        });
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
    
    // Auto-detect best promo
    const applicablePromo = getApplicablePromo(subtotal);

    const discountAmount = useMemo(() => {
        // If there's an automatic promo, apply it unless manual discount is set
        if (discountMode === 'none' && applicablePromo) {
            return applicablePromo.discountAmount;
        }

        const v = parseFloat(discountValue) || 0;
        if (discountMode === 'amount') return Math.min(v, subtotal);
        if (discountMode === 'percent') return Math.min(Math.round(subtotal * v / 100), subtotal);
        return 0;
    }, [discountMode, discountValue, subtotal, applicablePromo]);

    // Points Redemption Logic
    const customer = useMemo(() => findByPhone(customerPhone), [customerPhone, findByPhone]);
    const maxRedeemablePoints = customer ? Math.floor(customer.points / 100) * 100 : 0; // Assuming 1 point = Rp100, and we only redeem points in hundreds for simplicity, but let's just use raw points. Actually, store logic says POINTS_REDEEM_VALUE = 100.
    const pointsDiscount = (usePoints && customer) ? customer.points * 100 : 0; // POINTS_REDEEM_VALUE = 100

    const orderTotal = Math.max(0, subtotal - discountAmount - pointsDiscount);
    const cashIn = parseFloat(cashReceived.replace(/\D/g, '')) || 0;
    const change = paymentMethod === 'cash' ? Math.max(0, cashIn - orderTotal) : 0;
    const isInsufficientCash = paymentMethod === 'cash' && cashIn < orderTotal && cashIn > 0;

    // ── Variant Modal Handler ─────────────────────────────────
    const handleVariantConfirm = useCallback((
        variants: import("@/lib/store").ProductVariants,
        finalPrice: number,
        qty: number
    ) => {
        if (!variantProduct) return;
        for (let i = 0; i < qty; i++) {
            addToCart(variantProduct, variants, finalPrice);
        }
        setVariantProduct(null);
        toast.success(`${variantProduct.name} (${variants.size}) ditambahkan!`);
    }, [variantProduct, addToCart, toast]);

    // ── Hold Order ────────────────────────────────────────────
    const handleHoldOrder = useCallback(() => {
        if (items.length === 0) { toast.warning('Keranjang kosong.'); return; }
        const heldOrder: Order = {
            id: nanoid(),
            date: new Date().toISOString(),
            items: items.map(it => ({ ...it })),
            total: orderTotal, subtotal,
            discount: discountAmount,
            discountType: discountMode !== 'none' ? discountMode : undefined,
            discountValue: discountMode !== 'none' ? parseFloat(discountValue) : undefined,
            customerName: customerName || '(hold)',
            cashierName: user?.name || 'Kasir',
            status: 'pending', orderType,
            tableNumber: tableNumber || undefined,
        };
        holdOrder(heldOrder);
        clearCart();
        setCustomerName(''); setTableNumber(''); setCashReceived('');
        setDiscountMode('none'); setDiscountValue('');
        toast.info(`Pesanan "${heldOrder.customerName}" di-hold.`);
    }, [items, orderTotal, subtotal, discountAmount, discountMode, discountValue,
        customerName, orderType, tableNumber, user, holdOrder, clearCart, toast]);

    const handleResumeOrder = useCallback((heldId: string) => {
        const held = resumeOrder(heldId);
        if (!held) return;
        clearCart();
        held.items.forEach(it => {
            const product = products.find(p => p.id === it.id);
            if (!product) return;
            // Add `qty` times with same variants
            for (let i = 0; i < it.quantity; i++) {
                addToCart(product, it.variants, it.finalPrice ?? it.price);
            }
            // Restore note
            if (it.note && it.cartItemId) {
                setTimeout(() => updateNote(it.cartItemId!, it.note!), 50);
            }
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
    }, [resumeOrder, products, addToCart, updateNote, clearCart, toast]);

    // ── Voice Command ─────────────────────────────────────────
    const handleVoiceCommand = useCallback(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            toast.error('Browser Anda tidak mendukung Voice Command (gunakan Chrome).');
            return;
        }

        if (isListening || isProcessingVoice) return;

        const recognition = new SpeechRecognition();
        recognition.lang = 'id-ID';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            setIsListening(true);
            toast.info('Mendengarkan pesanan...');
        };

        recognition.onresult = async (event: any) => {
            const transcript = event.results[0][0].transcript;
            toast.info(`Menangkap suara: "${transcript}"`);
            setIsProcessingVoice(true);

            try {
                const res = await fetch('/api/ai/voice-pos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: transcript, menu: products.filter(p => p.stock > 0) })
                });
                
                if (!res.ok) throw new Error('AI Error');
                
                const data = await res.json();
                
                if (data.items && data.items.length > 0) {
                    let addedCount = 0;
                    data.items.forEach((parsedItem: any) => {
                        const product = products.find(p => p.id === parsedItem.productId);
                        if (product) {
                            // Hitung harga final berdasarkan size jika ada upcharge
                            let finalPrice = product.price;
                            if (parsedItem.variants && parsedItem.variants.size === 'L') {
                                finalPrice += 2000; // Hardcode L size upcharge based on store.ts rules
                            }
                            
                            for (let i = 0; i < (parsedItem.quantity || 1); i++) {
                                addToCart(product, parsedItem.variants, finalPrice);
                            }
                            addedCount++;
                        }
                    });
                    
                    if (addedCount > 0) {
                        toast.success(`Berhasil menambahkan ${addedCount} produk dari suara!`);
                    } else {
                        toast.warning('Suara dikenali, tapi produk tidak ditemukan atau stok habis.');
                    }
                } else {
                    toast.warning('Tidak mengerti pesanan dari suara tersebut.');
                }
            } catch (err) {
                console.error(err);
                toast.error('Gagal memproses suara dengan AI.');
            } finally {
                setIsProcessingVoice(false);
                setIsListening(false);
            }
        };

        recognition.onerror = (event: any) => {
            toast.error('Gagal mendengarkan suara.');
            setIsProcessingVoice(false);
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognition.start();
    }, [isListening, isProcessingVoice, products, addToCart, toast]);

    // ── Checkout ──────────────────────────────────────────────
    const handleCheckout = useCallback(() => {
        if (!isStoreOpen) { toast.error('Toko harus dibuka terlebih dahulu!'); return; }
        if (items.length === 0) return;
        if (!customerName.trim()) { toast.error('Mohon isi nama pelanggan.'); return; }
        if (paymentMethod === 'cash' && cashIn < orderTotal) {
            toast.error(`Uang kurang! Perlu ${formatRp(orderTotal - cashIn)} lagi.`);
            return;
        }
        if (paymentMethod === 'qris' && !qrisSuccess) {
            toast.error(`Selesaikan pembayaran QRIS terlebih dahulu.`);
            return;
        }

        // Process Loyalty Points
        if (usePoints && customer) {
            redeemPoints(customerPhone, customer.points);
        }
        if (customerPhone.trim()) {
            if (!customer) {
                // Register new customer
                addCustomer({
                    id: nanoid(),
                    name: customerName.trim(),
                    phone: customerPhone.trim(),
                    points: 0,
                    totalSpent: 0,
                    createdAt: new Date().toISOString()
                });
            }
            // Give points for the final paid amount
            addPoints(customerPhone.trim(), orderTotal);
        }

        const newOrder: Order = {
            id: nanoid(),
            date: new Date().toISOString(),
            items: items.map(it => ({ ...it })),
            subtotal, discount: discountAmount + pointsDiscount,
            discountType: discountMode !== 'none' ? discountMode : (applicablePromo ? 'percent' : undefined), // Simplified type tracking for UI
            discountValue: discountMode !== 'none' ? parseFloat(discountValue) : (applicablePromo ? applicablePromo.promo.value : undefined),
            total: orderTotal,
            customerName: customerName.trim(),
            cashierName: user?.name || 'Kasir',
            status: 'processing', paymentMethod,
            cashReceived: paymentMethod === 'cash' ? cashIn : undefined,
            changeAmount: paymentMethod === 'cash' ? change : undefined,
            tableNumber: tableNumber.trim() || undefined, orderType,
        };
        addOrder(newOrder);
        addLog('SALE', `Order #${newOrder.id.slice(0, 6)} - ${formatRp(orderTotal)} via ${paymentMethod}`, user?.name || 'Kasir');
        decrementStock(items);
        decrementIngredientsForOrder(items, products); // BOM deduction
        setLastOrder(newOrder);
        setShowReceipt(true);
        clearCart();
        setCustomerName(''); setCustomerPhone(''); setTableNumber(''); setCashReceived('');
        setDiscountMode('none'); setDiscountValue(''); setUsePoints(false);
        setQrisGenerated(false); setQrisSuccess(false);
        setMobileCartOpen(false);
        toast.success(`Order #${newOrder.id.slice(0, 6)} berhasil! ${formatRp(orderTotal)}`);
    }, [isStoreOpen, items, customerName, paymentMethod, cashIn, orderTotal, subtotal,
        discountAmount, pointsDiscount, discountMode, discountValue, applicablePromo, change, tableNumber, orderType, user,
        usePoints, customer, customerPhone, redeemPoints, addPoints,
        addOrder, addLog, decrementStock, clearCart, toast]);

    const handleTutupToko = () => {
        const parsedActual = parseFloat(actualCash.replace(/[^0-9]/g, '')) || 0;
        const summary = closeStore(parsedActual, closeNotes);
        if (summary) {
            setShiftSummary(summary);
            addLog('STORE_CLOSE', `Store closed. Sales: ${formatRp(summary.totalSales)}. Diff: ${formatRp(parsedActual - (summary.expectedCash || 0))}`, user?.name || 'Kasir');
            toast.success('Toko berhasil ditutup!');
            setActualCash('');
            setCloseNotes('');
        }
    };

    const checkoutDisabled = items.length === 0 || !customerName.trim()
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
                    {heldOrders.length > 0 && (
                        <button onClick={() => setShowHeldOrders(true)}
                            className="relative flex items-center gap-1.5 text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-1 rounded-lg hover:bg-amber-500/30 transition">
                            <Pause size={12} />
                            <span className="hidden sm:inline">Hold</span>
                            <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-[#0D2B20] text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">{heldOrders.length}</span>
                        </button>
                    )}
                    <div className="hidden sm:flex items-center gap-2 text-xs text-white/60">
                        <div className={`w-2 h-2 rounded-full animate-pulse ${isStoreOpen ? 'bg-green-400' : 'bg-red-400'}`} />
                        <span>{user.name}</span>
                    </div>
                    {isStoreOpen && (
                        <button onClick={() => setConfirmCloseStore(true)}
                            className="text-[10px] sm:text-xs font-bold bg-amber-400 text-[#0D2B20] hover:bg-amber-300 transition px-2 py-1 rounded-md">
                            Tutup Toko
                        </button>
                    )}
                    <a href="/admin" className="flex items-center gap-1.5 text-[10px] sm:text-xs text-white/70 hover:text-white transition px-2 py-1 rounded hover:bg-white/10">
                        <LayoutDashboard size={13} />
                        <span className="hidden sm:inline">Dashboard</span>
                    </a>
                    <button onClick={() => setConfirmLogout(true)}
                        className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition px-2 py-1 rounded hover:bg-red-500/10">
                        <LogOut size={13} /> Keluar
                    </button>
                </div>
            </header>

            {/* ── MAIN AREA ─────────────────────────────────── */}
            <div className="flex flex-1 overflow-hidden relative">

                {/* Store closed overlay */}
                {!isStoreOpen && (
                    <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center flex flex-col items-center">
                            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-4">
                                <Building2 size={32} />
                            </div>
                            <h2 className="text-2xl font-black text-[#0D2B20] mb-2">Buka Shift Kasir</h2>
                            <p className="text-sm text-gray-500 mb-4">Masukkan modal awal uang kembalian (Starting Cash).</p>
                            
                            <div className="w-full relative mb-6">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">Rp</span>
                                <input type="tel" 
                                    value={startingCash} 
                                    onChange={e => setStartingCash(e.target.value.replace(/[^0-9]/g, ''))}
                                    placeholder="Contoh: 150000"
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D2B20] text-lg font-bold text-gray-800" 
                                />
                            </div>

                            <button
                                onClick={() => { 
                                    const parsedCash = parseFloat(startingCash) || 0;
                                    openStore(user.name, parsedCash); 
                                    addLog('STORE_OPEN', `Store opened with starting cash: ${formatRp(parsedCash)}`, user.name); 
                                    toast.success('Shift kasir dimulai! 🍵'); 
                                    setStartingCash('');
                                }}
                                className="w-full py-3 bg-[#0D2B20] text-amber-400 font-bold rounded-xl hover:bg-[#1a4433] hover:scale-105 active:scale-95 transition shadow-lg">
                                Buka Shift Sekarang
                            </button>
                        </div>
                    </div>
                )}

                {/* ════ LEFT PANEL — Katalog Produk ════ */}
                <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                    {/* Search + Category Bar */}
                    <div className="bg-white border-b border-gray-200 px-4 py-2.5 flex flex-col gap-2 flex-shrink-0 shadow-sm">
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input ref={searchRef} type="text"
                                    placeholder="Cari produk... (Ctrl+F)"
                                    value={search} onChange={e => setSearch(e.target.value)}
                                    className="w-full text-gray-900 pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#0D2B20] transition" />
                            </div>
                            
                            <button onClick={handleVoiceCommand}
                                disabled={isListening || isProcessingVoice}
                                title="Pesan dengan Suara (AI)"
                                className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all flex-shrink-0 border ${
                                    isListening ? 'bg-red-500 text-white border-red-600 animate-pulse' :
                                    isProcessingVoice ? 'bg-amber-400 text-[#0D2B20] border-amber-500' :
                                    'bg-[#0D2B20] text-white border-[#0D2B20] shadow-md hover:bg-[#1a4433]'
                                }`}>
                                {isProcessingVoice ? <Loader2 size={14} className="animate-spin" /> : 
                                 isListening ? <Mic size={14} /> : <Mic size={14} />}
                            </button>

                            <button onClick={() => setShowFlavorFinder(v => !v)}
                                title="Temukan Minuman Sesuai Selera"
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex-shrink-0 ${showFlavorFinder ? 'bg-[#0D2B20] text-amber-400 border-[#0D2B20] shadow-md' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-[#0D2B20] hover:text-[#0D2B20]'}`}>
                                <Wand2 size={13} />
                                <span className="hidden sm:inline">Pilih Rasa</span>
                                <ChevronDown size={11} className={`transition-transform ${showFlavorFinder ? 'rotate-180' : ''}`} />
                            </button>
                        </div>

                        {/* Flavor Finder Panel */}
                        <AnimatePresence>
                            {showFlavorFinder && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                                    <div className="bg-gradient-to-br from-amber-50 to-green-50 border border-amber-200 rounded-xl p-3 space-y-2">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <Sparkles size={12} className="text-amber-600" />
                                            <span className="text-[11px] font-bold text-[#0D2B20]">Temukan Minuman Sesuai Selera Kamu</span>
                                            <span className="ml-auto text-[9px] text-gray-400 italic">Smart Matching</span>
                                        </div>
                                        {([
                                            { key: 'sweet', label: '🍯 Kemanisan' },
                                            { key: 'creamy', label: '🥛 Creamy' },
                                            { key: 'fruity', label: '🍊 Buah-buahan' },
                                        ] as const).map(({ key, label }) => (
                                            <div key={key} className="flex items-center gap-2">
                                                <span className="text-[10px] w-28 flex-shrink-0 text-gray-700 font-medium">{label}</span>
                                                <input type="range" min={0} max={10} step={1} value={flavorPref[key]}
                                                    onChange={e => setFlavorPref(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                                                    className="flex-1 h-1.5 accent-amber-500 cursor-pointer" />
                                                <span className="text-[11px] font-black w-5 text-center text-amber-600">{flavorPref[key]}</span>
                                            </div>
                                        ))}
                                        {flavorRecommendations.size > 0 && (
                                            <div className="flex items-center gap-1.5 pt-1">
                                                <Sparkles size={10} className="text-amber-500" />
                                                <span className="text-[10px] text-amber-700 font-semibold">{flavorRecommendations.size} minuman terbaik ditampilkan di atas ✨</span>
                                            </div>
                                        )}
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
                                    <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${isActive ? 'bg-[#0D2B20] text-amber-400 shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                                        <Icon size={11} />{cat.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Product Grid */}
                    <div className="flex-1 overflow-y-auto p-3">
                        {filteredProducts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full opacity-40 gap-2">
                                <Package size={40} /><p className="text-sm">Produk tidak ditemukan</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
                                {filteredProducts.map(product => {
                                    // Total qty of this product across all variant combos
                                    const cartQty = items.filter(i => i.id === product.id).reduce((s, i) => s + i.quantity, 0);
                                    return (
                                        <ProductCard
                                            key={product.id}
                                            product={product}
                                            cartQty={cartQty}
                                            isRecommended={flavorRecommendations.has(product.id)}
                                            onAdd={() => setVariantProduct(product)}
                                        />
                                    );
                                })}
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

                {/* ════ RIGHT PANEL — Keranjang ════ */}
                <AnimatePresence>
                    {mobileCartOpen && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setMobileCartOpen(false)}
                            className="lg:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm" />
                    )}
                </AnimatePresence>

                <div className={`fixed lg:relative right-0 top-0 h-full lg:h-auto w-80 sm:w-96 flex-shrink-0 bg-white border-l border-gray-200 flex flex-col shadow-2xl lg:shadow-xl z-40 transition-transform duration-300 lg:translate-x-0 ${mobileCartOpen ? 'translate-x-0' : 'translate-x-full'}`}>

                    {/* Cart Header */}
                    <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between flex-shrink-0">
                        <div className="flex items-center gap-2">
                            <button onClick={() => setMobileCartOpen(false)} className="lg:hidden p-1 bg-gray-200 rounded-full hover:bg-gray-300 text-gray-700"><X size={14} /></button>
                            <ShoppingCart size={16} className="text-[#0D2B20] hidden lg:block" />
                            <span className="font-bold text-gray-800 text-sm">Pesanan</span>
                            {items.length > 0 && <span className="bg-[#0D2B20] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{items.length}</span>}
                        </div>
                        <div className="flex items-center gap-2">
                            {items.length > 0 && (
                                <button onClick={handleHoldOrder}
                                    className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 transition border border-amber-200 bg-amber-50 px-2 py-0.5 rounded-lg">
                                    <Pause size={11} /> Hold
                                </button>
                            )}
                            {items.length > 0 && (
                                <button onClick={() => setConfirmClearCart(true)}
                                    className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition">
                                    <RotateCcw size={11} /> Kosongkan
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Cart Items */}
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
                                    const itemKey = item.cartItemId ?? item.id;
                                    const variantLabel = formatVariantLabel(item.variants);
                                    return (
                                        <div key={itemKey} className="px-3 py-2.5">
                                            <div className="flex items-start gap-2">
                                                <div className="w-9 h-9 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 relative">
                                                    {item.image
                                                        ? <Image src={item.image} alt={item.name} fill className="object-cover" unoptimized />
                                                        : <div className="w-full h-full flex items-center justify-center text-gray-300 text-lg font-bold">{item.name[0]}</div>
                                                    }
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold text-gray-800 truncate">{item.name}</p>
                                                    {/* Variant label */}
                                                    {variantLabel && (
                                                        <p className="text-[9px] text-amber-600 font-medium leading-tight truncate">{variantLabel}</p>
                                                    )}
                                                    <p className="text-[10px] text-gray-500 font-medium mt-0.5">{formatRp(item.finalPrice ?? item.price)}</p>
                                                    {/* Note input */}
                                                    <input type="text" placeholder="Catatan (opsional)"
                                                        value={item.note || ''}
                                                        onChange={e => updateNote(itemKey, e.target.value)}
                                                        className="w-full text-gray-900 text-[10px] bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 mt-1 focus:outline-none focus:border-gray-400" />
                                                </div>
                                                {/* Qty Controls */}
                                                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                                    <button onClick={() => removeFromCart(itemKey)} className="text-red-400 hover:text-red-500 transition">
                                                        <Trash2 size={12} />
                                                    </button>
                                                    <div className="flex items-center gap-1 bg-gray-50 rounded-lg border border-gray-200 px-1">
                                                        <button onClick={() => updateQuantity(itemKey, item.quantity - 1)}
                                                            className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-red-500 transition">
                                                            <Minus size={10} />
                                                        </button>
                                                        <span className="text-xs font-bold text-gray-800 w-4 text-center">{item.quantity}</span>
                                                        <button
                                                            onClick={() => { if (live) { const totalQty = items.filter(i => i.id === item.id).reduce((s, i) => s + i.quantity, 0); if (totalQty < live.stock) updateQuantity(itemKey, item.quantity + 1); } }}
                                                            disabled={!live || (() => { const tq = items.filter(i => i.id === item.id).reduce((s, i) => s + i.quantity, 0); return tq >= (live?.stock ?? 0); })()}
                                                            className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-green-600 transition disabled:opacity-30">
                                                            <Plus size={10} />
                                                        </button>
                                                    </div>
                                                    <span className="text-[10px] font-bold text-gray-700">{formatRp((item.finalPrice ?? item.price) * item.quantity)}</span>
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
                        <div className="px-4 pt-2.5 pb-1 space-y-1 border-b border-gray-200">
                            {discountAmount > 0 && (
                                <>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-gray-500">Subtotal</span>
                                        <span className="text-gray-600">{formatRp(subtotal)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-red-500 font-medium">Diskon{discountMode === 'percent' ? ` (${discountValue}%)` : ''}</span>
                                        <span className="text-red-500 font-bold">-{formatRp(discountAmount)}</span>
                                    </div>
                                </>
                            )}
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-bold text-gray-700">Total</span>
                                <span className="text-lg font-black text-[#0D2B20]">{formatRp(orderTotal)}</span>
                            </div>
                        </div>

                        {/* Form */}
                        <div className="px-3 py-2.5 space-y-2">
                            {/* Customer + Table */}
                            {/* Customer + Phone + Table */}
                            <div className="flex flex-col gap-2">
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Users size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input type="text" placeholder="No. HP / Telepon" value={customerPhone}
                                            onChange={e => setCustomerPhone(e.target.value)}
                                            className="w-full text-gray-900 pl-7 pr-2 py-1.5 text-xs border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-[#0D2B20] transition" />
                                    </div>
                                    <input type="text" placeholder="Meja" value={tableNumber}
                                        onChange={e => setTableNumber(e.target.value)}
                                        className="w-16 text-gray-900 px-2 py-1.5 text-xs border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-[#0D2B20] transition text-center" />
                                </div>
                                <input type="text" placeholder="Nama Pelanggan *" value={customerName}
                                    onChange={e => setCustomerName(e.target.value)}
                                    className="w-full text-gray-900 px-3 py-1.5 text-xs border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-[#0D2B20] transition" />
                            </div>

                            {/* Loyalty Points */}
                            <AnimatePresence>
                                {customer && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 flex justify-between items-center text-xs">
                                            <div>
                                                <p className="font-bold text-amber-900">Member: {customer.name}</p>
                                                <p className="text-amber-700 text-[10px]">Poin: {customer.points} ({formatRp(maxRedeemablePoints)})</p>
                                            </div>
                                            {maxRedeemablePoints > 0 && (
                                                <label className="flex items-center gap-1.5 cursor-pointer">
                                                    <input type="checkbox" checked={usePoints} onChange={e => setUsePoints(e.target.checked)} className="accent-amber-600" />
                                                    <span className="font-bold text-amber-800 text-[10px]">Gunakan Poin</span>
                                                </label>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Auto Promo Info */}
                            {applicablePromo && discountMode === 'none' && (
                                <div className="bg-green-50 border border-green-200 rounded-lg px-2 py-1.5 text-[10px] text-green-800 flex justify-between items-center">
                                    <span className="font-bold">🎉 {applicablePromo.promo.name}</span>
                                    <span>Otomatis aktif</span>
                                </div>
                            )}

                            {/* Order Type */}
                            <div className="flex gap-1.5">
                                {(['dine-in', 'take-away'] as const).map(type => (
                                    <button key={type} onClick={() => setOrderType(type)}
                                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition border ${orderType === type ? 'bg-[#0D2B20] text-amber-400 border-[#0D2B20]' : 'bg-white text-gray-500 border-gray-300 hover:border-gray-400'}`}>
                                        {type === 'dine-in' ? <><UtensilsCrossed size={12} /> Dine In</> : <><ShoppingBag size={12} />Take Away</>}
                                    </button>
                                ))}
                            </div>

                            {/* Diskon toggle */}
                            <div className="flex gap-1.5">
                                {(['none', 'amount', 'percent'] as const).map(mode => (
                                    <button key={mode} onClick={() => { setDiscountMode(mode); if (mode === 'none') setDiscountValue(''); }}
                                        className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-bold transition border ${discountMode === mode
                                            ? mode === 'none' ? 'bg-gray-200 text-gray-700 border-gray-300' : 'bg-red-600 text-white border-red-600'
                                            : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'}`}>
                                        {mode === 'none' ? 'No Diskon' : mode === 'amount' ? <><Tag size={10} /> Nominal</> : <><Percent size={10} /> Persen</>}
                                    </button>
                                ))}
                            </div>

                            {/* Discount input */}
                            <AnimatePresence>
                                {discountMode !== 'none' && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-bold">{discountMode === 'percent' ? '%' : 'Rp'}</span>
                                            <input type="tel" placeholder={discountMode === 'percent' ? 'contoh: 10' : 'contoh: 5000'}
                                                value={discountValue}
                                                onChange={e => setDiscountValue(e.target.value.replace(/[^0-9]/g, ''))}
                                                className="w-full text-gray-900 pl-8 pr-3 py-1.5 text-xs border border-red-300 rounded-lg bg-red-50 focus:outline-none focus:border-red-500 transition font-mono" />
                                        </div>
                                        {discountAmount > 0 && <p className="text-[10px] text-red-600 font-bold mt-0.5 text-right">Hemat {formatRp(discountAmount)}</p>}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Payment Methods */}
                            <div className="flex gap-1.5">
                                {PAYMENT_METHODS.map(pm => {
                                    const Icon = pm.icon;
                                    return (
                                        <button key={pm.id} onClick={() => setPaymentMethod(pm.id)}
                                            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 rounded-lg text-[10px] font-bold transition border ${paymentMethod === pm.id ? 'bg-amber-50 text-amber-700 border-amber-400 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>
                                            <Icon size={14} />{pm.label}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* QRIS */}
                            <AnimatePresence>
                                {paymentMethod === 'qris' && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                                        <div className="bg-white p-3 rounded-xl border border-gray-200 flex flex-col items-center text-center gap-2 mt-1">
                                            {!qrisGenerated ? (
                                                <button
                                                    onClick={() => setQrisGenerated(true)}
                                                    className="w-full bg-[#0D2B20] text-amber-400 font-bold py-2 rounded-lg text-xs"
                                                >
                                                    Generate QRIS (Midtrans)
                                                </button>
                                            ) : (
                                                <>
                                                    <p className="text-[11px] font-bold text-gray-800">Scan QRIS Dinamis</p>
                                                    <div className="w-40 h-40 bg-gray-50 rounded-lg p-2 border-2 border-dashed border-gray-300 flex items-center justify-center relative overflow-hidden">
                                                        <div className="absolute inset-0 flex flex-col items-center justify-center z-0 p-2">
                                                            <QrCode size={24} className="text-gray-300 mb-1" />
                                                        </div>
                                                        {/* Fake dynamic QR by using an image or just the same image for demo */}
                                                        <Image src="/images/qris-gopay.jpg" alt="QRIS" fill className={`object-contain relative z-10 bg-white transition ${qrisSuccess ? 'opacity-30' : 'opacity-100'}`} unoptimized />
                                                        {qrisSuccess && (
                                                            <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                                                                <div className="bg-green-500 rounded-full p-2 mb-1">
                                                                    <CheckCircle size={24} className="text-white" />
                                                                </div>
                                                                <span className="font-bold text-green-700 text-xs bg-white px-2 py-0.5 rounded-full shadow-sm">LUNAS</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="text-amber-900 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg w-full">
                                                        <span className="uppercase tracking-widest text-[9px] font-bold opacity-60">Total Tagihan</span>
                                                        <p className="text-base font-black text-[#0D2B20]">{formatRp(orderTotal)}</p>
                                                    </div>
                                                    {!qrisSuccess && (
                                                        <button
                                                            onClick={() => {
                                                                setIsCheckingQris(true);
                                                                setTimeout(() => {
                                                                    setIsCheckingQris(false);
                                                                    setQrisSuccess(true);
                                                                    toast.success('Pembayaran QRIS berhasil diterima!');
                                                                }, 1500);
                                                            }}
                                                            disabled={isCheckingQris}
                                                            className="w-full bg-amber-100 text-amber-700 font-bold py-2 rounded-lg text-xs hover:bg-amber-200 transition flex items-center justify-center gap-1 mt-1"
                                                        >
                                                            {isCheckingQris ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Cek Status Pembayaran
                                                        </button>
                                                    )}
                                                </>
                                            )}
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
                                            <input type="tel" placeholder="Uang Diterima" value={cashReceived}
                                                onChange={e => setCashReceived(e.target.value.replace(/[^0-9]/g, ''))}
                                                className={`w-full text-gray-900 pl-9 pr-3 py-1.5 text-xs border rounded-lg bg-white focus:outline-none transition font-mono ${isInsufficientCash ? 'border-red-400 bg-red-50 text-red-700' : 'border-gray-300 focus:border-[#0D2B20]'}`} />
                                        </div>
                                        {cashIn >= orderTotal && cashIn > 0 && (
                                            <div className="flex justify-between items-center bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
                                                <span className="text-xs text-green-700 font-medium">Kembalian</span>
                                                <span className="text-sm font-black text-green-700">{formatRp(change)}</span>
                                            </div>
                                        )}
                                        {isInsufficientCash && <p className="text-[10px] text-red-500 text-center">⚠ Uang kurang {formatRp(orderTotal - cashIn)}</p>}
                                        <div className="flex gap-1 flex-wrap">
                                            {[5000, 10000, 20000, 50000, 100000].filter(n => n >= orderTotal).slice(0, 4).map(n => (
                                                <button key={n} onClick={() => setCashReceived(String(n))}
                                                    className="text-gray-900 text-[10px] px-2 py-0.5 bg-gray-100 hover:bg-gray-200 rounded font-mono border border-gray-200 transition">
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
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                                        <div className="bg-white p-3 rounded-xl border border-gray-200 flex flex-col items-center gap-2">
                                            <Building2 size={28} className="text-gray-300 mt-2" />
                                            <div className="text-amber-900 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg w-full text-center">
                                                <span className="text-[9px] font-bold opacity-60 uppercase">Total Tagihan</span>
                                                <p className="text-base font-black text-[#0D2B20]">{formatRp(orderTotal)}</p>
                                            </div>
                                            <p className="text-[9px] text-gray-500 bg-gray-50 p-1.5 rounded w-full">💡 Pastikan bukti transfer sudah diterima sebelum proses.</p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Checkout Button */}
                        <div className="px-3 pb-3">
                            <div className="relative group">
                                <button onClick={handleCheckout} disabled={checkoutDisabled}
                                    className="w-full py-3 bg-[#0D2B20] text-amber-400 font-black text-sm rounded-xl hover:bg-[#1a4433] transition flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg hover:scale-[1.01] active:scale-[0.99]">
                                    <ChevronRight size={18} />Proses &amp; Cetak Struk
                                </button>
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

            {/* ── MOBILE FAB ─────────────────────────────────── */}
            <AnimatePresence>
                {!mobileCartOpen && items.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="fixed lg:hidden bottom-6 w-full px-4 z-20">
                        <button onClick={() => setMobileCartOpen(true)}
                            className="w-full bg-[#0D2B20] text-amber-400 py-3.5 rounded-2xl shadow-2xl flex items-center justify-between px-6 border border-amber-500/30">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <ShoppingCart size={20} />
                                    <span className="absolute -top-2 -right-3 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{items.length}</span>
                                </div>
                                <span className="font-bold text-sm ml-2">Lihat Tray ({items.length} item)</span>
                            </div>
                            <span className="font-black text-amber-400 text-sm">{formatRp(orderTotal)}</span>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── VARIANT MODAL ─────────────────────────────── */}
            <AnimatePresence>
                {variantProduct && (
                    <VariantModal
                        product={variantProduct}
                        onConfirm={handleVariantConfirm}
                        onClose={() => setVariantProduct(null)}
                    />
                )}
            </AnimatePresence>

            {/* ── RECEIPT MODAL ─────────────────────────────── */}
            <AnimatePresence>
                {showReceipt && lastOrder && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                        <ReceiptModal order={lastOrder} onClose={() => { setShowReceipt(false); setLastOrder(null); }} />
                    </div>
                )}
            </AnimatePresence>

            {/* ── HELD ORDERS PANEL ─────────────────────────── */}
            <AnimatePresence>
                {showHeldOrders && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} onClick={() => setShowHeldOrders(false)} className="fixed inset-0 bg-black z-40" />
                        <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed right-0 top-0 h-full w-80 bg-white z-50 shadow-2xl flex flex-col">
                            <div className="px-4 py-3 border-b border-gray-100 bg-amber-50 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Pause size={16} className="text-amber-600" />
                                    <span className="font-bold text-gray-800 text-sm">Pesanan Ditahan ({heldOrders.length})</span>
                                </div>
                                <button onClick={() => setShowHeldOrders(false)} className="p-1 hover:bg-gray-200 rounded-full"><X size={16} /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                                {heldOrders.length === 0 && <div className="text-center text-gray-400 py-10 text-sm">Tidak ada pesanan ditahan.</div>}
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
                                                <div key={i}>{it.quantity}x {it.name}
                                                    {it.variants?.size && <span className="text-amber-600 ml-1">({it.variants.size})</span>}
                                                </div>
                                            ))}
                                            {held.items.length > 3 && <div className="text-gray-400">+{held.items.length - 3} lainnya</div>}
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleResumeOrder(held.id)}
                                                className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-[#0D2B20] text-amber-400 rounded-lg text-xs font-bold hover:bg-[#1a4433] transition">
                                                <Play size={11} /> Lanjutkan
                                            </button>
                                            <button onClick={() => deleteHeldOrder(held.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"><Trash size={14} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* ── CONFIRM MODALS ────────────────────────────── */}
            <ConfirmModal isOpen={confirmClearCart} title="Kosongkan Keranjang?" message="Semua item akan dihapus. Gunakan Hold untuk menyimpan pesanan." confirmLabel="Ya, Kosongkan" danger
                onConfirm={() => { clearCart(); setConfirmClearCart(false); toast.info('Keranjang dikosongkan.'); }}
                onCancel={() => setConfirmClearCart(false)} />
            <ConfirmModal isOpen={confirmLogout} title="Keluar dari POS?" message={`Anda akan keluar sebagai ${user?.name}.`} confirmLabel="Ya, Keluar" danger
                onConfirm={() => { setConfirmLogout(false); addLog('LOGOUT', `${user?.name} logged out`, user?.name || ''); logout(); router.push('/admin'); }}
                onCancel={() => setConfirmLogout(false)} />
                
            <AnimatePresence>
                {confirmCloseStore && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} 
                            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                            <h3 className="text-xl font-black text-[#0D2B20] mb-2">Tutup Shift Kasir</h3>
                            <p className="text-sm text-gray-500 mb-4">Silakan hitung uang fisik di laci kasir dan masukkan totalnya untuk pencocokan.</p>
                            
                            <div className="space-y-3 mb-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Uang Fisik Aktual (Actual Cash)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">Rp</span>
                                        <input type="tel" 
                                            value={actualCash} 
                                            onChange={e => setActualCash(e.target.value.replace(/[^0-9]/g, ''))}
                                            placeholder="Total uang di laci"
                                            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#0D2B20] font-bold" 
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Catatan Tambahan (Opsional)</label>
                                    <input type="text" 
                                        value={closeNotes} 
                                        onChange={e => setCloseNotes(e.target.value)}
                                        placeholder="Alasan selisih uang, pengeluaran darurat, dll."
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#0D2B20] text-sm" 
                                    />
                                </div>
                            </div>
                            
                            <div className="flex gap-2 justify-end">
                                <button onClick={() => setConfirmCloseStore(false)}
                                    className="px-4 py-2 rounded-lg text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition">
                                    Batal
                                </button>
                                <button onClick={() => { setConfirmCloseStore(false); handleTutupToko(); }}
                                    disabled={!actualCash}
                                    className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition">
                                    Tutup Shift
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ── SHIFT SUMMARY ─────────────────────────────── */}
            {shiftSummary && <ShiftSummaryModal isOpen={!!shiftSummary} session={shiftSummary} orders={orders} onClose={() => setShiftSummary(null)} />}
        </div>
    );
}

// ── Product Card ──────────────────────────────────────────────
function ProductCard({ product, cartQty, isRecommended, onAdd }: {
    product: ExtendedProduct;
    cartQty: number;
    isRecommended?: boolean;
    onAdd: () => void;
}) {
    const isOutOfStock = product.stock <= 0;
    const isLimited = !isOutOfStock && product.stock <= (product.minStockThreshold || 5);

    return (
        <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className={`bg-white rounded-xl overflow-hidden shadow-sm border transition-all group relative ${isOutOfStock ? 'border-gray-200 opacity-60' :
                isRecommended ? 'border-amber-400 shadow-lg shadow-amber-200 ring-2 ring-amber-300/50' :
                    cartQty > 0 ? 'border-amber-400 shadow-md shadow-amber-100' : 'border-gray-200 hover:border-[#0D2B20]/30 hover:shadow-md'}`}>

            <div className="aspect-square relative overflow-hidden bg-gray-100">
                {product.image
                    ? <Image src={product.image} alt={product.name} fill className={`object-cover transition duration-500 group-hover:scale-110 ${isOutOfStock ? 'grayscale' : ''}`} unoptimized />
                    : <div className="w-full h-full flex items-center justify-center text-gray-300 text-3xl font-bold">{product.name[0]}</div>
                }
                <div className="absolute top-1.5 left-1.5 flex flex-col gap-1">
                    {isRecommended && !isOutOfStock && <span className="bg-gradient-to-r from-amber-400 to-yellow-300 text-[#0D2B20] text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-sm">✨ Cocok!</span>}
                    {isOutOfStock && <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">HABIS</span>}
                    {isLimited && <span className="bg-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">Sisa {product.stock}</span>}
                </div>
                {cartQty > 0 && (
                    <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-[#0D2B20] rounded-full flex items-center justify-center">
                        <span className="text-amber-400 text-[10px] font-black">{cartQty}</span>
                    </div>
                )}
            </div>

            <div className="p-2">
                <p className="text-[11px] font-bold text-gray-800 truncate leading-tight">{product.name}</p>
                <p className="text-[10px] font-bold text-amber-600 mt-0.5">{formatRp(product.price)}</p>
                <button onClick={onAdd} disabled={isOutOfStock}
                    className="w-full mt-1.5 h-6 flex items-center justify-center gap-1 bg-[#0D2B20] hover:bg-[#1a4433] text-amber-400 rounded-lg transition text-[10px] font-bold disabled:opacity-40 disabled:cursor-not-allowed">
                    <Plus size={10} /> {cartQty > 0 ? `Tambah Lagi (${cartQty})` : 'Tambah'}
                </button>
            </div>
        </motion.div>
    );
}
