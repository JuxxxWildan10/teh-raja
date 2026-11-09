"use client";

/**
 * ============================================================================
 * FILE: app/pos/page.tsx
 * ============================================================================
 * @file POS (Point of Sale) Page
 * @description Halaman utama Kasir untuk memproses pesanan, memilih metode pembayaran, dan sinkronisasi data offline-first.
 * Menggunakan Zustand untuk state management lokal dan Firebase untuk sinkronisasi Realtime.
 *
 * FUNGSI UTAMA (Dirancang untuk Operasional Kasir Merangkap Barista di Kedai Teh Raja):
 * 1. **Katalog & Keranjang Kasir**: Memilih produk dan varian (Ukuran M/L, Suhu, % Gula, Level Es), hold/resume pesanan.
 * 2. **Multi-Metode Pembayaran**:
 *    - Tunai (*Quick Cash* Uang Pas, 10rb, 20rb, 50rb, 100rb) dengan hitung kembalian otomatis.
 *    - QRIS Dinamis (memanggil `/api/payment/qris`).
 *    - Transfer Bank.
 * 3. **Pemotongan Stok & Resep BOM Otomatis (`handleCheckout`)**:
 *    Saat pesanan dibayar, sistem memanggil `decrementStock` dan `decrementIngredientsForOrder` untuk memotong bahan baku gudang.
 * 4. **Laci Antrean & Struk Terpadu (3 Tab: `Masuk`, `Sedang Diracik`, `Selesai`)**:
 *    Memungkinkan kasir merangkap barista memantau pesanan dari `/menu`, melihat detail racikan, mengubah status pesanan, dan mencetak struk dalam 1 layar.
 * 5. **Manajemen Shift & Kas Keluar (`Petty Cash`)**:
 *    Buka shift (modal awal), catat pengeluaran laci kasir, dan tutup shift (`ShiftSummaryModal`).
 * ============================================================================
 */

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
    useAuthStore, useCartStore, useProductStore, useSalesStore,
    usePromoStore, useCustomerStore, useInventoryStore, useExpenseStore, useStoreConfigStore,
    SHOP_CLOSE_PRESETS, Order, ExtendedProduct, formatVariantLabel, ExpenseCategory, EXPENSE_CATEGORIES, POINTS_REDEEM_VALUE,
    getEnrichedSessions, isOrderInSession, isExpenseInSession, getTodayDateKey, toLocalDateKey, getInsufficientBomIngredients,
    getNextCustomerLabel, getVariantUnitPrice, getBundlePromoStatus, countOrderCupQuantity, getKresekPackagingLabel
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
    Wand2, Sparkles, ChevronDown, Pause, Play, Trash, Tag, Percent, Mic, Loader2,
    CheckCircle, RefreshCw, Bell, Printer, ChefHat, Lock, Unlock
} from "lucide-react";

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

export default function POSPage() {
    const router = useRouter();
    const { user, logout, isAdvancedUnlocked } = useAuthStore();
    const { items, addToCart, removeFromCart, updateQuantity, updateNote, clearCart, total } = useCartStore();
    const { products, decrementStock } = useProductStore();
    const { addOrder, addLog, isStoreOpen, openStore, closeStore, heldOrders, holdOrder, resumeOrder, deleteHeldOrder, orders, updateOrderStatus, branchId, branchName, sessions, currentSessionId } = useSalesStore();
    const { promos, getApplicablePromo } = usePromoStore();
    const { findByPhone, addCustomer, addPoints, redeemPoints } = useCustomerStore();
    const { decrementIngredientsForOrder, ingredients } = useInventoryStore();
    const { isOnlineOrderOpen, closedBadge, openOnlineStore, closeOnlineStore } = useStoreConfigStore();
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
    const [qrisUrl, setQrisUrl] = useState<string | null>(null);

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

    // AI Upsell CRM
    const [upsellHint, setUpsellHint] = useState<string | null>(null);
    const [, setIsLoadingUpsell] = useState(false);

    // Confirm Modals
    const [confirmClearCart, setConfirmClearCart] = useState(false);
    const [confirmLogout, setConfirmLogout] = useState(false);
    const [confirmCloseStore, setConfirmCloseStore] = useState(false);

    // Shift summary
    const [shiftSummary, setShiftSummary] = useState<import("@/lib/store").StoreSession | null>(null);

    // Hold Order panel
    const [showHeldOrders, setShowHeldOrders] = useState(false);

    // Orders Drawer (Masuk, Sedang Diracik, Selesai Hari Ini)
    const [showIncomingOrders, setShowIncomingOrders] = useState(false);
    const [orderDrawerTab, setOrderDrawerTab] = useState<'incoming' | 'processing' | 'completed'>('incoming');
    // Filter tampilan ringkasan & struk selesai di POS: 'active_shift' | 'all_today' | id sesi spesifik
    const [posShiftScope, setPosShiftScope] = useState<string>('active_shift');

    // Enriched multi-shift info hari ini (Shift 1, Shift 2, dst.)
    const enrichedSessions = useMemo(() => getEnrichedSessions(sessions), [sessions]);
    const todayDateKey = getTodayDateKey();
    const todaySessions = useMemo(
        () => enrichedSessions.filter(s => s.dateKey === todayDateKey),
        [enrichedSessions, todayDateKey]
    );
    const activeEnrichedSession = useMemo(
        () => enrichedSessions.find(s => s.id === currentSessionId) || null,
        [enrichedSessions, currentSessionId]
    );

    const incomingOrders = useMemo(() => {
        return orders
            .filter(o => !o.status || o.status === 'pending' || o.status === 'awaiting_payment')
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [orders]);

    const processingOrders = useMemo(() => {
        return orders
            .filter(o => o.status === 'processing')
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [orders]);

    const todayOrders = useMemo(() => {
        return orders.filter(o => toLocalDateKey(o.date) === todayDateKey && o.status !== 'cancelled');
    }, [orders, todayDateKey]);

    const activeShiftOrders = useMemo(() => {
        if (!activeEnrichedSession) return todayOrders;
        return orders.filter(o => o.status !== 'cancelled' && isOrderInSession(o, activeEnrichedSession));
    }, [orders, activeEnrichedSession, todayOrders]);

    // Filter pesanan selesai berdasarkan sesi shift yang dipilih pada drawer POS
    const completedTodayOrders = useMemo(() => {
        const baseCompleted = orders.filter(o => o.status === 'completed');
        let filtered = baseCompleted;
        if (posShiftScope === 'active_shift' && activeEnrichedSession) {
            filtered = baseCompleted.filter(o => isOrderInSession(o, activeEnrichedSession));
        } else if (posShiftScope === 'all_today' || !posShiftScope || posShiftScope === 'active_shift') {
            filtered = baseCompleted.filter(o => toLocalDateKey(o.date) === todayDateKey);
        } else {
            const targetSession = enrichedSessions.find(s => s.id === posShiftScope);
            filtered = targetSession
                ? baseCompleted.filter(o => isOrderInSession(o, targetSession))
                : baseCompleted.filter(o => toLocalDateKey(o.date) === todayDateKey);
        }
        return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [orders, posShiftScope, activeEnrichedSession, todayDateKey, enrichedSessions]);

    const todayRevenue = useMemo(() => {
        return todayOrders.reduce((sum, o) => sum + o.total, 0);
    }, [todayOrders]);

    const activeShiftRevenue = useMemo(() => {
        return activeShiftOrders.reduce((sum, o) => sum + o.total, 0);
    }, [activeShiftOrders]);

    // Petty Cash / Kas Keluar Modal
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [expenseAmount, setExpenseAmount] = useState('');
    const [expenseDesc, setExpenseDesc] = useState('');
    const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory>('bahan_tambahan');

    // ── FUNGSI PENCATATAN KAS KELUAR / PETTY CASH DARI LACI KASIR ──
    // Mencatat uang tunai yang diambil dari laci kasir untuk belanja mendadak (es batu, galon, gas)
    // agar ekspektasi uang laci saat tutup shift otomatis dikurangi dan tidak tekor.
    const handleAddExpense = () => {
        const amount = parseFloat(expenseAmount.replace(/\D/g, '')) || 0;
        if (amount <= 0 || !expenseDesc.trim()) {
            toast.error("Masukkan keterangan dan nominal pengeluaran!");
            return;
        }
        useExpenseStore.getState().addExpense({
            amount,
            description: expenseDesc.trim(),
            category: expenseCategory,
            paidVia: 'kas_laci',
            cashierName: user?.name || 'Kasir',
            sessionId: currentSessionId || undefined,
        });
        addLog("EXPENSE_ADDED", `Kas Keluar: ${expenseDesc.trim()} (${formatRp(amount)})`, user?.name || 'Kasir');
        toast.success(`Kas keluar ${formatRp(amount)} berhasil dicatat!`);
        setExpenseAmount('');
        setExpenseDesc('');
        setShowExpenseModal(false);
    };

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

    const [authHydrated, setAuthHydrated] = useState(false);
    useEffect(() => {
        if (useAuthStore.persist.hasHydrated()) {
            setAuthHydrated(true);
        } else {
            const unsub = useAuthStore.persist.onFinishHydration(() => setAuthHydrated(true));
            const fallback = setTimeout(() => setAuthHydrated(true), 600);
            return () => { unsub(); clearTimeout(fallback); };
        }
    }, []);

    useEffect(() => {
        if (isClient && authHydrated && !user) router.replace('/menu');
    }, [isClient, authHydrated, user, router]);

    const searchRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setMobileCartOpen(false);
                setShowReceipt(false);
                setShowHeldOrders(false);
                setShowIncomingOrders(false);
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

    // ── Cart & Loyalty Calculations ───────────────────────────
    const nextCustomerLabel = useMemo(
        () => getNextCustomerLabel([...orders, ...heldOrders]),
        [orders, heldOrders]
    );
    const subtotal = total();
    // Promo bundle produk (misal Imperial Jasmine 3 cup M = 10rb) tetap berlaku otomatis di Mode PKL
    const applicablePromo = getApplicablePromo(subtotal, items, isAdvancedUnlocked);
    const bundleNudge = useMemo(() => {
        const candidate = promos
            .filter(p => p.isActive && p.type === 'bundle' && (isAdvancedUnlocked || p.alwaysApplyInPkl || p.type === 'bundle'))
            .map(p => ({ promo: p, ...getBundlePromoStatus(p, items) }))
            .find(st => st.eligibleQty > 0 && st.remainingForNextBundle > 0);
        return candidate || null;
    }, [promos, items, isAdvancedUnlocked]);

    const discountAmount = useMemo(() => {
        if (discountMode === 'none' && applicablePromo) {
            return applicablePromo.discountAmount;
        }
        const v = parseFloat(discountValue) || 0;
        if (discountMode === 'amount') return Math.min(v, subtotal);
        if (discountMode === 'percent') return Math.min(Math.round(subtotal * v / 100), subtotal);
        return 0;
    }, [discountMode, discountValue, subtotal, applicablePromo]);

    const customer = useMemo(() => findByPhone(customerPhone), [customerPhone, findByPhone]);

    // Auto-fill customer name when phone matches a member
    useEffect(() => {
        if (customer && !customerName.trim()) {
            setCustomerName(customer.name);
        }
        if (!customer) {
            setUsePoints(false);
        }
    }, [customer, customerName]);

    const maxPointsRpValue = customer ? customer.points * POINTS_REDEEM_VALUE : 0;
    const afterDiscountSubtotal = Math.max(0, subtotal - discountAmount);
    const pointsDiscount = (usePoints && customer) ? Math.min(maxPointsRpValue, afterDiscountSubtotal) : 0;
    const pointsToRedeem = Math.ceil(pointsDiscount / POINTS_REDEEM_VALUE);

    // AI Smart Upsell: Triggered when a known customer + items in cart
    useEffect(() => {
        if (!customer || items.length === 0) { setUpsellHint(null); return; }
        const controller = new AbortController();
        const timer = setTimeout(async () => {
            setIsLoadingUpsell(true);
            try {
                const orderHistory = orders.filter(o => o.customerPhone === customer.phone || o.customerName === customer.name);
                const res = await fetch('/api/ai/crm-upsell', {
                    signal: controller.signal,
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        customer,
                        orderHistory: orderHistory.slice(-10),
                        currentCart: items,
                        availableProducts: products.filter(p => p.isAvailable).slice(0, 8)
                    })
                });
                if (!res.ok) return;
                const data = await res.json();
                if (data.suggestion) setUpsellHint(data.suggestion);
            } catch (e: any) {
                if (e.name !== 'AbortError') console.warn('[Upsell]', e.message);
            } finally {
                setIsLoadingUpsell(false);
            }
        }, 700);
        return () => { clearTimeout(timer); controller.abort(); };
    }, [customer, items, orders, products]);

    const orderTotal = Math.max(0, subtotal - discountAmount - pointsDiscount);
    const cashIn = parseFloat(cashReceived.replace(/\D/g, '')) || 0;
    const change = paymentMethod === 'cash' ? Math.max(0, cashIn - orderTotal) : 0;
    const isInsufficientCash = paymentMethod === 'cash' && cashIn < orderTotal && cashIn > 0;
    const cartCups = useMemo(() => countOrderCupQuantity(items, products), [items, products]);
    const cartKresekLabel = useMemo(() => getKresekPackagingLabel(cartCups), [cartCups]);

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
        const resolvedHoldName = customerName.trim() || getNextCustomerLabel([...orders, ...heldOrders]);
        const heldDiscountType: Order['discountType'] = discountMode !== 'none'
            ? discountMode
            : (applicablePromo
                ? ((applicablePromo.promo.type === 'percent' || applicablePromo.promo.type === 'happy_hour') ? 'percent' : 'amount')
                : undefined);
        const heldDiscountValue = discountMode !== 'none'
            ? parseFloat(discountValue)
            : (applicablePromo
                ? (heldDiscountType === 'percent' ? applicablePromo.promo.value : applicablePromo.discountAmount)
                : undefined);
        const heldOrder: Order = {
            id: nanoid(),
            date: new Date().toISOString(),
            items: items.map(it => ({ ...it })),
            total: orderTotal, subtotal,
            discount: discountAmount,
            discountType: heldDiscountType,
            discountValue: heldDiscountValue,
            promoName: discountMode === 'none' && applicablePromo ? applicablePromo.promo.name : undefined,
            customerName: resolvedHoldName,
            customerPhone: customerPhone.trim() || undefined,
            cashierName: user?.name || 'Kasir',
            status: 'pending', orderType,
            tableNumber: tableNumber || undefined,
            branchId: branchId || 'main',
        };
        holdOrder(heldOrder);
        clearCart();
        setCustomerName(''); setCustomerPhone(''); setTableNumber(''); setCashReceived('');
        setDiscountMode('none'); setDiscountValue('');
        toast.info(`Pesanan "${heldOrder.customerName}" di-hold.`);
    }, [items, orderTotal, subtotal, discountAmount, discountMode, discountValue, applicablePromo,
        customerName, customerPhone, orderType, tableNumber, user, branchId, orders, heldOrders, holdOrder, clearCart, toast]);

    const handleResumeOrder = useCallback((heldId: string) => {
        const held = resumeOrder(heldId);
        if (!held) return;
        clearCart();
        held.items.forEach(it => {
            const product = products.find(p => p.id === it.id);
            if (!product) return;
            for (let i = 0; i < it.quantity; i++) {
                addToCart(product, it.variants, it.finalPrice ?? it.price);
            }
            if (it.note && it.cartItemId) {
                setTimeout(() => updateNote(it.cartItemId!, it.note!), 50);
            }
        });
        setCustomerName(held.customerName || '');
        setCustomerPhone(held.customerPhone || '');
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
            toast.error('Browser Anda tidak mendukung Voice Command (gunakan Chrome/Edge).');
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
                            const finalPrice = getVariantUnitPrice(product, parsedItem.variants?.size || 'M');
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
                console.warn(err);
                toast.error('Gagal memproses suara.');
            } finally {
                setIsProcessingVoice(false);
                setIsListening(false);
            }
        };

        recognition.onerror = () => {
            toast.error('Gagal mendengarkan suara.');
            setIsProcessingVoice(false);
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognition.start();
    }, [isListening, isProcessingVoice, products, addToCart, toast]);

    // ── FUNGSI UTAMA CHECKOUT TRANSAKSI KASIR & PEMOTONGAN RESEP BOM ──
    // 1. Memvalidasi status buka shift dan kecukupan uang tunai / konfirmasi QRIS.
    //    (Jika nama pelanggan kosong, otomatis memakai label Customer 1, 2, 3, ... harian).
    // 2. Menyimpan objek pesanan (`addOrder`) ke IndexedDB lokal & Firebase Realtime Database.
    // 3. Memotong stok produk (`decrementStock`) dan memotong takaran bahan baku sesuai resep BOM (`decrementIngredientsForOrder`).
    // 4. Membuka modal struk (`ReceiptModal`) untuk cetak Bluetooth 58mm / Browser / WhatsApp.
    const handleCheckout = useCallback(() => {
        if (!isStoreOpen) { toast.error('Toko harus dibuka terlebih dahulu!'); return; }
        if (items.length === 0) return;
        const resolvedCustomerName = customerName.trim() || getNextCustomerLabel([...orders, ...heldOrders]);
        if (paymentMethod === 'cash' && cashIn < orderTotal) {
            toast.error(`Uang kurang! Perlu ${formatRp(orderTotal - cashIn)} lagi.`);
            return;
        }
        if (paymentMethod === 'qris' && !qrisSuccess) {
            toast.error(`Selesaikan pembayaran QRIS terlebih dahulu.`);
            return;
        }

        // Validasi akumulasi kecukupan bahan baku BOM untuk seluruh isi keranjang
        const bomShortages = getInsufficientBomIngredients(items, products, ingredients);
        if (bomShortages.length > 0) {
            toast.error(
                `Stok bahan baku tidak mencukupi: ${bomShortages.map(s => `${s.name} (butuh ${s.needed}, sisa ${s.available} ${s.unit})`).join(', ')}`
            );
            return;
        }

        // Process Loyalty Points (hanya aktif pada Mode Pengembangan Lanjutan)
        const cleanPhone = customerPhone.trim();
        if (isAdvancedUnlocked) {
            if (usePoints && customer && pointsToRedeem > 0) {
                redeemPoints(cleanPhone, pointsToRedeem);
            }
            if (cleanPhone) {
                if (!customer) {
                    addCustomer({
                        id: nanoid(),
                        name: resolvedCustomerName,
                        phone: cleanPhone,
                        points: 0,
                        totalSpent: 0,
                        createdAt: new Date().toISOString()
                    });
                }
                addPoints(cleanPhone, orderTotal);
            }
        }

        const totalOrderDiscount = discountAmount + pointsDiscount;
        const resolvedDiscountType: Order['discountType'] = totalOrderDiscount > 0
            ? (discountMode !== 'none'
                ? discountMode
                : (pointsDiscount === 0 && applicablePromo && (applicablePromo.promo.type === 'percent' || applicablePromo.promo.type === 'happy_hour')
                    ? 'percent'
                    : 'amount'))
            : undefined;
        const resolvedDiscountValue = totalOrderDiscount > 0
            ? (discountMode !== 'none'
                ? (parseFloat(discountValue) || 0)
                : (resolvedDiscountType === 'percent' && applicablePromo ? applicablePromo.promo.value : totalOrderDiscount))
            : undefined;
        const resolvedPromoName = discountMode === 'none'
            ? (applicablePromo
                ? `${applicablePromo.promo.name}${pointsDiscount > 0 ? ' + Poin' : ''}`
                : (pointsDiscount > 0 ? `Tukar ${pointsToRedeem} Poin` : undefined))
            : undefined;

        const newOrder: Order = {
            id: nanoid(),
            date: new Date().toISOString(),
            items: items.map(it => ({ ...it })),
            subtotal,
            discount: totalOrderDiscount > 0 ? totalOrderDiscount : undefined,
            discountType: resolvedDiscountType,
            discountValue: resolvedDiscountValue,
            promoName: resolvedPromoName,
            total: orderTotal,
            customerName: resolvedCustomerName,
            customerPhone: cleanPhone || undefined,
            cashierName: user?.name || 'Kasir',
            status: 'processing',
            paymentMethod,
            cashReceived: paymentMethod === 'cash' ? cashIn : undefined,
            changeAmount: paymentMethod === 'cash' ? change : undefined,
            tableNumber: tableNumber.trim() || undefined,
            orderType,
            branchId: branchId || 'main',
            sessionId: currentSessionId || undefined,
        };
        addOrder(newOrder);
        addLog('SALE', `Order #${newOrder.id.slice(0, 6)} (${resolvedCustomerName}) - ${formatRp(orderTotal)} via ${paymentMethod}`, user?.name || 'Kasir');
        decrementStock(items);
        decrementIngredientsForOrder(items, products);
        setLastOrder(newOrder);
        setShowReceipt(true);
        clearCart();
        setCustomerName(''); setCustomerPhone(''); setTableNumber(''); setCashReceived('');
        setDiscountMode('none'); setDiscountValue(''); setUsePoints(false);
        setQrisGenerated(false); setQrisSuccess(false); setUpsellHint(null); setQrisUrl(null);
        setMobileCartOpen(false);
        toast.success(
            isAdvancedUnlocked
                ? `Order #${newOrder.id.slice(0, 6)} (${resolvedCustomerName}) berhasil! Dikirim ke KDS (${formatRp(orderTotal)})`
                : `Order #${newOrder.id.slice(0, 6)} (${resolvedCustomerName}) berhasil! Stok bahan baku (BOM) otomatis dipotong (${formatRp(orderTotal)})`
        );
    }, [isStoreOpen, items, customerName, orders, heldOrders, paymentMethod, cashIn, qrisSuccess, orderTotal, subtotal,
        discountAmount, pointsDiscount, pointsToRedeem, discountMode, discountValue, applicablePromo, change, tableNumber, orderType, user, branchId, currentSessionId,
        usePoints, customer, customerPhone, redeemPoints, addCustomer, addPoints,
        addOrder, addLog, decrementStock, decrementIngredientsForOrder, products, ingredients, clearCart, toast, isAdvancedUnlocked]);

    // ── FUNGSI TUTUP SHIFT KASIR & REKONSILIASI UANG LACI ──
    // Membandingkan uang tunai fisik yang dihitung kasir (`actualCash`) dengan
    // rumus `expectedCash = Modal Awal + Penjualan Tunai - Kas Keluar (Petty Cash)`
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

    const checkoutDisabled = items.length === 0
        || (paymentMethod === 'cash' && (cashIn < orderTotal || (orderTotal > 0 && cashIn === 0)));
    const checkoutDisabledReason = paymentMethod === 'cash' && orderTotal > 0 && cashIn === 0
        ? 'Masukkan nominal uang diterima'
        : paymentMethod === 'cash' && cashIn < orderTotal
            ? `Uang kurang ${formatRp(orderTotal - cashIn)}`
            : '';

    if (!isClient || !user) return null;

    return (
        <div className="h-[100dvh] bg-gray-100 flex flex-col overflow-hidden select-none">

            {/* ── TOP BAR ───────────────────────────────────── */}
            <header className="h-12 bg-[#0D2B20] text-white flex items-center justify-between px-2.5 sm:px-4 gap-2 shadow-xl z-20 flex-shrink-0">
                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                    <Link href="/" className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap">
                        <div className="w-7 h-7 rounded-full bg-amber-400 flex items-center justify-center flex-shrink-0">
                            <Leaf size={14} className="text-[#0D2B20]" />
                        </div>
                        <span className="hidden xs:inline sm:inline font-bold text-amber-400 tracking-wider sm:tracking-widest text-xs sm:text-sm uppercase">Teh Raja</span>
                    </Link>
                    <span className="hidden md:block text-white/40 text-xs border-l border-white/20 pl-3 tracking-wider uppercase whitespace-nowrap">
                        POS · {branchName || 'Cabang Utama'}
                    </span>
                    <button
                        type="button"
                        onClick={() => setPosShiftScope(prev => prev === 'active_shift' ? 'all_today' : 'active_shift')}
                        title="Klik untuk beralih tampilan antara Omzet Shift Aktif vs Gabungan Semua Shift Hari Ini"
                        className="hidden lg:flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-lg text-xs font-mono text-amber-300 border border-amber-400/20 ml-2 transition cursor-pointer whitespace-nowrap"
                    >
                        <ShoppingBag size={12} className="text-amber-400" />
                        {posShiftScope === 'active_shift' && activeEnrichedSession ? (
                            <span>
                                {activeEnrichedSession.shiftBadge}: <strong>{activeShiftOrders.length}</strong> Order · Rp {activeShiftRevenue.toLocaleString('id-ID')}
                            </span>
                        ) : (
                            <span>
                                Hari Ini{todaySessions.length > 1 ? ` (${todaySessions.length} Shift)` : ''}: <strong>{todayOrders.length}</strong> Order · Rp {todayRevenue.toLocaleString('id-ID')}
                            </span>
                        )}
                    </button>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide min-w-0 py-1">
                    {/* Indikator & Sakelar Cepat Order Online Pelanggan (/menu) */}
                    <button
                        type="button"
                        onClick={() => {
                            if (user.role !== 'admin') {
                                toast.info(
                                    isOnlineOrderOpen
                                        ? 'Menu Online Pelanggan (/menu) saat ini sedang BUKA. Hanya Admin yang dapat mengunci/menutup kedai.'
                                        : `Menu Online Pelanggan sedang DIKUNCI oleh Admin (${closedBadge}).`
                                );
                                return;
                            }
                            if (isOnlineOrderOpen) {
                                const preset = SHOP_CLOSE_PRESETS[1]; // Kedai Sedang Tutup
                                closeOnlineStore({
                                    closedBadge: preset.badge,
                                    closedMessage: preset.message,
                                    reopenInfo: preset.reopenHint,
                                    updatedBy: user.name,
                                });
                                addLog('STORE_ONLINE_LOCK', `Menu online pelanggan ditutup dari POS (${preset.badge})`, user.name);
                                toast.info(`🔒 Menu online pelanggan ditutup (${preset.badge}). Untuk pesan libur khusus, atur di halaman Admin.`);
                            } else {
                                openOnlineStore(user.name);
                                addLog('STORE_ONLINE_OPEN', 'Menu online pelanggan dibuka kembali dari POS', user.name);
                                toast.success('🔓 Menu online pelanggan kembali BUKA!');
                            }
                        }}
                        className={`flex items-center gap-1 text-[10px] sm:text-[11px] font-bold px-2 sm:px-2.5 py-1 rounded-lg border transition flex-shrink-0 whitespace-nowrap ${
                            isOnlineOrderOpen
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40 hover:bg-emerald-500/30'
                                : 'bg-red-500/25 text-red-200 border-red-400/50 hover:bg-red-500/35'
                        }`}
                        title={
                            user.role === 'admin'
                                ? (isOnlineOrderOpen ? 'Menu Online Buka — Klik untuk mengunci menu pelanggan' : `Menu Online Tutup (${closedBadge}) — Klik untuk membuka menu pelanggan`)
                                : (isOnlineOrderOpen ? 'Status Menu Online Pelanggan: Buka' : `Status Menu Online Pelanggan: Tutup (${closedBadge})`)
                        }
                    >
                        {isOnlineOrderOpen ? <Unlock size={11} /> : <Lock size={11} />}
                        <span className="hidden xl:inline">{isOnlineOrderOpen ? 'Web Order: Buka' : `Web Tutup (${closedBadge})`}</span>
                        <span className="hidden sm:inline xl:hidden">{isOnlineOrderOpen ? 'Web Buka' : 'Web Tutup'}</span>
                        <span className="sm:hidden">{isOnlineOrderOpen ? 'Buka' : 'Tutup'}</span>
                    </button>

                    {/* Always-visible Order Queue & History Drawer Button */}
                    <button
                        onClick={() => {
                            if (incomingOrders.length > 0) setOrderDrawerTab('incoming');
                            else if (processingOrders.length > 0) setOrderDrawerTab('processing');
                            setShowIncomingOrders(true);
                        }}
                        className={`relative flex items-center gap-1 sm:gap-1.5 text-xs font-bold px-2 sm:px-2.5 py-1 rounded-lg transition shadow-sm border flex-shrink-0 whitespace-nowrap ${
                            incomingOrders.length > 0
                                ? 'bg-amber-500/25 text-amber-300 border-amber-400/60 animate-pulse'
                                : 'bg-white/10 text-white/90 border-white/15 hover:bg-white/20'
                        }`}
                        title="Antrean Pesanan Online, Sedang Diracik, & Riwayat Struk"
                    >
                        <Bell size={12} className={incomingOrders.length > 0 ? "text-amber-400 animate-bounce" : "text-amber-400"} />
                        <span className="hidden sm:inline">Antrean &amp; Struk</span>
                        <span className="bg-amber-400 text-[#0D2B20] text-[9px] font-black px-1.5 py-0.5 rounded-full">
                            {incomingOrders.length + processingOrders.length}
                        </span>
                    </button>

                    {heldOrders.length > 0 && (
                        <button onClick={() => setShowHeldOrders(true)}
                            className="relative flex items-center gap-1 text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-1 rounded-lg hover:bg-amber-500/30 transition flex-shrink-0 whitespace-nowrap">
                            <Pause size={12} />
                            <span className="hidden sm:inline">Hold</span>
                            <span className="bg-amber-400 text-[#0D2B20] text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">{heldOrders.length}</span>
                        </button>
                    )}

                    <div className="hidden md:flex items-center gap-2 text-xs text-white/60 flex-shrink-0 whitespace-nowrap">
                        <div className={`w-2 h-2 rounded-full animate-pulse ${isStoreOpen ? 'bg-green-400' : 'bg-red-400'}`} />
                        <span>{user.name}</span>
                    </div>

                    {isStoreOpen && (
                        <>
                            <button onClick={() => setShowExpenseModal(true)}
                                className="text-[10px] sm:text-xs font-bold bg-white/10 hover:bg-white/20 text-amber-300 border border-amber-400/30 transition px-2 sm:px-2.5 py-1 rounded-md flex items-center gap-1 shadow-sm flex-shrink-0 whitespace-nowrap">
                                <span>💸</span>
                                <span className="hidden sm:inline">Kas Keluar</span>
                                <span className="sm:hidden">Kas</span>
                            </button>
                            <button onClick={() => setConfirmCloseStore(true)}
                                className="text-[10px] sm:text-xs font-bold bg-amber-400 text-[#0D2B20] hover:bg-amber-300 transition px-2 sm:px-2.5 py-1 rounded-md shadow-sm flex-shrink-0 whitespace-nowrap">
                                <span className="hidden sm:inline">Tutup Shift</span>
                                <span className="sm:hidden">Shift</span>
                            </button>
                        </>
                    )}

                    {isAdvancedUnlocked && (
                        <Link href="/kds" className="hidden sm:flex items-center gap-1 text-xs text-white/70 hover:text-amber-300 transition px-2 py-1 rounded hover:bg-white/10 flex-shrink-0 whitespace-nowrap" title="Kitchen Display System">
                            <ChefHat size={13} />
                            <span className="hidden md:inline">KDS</span>
                        </Link>
                    )}

                    <Link href="/admin" className="flex items-center gap-1 text-[10px] sm:text-xs text-white/70 hover:text-white transition px-2 py-1 rounded hover:bg-white/10 flex-shrink-0 whitespace-nowrap" title="Dashboard Admin">
                        <LayoutDashboard size={13} />
                        <span className="hidden sm:inline">Admin</span>
                    </Link>

                    <button onClick={() => setConfirmLogout(true)}
                        className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition px-2 py-1 rounded hover:bg-red-500/10 flex-shrink-0 whitespace-nowrap" title="Keluar">
                        <LogOut size={13} /> <span className="hidden sm:inline">Keluar</span>
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
                            <p className="text-sm text-gray-500 mb-4">Masukkan modal awal uang kembalian di laci (Starting Cash).</p>

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
                    <div className="bg-white border-b border-gray-200 px-4 py-2.5 flex flex-col gap-2 flex-shrink-0 shadow-sm">
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input ref={searchRef} type="text"
                                    placeholder="Cari produk... (Ctrl+F)"
                                    value={search} onChange={e => setSearch(e.target.value)}
                                    className="w-full text-gray-900 pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#0D2B20] transition" />
                            </div>

                            {isAdvancedUnlocked && (
                                <>
                                    <button onClick={handleVoiceCommand}
                                        disabled={isListening || isProcessingVoice}
                                        title="Pesan dengan Suara (AI Voice POS)"
                                        className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all flex-shrink-0 border ${
                                            isListening ? 'bg-red-500 text-white border-red-600 animate-pulse' :
                                            isProcessingVoice ? 'bg-amber-400 text-[#0D2B20] border-amber-500' :
                                            'bg-[#0D2B20] text-white border-[#0D2B20] shadow-md hover:bg-[#1a4433]'
                                        }`}>
                                        {isProcessingVoice ? <Loader2 size={14} className="animate-spin" /> : <Mic size={14} />}
                                    </button>

                                    <button onClick={() => setShowFlavorFinder(v => !v)}
                                        title="Temukan Minuman Sesuai Selera"
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex-shrink-0 ${showFlavorFinder ? 'bg-[#0D2B20] text-amber-400 border-[#0D2B20] shadow-md' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-[#0D2B20] hover:text-[#0D2B20]'}`}>
                                        <Wand2 size={13} />
                                        <span className="hidden sm:inline">Pilih Rasa</span>
                                        <ChevronDown size={11} className={`transition-transform ${showFlavorFinder ? 'rotate-180' : ''}`} />
                                    </button>
                                </>
                            )}
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
                    <div className="flex-1 overflow-y-auto p-3 pb-24 lg:pb-3">
                        {filteredProducts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full opacity-40 gap-2">
                                <Package size={40} /><p className="text-sm">Produk tidak ditemukan</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
                                {filteredProducts.map(product => {
                                    const cartQty = items.filter(i => i.id === product.id).reduce((s, i) => s + i.quantity, 0);
                                    const bundlePromo = promos.find(p =>
                                        p.isActive &&
                                        p.type === 'bundle' &&
                                        (isAdvancedUnlocked || p.alwaysApplyInPkl || p.type === 'bundle') &&
                                        (p.productId === product.id || (p.productId === '2' && product.name.toLowerCase().includes('imperial jasmine')))
                                    );
                                    const bundleBadge = bundlePromo
                                        ? `${bundlePromo.bundleQty || 3}${bundlePromo.targetSize || 'M'}=${Math.round(bundlePromo.value / 1000)}rb`
                                        : undefined;
                                    return (
                                        <ProductCard
                                            key={product.id}
                                            product={product}
                                            cartQty={cartQty}
                                            isRecommended={flavorRecommendations.has(product.id)}
                                            bundleBadge={bundleBadge}
                                            onAdd={() => setVariantProduct(product)}
                                            ingredients={ingredients}
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
                        <span className="text-green-600 font-medium">{products.filter(p => p.stock > 0 && p.isAvailable).length} tersedia</span>
                        <span>•</span>
                        <span className="text-red-500">{products.filter(p => p.stock <= 0 || !p.isAvailable).length} habis</span>
                        <span className="ml-auto text-gray-300 hidden sm:block">ESC: tutup · Ctrl+F: cari</span>
                    </div>
                </div>

                {/* ════ RIGHT PANEL — Keranjang ════ */}
                <AnimatePresence>
                    {mobileCartOpen && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }}
                            onClick={() => setMobileCartOpen(false)}
                            className="lg:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm" />
                    )}
                </AnimatePresence>

                <div className={`fixed lg:relative right-0 top-0 h-[100dvh] lg:h-auto w-full sm:w-96 flex-shrink-0 bg-white border-l border-gray-200 flex flex-col shadow-2xl lg:shadow-xl z-40 transition-transform duration-300 lg:translate-x-0 ${mobileCartOpen ? 'translate-x-0' : 'translate-x-full'}`}>

                    {/* Cart Header */}
                    <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between flex-shrink-0">
                        <div className="flex items-center gap-2">
                            <button onClick={() => setMobileCartOpen(false)} className="lg:hidden p-1.5 bg-gray-200 rounded-full hover:bg-gray-300 text-gray-700"><X size={15} /></button>
                            <ShoppingCart size={16} className="text-[#0D2B20] hidden lg:block" />
                            <span className="font-bold text-gray-800 text-sm">Pesanan</span>
                            {items.length > 0 && <span className="bg-[#0D2B20] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{items.reduce((s, i) => s + i.quantity, 0)}</span>}
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

                    {/* Scrollable Area: Cart Items + Form Pembayaran (anti-terpotong di layar HP & saat QRIS/Cash dibuka) */}
                    <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
                        <div className="flex-1">
                            {items.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full min-h-[180px] opacity-30 gap-2 p-6 text-center">
                                    <ShoppingCart size={36} />
                                    <p className="text-sm font-medium">Tray kosong</p>
                                    <p className="text-xs">Pilih produk dari menu</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100">
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
                                                        {variantLabel && (
                                                            <p className="text-[9px] text-amber-600 font-medium leading-tight truncate">{variantLabel}</p>
                                                        )}
                                                        <p className="text-[10px] text-gray-500 font-medium mt-0.5">{formatRp(item.finalPrice ?? item.price)}</p>
                                                        <input type="text" placeholder="Catatan (opsional)"
                                                            value={item.note || ''}
                                                            onChange={e => updateNote(itemKey, e.target.value)}
                                                            className="w-full text-gray-900 text-[10px] bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 mt-1 focus:outline-none focus:border-gray-400" />
                                                    </div>
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

                                    {/* Preview Alokasi Plastik Kresek Otomatis */}
                                    {cartKresekLabel && (
                                        <div className="mt-2.5 p-2 bg-emerald-50 border border-emerald-200/80 rounded-xl flex items-center justify-between text-xs text-emerald-900 shadow-2xs">
                                            <span className="flex items-center gap-1.5 font-bold min-w-0 truncate">
                                                <span>🛍️</span>
                                                <span className="truncate">Packing: <span className="text-emerald-700">{cartKresekLabel}</span></span>
                                            </span>
                                            <span className="text-[10px] bg-white border border-emerald-200 text-emerald-800 font-bold px-1.5 py-0.5 rounded-full flex-shrink-0">
                                                {cartCups} cup
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Form Pelanggan, Diskon, & Metode Pembayaran */}
                        <div className="px-3 py-2.5 space-y-2 bg-gray-50/80 border-t border-gray-200 mt-auto">
                            <div className="flex flex-col gap-2">
                                {isAdvancedUnlocked && (
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Users size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input type="text" placeholder="No. HP Member (misal: 081234567890)" value={customerPhone}
                                                onChange={e => setCustomerPhone(e.target.value)}
                                                className="w-full text-gray-900 pl-7 pr-2 py-1.5 text-xs border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-[#0D2B20] transition" />
                                        </div>
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    <div className="relative flex-1 min-w-0">
                                        <input type="text" placeholder={`Otomatis: ${nextCustomerLabel} (opsional)`} value={customerName}
                                            onChange={e => setCustomerName(e.target.value)}
                                            className="w-full min-w-0 text-gray-900 px-3 py-1.5 text-xs border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-[#0D2B20] transition" />
                                    </div>
                                    <input type="text" placeholder="Meja" value={tableNumber}
                                        onChange={e => setTableNumber(e.target.value)}
                                        className="w-16 text-gray-900 px-2 py-1.5 text-xs border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-[#0D2B20] transition text-center" />
                                </div>
                                {!customerName.trim() && (
                                    <p className="text-[10px] text-gray-500 flex items-center justify-between gap-1 px-0.5">
                                        <span>Label pembeli otomatis:</span>
                                        <span className="font-bold text-[#0D2B20] bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">{nextCustomerLabel}</span>
                                    </p>
                                )}
                            </div>

                            {/* Loyalty Points & AI Upsell (Hanya tampil jika fitur pengembangan di-unlock) */}
                            {isAdvancedUnlocked && (
                                <AnimatePresence>
                                    {upsellHint && (
                                        <div className="flex items-start gap-1.5 p-2 bg-violet-50 border border-violet-200 rounded-lg mb-1 animate-fade-in">
                                            <Sparkles size={11} className="text-violet-500 flex-shrink-0 mt-0.5" />
                                            <p className="text-[10px] text-violet-700 font-medium leading-tight">{upsellHint}</p>
                                        </div>
                                    )}
                                    {customer && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 flex justify-between items-center text-xs">
                                                <div>
                                                    <p className="font-bold text-amber-900">Member: {customer.name}</p>
                                                    <p className="text-amber-700 text-[10px]">Poin: <strong>{customer.points}</strong> (Senilai {formatRp(maxPointsRpValue)})</p>
                                                </div>
                                                {customer.points > 0 && (
                                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                                        <input type="checkbox" checked={usePoints} onChange={e => setUsePoints(e.target.checked)} className="accent-amber-600" />
                                                        <span className="font-bold text-amber-800 text-[10px]">Gunakan Poin</span>
                                                    </label>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            )}

                            {/* Auto Promo Info & Bundle Nudge */}
                            {applicablePromo && discountMode === 'none' && (
                                <div className="bg-green-50 border border-green-200 rounded-lg px-2 py-1.5 text-[10px] text-green-800 flex justify-between items-center gap-2">
                                    <span className="font-bold min-w-0 truncate">🎉 {applicablePromo.promo.name}</span>
                                    <span className="font-bold whitespace-nowrap">-{formatRp(applicablePromo.discountAmount)}</span>
                                </div>
                            )}
                            {bundleNudge && discountMode === 'none' && (
                                <div className="bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5 text-[10px] text-amber-900 flex items-center gap-1.5">
                                    <span>💡</span>
                                    <span>Tambah <strong>{bundleNudge.remainingForNextBundle} cup ({bundleNudge.promo.targetSize || 'M'})</strong> lagi = <strong>{formatRp(bundleNudge.promo.value)}</strong></span>
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
                                        {mode === 'none' ? 'Promo Otomatis' : mode === 'amount' ? <><Tag size={10} /> Nominal</> : <><Percent size={10} /> Persen</>}
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
                                                    onClick={async () => {
                                                        setQrisGenerated(true);
                                                        try {
                                                            const res = await fetch('/api/payment/qris', {
                                                                method: 'POST',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({ orderId: 'TRX-' + Date.now(), total: orderTotal, items })
                                                            });
                                                            const data = await res.json();
                                                            if (data.qrCodeUrl) setQrisUrl(data.qrCodeUrl);
                                                        } catch (e) {
                                                            console.warn("Gagal buat QRIS", e);
                                                        }
                                                    }}
                                                    className="w-full bg-[#0D2B20] text-amber-400 font-bold py-2 rounded-lg text-xs"
                                                >
                                                    Generate QRIS Dinamis
                                                </button>
                                            ) : (
                                                <>
                                                    <p className="text-[11px] font-bold text-gray-800">Scan QRIS Dinamis</p>
                                                    <div className="w-36 h-36 sm:w-40 sm:h-40 bg-gray-50 rounded-lg p-2 border-2 border-dashed border-gray-300 flex items-center justify-center relative overflow-hidden">
                                                        <div className="absolute inset-0 flex flex-col items-center justify-center z-0 p-2">
                                                            <QrCode size={24} className="text-gray-300 mb-1" />
                                                        </div>
                                                        {qrisUrl ? (
                                                            <Image src={qrisUrl} alt="QRIS" fill className={`object-contain relative z-10 bg-white transition ${qrisSuccess ? 'opacity-30' : 'opacity-100'}`} unoptimized />
                                                        ) : (
                                                            <div className="relative z-10 flex flex-col items-center justify-center h-full w-full bg-white/80">
                                                                <Loader2 size={24} className="animate-spin text-amber-500 mb-2" />
                                                                <span className="text-[10px] text-gray-500 font-bold">Memuat...</span>
                                                            </div>
                                                        )}
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
                                                                }, 800);
                                                            }}
                                                            disabled={isCheckingQris}
                                                            className="w-full bg-amber-100 text-amber-700 font-bold py-2 rounded-lg text-xs hover:bg-amber-200 transition flex items-center justify-center gap-1 mt-1"
                                                        >
                                                            {isCheckingQris ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Konfirmasi Pembayaran QRIS
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
                                        <div className="flex gap-1.5 flex-wrap pt-1">
                                            <button onClick={() => setCashReceived(String(orderTotal))}
                                                className="text-[#0D2B20] text-[10px] px-2.5 py-1 bg-amber-400 hover:bg-amber-300 rounded font-mono font-bold transition flex items-center gap-1 shadow-sm">
                                                💵 Uang Pas ({formatRp(orderTotal)})
                                            </button>
                                            {[10000, 20000, 50000, 100000].filter(n => n > orderTotal).slice(0, 3).map(n => (
                                                <button key={n} onClick={() => setCashReceived(String(n))}
                                                    className="text-gray-900 text-[10px] px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded font-mono font-bold border border-gray-200 transition">
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
                    </div>

                    {/* ── STICKY CHECKOUT FOOTER (Selalu Terlihat, Tidak Pernah Terpotong) ── */}
                    <div className="border-t border-gray-200 flex-shrink-0 bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
                        <div className="px-4 pt-2 pb-1.5 space-y-0.5">
                            {(discountAmount > 0 || pointsDiscount > 0) && (
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-500">Subtotal</span>
                                    <span className="text-gray-600">{formatRp(subtotal)}</span>
                                </div>
                            )}
                            {discountAmount > 0 && (
                                <div className="flex justify-between items-center text-xs gap-2">
                                    <span className="text-red-500 font-medium min-w-0 truncate">
                                        {discountMode === 'none' && applicablePromo
                                            ? applicablePromo.promo.name
                                            : `Diskon${discountMode === 'percent' ? ` (${discountValue}%)` : ''}`}
                                    </span>
                                    <span className="text-red-500 font-bold whitespace-nowrap">-{formatRp(discountAmount)}</span>
                                </div>
                            )}
                            {pointsDiscount > 0 && (
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-amber-600 font-medium">Tukar {pointsToRedeem} Poin</span>
                                    <span className="text-amber-600 font-bold">-{formatRp(pointsDiscount)}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-bold text-gray-700">Total</span>
                                <span className="text-lg font-black text-[#0D2B20]">{formatRp(orderTotal)}</span>
                            </div>
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
                    <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="fixed lg:hidden bottom-4 left-0 right-0 px-3 sm:px-4 z-20">
                        <button onClick={() => setMobileCartOpen(true)}
                            className="w-full bg-[#0D2B20] text-amber-400 py-3.5 rounded-2xl shadow-2xl flex items-center justify-between px-4 sm:px-6 border border-amber-500/30">
                            <div className="flex items-center gap-2.5 sm:gap-3">
                                <div className="relative">
                                    <ShoppingCart size={19} />
                                    <span className="absolute -top-2 -right-2.5 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{items.reduce((s, i) => s + i.quantity, 0)}</span>
                                </div>
                                <span className="font-bold text-xs sm:text-sm ml-1">Lihat Tray ({items.reduce((s, i) => s + i.quantity, 0)} item)</span>
                            </div>
                            <span className="font-black text-amber-400 text-xs sm:text-sm whitespace-nowrap">{formatRp(orderTotal)}</span>
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
                    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
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
                            className="fixed right-0 top-0 h-[100dvh] w-full max-w-xs sm:w-80 bg-white z-50 shadow-2xl flex flex-col">
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

            {/* ── ORDERS & RECEIPT HISTORY PANEL ───────────── */}
            <AnimatePresence>
                {showIncomingOrders && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} onClick={() => setShowIncomingOrders(false)} className="fixed inset-0 bg-black z-40" />
                        <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed right-0 top-0 h-[100dvh] w-full sm:w-[400px] max-w-full bg-white z-50 shadow-2xl flex flex-col">
                            <div className="px-4 py-3 border-b border-gray-100 bg-[#0D2B20] text-white flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Bell size={16} className="text-amber-400" />
                                    <div>
                                        <span className="font-bold text-amber-300 text-sm">Manajemen Antrean &amp; Struk</span>
                                        <p className="text-[10px] text-white/60">Sinkronisasi real-time dengan Web Menu &amp; KDS</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowIncomingOrders(false)} className="p-1 hover:bg-white/20 text-white rounded-full transition"><X size={16} /></button>
                            </div>

                            {/* Tabs */}
                            <div className="flex border-b border-gray-200 bg-gray-100 p-1 gap-1">
                                <button
                                    onClick={() => setOrderDrawerTab('incoming')}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
                                        orderDrawerTab === 'incoming' ? 'bg-[#0D2B20] text-amber-400 shadow' : 'text-gray-600 hover:bg-white'
                                    }`}
                                >
                                    Masuk ({incomingOrders.length})
                                </button>
                                <button
                                    onClick={() => setOrderDrawerTab('processing')}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
                                        orderDrawerTab === 'processing' ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:bg-white'
                                    }`}
                                >
                                    Diracik ({processingOrders.length})
                                </button>
                                <button
                                    onClick={() => setOrderDrawerTab('completed')}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
                                        orderDrawerTab === 'completed' ? 'bg-green-600 text-white shadow' : 'text-gray-600 hover:bg-white'
                                    }`}
                                >
                                    Selesai ({completedTodayOrders.length})
                                </button>
                            </div>

                            {/* Filter Sesi Shift Hari Ini pada Tab Selesai (mendukung 2+ shift dalam sehari) */}
                            {orderDrawerTab === 'completed' && todaySessions.length > 0 && (
                                <div className="px-3 py-2 bg-white border-b border-gray-200 flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
                                    <span className="text-[10px] font-bold text-gray-500 uppercase whitespace-nowrap mr-1">Filter Shift:</span>
                                    {activeEnrichedSession && (
                                        <button
                                            type="button"
                                            onClick={() => setPosShiftScope('active_shift')}
                                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition border ${
                                                posShiftScope === 'active_shift'
                                                    ? 'bg-[#0D2B20] text-amber-300 border-[#0D2B20]'
                                                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                                            }`}
                                        >
                                            🟢 {activeEnrichedSession.shiftBadge} Aktif
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setPosShiftScope('all_today')}
                                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition border ${
                                            posShiftScope === 'all_today'
                                                ? 'bg-[#0D2B20] text-amber-300 border-[#0D2B20]'
                                                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                                        }`}
                                    >
                                        Semua Hari Ini ({todaySessions.length} Sesi)
                                    </button>
                                    {todaySessions.filter(ts => ts.id !== currentSessionId).map(ts => (
                                        <button
                                            key={ts.id}
                                            type="button"
                                            onClick={() => setPosShiftScope(ts.id)}
                                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition border ${
                                                posShiftScope === ts.id
                                                    ? 'bg-amber-500 text-white border-amber-600'
                                                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                                            }`}
                                        >
                                            {ts.shiftBadge} · {ts.cashierName}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50/50">
                                {orderDrawerTab === 'incoming' && incomingOrders.length === 0 && (
                                    <div className="text-center text-gray-400 py-16 text-sm">
                                        <CheckCircle size={36} className="mx-auto text-green-500 mb-2 opacity-50" />
                                        <p className="font-bold text-gray-700">Tidak ada pesanan baru menunggu</p>
                                        <p className="text-xs text-gray-400 mt-1">Pesanan dari halaman /menu akan otomatis muncul di sini.</p>
                                    </div>
                                )}

                                {orderDrawerTab === 'processing' && processingOrders.length === 0 && (
                                    <div className="text-center text-gray-400 py-16 text-sm">
                                        <ChefHat size={36} className="mx-auto text-blue-500 mb-2 opacity-50" />
                                        <p className="font-bold text-gray-700">Tidak ada pesanan sedang diracik</p>
                                        <p className="text-xs text-gray-400 mt-1">Semua pesanan sedang diracik sudah diselesaikan.</p>
                                    </div>
                                )}

                                {orderDrawerTab === 'completed' && completedTodayOrders.length === 0 && (
                                    <div className="text-center text-gray-400 py-16 text-sm">
                                        <Printer size={36} className="mx-auto text-gray-400 mb-2 opacity-50" />
                                        <p className="font-bold text-gray-700">Belum ada pesanan selesai hari ini</p>
                                    </div>
                                )}

                                {(orderDrawerTab === 'incoming' ? incomingOrders : orderDrawerTab === 'processing' ? processingOrders : completedTodayOrders).map(order => {
                                    const orderTime = new Date(order.date);
                                    const diffMins = Math.floor((Date.now() - orderTime.getTime()) / 60000);
                                    const isAwaitingPayment = order.status === 'awaiting_payment';
                                    const isProcessing = order.status === 'processing';
                                    const isCompleted = order.status === 'completed';

                                    return (
                                        <div key={order.id} className={`bg-white border-2 rounded-2xl p-3.5 shadow-sm space-y-2.5 ${
                                            isProcessing ? 'border-blue-300' : isCompleted ? 'border-green-200' : 'border-amber-300/80'
                                        }`}>
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-black text-gray-800 text-sm">{order.customerName || "Pelanggan"}</span>
                                                        {diffMins < 5 && !isCompleted && (
                                                            <span className="text-[9px] bg-red-100 text-red-600 font-bold px-1.5 py-0.2 rounded-full animate-pulse">BARU</span>
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                                                        #{order.id.slice(0, 6).toUpperCase()} · {orderTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                        {order.tableNumber ? ` · Meja ${order.tableNumber}` : ' · Take Away'}
                                                    </p>
                                                </div>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                    isCompleted ? 'bg-green-100 text-green-800' :
                                                    isProcessing ? 'bg-blue-100 text-blue-800' :
                                                    isAwaitingPayment ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                                                    'bg-amber-100 text-amber-900 border border-amber-300'
                                                }`}>
                                                    {isCompleted ? 'Selesai' : isProcessing ? 'Sedang Diracik' : isAwaitingPayment ? 'Verifikasi Bayar' : 'Order Baru'}
                                                </span>
                                            </div>

                                            <div className="bg-gray-50 rounded-xl p-2.5 text-xs text-gray-700 space-y-1 border border-gray-100">
                                                {order.items.map((it, idx) => (
                                                    <div key={idx}>
                                                        <div className="flex justify-between items-start">
                                                            <span className="font-medium"><strong>{it.quantity}x</strong> {it.name}</span>
                                                            {it.note && <span className="text-[10px] text-blue-600 italic">&ldquo;{it.note}&rdquo;</span>}
                                                        </div>
                                                        {it.variants && (
                                                            <p className="text-[10px] text-amber-600 pl-4">{formatVariantLabel(it.variants)}</p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="flex justify-between items-center pt-1 border-t border-gray-100 text-xs gap-2">
                                                <div className="min-w-0">
                                                    <span className="text-gray-500 uppercase text-[10px] font-mono font-bold block">
                                                        {order.paymentMethod || 'TUNAI'}
                                                    </span>
                                                    {order.discount && order.discount > 0 && (
                                                        <span className="text-[10px] text-emerald-700 font-semibold block truncate">
                                                            🏷 {order.promoName || 'Diskon'} (-Rp {order.discount.toLocaleString('id-ID')})
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="font-black text-[#0D2B20] text-sm flex-shrink-0">Rp {order.total.toLocaleString('id-ID')}</span>
                                            </div>

                                            <div className="flex gap-1.5 pt-1">
                                                {orderDrawerTab === 'incoming' && (
                                                    <>
                                                        <button
                                                            onClick={() => {
                                                                updateOrderStatus(order.id, 'processing');
                                                                addLog("PROCESS_ORDER", `Terima & racik order #${order.id.slice(0, 6)}`, user?.name || 'Kasir');
                                                                toast.success(
                                                                    isAdvancedUnlocked
                                                                        ? `Order #${order.id.slice(0, 6)} diterima & dikirim ke KDS!`
                                                                        : `Order #${order.id.slice(0, 6)} diterima & sedang diracik!`
                                                                );
                                                            }}
                                                            className="flex-1 py-2 bg-[#0D2B20] hover:bg-[#1a4433] text-amber-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 shadow-sm"
                                                        >
                                                            <CheckCircle size={12} /> {isAwaitingPayment ? 'Lunas & Racik' : 'Terima & Racik'}
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setLastOrder(order);
                                                                setShowReceipt(true);
                                                            }}
                                                            className="px-2.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition flex items-center gap-1"
                                                            title="Lihat / Cetak Struk"
                                                        >
                                                            <Printer size={12} />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                updateOrderStatus(order.id, 'cancelled');
                                                                addLog("CANCEL_ORDER", `Batalkan order #${order.id.slice(0, 6)}`, user?.name || 'Kasir');
                                                                toast.info(`Order #${order.id.slice(0, 6)} dibatalkan & stok dikembalikan.`);
                                                            }}
                                                            className="px-2.5 py-2 bg-gray-100 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold transition"
                                                            title="Tolak / Batalkan"
                                                        >
                                                            ✕
                                                        </button>
                                                    </>
                                                )}

                                                {orderDrawerTab === 'processing' && (
                                                    <>
                                                        <button
                                                            onClick={() => {
                                                                updateOrderStatus(order.id, 'completed');
                                                                addLog("COMPLETE_ORDER", `Selesaikan order #${order.id.slice(0, 6)}`, user?.name || 'Kasir');
                                                                toast.success(`Order #${order.id.slice(0, 6)} selesai & siap diambil!`);
                                                            }}
                                                            className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 shadow-sm"
                                                        >
                                                            <CheckCircle size={12} /> Tandai Selesai
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setLastOrder(order);
                                                                setShowReceipt(true);
                                                            }}
                                                            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition flex items-center gap-1"
                                                        >
                                                            <Printer size={12} /> Struk
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                updateOrderStatus(order.id, 'cancelled');
                                                                addLog("CANCEL_ORDER", `Batalkan order #${order.id.slice(0, 6)}`, user?.name || 'Kasir');
                                                                toast.info(`Order #${order.id.slice(0, 6)} dibatalkan & stok dikembalikan.`);
                                                            }}
                                                            className="px-2.5 py-2 bg-gray-100 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold transition"
                                                            title="Batalkan"
                                                        >
                                                            ✕
                                                        </button>
                                                    </>
                                                )}

                                                {orderDrawerTab === 'completed' && (
                                                    <button
                                                        onClick={() => {
                                                            setLastOrder(order);
                                                            setShowReceipt(true);
                                                        }}
                                                        className="w-full py-2 bg-[#0D2B20] hover:bg-[#1a4433] text-amber-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                                                    >
                                                        <Printer size={13} /> Lihat / Cetak Ulang Struk
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* ── CONFIRM MODALS ────────────────────────────── */}
            <ConfirmModal isOpen={confirmClearCart} title="Kosongkan Keranjang?" message="Semua item akan dihapus. Gunakan Hold untuk menyimpan pesanan." confirmLabel="Ya, Kosongkan" danger
                onConfirm={() => { clearCart(); setConfirmClearCart(false); toast.info('Keranjang dikosongkan.'); }}
                onCancel={() => setConfirmClearCart(false)} />
            <ConfirmModal isOpen={confirmLogout} title="Keluar dari POS?" message={`Anda akan keluar sebagai ${user?.name} dan kembali ke tampilan pelanggan.`} confirmLabel="Ya, Keluar" danger
                onConfirm={() => { setConfirmLogout(false); addLog('LOGOUT', `${user?.name} logged out`, user?.name || ''); logout(); router.replace('/menu'); }}
                onCancel={() => setConfirmLogout(false)} />

            {/* ── KAS KELUAR / PETTY CASH MODAL ──────────────── */}
            <AnimatePresence>
                {showExpenseModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl p-5 sm:p-6 w-full max-w-md max-h-[90dvh] overflow-y-auto shadow-2xl">
                            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
                                <div className="flex items-center gap-2 text-[#0D2B20]">
                                    <span className="text-xl">💸</span>
                                    <h3 className="text-lg font-black">Catat Kas Keluar (Petty Cash)</h3>
                                </div>
                                <button onClick={() => setShowExpenseModal(false)} className="text-gray-400 hover:text-gray-600">
                                    <X size={18} />
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 mb-4">
                                Catat pengambilan uang dari laci kasir (beli es batu, galon, sedotan, dll) agar perhitungan kas di akhir shift tetap akurat.
                            </p>

                            <div className="space-y-3 mb-5">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Kategori Pengeluaran</label>
                                    <select
                                        value={expenseCategory}
                                        onChange={e => setExpenseCategory(e.target.value as ExpenseCategory)}
                                        className="w-full text-xs font-medium text-gray-900 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#0D2B20]">
                                        {EXPENSE_CATEGORIES.map(c => (
                                            <option key={c.id} value={c.id}>{c.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Nominal (Rp)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-xs">Rp</span>
                                        <input
                                            type="tel"
                                            value={expenseAmount}
                                            onChange={e => setExpenseAmount(e.target.value.replace(/[^0-9]/g, ''))}
                                            placeholder="Contoh: 15000"
                                            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#0D2B20] font-bold text-sm text-gray-900"
                                        />
                                    </div>
                                    <div className="flex gap-1.5 mt-1.5 flex-wrap">
                                        {[10000, 15000, 20000, 25000, 50000].map(val => (
                                            <button key={val} type="button" onClick={() => setExpenseAmount(String(val))}
                                                className="text-[10px] font-mono font-bold bg-gray-100 hover:bg-gray-200 px-2 py-0.5 rounded text-gray-700">
                                                {val >= 1000 ? `${val / 1000}rb` : val}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Keperluan / Keterangan</label>
                                    <input
                                        type="text"
                                        value={expenseDesc}
                                        onChange={e => setExpenseDesc(e.target.value)}
                                        placeholder="Contoh: Beli es batu kristal 1 karung"
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#0D2B20] text-xs text-gray-900"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-2 justify-end">
                                <button
                                    onClick={() => setShowExpenseModal(false)}
                                    className="px-4 py-2 rounded-lg text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition">
                                    Batal
                                </button>
                                <button
                                    onClick={handleAddExpense}
                                    disabled={!expenseAmount || !expenseDesc}
                                    className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-[#0D2B20] hover:bg-[#1a4433] disabled:opacity-50 transition shadow-md">
                                    Simpan Pengeluaran
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {confirmCloseStore && (() => {
                    const activeCashSales = activeEnrichedSession
                        ? activeShiftOrders
                            .filter(o => o.paymentMethod === 'cash' || !o.paymentMethod)
                            .reduce((s, o) => s + o.total, 0)
                        : 0;
                    const activeDrawerExpenses = activeEnrichedSession
                        ? (useExpenseStore.getState().expenses || [])
                            .filter(e => e.paidVia === 'kas_laci' && isExpenseInSession(e, activeEnrichedSession))
                            .reduce((s, e) => s + e.amount, 0)
                        : 0;
                    const estExpectedCash = Math.max(
                        0,
                        (activeEnrichedSession?.startingCash || 0) + activeCashSales - activeDrawerExpenses
                    );
                    const unfinishedCount = incomingOrders.length + processingOrders.length;

                    return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl p-5 sm:p-6 w-full max-w-md max-h-[90dvh] overflow-y-auto shadow-2xl">
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                                <h3 className="text-lg sm:text-xl font-black text-[#0D2B20]">
                                    Tutup {activeEnrichedSession ? activeEnrichedSession.shiftBadge : 'Shift'} Kasir
                                </h3>
                                {activeEnrichedSession && (
                                    <span className="text-xs font-bold bg-[#0D2B20] text-amber-300 px-2.5 py-0.5 rounded-full whitespace-nowrap">
                                        {activeEnrichedSession.shiftBadge} · {activeEnrichedSession.cashierName}
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-gray-500 mb-4">Silakan hitung uang fisik di laci kasir dan masukkan totalnya untuk pencocokan.</p>

                            {unfinishedCount > 0 && (
                                <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-900">
                                    <strong>⚠ Perhatian:</strong> Masih terdapat <strong>{unfinishedCount} pesanan aktif</strong> ({incomingOrders.length} masuk, {processingOrders.length} diracik) yang belum ditandai selesai.
                                </div>
                            )}

                            {activeEnrichedSession && (
                                <div className="mb-4 p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs space-y-1 text-gray-700">
                                    <div className="flex justify-between">
                                        <span>Modal Awal Shift:</span>
                                        <span className="font-mono font-bold">{formatRp(activeEnrichedSession.startingCash || 0)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Penjualan Tunai ({activeEnrichedSession.shiftBadge}):</span>
                                        <span className="font-mono font-bold text-green-700">+{formatRp(activeCashSales)}</span>
                                    </div>
                                    {activeDrawerExpenses > 0 && (
                                        <div className="flex justify-between">
                                            <span>Kas Keluar Laci ({activeEnrichedSession.shiftBadge}):</span>
                                            <span className="font-mono font-bold text-red-600">-{formatRp(activeDrawerExpenses)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between pt-1 border-t border-gray-200 font-black text-[#0D2B20]">
                                        <span>Estimasi Uang di Laci:</span>
                                        <span className="font-mono">{formatRp(estExpectedCash)}</span>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-3 mb-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Uang Fisik Aktual (Actual Cash)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">Rp</span>
                                        <input type="tel"
                                            value={actualCash}
                                            onChange={e => setActualCash(e.target.value.replace(/[^0-9]/g, ''))}
                                            placeholder="Total uang di laci"
                                            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#0D2B20] font-bold text-gray-900 placeholder-gray-400"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Catatan Tambahan (Opsional)</label>
                                    <input type="text"
                                        value={closeNotes}
                                        onChange={e => setCloseNotes(e.target.value)}
                                        placeholder="Alasan selisih uang, pengeluaran darurat, dll."
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#0D2B20] text-sm text-gray-900 placeholder-gray-400"
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
                    );
                })()}
            </AnimatePresence>

            {/* ── SHIFT SUMMARY ─────────────────────────────── */}
            {shiftSummary && <ShiftSummaryModal isOpen={!!shiftSummary} session={shiftSummary} orders={orders} onClose={() => setShiftSummary(null)} />}
        </div>
    );
}

// ── Product Card ──────────────────────────────────────────────
function ProductCard({ product, cartQty, isRecommended, bundleBadge, onAdd, ingredients }: {
    product: ExtendedProduct;
    cartQty: number;
    isRecommended?: boolean;
    bundleBadge?: string;
    onAdd: () => void;
    ingredients?: import('@/lib/store').Ingredient[];
}) {
    let isOutOfStock = !product.isAvailable || product.stock <= 0;
    if (!isOutOfStock && product.recipe && product.recipe.length > 0 && ingredients) {
        const canMake = product.recipe.every(req => {
            const ing = ingredients.find(i => i.id === req.ingredientId);
            return ing && ing.stock >= req.quantity;
        });
        if (!canMake) isOutOfStock = true;
    }
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
                    {bundleBadge && !isOutOfStock && <span className="bg-emerald-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-sm">🏷 {bundleBadge}</span>}
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
                <p className="text-[10px] font-bold text-amber-600 mt-0.5 truncate">
                    {formatRp(product.price)}
                    {typeof product.largePrice === 'number' && (
                        <span className="text-[9px] text-gray-400 font-semibold"> · L {Math.round(product.largePrice / 1000)}rb</span>
                    )}
                </p>
                <button onClick={onAdd} disabled={isOutOfStock}
                    className="w-full mt-1.5 h-6 flex items-center justify-center gap-1 bg-[#0D2B20] hover:bg-[#1a4433] text-amber-400 rounded-lg transition text-[10px] font-bold disabled:opacity-40 disabled:cursor-not-allowed">
                    <Plus size={10} /> {cartQty > 0 ? `Tambah Lagi (${cartQty})` : 'Tambah'}
                </button>
            </div>
        </motion.div>
    );
}
