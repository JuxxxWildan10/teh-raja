"use client";

/**
 * ============================================================================
 * FILE: app/admin/page.tsx
 * ============================================================================
 * @file Admin Dashboard
 * @description Halaman Panel Kendali (Admin). Berfungsi untuk melihat grafik penjualan, laporan harian, manajemen stok produk & resep BOM, pengaturan promo, manajemen member loyalty, inventori & suplier, multi-cabang, analitik BI, laporan laba rugi (P&L), dan AI Demand Forecasting.
 *
 * FUNGSI UTAMA:
 * 1. **Mode Default PKL (`!isAdvancedUnlocked`) — 6 Tab Inti POS & BOM**:
 *    - `overview`  : Dashboard KPI penjualan harian, menu terlaris, dan peringatan stok bahan baku kritis.
 *    - `products`  : CRUD produk menu & editor komposisi **Resep Bill of Materials (BOM)** per cup.
 *    - `inventory` : Manajemen 9 bahan baku utama, daftar suplier, **Restok Bahan (PO Suplier)**, & **Audit Stock Opname Fisik**.
 *    - `orders`    : Riwayat seluruh pesanan POS, filter status, batalkan pesanan (otomatis *rollback* BOM), & cetak struk.
 *    - `keuangan`  : **Rekening Toko Real-Time (Putar Modal Restok)**, Laporan Laba Rugi (*Profit & Loss*), riwayat mutasi modal, *Petty Cash*, Export Excel/PDF/CSV, & Backup/Restore JSON.
 *    - `users`     : Manajemen akun staf Kasir dan Administrator.
 * 2. **Mode Pengembangan Lanjutan / Skripsi (`isAdvancedUnlocked: true`) — Tambahan 6 Tab**:
 *    - Dapat dibuka dalam 1 klik lewat tombol `[🔒 Mode PKL (POS & BOM)]` di navbar atas Admin untuk memunculkan tab:
 *      `promos`, `customers`, `analytics`, `forecast` (AI Demand Forecasting), `branches`, dan `logs`.
 * ============================================================================
 */

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
    useProductStore, useSalesStore, useAuthStore, usePromoStore,
    useCustomerStore, useInventoryStore, useSupplierStore, useExpenseStore, useStoreAccountStore, useForecastHistoryStore, useStoreConfigStore,
    SHOP_CLOSE_PRESETS, ExtendedProduct, Order, ExpenseCategory, EXPENSE_CATEGORIES, DEFAULT_BRANCHES, RecipeItem, Role, PromoType,
    getEnrichedSessions, isOrderInSession, isExpenseInSession, toLocalDateKey, getTodayDateKey, getYesterdayDateKey, EnrichedStoreSession,
    calculateStoreAccountSummary, buildStoreAccountLedger
} from "@/lib/store";
import { useToast } from "@/components/Toast";
import ConfirmModal from "@/components/ConfirmModal";
import ShiftSummaryModal from "@/components/ShiftSummaryModal";
import ReceiptModal from "@/components/ReceiptModal";
import * as XLSX from "xlsx";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
} from "chart.js";
import {
    Plus, Trash, Edit, LogOut, X, Save,
    Image as ImageIcon, Download,
    ShieldAlert,
    History, AlertTriangle,
    CheckCircle, XCircle, Clock, Loader,
    Menu, Search, Sparkles, RefreshCw, Ticket, Users as UsersIcon, Box,
    Building2, BarChart2, TrendingUp, FileSpreadsheet, Bell, Wallet, DollarSign, Upload, Database, ClipboardCheck,
    ChefHat, Coffee, Presentation, PackagePlus, Lock, Unlock, Calendar, Filter, Store, CalendarX2,
    Landmark, ArrowUpRight, ArrowDownRight, ArrowUpDown
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { nanoid } from "nanoid";
import ReportGenerator from "@/components/ReportGenerator";
import ForecastDashboard from "@/components/forecast/ForecastDashboard";

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
);

export default function AdminPage() {
    const { user, logout, users, addUser, removeUser, updateUser, isAdvancedUnlocked, toggleAdvancedUnlocked } = useAuthStore();
    const router = useRouter();
    const toast = useToast();

    // Stores
    const { products, addProduct, updateProduct, deleteProduct, toggleAvailability } = useProductStore();
    const { getDailySales, getProductPopularity, getPeakHours, orders, logs, addLog, resetData, updateOrderStatus, sessions, branchId, branchName, setBranch } = useSalesStore();
    const [isClient, setIsClient] = useState(false);

    const { promos, addPromo, updatePromo, deletePromo, togglePromo } = usePromoStore();
    const { customers, addCustomer, updateCustomer, deleteCustomer } = useCustomerStore();
    const { ingredients, addIngredient, updateIngredient, deleteIngredient, opnameLogs, recordOpname } = useInventoryStore();
    const { suppliers, addSupplier, updateSupplier, deleteSupplier } = useSupplierStore();
    const { expenses, addExpense, deleteExpense } = useExpenseStore();
    const { movements, addMovement, deleteMovement } = useStoreAccountStore();
    const {
        isOnlineOrderOpen,
        closedBadge,
        closedMessage,
        reopenInfo,
        updatedAt: storeStatusUpdatedAt,
        updatedBy: storeStatusUpdatedBy,
        openOnlineStore,
        closeOnlineStore,
    } = useStoreConfigStore();

    // ── Pengaturan Lock / Unlock Buka-Tutup Kedai Online Pelanggan ──
    const [storeLockModalOpen, setStoreLockModalOpen] = useState(false);
    const [lockForm, setLockForm] = useState({
        badge: closedBadge || SHOP_CLOSE_PRESETS[0].badge,
        message: closedMessage || SHOP_CLOSE_PRESETS[0].message,
        reopenInfo: reopenInfo || SHOP_CLOSE_PRESETS[0].reopenHint,
    });

    const openStoreLockModal = () => {
        setLockForm({
            badge: closedBadge || SHOP_CLOSE_PRESETS[0].badge,
            message: closedMessage || SHOP_CLOSE_PRESETS[0].message,
            reopenInfo: reopenInfo ?? SHOP_CLOSE_PRESETS[0].reopenHint,
        });
        setStoreLockModalOpen(true);
    };

    const handleUnlockOnlineStore = () => {
        openOnlineStore(user?.name || 'Admin');
        addLog('STORE_ONLINE_OPEN', 'Kedai & menu order online pelanggan dibuka kembali (Unlock)', user?.name || 'Admin');
        setStoreLockModalOpen(false);
        toast.success('🔓 Kedai telah dibuka! Pelanggan kini dapat mengakses katalog /menu & memesan online.');
    };

    const handleSaveLockOnlineStore = (e: React.FormEvent) => {
        e.preventDefault();
        const badgeClean = lockForm.badge.trim() || 'Kedai Sedang Tutup';
        const msgClean = lockForm.message.trim() || SHOP_CLOSE_PRESETS[0].message;
        closeOnlineStore({
            closedBadge: badgeClean,
            closedMessage: msgClean,
            reopenInfo: lockForm.reopenInfo.trim(),
            updatedBy: user?.name || 'Admin',
        });
        addLog('STORE_ONLINE_LOCK', `Kedai & menu order online pelanggan dikunci: ${badgeClean}`, user?.name || 'Admin');
        setStoreLockModalOpen(false);
        toast.info(`🔒 Kedai berhasil ditutup (${badgeClean}). Pelanggan tidak dapat mengakses menu.`);
    };

    // ── Inventory CRUD & Filter State ─────────────────────────────
    const [ingModalOpen, setIngModalOpen] = useState(false);
    const [editingIngId, setEditingIngId] = useState<string | null>(null);
    const [ingForm, setIngForm] = useState({ name: '', stock: 0, unit: 'ml' as 'ml' | 'gram' | 'pcs', minStockThreshold: 100 });
    const [ingSearch, setIngSearch] = useState('');
    const [ingSortMode, setIngSortMode] = useState<'az' | 'za' | 'stock_asc' | 'stock_desc' | 'default'>('az');

    // ── Restock / Purchase Order Modal State ──────────────────────
    const [restockModalOpen, setRestockModalOpen] = useState(false);
    const [restockForm, setRestockForm] = useState({
        ingredientId: '',
        addQty: '',
        costAmount: '',
        paidVia: 'kas_laci' as 'kas_laci' | 'rekening_toko',
        supplierName: '',
    });

    // ── Supplier CRUD State ───────────────────────────────────────
    const [supModalOpen, setSupModalOpen] = useState(false);
    const [editingSupId, setEditingSupId] = useState<string | null>(null);
    const [supForm, setSupForm] = useState({
        name: '',
        contactPerson: '',
        phone: '',
        address: '',
        itemsSupplied: [] as string[],
    });

    // ── Customer / Loyalty CRUD State ─────────────────────────────
    const [custModalOpen, setCustModalOpen] = useState(false);
    const [editingCustId, setEditingCustId] = useState<string | null>(null);
    const [custForm, setCustForm] = useState({
        name: '',
        phone: '',
        points: 0,
        totalSpent: 0,
    });

    // ── Staff / Karyawan CRUD State ───────────────────────────────
    const [staffModalOpen, setStaffModalOpen] = useState(false);
    const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
    const [staffForm, setStaffForm] = useState({
        name: '',
        username: '',
        password: '',
        role: 'cashier' as Role,
    });

    // ── Promo CRUD State ──────────────────────────────────────────
    const [promoModalOpen, setPromoModalOpen] = useState(false);
    const [editingPromoId, setEditingPromoId] = useState<string | null>(null);
    const [promoForm, setPromoForm] = useState({
        name: '',
        type: 'percent' as PromoType,
        value: 10,
        minSubtotal: '',
        startHour: 9,
        endHour: 17,
        productId: '2',
        targetSize: 'M' as 'M' | 'L',
        bundleQty: 3,
        alwaysApplyInPkl: true,
        description: '',
        isActive: true,
    });

    // UI State
    const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'logs' | 'orders' | 'karyawan' | 'ai-forecast' | 'promos' | 'loyalty' | 'inventory' | 'cabang' | 'analytics' | 'keuangan'>('dashboard');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // ── Expense, P&L & Rekening Toko State ───────────────────────
    const [expenseModalOpen, setExpenseModalOpen] = useState(false);
    const [expenseForm, setExpenseForm] = useState({
        amount: '',
        description: '',
        category: 'bahan_tambahan' as ExpenseCategory,
        paidVia: 'kas_laci' as 'kas_laci' | 'rekening_toko',
        notes: ''
    });

    const [accountModalMode, setAccountModalMode] = useState<'topup' | 'withdraw' | null>(null);
    const [accountForm, setAccountForm] = useState({
        amount: '',
        description: '',
        notes: '',
    });
    const [ledgerFilter, setLedgerFilter] = useState<'all' | 'in' | 'restock' | 'manual'>('all');
    const [showAllLedger, setShowAllLedger] = useState(false);

    // ── Stock Opname State ───────────────────────────────────────
    const [opnameModalOpen, setOpnameModalOpen] = useState(false);
    const [opnameForm, setOpnameForm] = useState({
        ingredientId: '',
        actualStock: '',
        reason: 'koreksi_hitung' as 'tumpah' | 'basi' | 'rusak' | 'koreksi_hitung' | 'lainnya',
        notes: ''
    });

    const backupFileRef = useRef<HTMLInputElement>(null);

    // Confirm modals
    const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
    const [confirmDeleteIng, setConfirmDeleteIng] = useState<{ id: string; name: string; usedCount: number } | null>(null);
    const [confirmReset, setConfirmReset] = useState(false);
    const [confirmCancelOrder, setConfirmCancelOrder] = useState<string | null>(null);

    // Orders filter & sort
    const [orderSearch, setOrderSearch] = useState('');
    const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | Order['status']>('all');
    const [orderSortMode, setOrderSortMode] = useState<'newest' | 'pipeline' | 'oldest'>('newest');
    const [viewReceiptOrder, setViewReceiptOrder] = useState<Order | null>(null);

    // ── Filter Per Hari & Per Sesi Shift (Mendukung 2+ Sesi Shift dalam Sehari) ──
    const [filterDateMode, setFilterDateMode] = useState<'all' | 'today' | 'yesterday' | 'custom'>('all');
    const [customFilterDate, setCustomFilterDate] = useState<string>(() => getTodayDateKey());
    const [selectedShiftId, setSelectedShiftId] = useState<string>('all');

    // Shift summary
    const [shiftSummary, setShiftSummary] = useState<import("@/lib/store").StoreSession | null>(null);

    const [formData, setFormData] = useState<ExtendedProduct>({
        id: '', name: '', price: 0, largePrice: undefined, description: '',
        image: '/images/royal-milk-tea.png', category: 'signature',
        attributes: { sweet: 5, creamy: 5, fruity: 5 },
        isAvailable: true, stock: 50, minStockThreshold: 10,
        recipe: [],
    });

    // Recipe Editor helper state inside Product Modal
    const [newRecipeIngId, setNewRecipeIngId] = useState<string>('');
    const [newRecipeQty, setNewRecipeQty] = useState<string>('10');

    const [authHydrated, setAuthHydrated] = useState(false);
    useEffect(() => {
        setIsClient(true);
        if (useAuthStore.persist.hasHydrated()) {
            setAuthHydrated(true);
        } else {
            const unsub = useAuthStore.persist.onFinishHydration(() => setAuthHydrated(true));
            const fallback = setTimeout(() => setAuthHydrated(true), 600);
            return () => { unsub(); clearTimeout(fallback); };
        }
    }, []);

    useEffect(() => {
        if (isClient && authHydrated && !user) {
            router.replace('/menu');
        }
    }, [isClient, authHydrated, user, router]);

    const handleLogout = async () => {
        addLog("LOGOUT", `${user?.name} logged out`, user?.name || "Unknown");
        await logout();
        router.replace('/menu');
    };

    const openAddModal = () => {
        setEditingId(null);
        setFormData({
            id: nanoid(), name: '', price: 10000, largePrice: undefined, description: '',
            image: '/images/royal-milk-tea.png', category: 'signature',
            attributes: { sweet: 5, creamy: 5, fruity: 5 },
            isAvailable: true, stock: 50, minStockThreshold: 10,
            recipe: [
                { ingredientId: 'ing-tea', quantity: 15 },
                { ingredientId: 'ing-sugar', quantity: 25 },
                { ingredientId: 'ing-ice', quantity: 1 },
                { ingredientId: 'ing-cup', quantity: 1 },
            ],
        });
        setNewRecipeIngId(ingredients[0]?.id || '');
        setNewRecipeQty('15');
        setIsModalOpen(true);
    };

    const openEditModal = (product: ExtendedProduct) => {
        setEditingId(product.id);
        setFormData({ ...product, largePrice: product.largePrice, recipe: product.recipe ? [...product.recipe] : [] });
        setNewRecipeIngId(ingredients[0]?.id || '');
        setNewRecipeQty('15');
        setIsModalOpen(true);
    };

    const handleAddRecipeItem = () => {
        if (!newRecipeIngId) return;
        const qty = parseFloat(newRecipeQty) || 0;
        if (qty <= 0) {
            toast.error("Jumlah bahan harus lebih dari 0!");
            return;
        }
        const currentRecipe: RecipeItem[] = formData.recipe || [];
        const existingIdx = currentRecipe.findIndex(r => r.ingredientId === newRecipeIngId);
        let nextRecipe: RecipeItem[];
        if (existingIdx >= 0) {
            nextRecipe = currentRecipe.map((r, i) => i === existingIdx ? { ...r, quantity: qty } : r);
        } else {
            nextRecipe = [...currentRecipe, { ingredientId: newRecipeIngId, quantity: qty }];
        }
        setFormData({ ...formData, recipe: nextRecipe });
    };

    const handleRemoveRecipeItem = (ingredientId: string) => {
        setFormData({
            ...formData,
            recipe: (formData.recipe || []).filter(r => r.ingredientId !== ingredientId),
        });
    };

    const handleSave = () => {
        if (!formData.name) {
            toast.error("Nama produk wajib diisi!");
            return;
        }
        if (editingId) {
            updateProduct(editingId, formData);
            addLog("UPDATE_PRODUCT", `Updated product: ${formData.name}`, user?.name || "Unknown");
            toast.success(`Produk "${formData.name}" berhasil diperbarui.`);
        } else {
            addProduct(formData);
            addLog("CREATE_PRODUCT", `Created product: ${formData.name}`, user?.name || "Unknown");
            toast.success(`Produk "${formData.name}" berhasil ditambahkan!`);
        }
        setIsModalOpen(false);
    };

    const handleDelete = (id: string, name: string) => {
        setConfirmDelete({ id, name });
    };

    const doDelete = () => {
        if (!confirmDelete) return;
        deleteProduct(confirmDelete.id);
        addLog("DELETE_PRODUCT", `Deleted product: ${confirmDelete.name}`, user?.name || "Unknown");
        toast.success(`Produk "${confirmDelete.name}" dihapus.`);
        setConfirmDelete(null);
    };

    const handleReset = () => setConfirmReset(true);

    const doReset = () => {
        resetData();
        addLog("RESET_DATA", "All sales and order data reset", user?.name || "Unknown");
        toast.success("Data berhasil direset.");
        setConfirmReset(false);
        window.location.reload();
    };

    // ── LOGIKA UTAMA FILTER PER HARI & PER SESI SHIFT (MENDUKUNG 2+ SHIFT SEHARI) ──
    const enrichedSessions = useMemo(() => getEnrichedSessions(sessions), [sessions]);
    const sessionByIdMap = useMemo(
        () => new Map<string, EnrichedStoreSession>(enrichedSessions.map(s => [s.id, s])),
        [enrichedSessions]
    );

    // Mencari sesi shift tempat sebuah pesanan terjadi (via sessionId atau rentang jam buka-tutup shift)
    const resolveOrderShift = useMemo(() => {
        return (order: Order): EnrichedStoreSession | undefined => {
            if (order.sessionId && sessionByIdMap.has(order.sessionId)) {
                return sessionByIdMap.get(order.sessionId);
            }
            return enrichedSessions.find(s => isOrderInSession(order, s));
        };
    }, [enrichedSessions, sessionByIdMap]);

    const activeDateKey = useMemo(() => {
        if (filterDateMode === 'today') return getTodayDateKey();
        if (filterDateMode === 'yesterday') return getYesterdayDateKey();
        if (filterDateMode === 'custom') return customFilterDate || getTodayDateKey();
        return null;
    }, [filterDateMode, customFilterDate]);

    const selectedShiftObj = useMemo(
        () => (selectedShiftId !== 'all' ? sessionByIdMap.get(selectedShiftId) || null : null),
        [selectedShiftId, sessionByIdMap]
    );

    const sessionsOnSelectedDate = useMemo(() => {
        if (!activeDateKey) return [];
        return enrichedSessions.filter(s => s.dateKey === activeDateKey);
    }, [enrichedSessions, activeDateKey]);

    const isPeriodFilterActive = filterDateMode !== 'all' || selectedShiftId !== 'all';

    const handleDateModeChange = (mode: 'all' | 'today' | 'yesterday' | 'custom', customDateVal?: string) => {
        setFilterDateMode(mode);
        const nextDateKey =
            mode === 'today' ? getTodayDateKey() :
            mode === 'yesterday' ? getYesterdayDateKey() :
            mode === 'custom' ? (customDateVal ?? customFilterDate) :
            null;
        if (customDateVal !== undefined) {
            setCustomFilterDate(customDateVal);
        }
        // Reset pilihan shift jika tidak berada di tanggal yang baru dipilih
        if (selectedShiftObj && nextDateKey && selectedShiftObj.dateKey !== nextDateKey) {
            setSelectedShiftId('all');
        }
        if (mode === 'all') {
            setSelectedShiftId('all');
        }
    };

    const handleSelectShiftFilter = (shiftId: string, syncDate = false) => {
        setSelectedShiftId(shiftId);
        if (syncDate && shiftId !== 'all') {
            const target = sessionByIdMap.get(shiftId);
            if (target) {
                const todayKey = getTodayDateKey();
                const yesterdayKey = getYesterdayDateKey();
                if (target.dateKey === todayKey) {
                    setFilterDateMode('today');
                } else if (target.dateKey === yesterdayKey) {
                    setFilterDateMode('yesterday');
                } else {
                    setCustomFilterDate(target.dateKey);
                    setFilterDateMode('custom');
                }
            }
        }
    };

    const resetPeriodFilter = () => {
        setFilterDateMode('all');
        setSelectedShiftId('all');
    };

    const activePeriodLabel = useMemo(() => {
        let datePart = 'Semua Hari';
        if (activeDateKey) {
            const formatted = new Date(`${activeDateKey}T00:00:00`).toLocaleDateString('id-ID', {
                day: '2-digit', month: 'short', year: 'numeric'
            });
            if (filterDateMode === 'today') datePart = `Hari Ini (${formatted})`;
            else if (filterDateMode === 'yesterday') datePart = `Kemarin (${formatted})`;
            else datePart = `Tanggal ${formatted}`;
        } else if (selectedShiftObj) {
            datePart = new Date(selectedShiftObj.startTime).toLocaleDateString('id-ID', {
                day: '2-digit', month: 'short', year: 'numeric'
            });
        }

        if (selectedShiftObj) {
            return `${datePart} — ${selectedShiftObj.shiftBadge} · ${selectedShiftObj.cashierName} (${selectedShiftObj.timeRangeLabel})`;
        }
        if (activeDateKey && sessionsOnSelectedDate.length > 0) {
            return `${datePart} — Semua Shift (${sessionsOnSelectedDate.length} Sesi)`;
        }
        return `${datePart} — Semua Sesi Shift`;
    }, [activeDateKey, filterDateMode, selectedShiftObj, sessionsOnSelectedDate]);

    // Pesanan & Pengeluaran yang sudah difilter berdasarkan Hari & Sesi Shift terpilih
    const periodOrders = useMemo(() => {
        if (selectedShiftObj) {
            return orders.filter(o => isOrderInSession(o, selectedShiftObj));
        }
        if (activeDateKey) {
            return orders.filter(o => toLocalDateKey(o.date) === activeDateKey);
        }
        return orders;
    }, [orders, selectedShiftObj, activeDateKey]);

    const periodExpenses = useMemo(() => {
        if (selectedShiftObj) {
            return expenses.filter(e => isExpenseInSession(e, selectedShiftObj));
        }
        if (activeDateKey) {
            return expenses.filter(e => toLocalDateKey(e.date) === activeDateKey);
        }
        return expenses;
    }, [expenses, selectedShiftObj, activeDateKey]);

    const handleExportCSV = () => {
        const headers = ["Order ID", "Date", "Shift", "Customer", "Items", "Total", "Payment", "Status"];
        const rows = periodOrders.map(order => {
            const sh = resolveOrderShift(order);
            return [
                order.id,
                new Date(order.date).toLocaleString('id-ID'),
                sh ? `${sh.shiftBadge} (${sh.cashierName})` : '-',
                order.customerName || "Pelanggan",
                order.items.map(i => `${i.name} (x${i.quantity})`).join("; "),
                order.total,
                order.paymentMethod || '-',
                order.status,
            ];
        });
        const csvContent = "data:text/csv;charset=utf-8,"
            + [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        const fileSuffix = selectedShiftObj
            ? `${selectedShiftObj.dateKey}_shift${selectedShiftObj.shiftNumber}`
            : (activeDateKey || getTodayDateKey());
        link.setAttribute("download", `laporan_penjualan_${fileSuffix}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        addLog("EXPORT_CSV", `Exported sales data to CSV (${activePeriodLabel})`, user?.name || "Unknown");
        toast.success(`Data penjualan (${activePeriodLabel}) berhasil di-export ke CSV!`);
    };

    const handleTabChange = (tab: typeof activeTab) => {
        setActiveTab(tab);
        setIsMobileMenuOpen(false);
    };

    // Export to Excel (mengikuti Filter Hari & Sesi Shift yang sedang dipilih)
    const handleExportExcel = async () => {
        const XLSX = await import('xlsx');
        const wsData = [
            ["Order ID", "Tanggal", "Waktu", "Sesi Shift", "Pelanggan", "No. HP", "Items", "Subtotal", "Diskon", "Total", "Metode Bayar", "Status", "Kasir", "Cabang"],
            ...periodOrders.map(o => {
                const sh = resolveOrderShift(o);
                return [
                    o.id,
                    new Date(o.date).toLocaleDateString('id-ID'),
                    new Date(o.date).toLocaleTimeString('id-ID'),
                    sh ? `${sh.shiftBadge} (${sh.cashierName})` : '-',
                    o.customerName || 'Pelanggan',
                    o.customerPhone || '-',
                    o.items.map(i => `${i.quantity}x ${i.name}`).join('; '),
                    o.subtotal ?? o.total,
                    o.discount ?? 0,
                    o.total,
                    o.paymentMethod || '-',
                    o.status,
                    o.cashierName || '-',
                    o.branchId || 'main',
                ];
            })
        ];
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        ws['!cols'] = [12, 12, 10, 18, 18, 14, 40, 12, 10, 12, 12, 12, 14, 12].map(w => ({ wch: w }));
        XLSX.utils.book_append_sheet(wb, ws, 'Laporan Penjualan');

        const popMap = new Map<string, number>();
        periodOrders.filter(o => o.status !== 'cancelled').forEach(o => o.items.forEach(i => popMap.set(i.name, (popMap.get(i.name) || 0) + i.quantity)));
        const popData = [
            ['Periode Laporan', activePeriodLabel],
            [],
            ['Nama Produk', 'Qty Terjual'],
            ...Array.from(popMap.entries()).sort((a, b) => b[1] - a[1])
        ];
        const ws2 = XLSX.utils.aoa_to_sheet(popData);
        XLSX.utils.book_append_sheet(wb, ws2, 'Ringkasan Produk');

        const fileSuffix = selectedShiftObj
            ? `${selectedShiftObj.dateKey}_Shift${selectedShiftObj.shiftNumber}`
            : (activeDateKey || getTodayDateKey());
        XLSX.writeFile(wb, `Laporan_TehRaja_${fileSuffix}.xlsx`);
        addLog("EXPORT_XLSX", `Exported report to Excel (${activePeriodLabel})`, user?.name || "Admin");
        toast.success(`Berhasil export Excel (${activePeriodLabel})!`);
    };

    // ── Live Today & Filtered KPI Stats ───────────────────────────
    const todayOrders = useMemo(() => {
        const todayKey = getTodayDateKey();
        return orders.filter(o => toLocalDateKey(o.date) === todayKey);
    }, [orders]);

    const dashboardFocusOrders = isPeriodFilterActive ? periodOrders : todayOrders;

    const todayValidOrders = useMemo(() => {
        return dashboardFocusOrders.filter(o => o.status !== 'cancelled');
    }, [dashboardFocusOrders]);

    const todayGrossRevenue = useMemo(() => {
        return todayValidOrders.reduce((sum, o) => sum + o.total, 0);
    }, [todayValidOrders]);

    const todayCompletedOrders = useMemo(() => {
        return dashboardFocusOrders.filter(o => o.status === 'completed');
    }, [dashboardFocusOrders]);

    const allTimeGrossRevenue = useMemo(
        () => orders.filter(o => o.status !== 'cancelled').reduce((sum, o) => sum + o.total, 0),
        [orders]
    );

    // ── Rekening Toko Real-Time (All-Time Working Capital) ──────
    const storeAccount = useMemo(
        () => calculateStoreAccountSummary(orders, expenses, movements),
        [orders, expenses, movements]
    );
    const storeAccountLedger = useMemo(
        () => buildStoreAccountLedger(orders, expenses, movements),
        [orders, expenses, movements]
    );
    const filteredStoreLedger = useMemo(() => {
        if (ledgerFilter === 'in') {
            return storeAccountLedger.filter(entry => entry.kind === 'order_revenue' || entry.kind === 'topup');
        }
        if (ledgerFilter === 'restock') {
            return storeAccountLedger.filter(entry => entry.kind === 'restock' || entry.kind === 'expense');
        }
        if (ledgerFilter === 'manual') {
            return storeAccountLedger.filter(entry => entry.kind === 'topup' || entry.kind === 'withdraw');
        }
        return storeAccountLedger;
    }, [storeAccountLedger, ledgerFilter]);

    const openAccountMovementModal = (
        mode: 'topup' | 'withdraw',
        prefillAmount?: number,
        prefillDesc?: string
    ) => {
        setAccountModalMode(mode);
        setAccountForm({
            amount: prefillAmount && prefillAmount > 0 ? String(Math.ceil(prefillAmount)) : '',
            description: prefillDesc || (mode === 'topup' ? 'Top-Up Modal Putar Stok Kedai' : 'Penarikan Dana / Ambil Laba'),
            notes: '',
        });
    };

    const handleSaveAccountMovement = (e: React.FormEvent) => {
        e.preventDefault();
        if (!accountModalMode) return;
        const amt = parseFloat(String(accountForm.amount).replace(/\D/g, '')) || 0;
        if (amt <= 0 || !accountForm.description.trim()) {
            toast.error("Nominal dan keterangan mutasi rekening wajib diisi!");
            return;
        }
        if (accountModalMode === 'withdraw' && amt > storeAccount.availableBalance) {
            toast.error(
                `Saldo Rekening Toko (Rp ${storeAccount.availableBalance.toLocaleString('id-ID')}) tidak cukup untuk penarikan Rp ${amt.toLocaleString('id-ID')}!`
            );
            return;
        }
        addMovement({
            type: accountModalMode,
            amount: amt,
            description: accountForm.description.trim(),
            notes: accountForm.notes.trim() || undefined,
            recordedBy: user?.name || 'Admin',
        });
        addLog(
            accountModalMode === 'topup' ? 'STORE_ACCOUNT_TOPUP' : 'STORE_ACCOUNT_WITHDRAW',
            `${accountModalMode === 'topup' ? 'Top-Up Modal' : 'Tarik Dana'} Rekening Toko: ${accountForm.description.trim()} (Rp ${amt.toLocaleString('id-ID')})`,
            user?.name || 'Admin'
        );
        toast.success(
            accountModalMode === 'topup'
                ? `Top-Up Modal Rp ${amt.toLocaleString('id-ID')} masuk ke Rekening Toko!`
                : `Penarikan dana Rp ${amt.toLocaleString('id-ID')} dari Rekening Toko berhasil dicatat!`
        );
        setAccountModalMode(null);
        setAccountForm({ amount: '', description: '', notes: '' });
    };

    // ── Financials (P&L) Calculations (mengikuti Filter Hari & Shift) ──
    const validOrders = useMemo(() => periodOrders.filter(o => o.status !== 'cancelled'), [periodOrders]);
    const grossRevenue = useMemo(() => validOrders.reduce((sum, o) => sum + o.total, 0), [validOrders]);
    const estimatedCOGS = useMemo(() => Math.round(grossRevenue * 0.30), [grossRevenue]);
    const grossProfit = useMemo(() => grossRevenue - estimatedCOGS, [grossRevenue, estimatedCOGS]);
    const totalExpenses = useMemo(() => periodExpenses.reduce((sum, e) => sum + e.amount, 0), [periodExpenses]);
    const netProfit = useMemo(() => grossProfit - totalExpenses, [grossProfit, totalExpenses]);
    const netMargin = useMemo(() => grossRevenue > 0 ? ((netProfit / grossRevenue) * 100).toFixed(1) : '0.0', [grossRevenue, netProfit]);
    const drawerExpenses = useMemo(() => periodExpenses.filter(e => e.paidVia === 'kas_laci').reduce((sum, e) => sum + e.amount, 0), [periodExpenses]);
    const transferExpenses = useMemo(() => periodExpenses.filter(e => e.paidVia === 'rekening_toko').reduce((sum, e) => sum + e.amount, 0), [periodExpenses]);

    const handleSaveExpense = (e: React.FormEvent) => {
        e.preventDefault();
        const amt = parseFloat(String(expenseForm.amount).replace(/\D/g, '')) || 0;
        if (amt <= 0 || !expenseForm.description.trim()) {
            toast.error("Nominal dan keperluan pengeluaran wajib diisi!");
            return;
        }
        if (expenseForm.paidVia === 'rekening_toko' && amt > storeAccount.availableBalance) {
            toast.error(
                `Saldo Rekening Toko tidak cukup (Rp ${storeAccount.availableBalance.toLocaleString('id-ID')}). Lakukan Top-Up Modal atau ganti ke Kas Laci!`
            );
            return;
        }
        addExpense({
            amount: amt,
            description: expenseForm.description.trim(),
            category: expenseForm.category,
            paidVia: expenseForm.paidVia,
            notes: expenseForm.notes.trim(),
            cashierName: user?.name || 'Admin',
        });
        addLog("EXPENSE_ADDED", `Pengeluaran: ${expenseForm.description} (Rp ${amt.toLocaleString('id-ID')})`, user?.name || 'Admin');
        toast.success("Pengeluaran operasional berhasil dicatat!");
        setExpenseModalOpen(false);
        setExpenseForm({
            amount: '',
            description: '',
            category: 'bahan_tambahan',
            paidVia: 'kas_laci',
            notes: ''
        });
    };

    const handleSaveOpname = (e: React.FormEvent) => {
        e.preventDefault();
        const ing = ingredients.find(i => i.id === opnameForm.ingredientId);
        if (!ing) {
            toast.error("Pilih bahan baku!");
            return;
        }
        const actual = parseFloat(String(opnameForm.actualStock).replace(/,/g, '.')) || 0;
        const diff = actual - ing.stock;

        recordOpname({
            ingredientId: ing.id,
            ingredientName: ing.name,
            systemStock: ing.stock,
            actualStock: actual,
            difference: diff,
            unit: ing.unit,
            reason: opnameForm.reason,
            notes: opnameForm.notes.trim(),
            recordedBy: user?.name || 'Admin',
        });

        addLog("STOCK_OPNAME", `Opname ${ing.name}: Fisik ${actual} vs Sistem ${ing.stock} (${diff >= 0 ? '+' : ''}${diff} ${ing.unit})`, user?.name || 'Admin');
        toast.success(`Stok ${ing.name} berhasil disesuaikan ke ${actual} ${ing.unit}!`);
        setOpnameModalOpen(false);
        setOpnameForm({
            ingredientId: '',
            actualStock: '',
            reason: 'koreksi_hitung',
            notes: ''
        });
    };

    const handleSaveRestock = (e: React.FormEvent) => {
        e.preventDefault();
        const ing = ingredients.find(i => i.id === restockForm.ingredientId);
        if (!ing) {
            toast.error("Pilih bahan baku yang akan direstok!");
            return;
        }
        const addQty = parseFloat(String(restockForm.addQty)) || 0;
        if (addQty <= 0) {
            toast.error("Jumlah tambahan stok harus lebih dari 0!");
            return;
        }
        const cost = parseFloat(String(restockForm.costAmount).replace(/\D/g, '')) || 0;
        if (cost > 0 && restockForm.paidVia === 'rekening_toko' && cost > storeAccount.availableBalance) {
            toast.error(
                `Saldo Rekening Toko tidak cukup untuk restok Rp ${cost.toLocaleString('id-ID')} (saldo: Rp ${storeAccount.availableBalance.toLocaleString('id-ID')}). Lakukan Top-Up Modal atau ganti ke Kas Laci!`
            );
            return;
        }

        const newStock = Math.round((ing.stock + addQty) * 100) / 100;
        updateIngredient(ing.id, { stock: newStock });

        if (cost > 0) {
            addExpense({
                amount: cost,
                description: `Restok PO ${ing.name} (+${addQty} ${ing.unit})${restockForm.supplierName ? ` dari ${restockForm.supplierName}` : ''}`,
                category: 'restok_bahan',
                paidVia: restockForm.paidVia,
                cashierName: user?.name || 'Admin',
                ingredientId: ing.id,
                supplierName: restockForm.supplierName || undefined,
            });
        }

        addLog("RESTOCK_INGREDIENT", `Restok ${ing.name} +${addQty} ${ing.unit} -> Total: ${newStock} ${ing.unit}`, user?.name || 'Admin');
        toast.success(
            `Stok ${ing.name} bertambah +${addQty} ${ing.unit}${cost > 0 ? ` & dibayar via ${restockForm.paidVia === 'rekening_toko' ? 'Rekening Toko' : 'Kas Laci'}` : ''}!`
        );
        setRestockModalOpen(false);
        setRestockForm({ ingredientId: '', addQty: '', costAmount: '', paidVia: 'rekening_toko', supplierName: '' });
    };

    const handleExportPNL = () => {
        const wb = XLSX.utils.book_new();

        const pnlRows = [
            ["LAPORAN LABA RUGI (PROFIT & LOSS) - TEH RAJA"],
            [`Periode Filter : ${activePeriodLabel}`],
            [`Tanggal Cetak  : ${new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}`],
            [`Dicatat Oleh   : ${user?.name || 'Admin'}`],
            [],
            ["Komponen Keuangan", "Nominal (Rp)", "Persentase (%)"],
            ["1. Pendapatan Kotor (Gross Sales)", grossRevenue, "100.0%"],
            ["2. Estimasi HPP Bahan Baku (COGS 30%)", -estimatedCOGS, "-30.0%"],
            ["3. Laba Kotor (Gross Profit)", grossProfit, `${grossRevenue > 0 ? ((grossProfit / grossRevenue) * 100).toFixed(1) : 0}%`],
            ["4. Total Biaya Operasional (Petty Cash)", -totalExpenses, `${grossRevenue > 0 ? ((-totalExpenses / grossRevenue) * 100).toFixed(1) : 0}%`],
            ["   - Kas Keluar dari Laci (Petty Cash)", -drawerExpenses, ""],
            ["   - Pengeluaran Transfer / Rekening Toko", -transferExpenses, ""],
            ["5. LABA BERSIH (NET PROFIT)", netProfit, `${netMargin}%`],
        ];

        const wsPNL = XLSX.utils.aoa_to_sheet(pnlRows);
        XLSX.utils.book_append_sheet(wb, wsPNL, "Laba Rugi (P&L)");

        const expRows = [
            ["No", "Tanggal", "Sesi Shift", "Kategori", "Keperluan / Deskripsi", "Metode Bayar", "Jumlah (Rp)", "Dicatat Oleh"],
            ...periodExpenses.map((e, idx) => {
                const sh = e.sessionId ? sessionByIdMap.get(e.sessionId) : enrichedSessions.find(s => isExpenseInSession(e, s));
                return [
                    idx + 1,
                    new Date(e.date).toLocaleString('id-ID'),
                    sh ? `${sh.shiftBadge} (${sh.cashierName})` : '-',
                    EXPENSE_CATEGORIES.find(c => c.id === e.category)?.label || e.category,
                    e.description,
                    e.paidVia === 'kas_laci' ? 'Kas Laci Kasir' : 'Rekening Toko',
                    e.amount,
                    e.cashierName || 'Admin'
                ];
            })
        ];
        const wsExp = XLSX.utils.aoa_to_sheet(expRows);
        XLSX.utils.book_append_sheet(wb, wsExp, "Daftar Pengeluaran");

        const accRows = [
            ["RINGKASAN REKENING TOKO (PUTARAN MODAL REAL-TIME)"],
            [`Tanggal Cetak : ${new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}`],
            [],
            ["Komponen Rekening Toko", "Nominal (Rp)"],
            ["Saldo Rekening Toko Tersedia (Siap Putar Modal)", storeAccount.availableBalance],
            ["Total Pendapatan Total Kedai (Tunai + QRIS + Transfer)", storeAccount.totalOrderRevenue],
            ["  - Pendapatan Tunai POS", storeAccount.cashRevenue],
            ["  - Pendapatan QRIS & Transfer", storeAccount.digitalRevenue],
            ["Total Top-Up / Modal Tambahan", storeAccount.totalTopUp],
            ["Total Restok Bahan Baku (PO)", -storeAccount.totalRestockCost],
            ["Total Biaya Operasional Lain & Kas Laci", -storeAccount.totalOtherExpenses],
            ["Total Penarikan Dana / Laba", -storeAccount.totalWithdraw],
            [],
            ["MUTASI ARUS MODAL REKENING TOKO"],
            ["No", "Waktu", "Jenis", "Keterangan", "Sumber/Metode", "Nominal (+/-)", "Saldo Rekening (Rp)", "Petugas"],
            ...storeAccountLedger.map((entry, idx) => [
                idx + 1,
                new Date(entry.date).toLocaleString('id-ID'),
                entry.kind === 'order_revenue' ? 'Penjualan' : entry.kind === 'topup' ? 'Top-Up Modal' : entry.kind === 'restock' ? 'Restok Bahan' : entry.kind === 'withdraw' ? 'Tarik Dana' : 'Biaya Operasional',
                entry.title,
                entry.channelLabel,
                entry.signedAmount,
                entry.balanceAfter,
                entry.actor || '-',
            ]),
        ];
        const wsAcc = XLSX.utils.aoa_to_sheet(accRows);
        XLSX.utils.book_append_sheet(wb, wsAcc, "Rekening Toko");

        const fileSuffix = selectedShiftObj
            ? `${selectedShiftObj.dateKey}_Shift${selectedShiftObj.shiftNumber}`
            : (activeDateKey || getTodayDateKey());
        XLSX.writeFile(wb, `Laporan_Laba_Rugi_TehRaja_${fileSuffix}.xlsx`);
        toast.success(`Laporan Laba Rugi (${activePeriodLabel}) berhasil diunduh!`);
    };

    const handleExportBackup = () => {
        const backupData = {
            appName: "Teh Raja POS & Management",
            version: "3.1.0",
            exportDate: new Date().toISOString(),
            products: useProductStore.getState().products,
            orders: useSalesStore.getState().orders,
            ingredients: useInventoryStore.getState().ingredients,
            opnameLogs: useInventoryStore.getState().opnameLogs || [],
            suppliers: useSupplierStore.getState().suppliers,
            expenses: useExpenseStore.getState().expenses,
            storeAccountMovements: useStoreAccountStore.getState().movements,
            promos: usePromoStore.getState().promos,
            customers: useCustomerStore.getState().customers,
            sessions: useSalesStore.getState().sessions,
            forecastHistory: useForecastHistoryStore.getState().records,
            storeConfig: {
                isOnlineOrderOpen: useStoreConfigStore.getState().isOnlineOrderOpen,
                closedBadge: useStoreConfigStore.getState().closedBadge,
                closedMessage: useStoreConfigStore.getState().closedMessage,
                reopenInfo: useStoreConfigStore.getState().reopenInfo,
            },
        };
        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Backup_Database_TehRaja_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Seluruh database toko berhasil di-backup ke file JSON!");
    };

    const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target?.result as string);
                if (!data.appName || !data.products) {
                    toast.error("Format file backup tidak valid!");
                    return;
                }
                if (confirm("Restore database akan menimpa data saat ini dengan isi file backup. Lanjutkan?")) {
                    if (data.products) useProductStore.setState({ products: data.products });
                    if (data.orders) useSalesStore.setState({ orders: data.orders });
                    if (data.ingredients) useInventoryStore.setState({ ingredients: data.ingredients, opnameLogs: data.opnameLogs || [] });
                    if (data.suppliers) useSupplierStore.setState({ suppliers: data.suppliers });
                    if (data.expenses) useExpenseStore.setState({ expenses: data.expenses });
                    if (data.storeAccountMovements) useStoreAccountStore.setState({ movements: data.storeAccountMovements });
                    if (data.promos) usePromoStore.setState({ promos: data.promos });
                    if (data.customers) useCustomerStore.setState({ customers: data.customers });
                    if (data.sessions) useSalesStore.setState({ sessions: data.sessions });
                    if (data.forecastHistory) useForecastHistoryStore.setState({ records: data.forecastHistory });
                    if (data.storeConfig) useStoreConfigStore.getState().updateStoreConfig(data.storeConfig);
                    toast.success("Database toko berhasil dipulihkan secara penuh!");
                }
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                toast.error("Gagal membaca file backup: " + msg);
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    // AI CRM Upsell State
    const [upsellSuggestion, setUpsellSuggestion] = useState<string | null>(null);
    const [isUpselling, setIsUpselling] = useState(false);
    const [upsellPhone, setUpsellPhone] = useState('');

    const handleUpsell = async (phone: string) => {
        if (!phone.trim()) return;
        setUpsellPhone(phone);
        setIsUpselling(true);
        setUpsellSuggestion(null);
        try {
            const matchedCustomer = customers.find((c) => c.phone === phone.trim());
            const customer = matchedCustomer || {
                id: 'guest',
                name: 'Pelanggan',
                phone: phone.trim(),
                points: 0,
                totalSpent: 0,
            };
            const orderHistory = orders.filter((o) => o.customerPhone === phone.trim() || (matchedCustomer && o.customerName === matchedCustomer.name));
            const availableProducts = products.filter((p) => p.isAvailable).slice(0, 10);
            const res = await fetch('/api/ai/crm-upsell', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ customer, orderHistory, availableProducts, currentCart: [] })
            });
            const data = await res.json();
            if (data.suggestion) setUpsellSuggestion(data.suggestion);
            else throw new Error('Tidak ada saran dari AI');
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            toast.error('Gagal mengambil saran AI: ' + msg);
        } finally {
            setIsUpselling(false);
        }
    };

    // ── Inventory CRUD Handlers ─────────────────────────────────
    const openAddIng = () => {
        setEditingIngId(null);
        setIngForm({ name: '', stock: 0, unit: 'ml', minStockThreshold: 100 });
        setIngModalOpen(true);
    };
    const openEditIng = (ing: typeof ingredients[0]) => {
        setEditingIngId(ing.id);
        setIngForm({ name: ing.name, stock: ing.stock, unit: ing.unit, minStockThreshold: ing.minStockThreshold });
        setIngModalOpen(true);
    };
    const saveIng = () => {
        if (!ingForm.name.trim()) { toast.error('Nama bahan wajib diisi!'); return; }
        if (editingIngId) {
            updateIngredient(editingIngId, ingForm);
            toast.success(`Bahan "${ingForm.name}" berhasil diperbarui.`);
        } else {
            addIngredient({ id: nanoid(), ...ingForm });
            toast.success(`Bahan "${ingForm.name}" berhasil ditambahkan!`);
        }
        setIngModalOpen(false);
    };

    // ── Supplier CRUD Handlers ──────────────────────────────────
    const openAddSup = () => {
        setEditingSupId(null);
        setSupForm({ name: '', contactPerson: '', phone: '', address: '', itemsSupplied: [] });
        setSupModalOpen(true);
    };
    const openEditSup = (sup: typeof suppliers[0]) => {
        setEditingSupId(sup.id);
        setSupForm({
            name: sup.name,
            contactPerson: sup.contactPerson,
            phone: sup.phone,
            address: sup.address,
            itemsSupplied: [...sup.itemsSupplied],
        });
        setSupModalOpen(true);
    };
    const saveSup = () => {
        if (!supForm.name.trim()) { toast.error('Nama suplier wajib diisi!'); return; }
        if (editingSupId) {
            updateSupplier(editingSupId, supForm);
            toast.success(`Suplier "${supForm.name}" berhasil diperbarui.`);
        } else {
            addSupplier({ id: nanoid(), ...supForm });
            toast.success(`Suplier "${supForm.name}" berhasil ditambahkan!`);
        }
        setSupModalOpen(false);
    };

    // ── Customer CRUD Handlers ──────────────────────────────────
    const openAddCust = () => {
        setEditingCustId(null);
        setCustForm({ name: '', phone: '', points: 10, totalSpent: 0 });
        setCustModalOpen(true);
    };
    const openEditCust = (cust: typeof customers[0]) => {
        setEditingCustId(cust.id);
        setCustForm({ name: cust.name, phone: cust.phone, points: cust.points, totalSpent: cust.totalSpent });
        setCustModalOpen(true);
    };
    const saveCust = () => {
        if (!custForm.name.trim() || !custForm.phone.trim()) {
            toast.error("Nama dan Nomor HP Member wajib diisi!");
            return;
        }
        if (editingCustId) {
            updateCustomer(editingCustId, {
                name: custForm.name.trim(),
                phone: custForm.phone.trim(),
                points: Number(custForm.points) || 0,
                totalSpent: Number(custForm.totalSpent) || 0,
            });
            toast.success(`Member "${custForm.name}" berhasil diperbarui.`);
        } else {
            addCustomer({
                id: nanoid(),
                name: custForm.name.trim(),
                phone: custForm.phone.trim(),
                points: Number(custForm.points) || 0,
                totalSpent: Number(custForm.totalSpent) || 0,
                createdAt: new Date().toISOString(),
            });
            toast.success(`Member "${custForm.name}" berhasil ditambahkan!`);
        }
        setCustModalOpen(false);
    };

    // ── Staff CRUD Handlers ─────────────────────────────────────
    const openAddStaff = () => {
        setEditingStaffId(null);
        setStaffForm({ name: '', username: '', password: '123', role: 'cashier' });
        setStaffModalOpen(true);
    };
    const openEditStaff = (u: typeof users[0]) => {
        setEditingStaffId(u.id);
        setStaffForm({ name: u.name, username: u.username, password: u.password || '123', role: u.role });
        setStaffModalOpen(true);
    };
    const saveStaff = () => {
        if (!staffForm.name.trim() || !staffForm.username.trim() || !staffForm.password.trim()) {
            toast.error("Nama, Username, dan Password wajib diisi!");
            return;
        }
        if (editingStaffId) {
            updateUser(editingStaffId, {
                name: staffForm.name.trim(),
                username: staffForm.username.trim(),
                password: staffForm.password.trim(),
                role: staffForm.role,
            });
            toast.success(`Akun "${staffForm.name}" berhasil diperbarui.`);
        } else {
            addUser({
                id: nanoid(),
                name: staffForm.name.trim(),
                username: staffForm.username.trim(),
                password: staffForm.password.trim(),
                role: staffForm.role,
            });
            toast.success(`Akun karyawan "${staffForm.name}" berhasil ditambahkan!`);
        }
        setStaffModalOpen(false);
    };

    // ── Promo CRUD Handlers ─────────────────────────────────────
    const openAddPromo = () => {
        setEditingPromoId(null);
        setPromoForm({
            name: '',
            type: 'percent',
            value: 10,
            minSubtotal: '',
            startHour: 9,
            endHour: 17,
            productId: products[0]?.id || '2',
            targetSize: 'M',
            bundleQty: 3,
            alwaysApplyInPkl: true,
            description: '',
            isActive: true,
        });
        setPromoModalOpen(true);
    };
    const openEditPromo = (promo: typeof promos[0]) => {
        setEditingPromoId(promo.id);
        setPromoForm({
            name: promo.name,
            type: promo.type,
            value: promo.value,
            minSubtotal: promo.minSubtotal ? String(promo.minSubtotal) : '',
            startHour: promo.startHour ?? 9,
            endHour: promo.endHour ?? 17,
            productId: promo.productId || '2',
            targetSize: promo.targetSize || 'M',
            bundleQty: promo.bundleQty || 3,
            alwaysApplyInPkl: promo.alwaysApplyInPkl ?? (promo.type === 'bundle'),
            description: promo.description ?? '',
            isActive: promo.isActive,
        });
        setPromoModalOpen(true);
    };
    const savePromo = () => {
        if (!promoForm.name.trim()) { toast.error('Nama promo wajib diisi!'); return; }
        const payload = {
            name: promoForm.name.trim(),
            type: promoForm.type,
            value: Number(promoForm.value),
            minSubtotal: promoForm.minSubtotal ? Number(promoForm.minSubtotal) : undefined,
            startHour: promoForm.type === 'happy_hour' ? promoForm.startHour : undefined,
            endHour: promoForm.type === 'happy_hour' ? promoForm.endHour : undefined,
            productId: promoForm.type === 'bundle' ? promoForm.productId : undefined,
            targetSize: promoForm.type === 'bundle' ? promoForm.targetSize : undefined,
            bundleQty: promoForm.type === 'bundle' ? Math.max(2, Number(promoForm.bundleQty) || 3) : undefined,
            alwaysApplyInPkl: promoForm.alwaysApplyInPkl,
            description: promoForm.description,
            isActive: promoForm.isActive,
        };
        if (editingPromoId) {
            updatePromo(editingPromoId, payload);
            toast.success(`Promo "${promoForm.name}" diperbarui!`);
        } else {
            addPromo({ id: nanoid(), ...payload });
            toast.success(`Promo "${promoForm.name}" ditambahkan!`);
        }
        setPromoModalOpen(false);
    };

    // Lifecycle Stage Counts (mengikuti Filter Hari & Sesi Shift)
    const orderStageCounts = useMemo(() => {
        return {
            all: periodOrders.length,
            pending: periodOrders.filter(o => !o.status || o.status === 'pending').length,
            awaiting_payment: periodOrders.filter(o => o.status === 'awaiting_payment').length,
            processing: periodOrders.filter(o => o.status === 'processing').length,
            completed: periodOrders.filter(o => o.status === 'completed').length,
            cancelled: periodOrders.filter(o => o.status === 'cancelled').length,
        };
    }, [periodOrders]);

    const filteredOrders = useMemo(() => {
        const statusWeight: Record<string, number> = {
            pending: 1,
            awaiting_payment: 2,
            processing: 3,
            completed: 4,
            cancelled: 5,
        };

        const list = periodOrders.filter(order => {
            const currentStatus = order.status || 'pending';
            const matchStatus = orderStatusFilter === 'all' || currentStatus === orderStatusFilter;
            const q = orderSearch.toLowerCase();
            const matchSearch = !q
                || (order.customerName || '').toLowerCase().includes(q)
                || order.id.toLowerCase().includes(q)
                || order.items.some(i => i.name.toLowerCase().includes(q));
            return matchStatus && matchSearch;
        });

        return list.sort((a, b) => {
            const timeA = new Date(a.date).getTime() || 0;
            const timeB = new Date(b.date).getTime() || 0;

            if (orderSortMode === 'pipeline') {
                const wA = statusWeight[a.status || 'pending'] || 99;
                const wB = statusWeight[b.status || 'pending'] || 99;
                if (wA !== wB) return wA - wB;
                return timeB - timeA;
            } else if (orderSortMode === 'oldest') {
                return timeA - timeB;
            } else {
                return timeB - timeA;
            }
        });
    }, [periodOrders, orderStatusFilter, orderSearch, orderSortMode]);

    // Charts Data (Produk Terpopuler & Waktu Tersibuk ikut merespons Filter Hari & Shift)
    const dailySales = getDailySales();
    const popularity = useMemo(() => {
        if (!isPeriodFilterActive) return getProductPopularity();
        const counts = new Map<string, number>();
        validOrders.forEach(o => o.items.forEach(i => counts.set(i.name, (counts.get(i.name) || 0) + i.quantity)));
        return Array.from(counts.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
    }, [isPeriodFilterActive, getProductPopularity, validOrders]);

    const peakHours = useMemo(() => {
        if (!isPeriodFilterActive) return getPeakHours();
        const hourMap = new Map<number, number>();
        validOrders.forEach(o => {
            const d = new Date(o.date);
            if (!isNaN(d.getTime())) {
                const h = d.getHours();
                hourMap.set(h, (hourMap.get(h) || 0) + 1);
            }
        });
        return Array.from(hourMap.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([h, count]) => ({ hour: `${String(h).padStart(2, '0')}:00`, count }));
    }, [isPeriodFilterActive, getPeakHours, validOrders]);

    // Variant analysis (only valid orders)
    const variantAnalysis = useMemo(() => {
        const sizeMap = new Map<string, number>();
        const sugarMap = new Map<string, number>();
        const tempMap = new Map<string, number>();
        validOrders.forEach(o => o.items.forEach(item => {
            const v = item.variants;
            if (v?.size) sizeMap.set(v.size, (sizeMap.get(v.size) || 0) + item.quantity);
            if (v?.sugar) sugarMap.set(v.sugar, (sugarMap.get(v.sugar) || 0) + item.quantity);
            if (v?.temperature) tempMap.set(v.temperature, (tempMap.get(v.temperature) || 0) + item.quantity);
        }));
        return { size: sizeMap, sugar: sugarMap, temp: tempMap };
    }, [validOrders]);

    // Low stock alerts
    const lowStockProducts = products.filter(p => p.stock <= (p.minStockThreshold ?? 5) && p.isAvailable);
    const lowStockIngredients = ingredients.filter(i => i.stock <= i.minStockThreshold);

    // Filter & Urutan Bahan Baku Inventaris (Pencarian & Abjad)
    const filteredIngredients = useMemo(() => {
        let result = [...ingredients];
        if (ingSearch.trim()) {
            const q = ingSearch.trim().toLowerCase();
            result = result.filter(ing =>
                ing.name.toLowerCase().includes(q) ||
                ing.id.toLowerCase().includes(q) ||
                ing.unit.toLowerCase().includes(q)
            );
        }
        switch (ingSortMode) {
            case 'az':
                result.sort((a, b) => a.name.localeCompare(b.name, 'id', { sensitivity: 'base' }));
                break;
            case 'za':
                result.sort((a, b) => b.name.localeCompare(a.name, 'id', { sensitivity: 'base' }));
                break;
            case 'stock_asc':
                result.sort((a, b) => a.stock - b.stock);
                break;
            case 'stock_desc':
                result.sort((a, b) => b.stock - a.stock);
                break;
            default:
                break;
        }
        return result;
    }, [ingredients, ingSearch, ingSortMode]);

    // Daftar bahan baku terurut abjad A-Z untuk dropdown modal (Restok, Opname, Resep, Suplier)
    const alphabetizedIngredients = useMemo(
        () => [...ingredients].sort((a, b) => a.name.localeCompare(b.name, 'id', { sensitivity: 'base' })),
        [ingredients]
    );

    const salesData = {
        labels: dailySales.map(d => d.date),
        datasets: [
            {
                label: "Penjualan (Rp)",
                data: dailySales.map(d => d.total),
                borderColor: "#D4AF37",
                backgroundColor: "rgba(212, 175, 55, 0.5)",
                yAxisID: 'y',
            },
            {
                label: "Jumlah Order",
                data: dailySales.map(d => d.count),
                borderColor: "#1A4D3E",
                backgroundColor: "rgba(26, 77, 62, 0.5)",
                yAxisID: 'y1',
            }
        ],
    };

    const popularityData = {
        labels: popularity.map(p => p.name),
        datasets: [
            {
                label: "Terjual (Cup)",
                data: popularity.map(p => p.count),
                backgroundColor: "rgba(26, 77, 62, 0.8)",
            }
        ]
    };

    const peakHoursData = {
        labels: peakHours.map(p => p.hour),
        datasets: [
            {
                label: "Pesanan Masuk",
                data: peakHours.map(p => p.count),
                backgroundColor: "rgba(212, 175, 55, 0.8)",
            }
        ]
    };

    if (!isClient || !authHydrated || !user) return null;

    const pendingCount = orders.filter(o => !o.status || o.status === 'pending' || o.status === 'awaiting_payment').length;
    const lowStockAlertCount = products.filter(p => p.stock <= (p.minStockThreshold ?? 5)).length + ingredients.filter(i => i.stock <= i.minStockThreshold).length;
    const tabs = [
        { id: 'dashboard' as const, label: 'Dashboard' },
        { id: 'products' as const, label: 'Menu & Resep BOM' },
        ...(user.role === 'admin' ? [{ id: 'inventory' as const, label: 'Bahan Baku & Suplier', icon: <Box size={18} />, badge: lowStockAlertCount }] : []),
        { id: 'orders' as const, label: 'Pesanan POS', badge: pendingCount },
        ...(user.role === 'admin' ? [{ id: 'keuangan' as const, label: 'Laba Rugi & Kas 💰', icon: <Wallet size={18} /> }] : []),
        ...(user.role === 'admin' ? [{ id: 'karyawan' as const, label: 'Karyawan' }] : []),
        ...(user.role === 'admin' && isAdvancedUnlocked ? [
            { id: 'analytics' as const, label: 'Analitik BI', icon: <BarChart2 size={18} /> },
            { id: 'promos' as const, label: 'Promo Engine', icon: <Ticket size={18} /> },
            { id: 'loyalty' as const, label: 'Loyalty CRM', icon: <UsersIcon size={18} /> },
            { id: 'cabang' as const, label: 'Multi Cabang', icon: <Building2 size={18} /> },
            { id: 'logs' as const, label: 'Log Aktivitas' },
            { id: 'ai-forecast' as const, label: 'AI Forecast ✨' },
        ] : []),
    ];

    const handleToggleAdvancedMode = () => {
        const nextVal = !isAdvancedUnlocked;
        toggleAdvancedUnlocked();
        if (!nextVal && ['analytics', 'promos', 'loyalty', 'cabang', 'logs', 'ai-forecast'].includes(activeTab)) {
            setActiveTab('dashboard');
        }
        if (nextVal) {
            toast.success('🔓 Seluruh Fitur Pengembangan Lanjutan (AI Forecast, KDS, CRM, Multi-Cabang) dibuka!');
        } else {
            toast.info('🔒 Dikunci ke Mode PKL (Fokus Kasir POS & Bahan Baku BOM).');
        }
    };

    const restockCostNum = parseFloat(String(restockForm.costAmount).replace(/\D/g, '')) || 0;
    const isRestockBlockedByBalance = restockCostNum > 0 && restockForm.paidVia === 'rekening_toko' && restockCostNum > storeAccount.availableBalance;
    const restockShortfall = Math.max(0, restockCostNum - storeAccount.availableBalance);
    const selectedRestockIng = ingredients.find(i => i.id === restockForm.ingredientId);

    const expenseAmountNum = parseFloat(String(expenseForm.amount).replace(/\D/g, '')) || 0;
    const isExpenseBlockedByBalance = expenseAmountNum > 0 && expenseForm.paidVia === 'rekening_toko' && expenseAmountNum > storeAccount.availableBalance;
    const expenseShortfall = Math.max(0, expenseAmountNum - storeAccount.availableBalance);

    const accountAmountNum = parseFloat(String(accountForm.amount).replace(/\D/g, '')) || 0;
    const isWithdrawOverBalance = accountModalMode === 'withdraw' && accountAmountNum > storeAccount.availableBalance;

    return (
        <div className="min-h-screen bg-gray-50 text-forest relative flex flex-col">
            {/* ============ ADMIN NAVBAR ============ */}
            <nav className="bg-forest text-cream shadow-lg sticky top-0 z-30">
                <div className="px-3 sm:px-6 py-2.5 sm:py-3 flex justify-between items-center gap-2">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="md:hidden p-1.5 sm:p-2 hover:bg-white/10 rounded-lg transition flex-shrink-0"
                            aria-label="Toggle menu"
                        >
                            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>
                        <Link href="/" className="text-base sm:text-xl font-serif font-bold text-gold whitespace-nowrap">TEH RAJA</Link>
                        <span className="opacity-30 hidden sm:block">|</span>
                        <span className="text-xs opacity-60 hidden sm:block uppercase tracking-wider truncate">
                            {isAdvancedUnlocked ? `Admin ERP · ${branchName || 'Cabang Utama'}` : 'Admin POS & Bahan Baku BOM'}
                        </span>
                    </div>
                    <div className="flex gap-1.5 sm:gap-2.5 items-center flex-shrink-0">
                        {/* Tombol Lock / Unlock Buka-Tutup Kedai Online Pelanggan */}
                        {user.role === 'admin' ? (
                            <button
                                type="button"
                                onClick={openStoreLockModal}
                                className={`flex items-center gap-1 sm:gap-1.5 text-[11px] font-bold px-2 sm:px-2.5 py-1.5 rounded-lg border transition whitespace-nowrap ${
                                    isOnlineOrderOpen
                                        ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40 hover:bg-emerald-500/30'
                                        : 'bg-red-500/30 text-red-200 border-red-400/60 hover:bg-red-500/40 animate-pulse'
                                }`}
                                title={isOnlineOrderOpen ? 'Kedai Online sedang Buka. Klik untuk menutup/meliburkan kedai.' : `Kedai Online sedang Tutup (${closedBadge}). Klik untuk membuka kembali.`}
                            >
                                {isOnlineOrderOpen ? <Store size={13} className="text-emerald-300 flex-shrink-0" /> : <Lock size={13} className="text-red-300 flex-shrink-0" />}
                                <span className="hidden lg:inline">
                                    {isOnlineOrderOpen ? 'Kedai Online: BUKA' : `Kedai Tutup (${closedBadge})`}
                                </span>
                                <span className="lg:hidden">
                                    {isOnlineOrderOpen ? 'Buka' : 'Tutup'}
                                </span>
                            </button>
                        ) : (
                            <span
                                className={`hidden sm:inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-lg border whitespace-nowrap ${
                                    isOnlineOrderOpen
                                        ? 'bg-emerald-500/15 text-emerald-200 border-emerald-400/30'
                                        : 'bg-red-500/25 text-red-200 border-red-400/50'
                                }`}
                            >
                                {isOnlineOrderOpen ? '🟢 Menu Online Buka' : `🔴 Menu Tutup (${closedBadge})`}
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={handleToggleAdvancedMode}
                            className={`flex items-center gap-1.5 text-[11px] font-bold px-2 sm:px-2.5 py-1.5 rounded-lg border transition whitespace-nowrap ${
                                isAdvancedUnlocked
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40 hover:bg-emerald-500/30'
                                    : 'bg-white/10 text-amber-300 border-amber-400/30 hover:bg-white/20'
                            }`}
                            title={isAdvancedUnlocked ? 'Klik untuk kunci kembali ke Mode PKL (POS & BOM)' : 'Klik untuk membuka seluruh fitur pengembangan lanjutan (Skripsi)'}
                        >
                            {isAdvancedUnlocked ? <Unlock size={13} /> : <Lock size={13} />}
                            <span className="hidden md:inline">{isAdvancedUnlocked ? 'Mode Full (Unlocked)' : 'Mode PKL (POS & BOM)'}</span>
                        </button>
                        <div className="h-6 w-[1px] bg-white/10 hidden lg:block"></div>
                        <Link href="/menu" className="hidden sm:flex items-center gap-1.5 text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition whitespace-nowrap">
                            <Coffee size={13} className="text-gold" /> Web Menu
                        </Link>
                        {isAdvancedUnlocked && (
                            <Link href="/kds" className="hidden sm:flex items-center gap-1.5 text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition whitespace-nowrap">
                                <ChefHat size={13} className="text-amber-400" /> Dapur KDS
                            </Link>
                        )}
                        <Link href="/pos" className="flex items-center gap-1.5 text-xs bg-amber-400 text-forest font-bold px-2.5 sm:px-3 py-1.5 rounded-lg hover:bg-amber-300 transition shadow whitespace-nowrap">
                            <span className="hidden sm:inline">Buka Kasir </span>
                            <span>POS</span>
                            <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse flex-shrink-0"></span>
                        </Link>
                        <a
                            href="/presentasi_pkl_tehraja.html"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hidden xl:flex items-center gap-1 text-xs bg-white/10 hover:bg-white/20 text-amber-300 px-2.5 py-1.5 rounded-lg transition whitespace-nowrap"
                            title="Slide Presentasi Laporan Akhir Pembuatan POS"
                        >
                            <Presentation size={13} /> Slide Laporan Akhir
                        </a>
                        <a
                            href="/presentasi_sempro_tehraja.html"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hidden xl:flex items-center gap-1 text-xs bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/40 text-amber-300 px-2.5 py-1.5 rounded-lg transition font-bold whitespace-nowrap"
                            title="Slide Presentasi Seminar Proposal (Sempro)"
                        >
                            <Sparkles size={13} /> Slide Sempro
                        </a>
                        <button onClick={handleLogout} className="p-1.5 sm:p-2 hover:bg-red-500/20 text-red-300 rounded-full transition flex-shrink-0" title="Logout">
                            <LogOut size={17} />
                        </button>
                    </div>
                </div>

                {/* Desktop Nav Tabs */}
                <div className="hidden md:flex px-6 pb-0 gap-1 text-xs lg:text-sm bg-black/20 overflow-x-auto">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id)}
                            className={`px-3.5 py-2 rounded-t-md transition relative font-medium whitespace-nowrap ${activeTab === tab.id
                                ? 'bg-gray-50 text-forest font-bold shadow-sm'
                                : 'hover:bg-white/5 text-cream/80'
                                }`}
                        >
                            {tab.label}
                            {Boolean(tab.badge && tab.badge > 0) && (
                                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-[10px] text-white font-bold items-center justify-center">
                                        {tab.badge}
                                    </span>
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Mobile Dropdown */}
                {isMobileMenuOpen && (
                    <div className="md:hidden border-t border-white/10 bg-forest-light max-h-[calc(100dvh-56px)] overflow-y-auto">
                        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center flex-shrink-0">
                                    <span className="text-gold font-bold text-sm">{user.name.charAt(0)}</span>
                                </div>
                                <div className="min-w-0">
                                    <p className="font-bold text-sm text-gold truncate">{user.name}</p>
                                    <p className="text-xs opacity-60 uppercase tracking-wider">{user.role}</p>
                                </div>
                            </div>
                            <div className="flex gap-2 flex-shrink-0">
                                <Link href="/menu" className="text-xs bg-white/10 px-2.5 py-1.5 rounded text-gold whitespace-nowrap">Menu</Link>
                                {isAdvancedUnlocked && (
                                    <Link href="/kds" className="text-xs bg-white/10 px-2.5 py-1.5 rounded text-amber-300 whitespace-nowrap">KDS</Link>
                                )}
                            </div>
                        </div>
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => handleTabChange(tab.id)}
                                className={`w-full text-left px-4 py-3 flex items-center justify-between transition ${activeTab === tab.id
                                    ? 'bg-gold/20 text-gold font-bold border-l-4 border-gold'
                                    : 'text-cream/80 hover:bg-white/5 border-l-4 border-transparent'
                                    }`}
                            >
                                <span>{tab.label}</span>
                                {Boolean(tab.badge && tab.badge > 0) && (
                                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                        {tab.badge}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                )}

                {/* Mobile Scrollable Tab Bar */}
                <div className="md:hidden flex gap-1 px-3 py-2 overflow-x-auto scrollbar-hide bg-black/20">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id)}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition relative flex-shrink-0 ${activeTab === tab.id
                                ? 'bg-gold text-forest'
                                : 'bg-white/10 text-cream/70 hover:bg-white/20'
                                }`}
                        >
                            {tab.label}
                            {Boolean(tab.badge && tab.badge > 0) && (
                                <span className="ml-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                    {tab.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </nav>

            {/* ============ MAIN CONTENT ============ */}
            <div className="flex-1 container mx-auto p-4 md:p-8">

                {/* === DASHBOARD TAB === */}
                {activeTab === 'dashboard' && (
                    <div className="animate-fade-in space-y-6 md:space-y-8">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                            <div>
                                <h2 className="text-xl md:text-2xl font-bold">Laporan Kinerja Operasional</h2>
                                <p className="text-xs text-gray-500 mt-0.5">Periode aktif: <strong className="text-forest">{activePeriodLabel}</strong></p>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                <button onClick={handleExportCSV} className="flex items-center gap-2 text-forest bg-white border border-gray-200 px-3 py-2 rounded text-sm hover:bg-gray-50 shadow-sm transition font-bold">
                                    <Download size={16} /> CSV
                                </button>
                                <button onClick={handleExportExcel} className="flex items-center gap-2 bg-green-700 text-white px-3 py-2 rounded text-sm hover:bg-green-800 shadow-sm transition font-bold">
                                    <FileSpreadsheet size={16} /> Excel (.xlsx)
                                </button>
                                <ReportGenerator orders={periodOrders} periodLabel={activePeriodLabel} />
                            </div>
                        </div>

                        {/* Kartu Kendali Buka / Tutup Kedai & Penguncian Menu Online Pelanggan (Hari Libur / Tutup) */}
                        <div
                            className={`rounded-2xl p-4 md:p-5 border shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition ${
                                isOnlineOrderOpen
                                    ? 'bg-emerald-50/70 border-emerald-200'
                                    : 'bg-red-50 border-red-300'
                            }`}
                        >
                            <div className="flex items-start gap-3.5">
                                <div
                                    className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-xs ${
                                        isOnlineOrderOpen
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-red-600 text-white'
                                    }`}
                                >
                                    {isOnlineOrderOpen ? <Store size={22} /> : <CalendarX2 size={22} />}
                                </div>
                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span
                                            className={`text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                                                isOnlineOrderOpen
                                                    ? 'bg-emerald-600 text-white'
                                                    : 'bg-red-600 text-white'
                                            }`}
                                        >
                                            {isOnlineOrderOpen ? '🟢 KEDAI BUKA (UNLOCKED)' : `🔒 KEDAI TUTUP (${closedBadge})`}
                                        </span>
                                        {storeStatusUpdatedAt && (
                                            <span className="text-[11px] text-gray-500">
                                                Diperbarui {new Date(storeStatusUpdatedAt).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                {storeStatusUpdatedBy ? ` oleh ${storeStatusUpdatedBy}` : ''}
                                            </span>
                                        )}
                                    </div>
                                    <p className={`text-sm font-bold mt-1.5 ${isOnlineOrderOpen ? 'text-emerald-950' : 'text-red-950'}`}>
                                        {isOnlineOrderOpen
                                            ? 'Menu & Order Online Pelanggan (/menu) sedang aktif dan siap menerima pesanan.'
                                            : 'Akses Menu & Order Online Pelanggan (/menu) sedang DIKUNCI — pelanggan tidak dapat melihat/memesan menu.'}
                                    </p>
                                    {!isOnlineOrderOpen && (
                                        <p className="text-xs text-red-800 mt-1">
                                            Pesan di layar pelanggan: <em>&ldquo;{closedMessage}&rdquo;</em>
                                            {reopenInfo ? ` · (${reopenInfo})` : ''}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {user.role === 'admin' && (
                                <div className="flex flex-wrap items-center gap-2 self-start lg:self-center flex-shrink-0">
                                    {isOnlineOrderOpen ? (
                                        <button
                                            type="button"
                                            onClick={openStoreLockModal}
                                            className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black transition flex items-center gap-1.5 shadow-sm"
                                        >
                                            <Lock size={14} /> Tutup / Liburkan Kedai
                                        </button>
                                    ) : (
                                        <>
                                            <button
                                                type="button"
                                                onClick={openStoreLockModal}
                                                className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-gray-50 text-red-700 border border-red-200 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
                                            >
                                                <Edit size={13} /> Ubah Pesan Libur
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleUnlockOnlineStore}
                                                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition flex items-center gap-1.5 shadow-md"
                                            >
                                                <Unlock size={14} /> Buka Kedai Sekarang
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Filter Per Hari & Per Sesi Shift (Mendukung 2+ Shift Sehari) */}
                        <DayShiftFilterBar
                            filterDateMode={filterDateMode}
                            customFilterDate={customFilterDate}
                            selectedShiftId={selectedShiftId}
                            sessionsOnSelectedDate={sessionsOnSelectedDate}
                            allEnrichedSessions={enrichedSessions}
                            activePeriodLabel={activePeriodLabel}
                            isFilterActive={isPeriodFilterActive}
                            onChangeDateMode={handleDateModeChange}
                            onSelectShift={handleSelectShiftFilter}
                            onReset={resetPeriodFilter}
                        />

                        {/* Kartu Saldo Rekening Toko Real-Time (Sumber Putaran Modal Restok Bahan) */}
                        <div className={`rounded-2xl p-4 md:p-5 border shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                            storeAccount.availableBalance > 0
                                ? 'bg-gradient-to-r from-[#0D2B20] via-[#133829] to-[#1a4433] text-white border-emerald-700/40'
                                : 'bg-gradient-to-r from-[#2c1515] to-[#3f1d1d] text-white border-red-700/40'
                        }`}>
                            <div className="flex items-start gap-3.5 min-w-0">
                                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                                    storeAccount.availableBalance > 0 ? 'bg-amber-400 text-[#0D2B20]' : 'bg-red-500 text-white'
                                }`}>
                                    <Landmark size={22} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-[11px] font-black uppercase tracking-wider text-amber-300">
                                            Rekening Toko · Putaran Modal Kedai (Real-Time)
                                        </span>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                            storeAccount.availableBalance > 0
                                                ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30'
                                                : 'bg-red-500/30 text-red-200 border border-red-400/40'
                                        }`}>
                                            {storeAccount.availableBalance > 0 ? 'Siap Putar Restok' : 'Saldo Kosong · Perlu Top-Up'}
                                        </span>
                                    </div>
                                    <p className="text-2xl sm:text-3xl font-black font-mono text-white mt-1 break-all">
                                        Rp {storeAccount.availableBalance.toLocaleString('id-ID')}
                                    </p>
                                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-white/75 mt-1.5">
                                        <span>Pendapatan Kedai: <strong className="text-emerald-300 font-mono">+Rp {storeAccount.totalOrderRevenue.toLocaleString('id-ID')}</strong></span>
                                        {storeAccount.totalTopUp > 0 && (
                                            <span>Top-Up: <strong className="text-sky-300 font-mono">+Rp {storeAccount.totalTopUp.toLocaleString('id-ID')}</strong></span>
                                        )}
                                        <span>Restok &amp; Biaya: <strong className="text-amber-200 font-mono">-Rp {storeAccount.totalAllExpenses.toLocaleString('id-ID')}</strong></span>
                                        {storeAccount.totalWithdraw > 0 && (
                                            <span>Tarik Dana: <strong className="text-red-200 font-mono">-Rp {storeAccount.totalWithdraw.toLocaleString('id-ID')}</strong></span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {user.role === 'admin' && (
                                <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => openAccountMovementModal('topup')}
                                        className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#0D2B20] text-xs font-black transition flex items-center gap-1.5 shadow-sm"
                                    >
                                        <Plus size={14} /> Top-Up Modal
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setRestockForm({
                                                ingredientId: ingredients[0]?.id || '',
                                                addQty: '',
                                                costAmount: '',
                                                paidVia: 'rekening_toko',
                                                supplierName: '',
                                            });
                                            setRestockModalOpen(true);
                                        }}
                                        className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                                    >
                                        <PackagePlus size={14} /> Restok Bahan (PO)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleTabChange('keuangan')}
                                        className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold transition flex items-center gap-1.5"
                                    >
                                        <Wallet size={14} /> Mutasi Rekening
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Low Stock Alert Banner */}
                        {(lowStockProducts.length > 0 || lowStockIngredients.length > 0) && (
                            <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <Bell size={18} className="text-amber-600 animate-pulse" />
                                    <p className="font-bold text-amber-800 text-sm">Peringatan Stok Menipis!</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {lowStockProducts.map(p => (
                                        <button key={p.id} onClick={() => handleTabChange('products')} className="text-xs bg-amber-100 text-amber-800 border border-amber-300 px-2 py-1 rounded-full font-bold hover:bg-amber-200 transition">
                                            🍵 {p.name} ({p.stock} cup)
                                        </button>
                                    ))}
                                    {lowStockIngredients.map(i => (
                                        <button key={i.id} onClick={() => handleTabChange('inventory')} className="text-xs bg-red-100 text-red-800 border border-red-300 px-2 py-1 rounded-full font-bold hover:bg-red-200 transition">
                                            ⚠️ {i.name} ({i.stock} {i.unit})
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* KPI Cards */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-white rounded-2xl p-4 md:p-5 border border-gray-100 shadow-sm flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">
                                            {selectedShiftObj ? `Order (${selectedShiftObj.shiftBadge})` : isPeriodFilterActive ? 'Order Periode' : 'Order Hari Ini'}
                                        </p>
                                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                    </div>
                                    <p className="text-2xl md:text-3xl font-black text-blue-600 mt-1 font-mono">
                                        {dashboardFocusOrders.length}
                                    </p>
                                </div>
                                <p className="text-[11px] text-gray-400 mt-2 pt-2 border-t border-gray-50 flex items-center justify-between">
                                    <span>Web &amp; POS Manual</span>
                                    <span className="font-semibold text-gray-600 font-mono">{orders.length} total</span>
                                </p>
                            </div>

                            <div className="bg-white rounded-2xl p-4 md:p-5 border border-gray-100 shadow-sm flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">
                                            {selectedShiftObj ? `Omzet (${selectedShiftObj.shiftBadge})` : isPeriodFilterActive ? 'Omzet Periode' : 'Omzet Hari Ini'}
                                        </p>
                                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                            {selectedShiftObj ? selectedShiftObj.shiftBadge : 'Live'}
                                        </span>
                                    </div>
                                    <p className="text-2xl md:text-3xl font-black text-amber-600 mt-1 font-mono">
                                        Rp {todayGrossRevenue.toLocaleString('id-ID')}
                                    </p>
                                </div>
                                <p className="text-[11px] text-gray-400 mt-2 pt-2 border-t border-gray-50 flex items-center justify-between">
                                    <span>{todayValidOrders.length} pesanan valid</span>
                                    <span className="font-semibold text-forest font-mono">Rp {allTimeGrossRevenue.toLocaleString('id-ID')} all</span>
                                </p>
                            </div>

                            <div className="bg-white rounded-2xl p-4 md:p-5 border border-gray-100 shadow-sm flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Perlu Tindakan</p>
                                        {(orderStageCounts.pending + orderStageCounts.awaiting_payment) > 0 && <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />}
                                    </div>
                                    <p className="text-2xl md:text-3xl font-black text-orange-600 mt-1 font-mono">
                                        {orderStageCounts.pending + orderStageCounts.awaiting_payment}
                                    </p>
                                </div>
                                <p className="text-[11px] text-gray-400 mt-2 pt-2 border-t border-gray-50 flex items-center justify-between">
                                    <span>Pesan &amp; Bayar</span>
                                    <span className="font-bold text-blue-600 font-mono">{orderStageCounts.processing} diracik</span>
                                </p>
                            </div>

                            <div className="bg-white rounded-2xl p-4 md:p-5 border border-gray-100 shadow-sm flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">
                                            {selectedShiftObj ? `Selesai (${selectedShiftObj.shiftBadge})` : isPeriodFilterActive ? 'Selesai Periode' : 'Selesai Hari Ini'}
                                        </p>
                                        <CheckCircle size={14} className="text-green-500" />
                                    </div>
                                    <p className="text-2xl md:text-3xl font-black text-green-600 mt-1 font-mono">
                                        {todayCompletedOrders.length}
                                    </p>
                                </div>
                                <p className="text-[11px] text-gray-400 mt-2 pt-2 border-t border-gray-50 flex items-center justify-between">
                                    <span>Sukses saji</span>
                                    <span className="font-semibold text-green-700 font-mono">{orders.filter(o => o.status === 'completed').length} total</span>
                                </p>
                            </div>
                        </div>

                        {/* Charts */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                            <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 h-72 md:h-96">
                                <h3 className="font-bold text-base md:text-lg mb-4 text-forest flex items-center gap-2">
                                    <span className="w-1 h-5 bg-gold rounded-full"></span> Tren Penjualan
                                </h3>
                                <Line data={salesData} options={{ responsive: true, maintainAspectRatio: false }} />
                            </div>
                            <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 h-72 md:h-96">
                                <h3 className="font-bold text-base md:text-lg mb-4 text-forest flex items-center gap-2">
                                    <span className="w-1 h-5 bg-forest rounded-full"></span> Produk Terpopuler
                                </h3>
                                <Bar data={popularityData} options={{ responsive: true, maintainAspectRatio: false }} />
                            </div>
                            <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 h-72 md:h-96">
                                <h3 className="font-bold text-base md:text-lg mb-4 text-forest flex items-center gap-2">
                                    <span className="w-1 h-5 bg-amber-500 rounded-full"></span> Waktu Tersibuk
                                </h3>
                                <Bar data={peakHoursData} options={{ responsive: true, maintainAspectRatio: false }} />
                            </div>
                        </div>

                        {/* Riwayat Sesi Shift Kasir (Mendukung Multi-Shift Harian: Shift 1, Shift 2, dst.) */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-4 md:p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                    <h3 className="font-bold text-lg text-forest flex items-center gap-2">
                                        <Clock size={20} className="text-amber-500" /> Riwayat Laporan Harian (Sesi Shift Kasir)
                                    </h3>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Laporan pendapatan dan rekonsiliasi laci kas per sesi shift (otomatis menomori <strong>Shift 1</strong>, <strong>Shift 2</strong> jika sehari ada beberapa sesi).
                                    </p>
                                </div>
                                {activeDateKey && (
                                    <span className="text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1.5 rounded-xl whitespace-nowrap">
                                        {sessionsOnSelectedDate.length} Sesi Shift pada Tanggal Ini
                                    </span>
                                )}
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold tracking-wider">
                                        <tr>
                                            <th className="p-4">Sesi Shift</th>
                                            <th className="p-4">Staff Kasir</th>
                                            <th className="p-4">Waktu Buka</th>
                                            <th className="p-4">Waktu Tutup</th>
                                            <th className="p-4 text-center">Jml Transaksi</th>
                                            <th className="p-4 text-right">Total Pendapatan</th>
                                            <th className="p-4 text-right">Aksi &amp; Detail</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {(activeDateKey ? sessionsOnSelectedDate : enrichedSessions.slice().reverse()).map(session => {
                                            const liveOrders = session.status === 'open'
                                                ? orders.filter(o => o.status !== 'cancelled' && isOrderInSession(o, session))
                                                : null;
                                            const rowOrdersCount = liveOrders ? liveOrders.length : session.totalOrders;
                                            const rowTotalSales = liveOrders
                                                ? liveOrders.reduce((sum, o) => sum + o.total, 0)
                                                : session.totalSales;
                                            const isSelectedShift = selectedShiftId === session.id;

                                            return (
                                                <tr key={session.id} className={`transition ${isSelectedShift ? 'bg-amber-50/70' : 'hover:bg-blue-50/50 bg-white'}`}>
                                                    <td className="p-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className={`px-2.5 py-1 rounded-full text-xs font-black ${
                                                                session.shiftNumber === 1
                                                                    ? 'bg-[#0D2B20] text-amber-300'
                                                                    : 'bg-amber-500 text-white'
                                                            }`}>
                                                                {session.shiftBadge}
                                                            </span>
                                                            {session.totalShiftsOnDay > 1 && (
                                                                <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                                                    dari {session.totalShiftsOnDay} shift
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 font-bold text-gray-800 flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs">
                                                            {session.cashierName.charAt(0)}
                                                        </div>
                                                        {session.cashierName}
                                                    </td>
                                                    <td className="p-4 text-sm text-gray-600 whitespace-nowrap">
                                                        {new Date(session.startTime).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                                                    </td>
                                                    <td className="p-4 text-sm text-gray-600 whitespace-nowrap">
                                                        {session.endTime
                                                            ? new Date(session.endTime).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
                                                            : <span className="text-green-600 font-bold text-xs bg-green-50 px-2 py-1 rounded border border-green-200">SEDANG BUKA</span>
                                                        }
                                                    </td>
                                                    <td className="p-4 text-center font-mono font-bold">{rowOrdersCount}</td>
                                                    <td className="p-4 text-right font-bold text-forest whitespace-nowrap">
                                                        Rp {rowTotalSales.toLocaleString('id-ID')}
                                                    </td>
                                                    <td className="p-4 text-right whitespace-nowrap">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => isSelectedShift ? setSelectedShiftId('all') : handleSelectShiftFilter(session.id, true)}
                                                                className={`text-xs px-2.5 py-1 rounded-lg font-bold transition border ${
                                                                    isSelectedShift
                                                                        ? 'bg-[#0D2B20] text-amber-300 border-[#0D2B20]'
                                                                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-amber-50 hover:border-amber-300'
                                                                }`}
                                                            >
                                                                {isSelectedShift ? '✓ Difilter' : 'Filter Shift'}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setShiftSummary(session)}
                                                                className="text-xs text-blue-600 hover:text-blue-800 font-bold transition"
                                                            >
                                                                Lihat Ringkasan
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {(activeDateKey ? sessionsOnSelectedDate.length === 0 : enrichedSessions.length === 0) && (
                                            <tr>
                                                <td colSpan={7} className="p-8 text-center text-gray-400 italic">
                                                    {activeDateKey
                                                        ? 'Tidak ada sesi shift kasir yang tercatat pada tanggal terpilih.'
                                                        : 'Belum ada riwayat sesi toko tersimpan.'}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Danger Zone */}
                        {user.role === 'admin' && (
                            <div className="bg-red-50 p-4 md:p-6 rounded-xl border border-red-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                                <div>
                                    <h4 className="font-bold text-red-800 flex items-center gap-2"><ShieldAlert size={18} /> Danger Zone</h4>
                                    <p className="text-xs text-red-600 mt-1">Hati-hati, tindakan reset data transaksi tidak dapat dibatalkan.</p>
                                </div>
                                <button onClick={handleReset} className="w-full sm:w-auto px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-bold text-sm transition">
                                    Reset Data Penjualan
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* === KEUNANGAN & LABA RUGI (P&L) TAB === */}
                {activeTab === 'keuangan' && user.role === 'admin' && (
                    <div className="animate-fade-in space-y-6">
                        <div className="bg-gradient-to-br from-[#0D2B20] to-[#1a4433] rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-amber-400 rounded-xl text-[#0D2B20]">
                                    <Wallet size={28} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-amber-400">Laporan Laba Rugi (P&amp;L) &amp; Arus Kas</h2>
                                    <p className="text-white/70 text-sm mt-0.5">Analisis profitabilitas riil, margin laba bersih, dan pengeluaran kas kecil (petty cash) kedai.</p>
                                </div>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                <button
                                    type="button"
                                    onClick={() => openAccountMovementModal('topup')}
                                    className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-white px-3.5 py-2.5 rounded-xl font-black text-xs transition shadow-md">
                                    <ArrowDownRight size={15} /> Top-Up Modal
                                </button>
                                <button
                                    type="button"
                                    onClick={() => openAccountMovementModal('withdraw')}
                                    className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-amber-200 border border-amber-300/30 px-3.5 py-2.5 rounded-xl font-bold text-xs transition">
                                    <ArrowUpRight size={15} /> Tarik Dana / Laba
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setExpenseModalOpen(true)}
                                    className="flex items-center gap-2 bg-amber-400 text-[#0D2B20] px-4 py-2.5 rounded-xl font-black text-xs hover:bg-amber-300 transition shadow-lg">
                                    <Plus size={15} /> Catat Biaya Operasional
                                </button>
                                <button
                                    type="button"
                                    onClick={handleExportPNL}
                                    className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-2.5 rounded-xl font-bold text-xs transition">
                                    <FileSpreadsheet size={15} /> Export P&amp;L (.xlsx)
                                </button>
                                <button
                                    type="button"
                                    onClick={handleExportBackup}
                                    className="flex items-center gap-2 bg-blue-600/80 hover:bg-blue-600 text-white px-3.5 py-2.5 rounded-xl font-bold text-xs transition">
                                    <Database size={15} /> Backup Data
                                </button>
                                <button
                                    type="button"
                                    onClick={() => backupFileRef.current?.click()}
                                    className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-3.5 py-2.5 rounded-xl font-bold text-xs transition">
                                    <Upload size={15} /> Restore Data
                                </button>
                                <input
                                    type="file"
                                    ref={backupFileRef}
                                    onChange={handleRestoreBackup}
                                    accept=".json"
                                    className="hidden"
                                />
                            </div>
                        </div>

                        {/* Panel Rekening Toko Real-Time (Sumber Putaran Modal Kedai) */}
                        <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-4 sm:p-6 space-y-4">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                <div className="flex items-start gap-3.5 min-w-0">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-xs ${
                                        storeAccount.availableBalance > 0 ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                                    }`}>
                                        <Landmark size={24} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-[11px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                                                🏦 Rekening Toko (Putar Modal Real-Time)
                                            </span>
                                            <span className="text-[11px] text-gray-400">
                                                Mengikuti total pendapatan valid kedai ({storeAccount.validOrderCount} order)
                                            </span>
                                        </div>
                                        <p className={`text-2xl sm:text-3xl font-black font-mono mt-1.5 break-all ${
                                            storeAccount.availableBalance > 0 ? 'text-[#0D2B20]' : 'text-red-600'
                                        }`}>
                                            Rp {storeAccount.availableBalance.toLocaleString('id-ID')}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Dana masuk dari penjualan kedai (Tunai + QRIS + Transfer) + Top-Up Modal, dikurangi biaya restok bahan, pengeluaran kas laci/bank, dan penarikan dana.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => openAccountMovementModal('topup')}
                                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition flex items-center gap-1.5 shadow-xs"
                                    >
                                        <ArrowDownRight size={14} /> + Top-Up Modal
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => openAccountMovementModal('withdraw')}
                                        disabled={storeAccount.availableBalance <= 0}
                                        className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                                            storeAccount.availableBalance <= 0
                                                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                                : 'bg-white text-red-700 border-red-200 hover:bg-red-50'
                                        }`}
                                    >
                                        <ArrowUpRight size={14} /> - Tarik Dana
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setRestockForm({
                                                ingredientId: ingredients[0]?.id || '',
                                                addQty: '',
                                                costAmount: '',
                                                paidVia: 'rekening_toko',
                                                supplierName: '',
                                            });
                                            setRestockModalOpen(true);
                                        }}
                                        className="px-3.5 py-2 rounded-xl bg-[#0D2B20] hover:bg-[#1a4433] text-amber-300 text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                                    >
                                        <PackagePlus size={14} /> Putar ke Restok Bahan (PO)
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-2 border-t border-gray-100">
                                <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-3">
                                    <p className="text-[10px] font-bold uppercase text-emerald-700">+ Pendapatan Kedai</p>
                                    <p className="text-sm sm:text-base font-black font-mono text-emerald-900 mt-0.5">
                                        +Rp {storeAccount.totalOrderRevenue.toLocaleString('id-ID')}
                                    </p>
                                    <p className="text-[10px] text-emerald-700/80 mt-0.5">
                                        Tunai Rp {storeAccount.cashRevenue.toLocaleString('id-ID')} · QRIS/TF Rp {storeAccount.digitalRevenue.toLocaleString('id-ID')}
                                    </p>
                                </div>
                                <div className="bg-sky-50/70 border border-sky-100 rounded-xl p-3">
                                    <p className="text-[10px] font-bold uppercase text-sky-700">+ Top-Up Modal</p>
                                    <p className="text-sm sm:text-base font-black font-mono text-sky-900 mt-0.5">
                                        +Rp {storeAccount.totalTopUp.toLocaleString('id-ID')}
                                    </p>
                                    <p className="text-[10px] text-sky-700/80 mt-0.5">Suntikan modal kerja kedai</p>
                                </div>
                                <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3">
                                    <p className="text-[10px] font-bold uppercase text-amber-800">- Restok Bahan (PO)</p>
                                    <p className="text-sm sm:text-base font-black font-mono text-amber-900 mt-0.5">
                                        -Rp {storeAccount.totalRestockCost.toLocaleString('id-ID')}
                                    </p>
                                    <p className="text-[10px] text-amber-800/80 mt-0.5">
                                        Rekening Rp {storeAccount.rekeningRestockCost.toLocaleString('id-ID')} · Laci Rp {storeAccount.cashDrawerRestockCost.toLocaleString('id-ID')}
                                    </p>
                                </div>
                                <div className="bg-orange-50/70 border border-orange-200 rounded-xl p-3">
                                    <p className="text-[10px] font-bold uppercase text-orange-800">- Biaya Operasional</p>
                                    <p className="text-sm sm:text-base font-black font-mono text-orange-900 mt-0.5">
                                        -Rp {storeAccount.totalOtherExpenses.toLocaleString('id-ID')}
                                    </p>
                                    <p className="text-[10px] text-orange-800/80 mt-0.5">
                                        Rekening Rp {storeAccount.rekeningOtherExpense.toLocaleString('id-ID')} · Laci Rp {storeAccount.cashDrawerOtherExpense.toLocaleString('id-ID')}
                                    </p>
                                </div>
                                <div className="bg-red-50/70 border border-red-200 rounded-xl p-3 col-span-2 sm:col-span-1">
                                    <p className="text-[10px] font-bold uppercase text-red-700">- Tarik Dana / Laba</p>
                                    <p className="text-sm sm:text-base font-black font-mono text-red-900 mt-0.5">
                                        -Rp {storeAccount.totalWithdraw.toLocaleString('id-ID')}
                                    </p>
                                    <p className="text-[10px] text-red-700/80 mt-0.5">Setoran profit ke pemilik</p>
                                </div>
                            </div>

                            {storeAccount.totalInflow > 0 && (
                                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                                    <div className="flex flex-wrap justify-between items-center gap-2 text-[11px] font-bold text-gray-600 mb-1.5">
                                        <span>Rasio Perputaran Modal (Restok + Biaya vs Total Dana Masuk)</span>
                                        <span className="font-mono text-forest">
                                            {Math.min(100, Math.round((storeAccount.totalAllExpenses / storeAccount.totalInflow) * 100))}% Terpakai · Sisa {Math.max(0, Math.round((storeAccount.availableBalance / storeAccount.totalInflow) * 100))}%
                                        </span>
                                    </div>
                                    <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden flex">
                                        <div
                                            className="bg-amber-500 h-full transition-all"
                                            style={{ width: `${Math.min(100, Math.round((storeAccount.totalRestockCost / storeAccount.totalInflow) * 100))}%` }}
                                            title="Restok Bahan"
                                        />
                                        <div
                                            className="bg-orange-500 h-full transition-all"
                                            style={{ width: `${Math.min(100, Math.round((storeAccount.totalOtherExpenses / storeAccount.totalInflow) * 100))}%` }}
                                            title="Biaya Operasional"
                                        />
                                        <div
                                            className="bg-red-500 h-full transition-all"
                                            style={{ width: `${Math.min(100, Math.round((storeAccount.totalWithdraw / storeAccount.totalInflow) * 100))}%` }}
                                            title="Penarikan Dana"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Filter Per Hari & Per Sesi Shift untuk Laporan Laba Rugi & Petty Cash */}
                        <DayShiftFilterBar
                            filterDateMode={filterDateMode}
                            customFilterDate={customFilterDate}
                            selectedShiftId={selectedShiftId}
                            sessionsOnSelectedDate={sessionsOnSelectedDate}
                            allEnrichedSessions={enrichedSessions}
                            activePeriodLabel={activePeriodLabel}
                            isFilterActive={isPeriodFilterActive}
                            onChangeDateMode={handleDateModeChange}
                            onSelectShift={handleSelectShiftFilter}
                            onReset={resetPeriodFilter}
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                                <div>
                                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400">1. Omzet Kotor (Gross Sales)</span>
                                    <p className="text-2xl font-black text-[#0D2B20] mt-1">Rp {grossRevenue.toLocaleString('id-ID')}</p>
                                </div>
                                <p className="text-[11px] text-gray-500 mt-3 pt-3 border-t border-gray-100 flex items-center gap-1">
                                    <span className="font-bold text-green-600">{validOrders.length}</span> transaksi berhasil
                                </p>
                            </div>

                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                                <div>
                                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400">2. Estimasi HPP (COGS 30%)</span>
                                    <p className="text-2xl font-black text-orange-600 mt-1">-Rp {estimatedCOGS.toLocaleString('id-ID')}</p>
                                </div>
                                <p className="text-[11px] text-gray-500 mt-3 pt-3 border-t border-gray-100">
                                    Laba Kotor: <span className="font-bold text-gray-800">Rp {grossProfit.toLocaleString('id-ID')}</span>
                                </p>
                            </div>

                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                                <div>
                                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400">3. Biaya Operasional (Petty Cash)</span>
                                    <p className="text-2xl font-black text-red-600 mt-1">-Rp {totalExpenses.toLocaleString('id-ID')}</p>
                                </div>
                                <div className="text-[11px] text-gray-500 mt-3 pt-3 border-t border-gray-100 flex justify-between">
                                    <span>Laci: Rp {drawerExpenses.toLocaleString('id-ID')}</span>
                                    <span>Bank: Rp {transferExpenses.toLocaleString('id-ID')}</span>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-amber-400 to-yellow-500 p-5 rounded-2xl shadow-lg text-[#0D2B20] flex flex-col justify-between">
                                <div>
                                    <span className="text-xs font-black uppercase tracking-wider opacity-80">4. Laba Bersih Riil (Net Profit)</span>
                                    <p className="text-3xl font-black mt-1">Rp {netProfit.toLocaleString('id-ID')}</p>
                                </div>
                                <div className="mt-3 pt-3 border-t border-[#0D2B20]/20 flex justify-between items-center text-xs font-black">
                                    <span>Net Profit Margin:</span>
                                    <span className="bg-[#0D2B20] text-amber-300 px-2.5 py-0.5 rounded-full">{netMargin}%</span>
                                </div>
                            </div>
                        </div>

                        {/* Petty Cash Table */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                                <div>
                                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                        <DollarSign size={18} className="text-amber-500 flex-shrink-0" /> Rincian Pengeluaran Operasional &amp; Kas Kecil (Petty Cash)
                                    </h3>
                                    <p className="text-xs text-gray-400 mt-0.5">Catatan uang keluar dari Kasir POS, Restok PO Bahan Baku, maupun Biaya Operasional Toko.</p>
                                </div>
                                <button
                                    onClick={() => setExpenseModalOpen(true)}
                                    className="bg-amber-100 hover:bg-amber-200 text-[#0D2B20] font-bold text-xs px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 self-start sm:self-auto flex-shrink-0">
                                    <Plus size={14} /> Tambah Biaya
                                </button>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead className="bg-gray-50 uppercase text-gray-500 font-bold tracking-wider">
                                        <tr>
                                            <th className="p-3.5">Tanggal</th>
                                            <th className="p-3.5">Kategori</th>
                                            <th className="p-3.5">Keperluan / Keterangan</th>
                                            <th className="p-3.5">Sumber Dana</th>
                                            <th className="p-3.5 text-right">Nominal (Rp)</th>
                                            <th className="p-3.5">Dicatat Oleh</th>
                                            <th className="p-3.5 text-center">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {periodExpenses.map(e => {
                                            const expShift = e.sessionId ? sessionByIdMap.get(e.sessionId) : enrichedSessions.find(s => isExpenseInSession(e, s));
                                            return (
                                            <tr key={e.id} className="hover:bg-gray-50 transition">
                                                <td className="p-3.5 text-gray-500 font-mono">
                                                    <div>{new Date(e.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                                                    {expShift && (
                                                        <span className="inline-block mt-0.5 text-[10px] font-bold bg-[#0D2B20]/10 text-[#0D2B20] px-1.5 py-0.5 rounded">
                                                            {expShift.shiftBadge}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-3.5">
                                                    <span className="font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                                                        {EXPENSE_CATEGORIES.find(c => c.id === e.category)?.label.split(' ')[0] || e.category}
                                                    </span>
                                                </td>
                                                <td className="p-3.5 font-bold text-gray-800">{e.description}</td>
                                                <td className="p-3.5">
                                                    <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${e.paidVia === 'kas_laci' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                                                        {e.paidVia === 'kas_laci' ? '💵 Kas Laci Kasir' : '🏦 Rekening Toko'}
                                                    </span>
                                                </td>
                                                <td className="p-3.5 text-right font-black text-red-600 font-mono text-sm">
                                                    -Rp {e.amount.toLocaleString('id-ID')}
                                                </td>
                                                <td className="p-3.5 text-gray-500">{e.cashierName || 'Admin'}</td>
                                                <td className="p-3.5 text-center">
                                                    <button
                                                        onClick={() => {
                                                            if (confirm(`Hapus pengeluaran "${e.description}"?`)) {
                                                                deleteExpense(e.id);
                                                                toast.success("Pengeluaran dihapus.");
                                                            }
                                                        }}
                                                        className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded transition">
                                                        <Trash size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                            );
                                        })}
                                        {periodExpenses.length === 0 && (
                                            <tr>
                                                <td colSpan={7} className="p-8 text-center text-gray-400">
                                                    {isPeriodFilterActive
                                                        ? `Tidak ada pengeluaran operasional tercatat pada periode "${activePeriodLabel}".`
                                                        : 'Belum ada pengeluaran yang dicatat. Klik "Catat Biaya Operasional".'}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Mutasi Rekening Toko Real-Time (Ledger Arus Modal) */}
                        <div className="bg-white rounded-2xl shadow-sm border border-emerald-200/80 overflow-hidden">
                            <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
                                <div>
                                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                        <Landmark size={18} className="text-emerald-600 flex-shrink-0" /> Buku Mutasi Rekening Toko (Arus Modal Real-Time)
                                    </h3>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        Riwayat kronologis setiap pendapatan masuk kedai, top-up modal, belanja restok bahan (PO), dan penarikan dana beserta saldo akhir berjalan.
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {([
                                        { id: 'all', label: `Semua (${storeAccountLedger.length})` },
                                        { id: 'in', label: 'Masuk' },
                                        { id: 'restock', label: 'Restok & Biaya' },
                                        { id: 'manual', label: `Top-Up / Tarik (${movements.length})` },
                                    ] as const).map(f => (
                                        <button
                                            key={f.id}
                                            type="button"
                                            onClick={() => setLedgerFilter(f.id)}
                                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition border ${
                                                ledgerFilter === f.id
                                                    ? 'bg-[#0D2B20] text-amber-300 border-[#0D2B20]'
                                                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                                            }`}
                                        >
                                            {f.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Desktop Ledger Table */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead className="bg-gray-50 uppercase text-gray-500 font-bold tracking-wider">
                                        <tr>
                                            <th className="p-3.5">Waktu</th>
                                            <th className="p-3.5">Jenis Mutasi</th>
                                            <th className="p-3.5">Keterangan</th>
                                            <th className="p-3.5">Sumber / Metode</th>
                                            <th className="p-3.5 text-right">Nominal (+/-)</th>
                                            <th className="p-3.5 text-right">Saldo Rekening</th>
                                            <th className="p-3.5 text-center">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {(showAllLedger ? filteredStoreLedger : filteredStoreLedger.slice(0, 25)).map(entry => (
                                            <tr key={entry.id} className="hover:bg-gray-50 transition">
                                                <td className="p-3.5 text-gray-500 font-mono whitespace-nowrap">
                                                    {new Date(entry.date).toLocaleString('id-ID', {
                                                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                                    })}
                                                </td>
                                                <td className="p-3.5 whitespace-nowrap">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                                        entry.kind === 'order_revenue' ? 'bg-emerald-100 text-emerald-800' :
                                                        entry.kind === 'topup' ? 'bg-sky-100 text-sky-800' :
                                                        entry.kind === 'restock' ? 'bg-amber-100 text-amber-800' :
                                                        entry.kind === 'withdraw' ? 'bg-red-100 text-red-800' :
                                                        'bg-orange-100 text-orange-800'
                                                    }`}>
                                                        {entry.kind === 'order_revenue' ? '💰 Penjualan' :
                                                         entry.kind === 'topup' ? '⬆️ Top-Up Modal' :
                                                         entry.kind === 'restock' ? '📦 Restok (PO)' :
                                                         entry.kind === 'withdraw' ? '⬇️ Tarik Dana' :
                                                         '💸 Biaya Ops'}
                                                    </span>
                                                </td>
                                                <td className="p-3.5">
                                                    <p className="font-bold text-gray-800">{entry.title}</p>
                                                    <p className="text-[11px] text-gray-400">{entry.subtitle}</p>
                                                </td>
                                                <td className="p-3.5 text-gray-600 whitespace-nowrap">
                                                    <span className="font-semibold">{entry.channelLabel}</span>
                                                    {entry.actor && <span className="block text-[10px] text-gray-400">oleh {entry.actor}</span>}
                                                </td>
                                                <td className={`p-3.5 text-right font-mono font-black whitespace-nowrap ${
                                                    entry.direction === 'in' ? 'text-emerald-600' : 'text-red-600'
                                                }`}>
                                                    {entry.direction === 'in' ? '+' : '-'}Rp {entry.amount.toLocaleString('id-ID')}
                                                </td>
                                                <td className={`p-3.5 text-right font-mono font-bold whitespace-nowrap ${
                                                    entry.balanceAfter >= 0 ? 'text-[#0D2B20]' : 'text-red-600'
                                                }`}>
                                                    Rp {entry.balanceAfter.toLocaleString('id-ID')}
                                                </td>
                                                <td className="p-3.5 text-center">
                                                    {entry.canDelete ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                if (confirm(`Hapus catatan mutasi "${entry.title}"? Saldo rekening akan disesuaikan otomatis.`)) {
                                                                    deleteMovement(entry.sourceId);
                                                                    toast.success("Mutasi rekening dihapus & saldo disesuaikan.");
                                                                }
                                                            }}
                                                            className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded transition"
                                                            title="Hapus mutasi manual"
                                                        >
                                                            <Trash size={14} />
                                                        </button>
                                                    ) : (
                                                        <span className="text-[10px] text-gray-300 font-semibold">Auto</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredStoreLedger.length === 0 && (
                                            <tr>
                                                <td colSpan={7} className="p-8 text-center text-gray-400 italic">
                                                    Belum ada mutasi Rekening Toko pada filter ini.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Ledger Cards (Bebas Terpotong di Layar Kecil) */}
                            <div className="md:hidden divide-y divide-gray-100">
                                {(showAllLedger ? filteredStoreLedger : filteredStoreLedger.slice(0, 25)).map(entry => (
                                    <div key={entry.id} className="p-3.5 space-y-1.5">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                                        entry.kind === 'order_revenue' ? 'bg-emerald-100 text-emerald-800' :
                                                        entry.kind === 'topup' ? 'bg-sky-100 text-sky-800' :
                                                        entry.kind === 'restock' ? 'bg-amber-100 text-amber-800' :
                                                        entry.kind === 'withdraw' ? 'bg-red-100 text-red-800' :
                                                        'bg-orange-100 text-orange-800'
                                                    }`}>
                                                        {entry.kind === 'order_revenue' ? '💰 Penjualan' :
                                                         entry.kind === 'topup' ? '⬆️ Top-Up' :
                                                         entry.kind === 'restock' ? '📦 Restok' :
                                                         entry.kind === 'withdraw' ? '⬇️ Tarik' :
                                                         '💸 Biaya'}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400 font-mono">
                                                        {new Date(entry.date).toLocaleString('id-ID', {
                                                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                                        })}
                                                    </span>
                                                </div>
                                                <p className="font-bold text-xs text-gray-800 mt-1 break-words">{entry.title}</p>
                                                <p className="text-[11px] text-gray-400 break-words">{entry.subtitle} · {entry.channelLabel}</p>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <p className={`font-mono font-black text-xs ${
                                                    entry.direction === 'in' ? 'text-emerald-600' : 'text-red-600'
                                                }`}>
                                                    {entry.direction === 'in' ? '+' : '-'}Rp {entry.amount.toLocaleString('id-ID')}
                                                </p>
                                                <p className="text-[10px] font-mono text-gray-500 mt-0.5">
                                                    Saldo Rp {entry.balanceAfter.toLocaleString('id-ID')}
                                                </p>
                                                {entry.canDelete && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (confirm(`Hapus catatan mutasi "${entry.title}"?`)) {
                                                                deleteMovement(entry.sourceId);
                                                                toast.success("Mutasi dihapus.");
                                                            }
                                                        }}
                                                        className="mt-1 text-[10px] text-red-500 font-bold underline"
                                                    >
                                                        Hapus
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {filteredStoreLedger.length === 0 && (
                                    <p className="p-6 text-center text-xs text-gray-400 italic">
                                        Belum ada mutasi Rekening Toko pada filter ini.
                                    </p>
                                )}
                            </div>

                            {filteredStoreLedger.length > 25 && (
                                <div className="p-3 bg-gray-50 border-t border-gray-100 text-center">
                                    <button
                                        type="button"
                                        onClick={() => setShowAllLedger(prev => !prev)}
                                        className="text-xs font-bold text-[#0D2B20] hover:underline"
                                    >
                                        {showAllLedger
                                            ? 'Tampilkan 25 Mutasi Terakhir'
                                            : `Tampilkan Semua (${filteredStoreLedger.length} Mutasi)`}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* === ANALYTICS BI TAB === */}
                {activeTab === 'analytics' && user.role === 'admin' && (
                    <div className="animate-fade-in space-y-6">
                        <div className="bg-gradient-to-br from-[#1a1a3e] to-[#2d2d6e] rounded-2xl p-6 text-white shadow-xl">
                            <div className="flex items-center gap-4 mb-5">
                                <div className="p-3 bg-violet-400 rounded-xl">
                                    <BarChart2 size={28} className="text-white" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-violet-200">Business Intelligence</h2>
                                    <p className="text-white/60 text-sm mt-0.5">Analitik mendalam · Berbasis data transaksi valid (tidak termasuk order batal)</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {[
                                    { label: 'Total Pendapatan Bersih', value: `Rp ${grossRevenue.toLocaleString('id-ID')}`, icon: '💰' },
                                    { label: 'Rata-rata / Order', value: `Rp ${validOrders.length ? Math.round(grossRevenue / validOrders.length).toLocaleString('id-ID') : '0'}`, icon: '📊' },
                                    { label: 'Pelanggan Unik', value: new Set(validOrders.map(o => o.customerPhone || o.customerName).filter(Boolean)).size, icon: '👥' },
                                    { label: 'Total Cup Terjual', value: validOrders.reduce((s, o) => s + o.items.reduce((si, i) => si + i.quantity, 0), 0), icon: '🍵' },
                                ].map(({ label, value, icon }) => (
                                    <div key={label} className="bg-white/10 border border-white/10 rounded-xl p-3 text-center">
                                        <p className="text-2xl mb-1">{icon}</p>
                                        <p className="text-lg font-black text-violet-200">{value}</p>
                                        <p className="text-white/50 text-[10px] mt-0.5">{label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                                <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><span className="w-1 h-5 bg-violet-500 rounded-full"></span> Metode Pembayaran</h3>
                                {validOrders.length > 0 ? (
                                    <div className="h-52 flex items-center justify-center">
                                        <Doughnut data={{ labels: ['Tunai', 'QRIS', 'Transfer'], datasets: [{ data: [validOrders.filter(o => o.paymentMethod === 'cash' || !o.paymentMethod).length, validOrders.filter(o => o.paymentMethod === 'qris').length, validOrders.filter(o => o.paymentMethod === 'transfer').length], backgroundColor: ['#1A4D3E', '#D4AF37', '#6366F1'], borderWidth: 2 }] }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
                                    </div>
                                ) : <p className="text-gray-400 text-center py-16 text-sm">Belum ada data.</p>}
                            </div>
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                                <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><span className="w-1 h-5 bg-amber-500 rounded-full"></span> Tipe Pesanan</h3>
                                {validOrders.length > 0 ? (
                                    <div className="h-52 flex items-center justify-center">
                                        <Doughnut data={{ labels: ['Dine-in', 'Take Away', 'Lainnya'], datasets: [{ data: [validOrders.filter(o => o.orderType === 'dine-in').length, validOrders.filter(o => o.orderType === 'take-away').length, validOrders.filter(o => !o.orderType).length], backgroundColor: ['#1A4D3E', '#D4AF37', '#9333EA'], borderWidth: 2 }] }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
                                    </div>
                                ) : <p className="text-gray-400 text-center py-16 text-sm">Belum ada data.</p>}
                            </div>
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                                <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><span className="w-1 h-5 bg-amber-400 rounded-full"></span> Jam Tersibuk</h3>
                                {peakHours.length > 0 ? (
                                    <div className="h-52"><Bar data={peakHoursData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} /></div>
                                ) : <p className="text-gray-400 text-center py-16 text-sm">Belum ada data.</p>}
                            </div>
                        </div>

                        {/* Variant Analysis */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                            <h3 className="font-bold text-gray-700 mb-5 flex items-center gap-2"><span className="w-1 h-5 bg-green-500 rounded-full"></span> Analisis Varian Favorit Pelanggan</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">📏 Ukuran Cup</p>
                                    {variantAnalysis.size.size > 0 ? (
                                        <div className="h-40 flex items-center justify-center">
                                            <Doughnut data={{ labels: Array.from(variantAnalysis.size.keys()), datasets: [{ data: Array.from(variantAnalysis.size.values()), backgroundColor: ['#1A4D3E', '#D4AF37'], borderWidth: 2 }] }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
                                        </div>
                                    ) : <p className="text-gray-400 text-xs text-center py-8">Data muncul setelah ada order dengan varian.</p>}
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">🍯 Level Gula</p>
                                    {variantAnalysis.sugar.size > 0 ? (
                                        <div className="space-y-2">
                                            {Array.from(variantAnalysis.sugar.entries()).sort((a, b) => b[1] - a[1]).map(([sugar, count]) => {
                                                const total = Array.from(variantAnalysis.sugar.values()).reduce((s, c) => s + c, 0);
                                                const pct = total ? Math.round(count / total * 100) : 0;
                                                return (
                                                    <div key={sugar}>
                                                        <div className="flex justify-between text-xs font-bold text-gray-600 mb-1"><span>Gula {sugar}</span><span>{count} cup ({pct}%)</span></div>
                                                        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }}></div></div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : <p className="text-gray-400 text-xs text-center py-8">Belum ada data varian gula.</p>}
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">🌡️ Suhu Minuman</p>
                                    {variantAnalysis.temp.size > 0 ? (
                                        <div className="h-40 flex items-center justify-center">
                                            <Doughnut data={{ labels: Array.from(variantAnalysis.temp.keys()).map(t => t === 'panas' ? '☕ Panas' : '🧊 Es'), datasets: [{ data: Array.from(variantAnalysis.temp.values()), backgroundColor: ['#EF4444', '#3B82F6'], borderWidth: 2 }] }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
                                        </div>
                                    ) : <p className="text-gray-400 text-xs text-center py-8">Belum ada data varian suhu.</p>}
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-5 border-b border-gray-100">
                                <h3 className="font-bold text-gray-800 flex items-center gap-2"><TrendingUp size={18} className="text-green-600" /> Tren Pendapatan Harian (7 Hari Terakhir)</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold tracking-wider">
                                        <tr>
                                            <th className="p-4">Tanggal</th>
                                            <th className="p-4 text-right">Jumlah Order</th>
                                            <th className="p-4 text-right">Total Pendapatan</th>
                                            <th className="p-4 text-right">Rata-rata/Order</th>
                                            <th className="p-4">Growth</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {dailySales.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-400">Belum ada data penjualan.</td></tr>}
                                        {dailySales.map((day, idx) => {
                                            const prev = dailySales[idx - 1];
                                            const growth = prev && prev.total > 0 ? ((day.total - prev.total) / prev.total * 100) : 0;
                                            return (
                                                <tr key={day.date} className="hover:bg-gray-50 transition">
                                                    <td className="p-4 font-bold text-gray-800">{day.date}</td>
                                                    <td className="p-4 text-right font-mono text-gray-700">{day.count}</td>
                                                    <td className="p-4 text-right font-black text-forest">Rp {day.total.toLocaleString('id-ID')}</td>
                                                    <td className="p-4 text-right text-sm text-gray-600">Rp {day.count ? Math.round(day.total / day.count).toLocaleString('id-ID') : '0'}</td>
                                                    <td className="p-4">{idx === 0 ? <span className="text-xs text-gray-400">—</span> : <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full ${growth >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{growth >= 0 ? '▲' : '▼'} {Math.abs(growth).toFixed(1)}%</span>}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* === ORDERS TAB (PIPELINE: 1. PESAN -> 2. BAYAR -> 3. RACIK -> 4. SELESAI) === */}
                {activeTab === 'orders' && (
                    <div className="animate-fade-in space-y-4">
                        {/* Filter Per Hari & Per Sesi Shift pada Daftar Pesanan POS */}
                        <DayShiftFilterBar
                            filterDateMode={filterDateMode}
                            customFilterDate={customFilterDate}
                            selectedShiftId={selectedShiftId}
                            sessionsOnSelectedDate={sessionsOnSelectedDate}
                            allEnrichedSessions={enrichedSessions}
                            activePeriodLabel={activePeriodLabel}
                            isFilterActive={isPeriodFilterActive}
                            onChangeDateMode={handleDateModeChange}
                            onSelectShift={handleSelectShiftFilter}
                            onReset={resetPeriodFilter}
                        />

                        {/* Header & Status Workflow Banner */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-4 md:p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-lg md:text-xl font-bold font-serif text-forest">Manajemen Pesanan &amp; Alur Transaksi</h2>
                                        <span className="bg-gold/20 text-[#0D2B20] text-[10px] font-bold px-2 py-0.5 rounded-full border border-gold/40">Real-Time Sync</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Tahapan Alur: <strong className="text-amber-600">1. Pesan Masuk</strong> ➔ <strong className="text-orange-600">2. Pembayaran</strong> ➔ <strong className="text-blue-600">3. Sedang Diracik (Dapur KDS)</strong> ➔ <strong className="text-green-600">4. Selesai</strong>. Pesanan baru selalu diurutkan paling atas.
                                    </p>
                                </div>
                                
                                {/* Action Counter Summary */}
                                <div className="flex items-center gap-2 text-xs">
                                    <div className="bg-amber-50 border border-amber-200 text-amber-900 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 shadow-xs">
                                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                                        <span>Perlu Tindakan: {orderStageCounts.pending + orderStageCounts.awaiting_payment}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Workflow Pipeline Filter Tabs */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 p-3 bg-gray-50 border-b border-gray-100 text-xs">
                                <button
                                    onClick={() => setOrderStatusFilter('all')}
                                    className={`px-3 py-2.5 rounded-xl font-bold transition flex items-center justify-between border ${
                                        orderStatusFilter === 'all'
                                            ? 'bg-[#0D2B20] text-amber-300 border-[#0D2B20] shadow-sm'
                                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                                    }`}
                                >
                                    <span>Semua Order</span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${orderStatusFilter === 'all' ? 'bg-amber-400/20 text-amber-300' : 'bg-gray-100 text-gray-600'}`}>
                                        {orderStageCounts.all}
                                    </span>
                                </button>

                                <button
                                    onClick={() => setOrderStatusFilter('pending')}
                                    className={`px-3 py-2.5 rounded-xl font-bold transition flex items-center justify-between border ${
                                        orderStatusFilter === 'pending'
                                            ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                                            : 'bg-white text-gray-800 border-amber-200 hover:bg-amber-50'
                                    }`}
                                >
                                    <span className="flex items-center gap-1.5">
                                        <span className={`w-2 h-2 rounded-full bg-amber-400 ${orderStageCounts.pending > 0 ? 'animate-ping' : ''}`} />
                                        1. Pesan Masuk
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black font-mono ${orderStatusFilter === 'pending' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'}`}>
                                        {orderStageCounts.pending}
                                    </span>
                                </button>

                                <button
                                    onClick={() => setOrderStatusFilter('awaiting_payment')}
                                    className={`px-3 py-2.5 rounded-xl font-bold transition flex items-center justify-between border ${
                                        orderStatusFilter === 'awaiting_payment'
                                            ? 'bg-orange-500 text-white border-orange-600 shadow-sm'
                                            : 'bg-white text-gray-800 border-orange-200 hover:bg-orange-50'
                                    }`}
                                >
                                    <span className="flex items-center gap-1.5">
                                        <Clock size={12} className={orderStageCounts.awaiting_payment > 0 ? "animate-pulse" : ""} />
                                        2. Pembayaran
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black font-mono ${orderStatusFilter === 'awaiting_payment' ? 'bg-white/20 text-white' : 'bg-orange-100 text-orange-800'}`}>
                                        {orderStageCounts.awaiting_payment}
                                    </span>
                                </button>

                                <button
                                    onClick={() => setOrderStatusFilter('processing')}
                                    className={`px-3 py-2.5 rounded-xl font-bold transition flex items-center justify-between border ${
                                        orderStatusFilter === 'processing'
                                            ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                                            : 'bg-white text-gray-800 border-blue-200 hover:bg-blue-50'
                                    }`}
                                >
                                    <span className="flex items-center gap-1.5">
                                        <Loader size={12} className={orderStageCounts.processing > 0 ? "animate-spin" : ""} />
                                        3. Sedang Diracik
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black font-mono ${orderStatusFilter === 'processing' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-800'}`}>
                                        {orderStageCounts.processing}
                                    </span>
                                </button>

                                <button
                                    onClick={() => setOrderStatusFilter('completed')}
                                    className={`px-3 py-2.5 rounded-xl font-bold transition flex items-center justify-between border ${
                                        orderStatusFilter === 'completed'
                                            ? 'bg-green-600 text-white border-green-700 shadow-sm'
                                            : 'bg-white text-gray-800 border-green-200 hover:bg-green-50'
                                    }`}
                                >
                                    <span className="flex items-center gap-1.5">
                                        <CheckCircle size={12} />
                                        4. Selesai
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black font-mono ${orderStatusFilter === 'completed' ? 'bg-white/20 text-white' : 'bg-green-100 text-green-800'}`}>
                                        {orderStageCounts.completed}
                                    </span>
                                </button>

                                <button
                                    onClick={() => setOrderStatusFilter('cancelled')}
                                    className={`px-3 py-2.5 rounded-xl font-bold transition flex items-center justify-between border ${
                                        orderStatusFilter === 'cancelled'
                                            ? 'bg-gray-600 text-white border-gray-700 shadow-sm'
                                            : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100'
                                    }`}
                                >
                                    <span>Dibatalkan</span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${orderStatusFilter === 'cancelled' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>
                                        {orderStageCounts.cancelled}
                                    </span>
                                </button>
                            </div>

                            {/* Filter, Search & Sorting Bar */}
                            <div className="p-3 md:p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white">
                                <div className="relative flex-1">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Cari nama pelanggan, ID order (#...), nomor meja, atau menu..."
                                        value={orderSearch}
                                        onChange={e => setOrderSearch(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-xs md:text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0D2B20] transition bg-gray-50/70"
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500 whitespace-nowrap font-medium hidden sm:inline">Urutan:</span>
                                    <select
                                        value={orderSortMode}
                                        onChange={e => setOrderSortMode(e.target.value as 'newest' | 'pipeline' | 'oldest')}
                                        className="border border-gray-200 rounded-xl text-xs font-bold text-gray-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0D2B20] bg-gray-50 transition"
                                    >
                                        <option value="newest">⚡ Pesanan Baru Paling Atas (Waktu Terbaru)</option>
                                        <option value="pipeline">🔄 Urut Sesuai Alur (Pesan ➔ Bayar ➔ Racik)</option>
                                        <option value="oldest">⏳ Pesanan Terlama Dahulu</option>
                                    </select>
                                </div>
                            </div>

                            {/* Order Count Information */}
                            <div className="px-4 py-2 bg-gray-50/60 border-b border-gray-100 flex justify-between items-center text-xs text-gray-500">
                                <span>Menampilkan <strong>{filteredOrders.length}</strong> pesanan</span>
                                {orderSortMode === 'newest' && (
                                    <span className="text-forest font-semibold flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                        Urutan: Pesanan baru otomatis muncul di posisi paling atas
                                    </span>
                                )}
                            </div>

                            {/* Desktop Table View */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider border-b border-gray-100">
                                        <tr>
                                            <th className="p-4 rounded-tl-lg">Order ID &amp; Tipe</th>
                                            <th className="p-4">Waktu Masuk</th>
                                            <th className="p-4">Pelanggan</th>
                                            <th className="p-4">Item Menu &amp; Catatan</th>
                                            <th className="p-4">Total Bayar</th>
                                            <th className="p-4">Status Alur</th>
                                            <th className="p-4 text-right rounded-tr-lg">Aksi Proses</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredOrders.map(order => {
                                            const orderTime = new Date(order.date);
                                            const diffMins = Math.floor((Date.now() - orderTime.getTime()) / 60000);
                                            const isVeryRecent = diffMins < 5;
                                            const orderShift = resolveOrderShift(order);

                                            return (
                                                <tr key={order.id} className="hover:bg-amber-50/30 transition bg-white">
                                                    <td className="p-4">
                                                        <div className="font-mono font-bold text-gray-800 text-xs">#{order.id.slice(0, 6).toUpperCase()}</div>
                                                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${order.orderType === 'take-away' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                                                {order.orderType === 'take-away' ? 'Bawa Pulang' : 'Makan di Tempat'}
                                                            </span>
                                                            {order.tableNumber && (
                                                                <span className="text-[10px] bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded font-mono">
                                                                    Meja {order.tableNumber}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 whitespace-nowrap">
                                                        <div className="font-mono font-bold text-gray-800">
                                                            {orderTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                        </div>
                                                        <div className="text-[10px] text-gray-400 mt-0.5">
                                                            {orderTime.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                                                            {isVeryRecent && (
                                                                <span className="ml-1 text-red-600 font-bold animate-pulse">🔥 Baru!</span>
                                                            )}
                                                        </div>
                                                        {orderShift && (
                                                            <span className="inline-block mt-1 text-[10px] font-bold bg-[#0D2B20] text-amber-300 px-2 py-0.5 rounded-full">
                                                                {orderShift.shiftBadge}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="font-bold text-gray-800 text-sm">{order.customerName || "Pelanggan"}</div>
                                                        {order.customerPhone && (
                                                            <div className="text-[11px] text-gray-500 font-mono mt-0.5">📞 {order.customerPhone}</div>
                                                        )}
                                                        <div className="text-[10px] text-gray-400 mt-0.5">Kasir: {order.cashierName || 'Web Store'}</div>
                                                    </td>
                                                    <td className="p-4 max-w-xs">
                                                        <div className="space-y-1">
                                                            {order.items.map((i, idx) => (
                                                                <div key={idx} className="border-b border-gray-50 last:border-0 pb-1">
                                                                    <span className="font-bold text-gray-800">{i.quantity}x {i.name}</span>
                                                                    {i.note && (
                                                                        <div className="text-[11px] text-blue-600 italic flex items-center gap-1 mt-0.5">
                                                                            📝 &ldquo;{i.note}&rdquo;
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 whitespace-nowrap">
                                                        <div className="font-black text-forest text-sm">
                                                            Rp {order.total.toLocaleString('id-ID')}
                                                        </div>
                                                        <div className="text-[10px] uppercase font-bold text-gray-500 mt-0.5">
                                                            {order.paymentMethod || 'TUNAI'}
                                                        </div>
                                                        {order.discount && order.discount > 0 && (
                                                            <div className="text-[10px] text-emerald-600 font-semibold">
                                                                {order.promoName ? `${order.promoName}: ` : ''}-Rp {order.discount.toLocaleString('id-ID')}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="p-4 whitespace-nowrap">
                                                        <OrderStatusBadge status={order.status} />
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <OrderActions
                                                            order={order}
                                                            updateOrderStatus={updateOrderStatus}
                                                            addLog={addLog}
                                                            userName={user?.name || "Admin"}
                                                            onCancel={() => setConfirmCancelOrder(order.id)}
                                                            onViewReceipt={() => setViewReceiptOrder(order)}
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {filteredOrders.length === 0 && (
                                            <tr>
                                                <td colSpan={7} className="p-12 text-center text-gray-400 italic">
                                                    {orderSearch || orderStatusFilter !== 'all' || isPeriodFilterActive
                                                        ? `Tidak ada pesanan yang sesuai dengan filter (${activePeriodLabel}).`
                                                        : 'Belum ada pesanan masuk.'}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card List View */}
                            <div className="md:hidden divide-y divide-gray-100">
                                {filteredOrders.length === 0 && (
                                    <p className="p-8 text-center text-gray-400 italic text-xs">
                                        {orderSearch || orderStatusFilter !== 'all' || isPeriodFilterActive
                                            ? `Tidak ada pesanan yang sesuai filter (${activePeriodLabel}).`
                                            : 'Belum ada pesanan masuk.'}
                                    </p>
                                )}
                                {filteredOrders.map(order => {
                                    const orderTime = new Date(order.date);
                                    const diffMins = Math.floor((Date.now() - orderTime.getTime()) / 60000);
                                    const isVeryRecent = diffMins < 5;
                                    const orderShift = resolveOrderShift(order);

                                    return (
                                        <div key={order.id} className="p-4 space-y-3 bg-white">
                                            <div className="flex justify-between items-start gap-2">
                                                <div>
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span className="font-bold text-gray-800 text-sm">{order.customerName || "Pelanggan"}</span>
                                                        {orderShift && (
                                                            <span className="text-[9px] bg-[#0D2B20] text-amber-300 font-bold px-1.5 py-0.5 rounded-full">
                                                                {orderShift.shiftBadge}
                                                            </span>
                                                        )}
                                                        {isVeryRecent && (
                                                            <span className="text-[9px] bg-red-100 text-red-600 font-black px-1.5 py-0.2 rounded-full animate-pulse">BARU</span>
                                                        )}
                                                    </div>
                                                    <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                                                        #{order.id.slice(0, 6).toUpperCase()} · {orderTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                        {order.tableNumber ? ` · Meja ${order.tableNumber}` : ''}
                                                    </p>
                                                </div>
                                                <OrderStatusBadge status={order.status} />
                                            </div>

                                            <div className="bg-gray-50 rounded-xl p-2.5 space-y-1 border border-gray-100 text-xs">
                                                {order.items.map((i, idx) => (
                                                    <div key={idx} className="flex justify-between items-start">
                                                        <span className="font-semibold text-gray-800">{i.quantity}x {i.name}</span>
                                                        {i.note && <span className="text-[10px] text-blue-600 italic">&ldquo;{i.note}&rdquo;</span>}
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="flex flex-wrap justify-between items-center gap-2 pt-2 border-t border-gray-50">
                                                <div className="min-w-0">
                                                    <span className="text-xs text-gray-400 block font-mono uppercase">{order.paymentMethod || 'TUNAI'}</span>
                                                    <span className="font-black text-forest text-sm">Rp {order.total.toLocaleString('id-ID')}</span>
                                                    {order.discount && order.discount > 0 && (
                                                        <span className="block text-[10px] text-emerald-600 font-semibold">
                                                            {order.promoName ? `${order.promoName}: ` : ''}-Rp {order.discount.toLocaleString('id-ID')}
                                                        </span>
                                                    )}
                                                </div>
                                                <OrderActions
                                                    order={order}
                                                    updateOrderStatus={updateOrderStatus}
                                                    addLog={addLog}
                                                    userName={user?.name || "Admin"}
                                                    onCancel={() => setConfirmCancelOrder(order.id)}
                                                    onViewReceipt={() => setViewReceiptOrder(order)}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}


                {/* === PRODUCTS TAB (MENU & RESEP BOM) === */}
                {activeTab === 'products' && (() => {
                    const bundlePromos = promos.filter(p => p.type === 'bundle');
                    return (
                    <div className="animate-fade-in">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-4 md:p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 bg-gray-50/50">
                                <div>
                                    <h2 className="text-lg md:text-xl font-bold font-serif">Manajemen Menu &amp; Resep BOM</h2>
                                    <p className="text-sm text-gray-400 mt-0.5">Kelola menu, harga, stok, dan resep bahan baku (Bill of Materials). Stok bahan otomatis terpotong saat order dibuat.</p>
                                </div>
                                {user.role === 'admin' && (
                                    <button onClick={openAddModal} className="px-3 md:px-4 py-2 bg-forest text-gold rounded-lg font-bold flex items-center gap-2 hover:bg-forest-light shadow transition hover:-translate-y-1 text-sm self-start sm:self-auto">
                                        <Plus size={16} /> Tambah Menu
                                    </button>
                                )}
                            </div>

                            {bundlePromos.length > 0 && (
                                <div className="px-4 md:px-6 py-3 bg-emerald-50/70 border-b border-emerald-100 space-y-2">
                                    {bundlePromos.map(bp => {
                                        const qty = bp.bundleQty || 3;
                                        const sz = bp.targetSize || 'M';
                                        const prodName = products.find(p => p.id === bp.productId)?.name || 'Imperial Jasmine';
                                        return (
                                            <div key={bp.id} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-600 text-white font-bold text-[10px] uppercase tracking-wide flex-shrink-0">
                                                        🏷️ Promo Paket
                                                    </span>
                                                    <span className="font-bold text-emerald-950">{bp.name}</span>
                                                    <span className="text-emerald-800">
                                                        · {prodName} ({sz}): {qty} cup Rp {bp.value.toLocaleString('id-ID')} · {qty * 2} cup Rp {(bp.value * 2).toLocaleString('id-ID')}
                                                    </span>
                                                </div>
                                                {user.role === 'admin' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            togglePromo(bp.id);
                                                            toast.success(`Promo "${bp.name}" ${bp.isActive ? 'dinonaktifkan' : 'diaktifkan'}.`);
                                                        }}
                                                        className={`px-2.5 py-1 rounded-full font-bold text-[11px] border transition flex-shrink-0 ${bp.isActive
                                                            ? 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700'
                                                            : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
                                                            }`}
                                                    >
                                                        {bp.isActive ? '● Aktif' : '○ Nonaktif'}
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Desktop Table */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold tracking-wider">
                                        <tr>
                                            <th className="p-4 w-20">Gambar</th>
                                            <th className="p-4">Nama Produk</th>
                                            <th className="p-4">Kategori</th>
                                            <th className="p-4">Resep BOM</th>
                                            <th className="p-4">Stok</th>
                                            <th className="p-4 text-right">Harga</th>
                                            <th className="p-4 text-center">Status</th>
                                            {user.role === 'admin' && <th className="p-4 text-right">Aksi</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {products.map(item => {
                                            let maxCups: number | null = null;
                                            (item.recipe || []).forEach(r => {
                                                const ing = ingredients.find(i => i.id === r.ingredientId);
                                                if (!ing || r.quantity <= 0) return;
                                                const can = Math.floor(ing.stock / r.quantity);
                                                maxCups = maxCups === null ? can : Math.min(maxCups, can);
                                            });
                                            const matchingBundle = bundlePromos.find(bp =>
                                                bp.isActive && (!bp.productId || bp.productId === item.id || (bp.productId === '2' && item.name.toLowerCase().includes('imperial jasmine')))
                                            );
                                            return (
                                                <tr key={item.id} className={`hover:bg-blue-50/50 transition bg-white ${!item.isAvailable ? 'opacity-60' : ''}`}>
                                                    <td className="p-4">
                                                        <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden border border-gray-200 relative">
                                                            {item.image ? (
                                                                <Image src={item.image} alt={item.name} fill className="object-cover" />
                                                            ) : <ImageIcon className="m-auto text-gray-300 mt-3" />}
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <p className="font-bold text-gray-800">{item.name}</p>
                                                            {matchingBundle && (
                                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                                    🏷️ {matchingBundle.bundleQty || 3}{matchingBundle.targetSize || 'M'}={Math.round(matchingBundle.value / 1000)}rb
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-gray-400 line-clamp-1">{item.description}</p>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className="px-2 py-1 text-xs rounded border border-gray-200 bg-gray-50 font-bold text-gray-600 uppercase">
                                                            {item.category}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 max-w-xs">
                                                        {(item.recipe && item.recipe.length > 0) ? (
                                                            <div className="flex flex-wrap gap-1">
                                                                {item.recipe.map(r => {
                                                                    const ing = ingredients.find(i => i.id === r.ingredientId);
                                                                    const low = ing ? ing.stock <= ing.minStockThreshold : true;
                                                                    return (
                                                                        <span key={r.ingredientId} className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${low ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'}`}>
                                                                            {ing?.name || r.ingredientId} · {r.quantity}{ing?.unit ? ` ${ing.unit}` : ''}
                                                                        </span>
                                                                    );
                                                                })}
                                                            </div>
                                                        ) : (
                                                            <span className="text-[11px] text-gray-400 italic">Belum ada resep</span>
                                                        )}
                                                        {maxCups !== null && (
                                                            <p className={`text-[10px] mt-1 font-bold ${maxCups === 0 ? 'text-red-600' : maxCups < 20 ? 'text-amber-600' : 'text-gray-500'}`}>
                                                                Bahan cukup untuk ±{maxCups} porsi
                                                            </p>
                                                        )}
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`font-mono font-bold text-lg ${item.stock === 0 ? 'text-red-500' :
                                                                item.stock <= (item.minStockThreshold || 5) ? 'text-yellow-600' : 'text-green-600'
                                                                }`}>
                                                                {item.stock}
                                                            </span>
                                                            {item.stock <= (item.minStockThreshold || 5) && item.stock > 0 && (
                                                                <AlertTriangle size={16} className="text-yellow-500" />
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-right font-mono font-bold text-forest whitespace-nowrap">
                                                        {typeof item.largePrice === 'number' ? (
                                                            <div className="leading-tight">
                                                                <div>M: Rp {item.price.toLocaleString('id-ID')}</div>
                                                                <div className="text-[11px] font-semibold text-gray-500 mt-0.5">L: Rp {item.largePrice.toLocaleString('id-ID')}</div>
                                                            </div>
                                                        ) : (
                                                            <>Rp {item.price.toLocaleString('id-ID')}</>
                                                        )}
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <button
                                                            onClick={() => {
                                                                toggleAvailability(item.id);
                                                                addLog("TOGGLE_PRODUCT", `${item.isAvailable ? 'Nonaktifkan' : 'Aktifkan'} menu: ${item.name}`, user?.name || 'Admin');
                                                            }}
                                                            disabled={user.role !== 'admin'}
                                                            className={`text-[11px] font-bold px-2.5 py-1 rounded-full border transition ${item.isAvailable ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'}`}
                                                            title="Klik untuk mengubah ketersediaan di Menu, POS & KDS"
                                                        >
                                                            {item.isAvailable ? '● Tersedia' : '○ Habis/Nonaktif'}
                                                        </button>
                                                    </td>
                                                    {user.role === 'admin' && (
                                                        <td className="p-4 text-right">
                                                            <div className="flex justify-end gap-2">
                                                                <button onClick={() => openEditModal(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded transition" title="Edit menu & resep"><Edit size={16} /></button>
                                                                <button onClick={() => handleDelete(item.id, item.name)} className="p-2 text-red-600 hover:bg-red-50 rounded transition" title="Hapus menu"><Trash size={16} /></button>
                                                            </div>
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        })}
                                        {products.length === 0 && (
                                            <tr><td colSpan={8} className="p-8 text-center text-gray-400 italic">Belum ada produk.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Cards */}
                            <div className="md:hidden divide-y divide-gray-100">
                                {products.map(item => {
                                    const matchingBundle = bundlePromos.find(bp =>
                                        bp.isActive && (!bp.productId || bp.productId === item.id || (bp.productId === '2' && item.name.toLowerCase().includes('imperial jasmine')))
                                    );
                                    return (
                                    <div key={item.id} className={`p-4 flex gap-3 items-start ${!item.isAvailable ? 'opacity-60' : ''}`}>
                                        <div className="w-14 h-14 flex-shrink-0 rounded-xl bg-gray-100 overflow-hidden border border-gray-200 relative">
                                            {item.image ? (
                                                <Image src={item.image} alt={item.name} fill className="object-cover" />
                                            ) : <ImageIcon className="m-auto text-gray-300 mt-4" size={20} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start gap-2">
                                                <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                                                    <p className="font-bold text-gray-800 text-sm leading-tight">{item.name}</p>
                                                    {matchingBundle && (
                                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                            🏷️ {matchingBundle.bundleQty || 3}{matchingBundle.targetSize || 'M'}={Math.round(matchingBundle.value / 1000)}rb
                                                        </span>
                                                    )}
                                                </div>
                                                {user.role === 'admin' && (
                                                    <div className="flex gap-1 flex-shrink-0">
                                                        <button onClick={() => openEditModal(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition"><Edit size={14} /></button>
                                                        <button onClick={() => handleDelete(item.id, item.name)} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"><Trash size={14} /></button>
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-[10px] text-gray-500 mt-0.5">
                                                {(item.recipe || []).length > 0 ? `Resep: ${(item.recipe || []).map(r => ingredients.find(i => i.id === r.ingredientId)?.name || r.ingredientId).join(', ')}` : 'Belum ada resep BOM'}
                                            </p>
                                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                <span className="px-1.5 py-0.5 text-[10px] rounded border border-gray-200 bg-gray-50 font-bold text-gray-600 uppercase">{item.category}</span>
                                                <button
                                                    onClick={() => toggleAvailability(item.id)}
                                                    disabled={user.role !== 'admin'}
                                                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${item.isAvailable ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}
                                                >
                                                    {item.isAvailable ? 'Tersedia' : 'Nonaktif'}
                                                </button>
                                                <span className={`font-mono font-bold text-sm ${item.stock === 0 ? 'text-red-500' : item.stock <= (item.minStockThreshold || 5) ? 'text-yellow-600' : 'text-green-600'}`}>
                                                    {item.stock} stok
                                                </span>
                                                <div className="font-mono font-bold text-sm text-forest ml-auto text-right">
                                                    {typeof item.largePrice === 'number' ? (
                                                        <>
                                                            <span>M: Rp {item.price.toLocaleString('id-ID')}</span>
                                                            <span className="block text-[11px] font-semibold text-gray-500">L: Rp {item.largePrice.toLocaleString('id-ID')}</span>
                                                        </>
                                                    ) : (
                                                        <span>Rp {item.price.toLocaleString('id-ID')}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                    );
                })()}

                {/* === LOGS TAB === */}
                {activeTab === 'logs' && user.role === 'admin' && (
                    <div className="animate-fade-in bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><History size={22} /></div>
                            <div>
                                <h2 className="text-lg md:text-xl font-bold font-serif">Log Aktivitas</h2>
                                <p className="text-sm text-gray-500">Rekam jejak tindakan sistem dari Admin, Kasir POS, dan Dapur KDS.</p>
                            </div>
                        </div>
                        <div className="space-y-2">
                            {logs.length === 0 && <p className="text-center text-gray-400 italic py-8">Belum ada aktivitas tercatat.</p>}
                            {logs.map(log => (
                                <div key={log.id} className="flex flex-col sm:flex-row sm:gap-4 p-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition rounded-lg">
                                    <div className="text-xs font-mono text-gray-400 sm:w-36 mb-1 sm:mb-0 flex-shrink-0 pt-0.5">
                                        {new Date(log.timestamp).toLocaleString('id-ID')}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex gap-2 items-center mb-1 flex-wrap">
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${log.action.includes('DELETE') || log.action.includes('CANCEL') ? 'bg-red-100 text-red-600' :
                                                log.action.includes('CREATE') || log.action.includes('COMPLETE') ? 'bg-green-100 text-green-600' :
                                                    'bg-blue-100 text-blue-600'
                                                }`}>
                                                {log.action}
                                            </span>
                                            <span className="font-bold text-sm text-gray-700">{log.user}</span>
                                        </div>
                                        <p className="text-sm text-gray-600">{log.details}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ============ TAB: AI FORECAST ============ */}
                {activeTab === 'ai-forecast' && user.role === 'admin' && (
                    <ForecastDashboard />
                )}

                {/* ============ TAB: KARYAWAN ============ */}
                {activeTab === 'karyawan' && user.role === 'admin' && (
                    <div className="animate-fade-in bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-4 md:p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 bg-gray-50/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><UsersIcon size={22} /></div>
                                <div>
                                    <h2 className="text-lg md:text-xl font-bold font-serif">Manajemen Karyawan</h2>
                                    <p className="text-sm text-gray-500">Akun login Admin &amp; Kasir. Kasir otomatis diarahkan ke halaman POS saat login.</p>
                                </div>
                            </div>
                            <button onClick={openAddStaff} className="px-4 py-2 bg-forest text-gold rounded-lg font-bold flex items-center gap-2 hover:bg-forest-light shadow text-sm self-start sm:self-auto">
                                <Plus size={16} /> Tambah Karyawan
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-sm">
                                <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold tracking-wider">
                                    <tr>
                                        <th className="p-4">Nama</th>
                                        <th className="p-4">Username</th>
                                        <th className="p-4">Role</th>
                                        <th className="p-4 text-center">Sesi Shift</th>
                                        <th className="p-4 text-right">Total Penjualan Shift</th>
                                        <th className="p-4 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {users.map(u => {
                                        const userSessions = sessions.filter(s => s.cashierName === u.name);
                                        const userSales = userSessions.reduce((s, x) => s + (x.totalSales || 0), 0);
                                        return (
                                            <tr key={u.id} className="hover:bg-gray-50 transition">
                                                <td className="p-4 font-bold text-gray-800 flex items-center gap-2">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${u.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                        {u.name.charAt(0)}
                                                    </div>
                                                    {u.name}
                                                    {u.id === user.id && <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold">Anda</span>}
                                                </td>
                                                <td className="p-4 font-mono text-gray-600">{u.username}</td>
                                                <td className="p-4">
                                                    <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase ${u.role === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                                        {u.role === 'admin' ? 'Admin' : 'Kasir'}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-center font-mono">{userSessions.length}</td>
                                                <td className="p-4 text-right font-bold text-forest">Rp {userSales.toLocaleString('id-ID')}</td>
                                                <td className="p-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button onClick={() => openEditStaff(u)} className="p-2 text-blue-600 hover:bg-blue-50 rounded transition" title="Edit akun"><Edit size={16} /></button>
                                                        <button
                                                            onClick={() => {
                                                                if (u.id === user.id) { toast.error("Tidak bisa menghapus akun yang sedang login!"); return; }
                                                                if (confirm(`Hapus akun karyawan "${u.name}"?`)) {
                                                                    removeUser(u.id);
                                                                    addLog("DELETE_USER", `Hapus akun karyawan: ${u.name}`, user.name);
                                                                    toast.success(`Akun "${u.name}" dihapus.`);
                                                                }
                                                            }}
                                                            className="p-2 text-red-600 hover:bg-red-50 rounded transition disabled:opacity-30"
                                                            disabled={u.id === user.id}
                                                            title="Hapus akun"
                                                        >
                                                            <Trash size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {users.length === 0 && (
                                        <tr><td colSpan={6} className="p-8 text-center text-gray-400 italic">Belum ada akun karyawan.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ============ TAB: INVENTARIS & SUPLIER ============ */}
                {activeTab === 'inventory' && user.role === 'admin' && (
                    <div className="animate-fade-in space-y-6">
                        <div className="bg-gradient-to-br from-[#0D2B20] to-[#1a4433] rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-amber-400 rounded-xl text-[#0D2B20]"><Box size={28} /></div>
                                <div>
                                    <h2 className="text-2xl font-black text-amber-400">Inventaris Bahan Baku &amp; Suplier</h2>
                                    <p className="text-white/70 text-sm mt-0.5">Stok bahan terhubung ke Resep BOM: otomatis berkurang saat order, kembali saat order dibatalkan.</p>
                                </div>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                <button onClick={openAddIng} className="flex items-center gap-2 bg-amber-400 text-[#0D2B20] px-4 py-2.5 rounded-xl font-black text-xs hover:bg-amber-300 transition shadow-lg">
                                    <Plus size={15} /> Tambah Bahan
                                </button>
                                <button onClick={() => { setRestockForm({ ingredientId: ingredients[0]?.id || '', addQty: '', costAmount: '', paidVia: 'rekening_toko', supplierName: '' }); setRestockModalOpen(true); }} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2.5 rounded-xl font-bold text-xs transition">
                                    <PackagePlus size={15} /> Restok Bahan (PO)
                                </button>
                                <button onClick={() => setOpnameModalOpen(true)} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-2.5 rounded-xl font-bold text-xs transition">
                                    <ClipboardCheck size={15} /> Stock Opname
                                </button>
                            </div>
                        </div>

                        {/* Rekening Toko Real-Time Siap Putar Modal Restok */}
                        <div className={`rounded-2xl p-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            storeAccount.availableBalance > 0
                                ? 'bg-emerald-50/80 border-emerald-200'
                                : 'bg-red-50/80 border-red-200'
                        }`}>
                            <div className="flex items-center gap-3 min-w-0">
                                <div className={`p-2.5 rounded-xl flex-shrink-0 ${
                                    storeAccount.availableBalance > 0 ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                                }`}>
                                    <Landmark size={20} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-600">
                                        Saldo Rekening Toko Siap Putar Modal Restok (Real-Time)
                                    </p>
                                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 mt-0.5">
                                        <span className={`text-lg sm:text-xl font-black font-mono ${
                                            storeAccount.availableBalance > 0 ? 'text-emerald-800' : 'text-red-700'
                                        }`}>
                                            Rp {storeAccount.availableBalance.toLocaleString('id-ID')}
                                        </span>
                                        <span className="text-[11px] text-gray-500">
                                            (Total sudah terpakai restok: <strong className="font-mono text-amber-800">Rp {storeAccount.totalRestockCost.toLocaleString('id-ID')}</strong>)
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2 flex-shrink-0">
                                <button
                                    type="button"
                                    onClick={() => openAccountMovementModal('topup')}
                                    className="px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#0D2B20] text-xs font-black transition flex items-center gap-1"
                                >
                                    <Plus size={13} /> Top-Up Modal
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleTabChange('keuangan')}
                                    className="px-3 py-2 rounded-xl bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 text-xs font-bold transition"
                                >
                                    Riwayat Rekening →
                                </button>
                            </div>
                        </div>

                        {/* Ingredients Table */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <h3 className="font-bold text-gray-800 flex items-center gap-2 text-base">
                                        <Box size={18} className="text-amber-500" /> Stok Bahan Baku ({ingredients.length})
                                    </h3>
                                    {lowStockIngredients.length > 0 && (
                                        <span className="text-xs font-bold bg-red-100 text-red-700 px-2.5 py-1 rounded-full">
                                            {lowStockIngredients.length} bahan menipis
                                        </span>
                                    )}
                                </div>

                                {/* Bilah Navbar Kontrol: Fitur Pencarian & Urutan Abjad */}
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full md:w-auto">
                                    {/* Search Input */}
                                    <div className="relative flex-1 sm:w-64">
                                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                        <input
                                            type="text"
                                            value={ingSearch}
                                            onChange={(e) => setIngSearch(e.target.value)}
                                            placeholder="Cari bahan (nama/ID/satuan)..."
                                            className="w-full pl-9 pr-8 py-2 text-xs bg-gray-50 hover:bg-gray-100/70 focus:bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition"
                                        />
                                        {ingSearch && (
                                            <button
                                                type="button"
                                                onClick={() => setIngSearch('')}
                                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full hover:bg-gray-200 transition"
                                                title="Hapus filter pencarian"
                                            >
                                                <X size={13} />
                                            </button>
                                        )}
                                    </div>

                                    {/* Sort Dropdown (Abjad A-Z, Z-A, Stok Sedikit, Stok Banyak) */}
                                    <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-amber-400 focus-within:border-amber-400">
                                        <ArrowUpDown size={14} className="text-amber-600 flex-shrink-0" />
                                        <select
                                            value={ingSortMode}
                                            onChange={(e) => setIngSortMode(e.target.value as 'az' | 'za' | 'stock_asc' | 'stock_desc' | 'default')}
                                            className="bg-transparent text-xs font-bold text-gray-700 focus:outline-none cursor-pointer pr-1"
                                            aria-label="Urutan Bahan Baku"
                                        >
                                            <option value="az">Urut: Abjad A - Z</option>
                                            <option value="za">Urut: Abjad Z - A</option>
                                            <option value="stock_asc">Urut: Stok Paling Sedikit</option>
                                            <option value="stock_desc">Urut: Stok Paling Banyak</option>
                                            <option value="default">Urut: Standar Bawaan</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Banner Filter Aktif */}
                            {(ingSearch.trim() || ingSortMode !== 'default') && (
                                <div className="px-5 py-2 bg-amber-50/60 border-b border-amber-100/70 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-900">
                                    <span className="flex items-center gap-1.5">
                                        <Filter size={13} className="text-amber-600" />
                                        Menampilkan <strong>{filteredIngredients.length}</strong> dari {ingredients.length} bahan baku
                                        {ingSearch && <span> (kata kunci: &ldquo;{ingSearch}&rdquo;)</span>}
                                        <span className="text-gray-500">· Urutan: {
                                            ingSortMode === 'az' ? 'Abjad A-Z' :
                                            ingSortMode === 'za' ? 'Abjad Z-A' :
                                            ingSortMode === 'stock_asc' ? 'Stok Paling Sedikit' :
                                            ingSortMode === 'stock_desc' ? 'Stok Paling Banyak' : 'Standar'
                                        }</span>
                                    </span>
                                    {ingSearch && (
                                        <button
                                            type="button"
                                            onClick={() => setIngSearch('')}
                                            className="text-[11px] font-bold text-amber-700 hover:text-amber-900 underline cursor-pointer"
                                        >
                                            Reset Pencarian
                                        </button>
                                    )}
                                </div>
                            )}

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-sm">
                                    <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold tracking-wider">
                                        <tr>
                                            <th className="p-4">Nama Bahan</th>
                                            <th className="p-4">Stok</th>
                                            <th className="p-4">Level</th>
                                            <th className="p-4">Dipakai di Menu</th>
                                            <th className="p-4 text-right">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredIngredients.map(ing => {
                                            const isLow = ing.stock <= ing.minStockThreshold;
                                            const pct = Math.min(100, Math.round((ing.stock / Math.max(1, ing.minStockThreshold * 4)) * 100));
                                            const usedIn = products.filter(p => (p.recipe || []).some(r => r.ingredientId === ing.id));
                                            const isKresek1 = ing.id === 'ing-kresek-1';
                                            const isKresek21 = ing.id === 'ing-kresek-21';
                                            const isKresek28 = ing.id === 'ing-kresek-28';
                                            const isKresekAuto = isKresek1 || isKresek21 || isKresek28;

                                            return (
                                                <tr key={ing.id} className={`transition ${isLow ? 'bg-red-50/40 hover:bg-red-50' : 'hover:bg-gray-50'}`}>
                                                    <td className="p-4">
                                                        <p className="font-bold text-gray-800 flex items-center gap-1.5">
                                                            {isLow && <AlertTriangle size={14} className="text-red-500" />}
                                                            {ing.name}
                                                            {isKresekAuto && (
                                                                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-black">
                                                                    Otomatis
                                                                </span>
                                                            )}
                                                        </p>
                                                        <p className="text-[10px] text-gray-400 font-mono">{ing.id} · min {ing.minStockThreshold} {ing.unit}</p>
                                                    </td>
                                                    <td className={`p-4 font-mono font-black ${isLow ? 'text-red-600' : 'text-forest'}`}>
                                                        {ing.stock.toLocaleString('id-ID')} {ing.unit}
                                                    </td>
                                                    <td className="p-4 w-40">
                                                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                            <div className={`h-full rounded-full ${isLow ? 'bg-red-500' : pct < 50 ? 'bg-amber-400' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex flex-wrap gap-1 max-w-xs">
                                                            {isKresek1 && (
                                                                <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded font-bold">
                                                                    📦 Pesanan 1 Cup
                                                                </span>
                                                            )}
                                                            {isKresek21 && (
                                                                <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded font-bold">
                                                                    📦 Pesanan 2-4 Cup
                                                                </span>
                                                            )}
                                                            {isKresek28 && (
                                                                <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded font-bold">
                                                                    📦 Pesanan 5-7 Cup
                                                                </span>
                                                            )}
                                                            {usedIn.slice(0, 4).map(p => (
                                                                <span key={p.id} className="text-[10px] bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded font-bold">{p.name}</span>
                                                            ))}
                                                            {usedIn.length > 4 && <span className="text-[10px] text-gray-500">+{usedIn.length - 4}</span>}
                                                            {!isKresekAuto && usedIn.length === 0 && <span className="text-[10px] text-gray-400 italic">-</span>}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <div className="flex justify-end gap-1.5">
                                                            <button
                                                                onClick={() => { setRestockForm({ ingredientId: ing.id, addQty: '', costAmount: '', paidVia: 'rekening_toko', supplierName: '' }); setRestockModalOpen(true); }}
                                                                className="px-2 py-1 text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition"
                                                            >
                                                                + Restok
                                                            </button>
                                                            <button onClick={() => openEditIng(ing)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition"><Edit size={15} /></button>
                                                            <button
                                                                onClick={() => setConfirmDeleteIng({ id: ing.id, name: ing.name, usedCount: usedIn.length })}
                                                                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"
                                                                title="Hapus Bahan Baku"
                                                            >
                                                                <Trash size={15} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {filteredIngredients.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="p-8 text-center text-gray-400 italic">
                                                    {ingSearch
                                                        ? `Tidak ada bahan baku yang cocok dengan pencarian "${ingSearch}".`
                                                        : 'Belum ada bahan baku.'}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Stock Opname Log */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                                <h3 className="font-bold text-gray-800 flex items-center gap-2"><ClipboardCheck size={18} className="text-amber-600" /> Riwayat Stock Opname</h3>
                                <button onClick={() => setOpnameModalOpen(true)} className="bg-amber-100 hover:bg-amber-200 text-[#0D2B20] font-bold text-xs px-3 py-1.5 rounded-lg transition flex items-center gap-1.5">
                                    <Plus size={14} /> Input Opname
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead className="bg-gray-50 uppercase text-gray-500 font-bold tracking-wider">
                                        <tr>
                                            <th className="p-3.5">Tanggal</th>
                                            <th className="p-3.5">Bahan</th>
                                            <th className="p-3.5 text-right">Sistem</th>
                                            <th className="p-3.5 text-right">Fisik</th>
                                            <th className="p-3.5 text-right">Selisih</th>
                                            <th className="p-3.5">Alasan</th>
                                            <th className="p-3.5">Auditor</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {(opnameLogs || []).slice(0, 30).map(log => (
                                            <tr key={log.id} className="hover:bg-gray-50">
                                                <td className="p-3.5 font-mono text-gray-500">{new Date(log.date).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</td>
                                                <td className="p-3.5 font-bold text-gray-800">{log.ingredientName}</td>
                                                <td className="p-3.5 text-right font-mono">{log.systemStock} {log.unit}</td>
                                                <td className="p-3.5 text-right font-mono">{log.actualStock} {log.unit}</td>
                                                <td className={`p-3.5 text-right font-mono font-black ${log.difference < 0 ? 'text-red-600' : log.difference > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                                                    {log.difference > 0 ? '+' : ''}{log.difference} {log.unit}
                                                </td>
                                                <td className="p-3.5"><span className="bg-gray-100 px-2 py-0.5 rounded font-bold text-gray-700">{log.reason.replace('_', ' ')}</span>{log.notes && <span className="block text-[10px] text-gray-400 mt-0.5">{log.notes}</span>}</td>
                                                <td className="p-3.5 text-gray-500">{log.recordedBy}</td>
                                            </tr>
                                        ))}
                                        {(opnameLogs || []).length === 0 && (
                                            <tr><td colSpan={7} className="p-8 text-center text-gray-400 italic">Belum ada riwayat stock opname.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Suppliers */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                                <h3 className="font-bold text-gray-800 flex items-center gap-2"><Building2 size={18} className="text-blue-600" /> Daftar Suplier ({suppliers.length})</h3>
                                <button onClick={openAddSup} className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs px-3 py-1.5 rounded-lg transition flex items-center gap-1.5">
                                    <Plus size={14} /> Tambah Suplier
                                </button>
                            </div>
                            <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {suppliers.map(sup => (
                                    <div key={sup.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition">
                                        <div className="flex justify-between items-start gap-2">
                                            <div>
                                                <p className="font-bold text-gray-800">{sup.name}</p>
                                                <p className="text-xs text-gray-500 mt-0.5">👤 {sup.contactPerson || '-'} · 📞 {sup.phone || '-'}</p>
                                                <p className="text-[11px] text-gray-400 mt-0.5">📍 {sup.address || '-'}</p>
                                            </div>
                                            <div className="flex gap-1 flex-shrink-0">
                                                <button onClick={() => openEditSup(sup)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit size={14} /></button>
                                                <button
                                                    onClick={() => {
                                                        if (confirm(`Hapus suplier "${sup.name}"?`)) {
                                                            deleteSupplier(sup.id);
                                                            toast.success(`Suplier "${sup.name}" dihapus.`);
                                                        }
                                                    }}
                                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                                >
                                                    <Trash size={14} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-1 mt-3">
                                            {sup.itemsSupplied.map(itemId => (
                                                <span key={itemId} className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded font-bold">
                                                    {ingredients.find(i => i.id === itemId)?.name || itemId}
                                                </span>
                                            ))}
                                            {sup.itemsSupplied.length === 0 && <span className="text-[10px] text-gray-400 italic">Belum ada bahan terhubung</span>}
                                        </div>
                                        <button
                                            onClick={() => { setRestockForm({ ingredientId: sup.itemsSupplied.find(id => ingredients.some(i => i.id === id)) || ingredients[0]?.id || '', addQty: '', costAmount: '', paidVia: 'rekening_toko', supplierName: sup.name }); setRestockModalOpen(true); }}
                                            className="mt-3 w-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg py-1.5 hover:bg-emerald-100 transition flex items-center justify-center gap-1.5"
                                        >
                                            <PackagePlus size={13} /> Buat PO / Restok dari Suplier ini
                                        </button>
                                    </div>
                                ))}
                                {suppliers.length === 0 && (
                                    <p className="col-span-full text-center text-gray-400 italic py-6 text-sm">Belum ada suplier. Klik &quot;Tambah Suplier&quot;.</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ============ TAB: PROMO ENGINE ============ */}
                {activeTab === 'promos' && user.role === 'admin' && (
                    <div className="animate-fade-in space-y-6">
                        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white/20 rounded-xl"><Ticket size={28} /></div>
                                <div>
                                    <h2 className="text-2xl font-black">Promo Engine</h2>
                                    <p className="text-white/80 text-sm mt-0.5">Promo aktif otomatis diterapkan di Web Menu pelanggan &amp; Kasir POS secara real-time.</p>
                                </div>
                            </div>
                            <button onClick={openAddPromo} className="flex items-center gap-2 bg-white text-orange-700 px-4 py-2.5 rounded-xl font-black text-xs hover:bg-orange-50 transition shadow-lg self-start md:self-auto">
                                <Plus size={15} /> Buat Promo
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {promos.map(promo => {
                                const hour = new Date().getHours();
                                const inWindow = promo.type !== 'happy_hour' || (hour >= (promo.startHour ?? 0) && hour < (promo.endHour ?? 24));
                                const liveNow = promo.isActive && inWindow;
                                return (
                                    <div key={promo.id} className={`bg-white rounded-2xl border-2 p-5 shadow-sm transition ${liveNow ? 'border-amber-400' : 'border-gray-100 opacity-80'}`}>
                                        <div className="flex justify-between items-start gap-2">
                                            <div>
                                                <p className="font-black text-gray-800">{promo.name}</p>
                                                <p className="text-xs text-gray-500 mt-0.5">{promo.description || '-'}</p>
                                            </div>
                                            <button
                                                onClick={() => { togglePromo(promo.id); toast.success(`Promo "${promo.name}" ${promo.isActive ? 'dinonaktifkan' : 'diaktifkan'}.`); }}
                                                className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${promo.isActive ? 'bg-amber-500' : 'bg-gray-300'}`}
                                                title="Aktif / Nonaktif"
                                            >
                                                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${promo.isActive ? 'translate-x-5' : ''}`} />
                                            </button>
                                        </div>
                                        <div className="flex flex-wrap items-baseline gap-1.5 mt-3">
                                            <p className="text-3xl font-black text-orange-600">
                                                {(promo.type === 'amount' || promo.type === 'bundle')
                                                    ? `Rp ${promo.value.toLocaleString('id-ID')}`
                                                    : `${promo.value}%`}
                                            </p>
                                            {promo.type === 'bundle' && (
                                                <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                                                    untuk {promo.bundleQty || 3} cup ({promo.targetSize || 'M'})
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 mt-2 text-[10px] font-bold">
                                            <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full uppercase">
                                                {promo.type === 'bundle'
                                                    ? 'Paket Bundle'
                                                    : promo.type === 'happy_hour'
                                                        ? 'Happy Hour'
                                                        : promo.type === 'percent'
                                                            ? 'Diskon %'
                                                            : 'Potongan Rp'}
                                            </span>
                                            {promo.type === 'bundle' && (
                                                <span className="bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full">
                                                    ☕ {products.find(p => p.id === promo.productId)?.name || 'Semua Produk'} ({promo.targetSize || 'M'})
                                                </span>
                                            )}
                                            {promo.alwaysApplyInPkl && (
                                                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                                                    ✓ Aktif di Mode PKL
                                                </span>
                                            )}
                                            {promo.type === 'happy_hour' && <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">⏰ {String(promo.startHour ?? 0).padStart(2, '0')}:00 - {String(promo.endHour ?? 0).padStart(2, '0')}:00</span>}
                                            {promo.minSubtotal ? <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">Min. Rp {promo.minSubtotal.toLocaleString('id-ID')}</span> : null}
                                            {liveNow && <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full animate-pulse">● Berlaku Sekarang</span>}
                                        </div>
                                        <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                                            <button onClick={() => openEditPromo(promo)} className="flex-1 text-xs font-bold py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition flex items-center justify-center gap-1"><Edit size={13} /> Edit</button>
                                            <button
                                                onClick={() => { if (confirm(`Hapus promo "${promo.name}"?`)) { deletePromo(promo.id); toast.success("Promo dihapus."); } }}
                                                className="flex-1 text-xs font-bold py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition flex items-center justify-center gap-1"
                                            >
                                                <Trash size={13} /> Hapus
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                            {promos.length === 0 && (
                                <p className="col-span-full text-center text-gray-400 italic py-12 bg-white rounded-2xl border border-gray-100">Belum ada promo. Klik &quot;Buat Promo&quot;.</p>
                            )}
                        </div>
                    </div>
                )}

                {/* ============ TAB: LOYALTY CRM ============ */}
                {activeTab === 'loyalty' && user.role === 'admin' && (
                    <div className="animate-fade-in space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Member</p>
                                <p className="text-3xl font-black text-forest mt-1">{customers.length}</p>
                            </div>
                            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Poin Beredar</p>
                                <p className="text-3xl font-black text-amber-600 mt-1">{customers.reduce((s, c) => s + c.points, 0).toLocaleString('id-ID')}</p>
                            </div>
                            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Lifetime Spending Member</p>
                                <p className="text-3xl font-black text-emerald-600 mt-1">Rp {customers.reduce((s, c) => s + c.totalSpent, 0).toLocaleString('id-ID')}</p>
                            </div>
                        </div>

                        {/* AI Smart Upsell */}
                        <div className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-2xl p-6 text-white shadow-xl">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2.5 bg-white/20 rounded-xl"><Sparkles size={22} /></div>
                                <div>
                                    <h3 className="text-lg font-black">AI Smart Upsell (CRM)</h3>
                                    <p className="text-white/70 text-xs">Rekomendasi personal berdasarkan riwayat pesanan member &amp; menu yang tersedia.</p>
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <input
                                    type="tel"
                                    placeholder="Masukkan No. HP member, cth: 081234567890"
                                    value={upsellPhone}
                                    onChange={e => setUpsellPhone(e.target.value)}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 text-sm focus:outline-none focus:border-white"
                                />
                                <button
                                    onClick={() => handleUpsell(upsellPhone)}
                                    disabled={isUpselling || !upsellPhone.trim()}
                                    className="px-5 py-2.5 bg-white text-indigo-700 rounded-xl font-black text-sm hover:bg-indigo-50 disabled:opacity-50 transition flex items-center justify-center gap-2"
                                >
                                    {isUpselling ? <RefreshCw size={15} className="animate-spin" /> : <Sparkles size={15} />}
                                    {isUpselling ? 'Menganalisis...' : 'Minta Saran AI'}
                                </button>
                            </div>
                            {upsellSuggestion && (
                                <div className="mt-4 bg-white/10 border border-white/20 rounded-xl p-4 text-sm leading-relaxed whitespace-pre-line">
                                    {upsellSuggestion}
                                </div>
                            )}
                        </div>

                        {/* Members Table */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                                <h3 className="font-bold text-gray-800 flex items-center gap-2"><UsersIcon size={18} className="text-violet-600" /> Daftar Member Loyalty</h3>
                                <button onClick={openAddCust} className="bg-violet-50 hover:bg-violet-100 text-violet-700 font-bold text-xs px-3 py-1.5 rounded-lg transition flex items-center gap-1.5">
                                    <Plus size={14} /> Tambah Member
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-sm">
                                    <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold tracking-wider">
                                        <tr>
                                            <th className="p-4">Member</th>
                                            <th className="p-4">No. HP</th>
                                            <th className="p-4 text-right">Poin</th>
                                            <th className="p-4 text-right">Total Belanja</th>
                                            <th className="p-4 text-center">Jml Order</th>
                                            <th className="p-4">Kunjungan Terakhir</th>
                                            <th className="p-4 text-right">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {customers.slice().sort((a, b) => b.totalSpent - a.totalSpent).map((c, idx) => {
                                            const custOrders = validOrders.filter(o => o.customerPhone === c.phone);
                                            const tier = c.totalSpent >= 500000 ? { label: 'Gold', cls: 'bg-amber-100 text-amber-800' } : c.totalSpent >= 150000 ? { label: 'Silver', cls: 'bg-gray-200 text-gray-700' } : { label: 'Bronze', cls: 'bg-orange-100 text-orange-800' };
                                            return (
                                                <tr key={c.id} className="hover:bg-gray-50 transition">
                                                    <td className="p-4">
                                                        <p className="font-bold text-gray-800 flex items-center gap-1.5">
                                                            {idx < 3 && <span>{['🥇', '🥈', '🥉'][idx]}</span>}
                                                            {c.name}
                                                        </p>
                                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${tier.cls}`}>{tier.label}</span>
                                                    </td>
                                                    <td className="p-4 font-mono text-gray-600">{c.phone}</td>
                                                    <td className="p-4 text-right font-black text-amber-600">{c.points.toLocaleString('id-ID')}</td>
                                                    <td className="p-4 text-right font-bold text-forest">Rp {c.totalSpent.toLocaleString('id-ID')}</td>
                                                    <td className="p-4 text-center font-mono">{custOrders.length}</td>
                                                    <td className="p-4 text-xs text-gray-500">{c.lastVisit ? new Date(c.lastVisit).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-'}</td>
                                                    <td className="p-4 text-right">
                                                        <div className="flex justify-end gap-1.5">
                                                            <button
                                                                onClick={() => handleUpsell(c.phone)}
                                                                disabled={isUpselling}
                                                                className="px-2 py-1 text-[11px] font-bold bg-violet-50 text-violet-700 border border-violet-200 rounded-lg hover:bg-violet-100 transition flex items-center gap-1 disabled:opacity-50"
                                                                title="Saran upsell AI untuk member ini"
                                                            >
                                                                <Sparkles size={11} /> AI
                                                            </button>
                                                            <button onClick={() => openEditCust(c)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition"><Edit size={15} /></button>
                                                            <button
                                                                onClick={() => {
                                                                    if (confirm(`Hapus member "${c.name}"?`)) {
                                                                        deleteCustomer(c.id);
                                                                        toast.success(`Member "${c.name}" dihapus.`);
                                                                    }
                                                                }}
                                                                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"
                                                            >
                                                                <Trash size={15} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {customers.length === 0 && (
                                            <tr><td colSpan={7} className="p-8 text-center text-gray-400 italic">Belum ada member. Member otomatis terdaftar saat pelanggan memasukkan No. HP di POS / Web Menu.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* ============ TAB: MULTI CABANG ============ */}
                {activeTab === 'cabang' && user.role === 'admin' && (
                    <div className="animate-fade-in space-y-6">
                        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-sky-400 rounded-xl text-slate-900"><Building2 size={28} /></div>
                                <div>
                                    <h2 className="text-2xl font-black text-sky-300">Multi Cabang</h2>
                                    <p className="text-white/60 text-sm mt-0.5">
                                        Perangkat ini aktif sebagai <strong className="text-sky-300">{branchName || 'Cabang Utama'}</strong>. Setiap order dari POS/Web Menu otomatis ditandai ID cabang aktif.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {DEFAULT_BRANCHES.map(b => {
                                const bOrders = validOrders.filter(o => (o.branchId || 'main') === b.id);
                                const bRevenue = bOrders.reduce((s, o) => s + o.total, 0);
                                const bToday = todayValidOrders.filter(o => (o.branchId || 'main') === b.id);
                                const bTodayRevenue = bToday.reduce((s, o) => s + o.total, 0);
                                const bSessions = sessions.filter(s => (s.branchId || 'main') === b.id);
                                const isActive = (branchId || 'main') === b.id;
                                const share = grossRevenue > 0 ? Math.round((bRevenue / grossRevenue) * 100) : 0;
                                return (
                                    <div key={b.id} className={`bg-white rounded-2xl p-5 shadow-sm border-2 transition ${isActive ? 'border-sky-500' : 'border-gray-100'}`}>
                                        <div className="flex justify-between items-start gap-2">
                                            <div>
                                                <p className="font-black text-gray-800 text-lg">{b.name}</p>
                                                <p className="text-xs text-gray-500 mt-0.5">📍 {b.address}</p>
                                                <p className="text-xs text-gray-500">📞 {b.phone}</p>
                                            </div>
                                            {isActive && <span className="text-[10px] font-black bg-sky-100 text-sky-700 px-2 py-1 rounded-full">AKTIF</span>}
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 mt-4">
                                            <div className="bg-gray-50 rounded-xl p-3">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase">Hari Ini</p>
                                                <p className="font-black text-forest">Rp {bTodayRevenue.toLocaleString('id-ID')}</p>
                                                <p className="text-[10px] text-gray-500">{bToday.length} order</p>
                                            </div>
                                            <div className="bg-gray-50 rounded-xl p-3">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase">Total</p>
                                                <p className="font-black text-forest">Rp {bRevenue.toLocaleString('id-ID')}</p>
                                                <p className="text-[10px] text-gray-500">{bOrders.length} order · {bSessions.length} shift</p>
                                            </div>
                                        </div>
                                        <div className="mt-3">
                                            <div className="flex justify-between text-[10px] font-bold text-gray-500 mb-1"><span>Kontribusi Omzet</span><span>{share}%</span></div>
                                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-sky-500 rounded-full" style={{ width: `${share}%` }} /></div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setBranch(b.id, b.name);
                                                addLog("SWITCH_BRANCH", `Perangkat dipindah ke ${b.name}`, user.name);
                                                toast.success(`Perangkat kini aktif sebagai ${b.name}.`);
                                            }}
                                            disabled={isActive}
                                            className={`mt-4 w-full py-2 rounded-xl text-xs font-bold transition ${isActive ? 'bg-sky-50 text-sky-600 cursor-default' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
                                        >
                                            {isActive ? '✓ Cabang Aktif di Perangkat Ini' : 'Aktifkan Cabang Ini'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* ============ MODAL: PRODUK + RESEP BOM ============ */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white text-forest rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[90dvh] overflow-y-auto shadow-2xl animate-scale-in">
                        <div className="p-4 sm:p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                            <h3 className="text-lg sm:text-xl font-bold font-serif">{editingId ? 'Edit Produk & Resep' : 'Tambah Produk Baru'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
                        </div>
                        <div className="p-4 sm:p-6 space-y-5">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-600">Nama Produk *</label>
                                    <input
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-forest text-sm text-gray-900"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-bold text-gray-600">Harga Normal / Size M (Rp)</label>
                                        <input
                                            type="number"
                                            min={0}
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-forest text-sm text-gray-900"
                                            value={formData.price}
                                            onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-bold text-gray-600">Harga Size Large / L (Rp) <span className="font-normal text-xs text-gray-400">opsional</span></label>
                                        <input
                                            type="number"
                                            min={0}
                                            placeholder="Default +Rp 2.000"
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-forest text-sm text-gray-900"
                                            value={formData.largePrice ?? ''}
                                            onChange={e => setFormData({ ...formData, largePrice: e.target.value === '' ? undefined : Number(e.target.value) })}
                                        />
                                        <p className="text-[11px] text-gray-400">Kosongkan agar Size L otomatis +Rp 2.000 dari harga M.</p>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-yellow-800">Stok Siap Jual</label>
                                    <input type="number" className="w-full p-2 border border-yellow-300 rounded text-sm text-gray-900" value={formData.stock} onChange={e => setFormData({ ...formData, stock: Number(e.target.value) })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-yellow-800">Batas Min. Alert</label>
                                    <input type="number" className="w-full p-2 border border-yellow-300 rounded text-sm text-gray-900" value={formData.minStockThreshold} onChange={e => setFormData({ ...formData, minStockThreshold: Number(e.target.value) })} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-600">Deskripsi</label>
                                <textarea
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-forest h-20 text-sm text-gray-900"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-600">Kategori</label>
                                    <select
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-forest bg-white text-sm text-gray-900"
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value as ExtendedProduct['category'] })}
                                    >
                                        <option value="signature">Signature (Khas)</option>
                                        <option value="classic">Classic Tea</option>
                                        <option value="milk">Milk Base</option>
                                        <option value="fruit">Fruit Series</option>
                                        <option value="snack">Camilan/Snack</option>
                                        <option value="food">Makanan Utama</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-600">URL Gambar</label>
                                    <input
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-forest text-sm text-gray-900"
                                        value={formData.image}
                                        placeholder="/images/example.png"
                                        onChange={e => setFormData({ ...formData, image: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* BOM Recipe Editor */}
                            <div className="bg-emerald-50/60 p-4 rounded-xl space-y-3 border border-emerald-200">
                                <div>
                                    <h4 className="font-bold flex items-center gap-2 text-sm text-emerald-900">
                                        <span className="w-2 h-5 bg-emerald-600 rounded-full"></span>
                                        Resep Bahan Baku (BOM) per Porsi
                                    </h4>
                                    <p className="text-[11px] text-emerald-800/70 mt-1">Takaran untuk ukuran M. Ukuran L otomatis ×1.5, gula &amp; es menyesuaikan varian pesanan.</p>
                                </div>
                                <div className="space-y-1.5">
                                    {(formData.recipe || []).map(r => {
                                        const ing = ingredients.find(i => i.id === r.ingredientId);
                                        return (
                                            <div key={r.ingredientId} className="flex items-center justify-between gap-2 bg-white rounded-lg px-3 py-2 border border-emerald-100 text-sm">
                                                <span className="font-bold text-gray-800 min-w-0 truncate">{ing?.name || r.ingredientId}</span>
                                                <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        step="any"
                                                        value={r.quantity}
                                                        onChange={e => setFormData({
                                                            ...formData,
                                                            recipe: (formData.recipe || []).map(x => x.ingredientId === r.ingredientId ? { ...x, quantity: Number(e.target.value) } : x),
                                                        })}
                                                        className="w-16 sm:w-20 px-2 py-1 border border-gray-200 rounded text-right font-mono text-xs text-gray-900"
                                                    />
                                                    <span className="text-xs text-gray-500 w-9 sm:w-10">{ing?.unit || ''}</span>
                                                    <button onClick={() => handleRemoveRecipeItem(r.ingredientId)} className="p-1 text-red-500 hover:bg-red-50 rounded"><X size={14} /></button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {(formData.recipe || []).length === 0 && (
                                        <p className="text-xs text-gray-500 italic bg-white rounded-lg px-3 py-2 border border-dashed border-emerald-200">Belum ada bahan. Tanpa resep, stok bahan baku tidak akan terpotong saat produk dijual.</p>
                                    )}
                                </div>
                                <div className="flex flex-wrap sm:flex-nowrap gap-2">
                                    <select
                                        value={newRecipeIngId}
                                        onChange={e => setNewRecipeIngId(e.target.value)}
                                        className="min-w-[140px] flex-1 px-2 py-2 border border-gray-300 rounded-lg text-xs bg-white text-gray-900"
                                    >
                                        <option value="">-- Pilih bahan --</option>
                                        {alphabetizedIngredients.map(i => (
                                            <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                                        ))}
                                    </select>
                                    <input
                                        type="number"
                                        min={0}
                                        step="any"
                                        value={newRecipeQty}
                                        onChange={e => setNewRecipeQty(e.target.value)}
                                        className="w-20 px-2 py-2 border border-gray-300 rounded-lg text-xs text-right font-mono text-gray-900"
                                    />
                                    <button onClick={handleAddRecipeItem} className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 flex items-center gap-1 flex-shrink-0">
                                        <Plus size={13} /> Bahan
                                    </button>
                                </div>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-xl space-y-4 border border-gray-200">
                                <h4 className="font-bold flex items-center gap-2 text-sm">
                                    <span className="w-2 h-5 bg-gold rounded-full"></span>
                                    Profil Rasa (untuk Smart Recommendation)
                                </h4>
                                <div className="space-y-4">
                                    {['sweet', 'creamy', 'fruity'].map(attr => (
                                        <div key={attr}>
                                            <div className="flex justify-between text-xs mb-1 uppercase font-bold text-gray-500">
                                                <span>{attr === 'sweet' ? '🍯 Kemanisan' : attr === 'creamy' ? '🥛 Creamy' : '🍊 Buah-buahan'}</span>
                                                <span>{formData.attributes[attr as keyof typeof formData.attributes]}/10</span>
                                            </div>
                                            <input
                                                type="range" min="0" max="10"
                                                className="w-full accent-forest"
                                                value={formData.attributes[attr as keyof typeof formData.attributes]}
                                                onChange={e => setFormData({ ...formData, attributes: { ...formData.attributes, [attr]: Number(e.target.value) } })}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                                <input type="checkbox" checked={formData.isAvailable} onChange={e => setFormData({ ...formData, isAvailable: e.target.checked })} className="w-4 h-4 accent-forest" />
                                Tampilkan di Menu (Tersedia)
                            </label>
                        </div>
                        <div className="p-4 sm:p-6 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white z-10">
                            <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-sm transition">Batal</button>
                            <button onClick={handleSave} className="px-5 py-2.5 rounded-lg bg-gold text-forest font-bold hover:bg-gold-light flex items-center gap-2 text-sm transition">
                                <Save size={16} /> Simpan Produk
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ============ MODAL: RESTOK BAHAN / PURCHASE ORDER ============ */}
            {restockModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <form onSubmit={handleSaveRestock} className="bg-white w-full max-w-md max-h-[90dvh] flex flex-col rounded-2xl shadow-2xl overflow-hidden">
                        <div className="bg-emerald-600 text-white px-4 sm:px-6 py-4 flex justify-between items-center flex-shrink-0">
                            <div className="flex items-center gap-2 min-w-0">
                                <PackagePlus size={20} className="flex-shrink-0" />
                                <div className="min-w-0">
                                    <h3 className="font-serif font-bold text-sm sm:text-base">Restok Bahan / Purchase Order</h3>
                                    <p className="text-xs text-emerald-100">Stok bertambah &amp; biaya otomatis masuk Laba Rugi</p>
                                </div>
                            </div>
                            <button type="button" onClick={() => setRestockModalOpen(false)} className="p-1 hover:bg-white/10 rounded-lg flex-shrink-0"><X size={20} /></button>
                        </div>
                        <div className="p-4 sm:p-6 space-y-3 overflow-y-auto flex-1">
                            {/* Info Saldo Rekening Toko Real-Time */}
                            <div className={`rounded-xl p-3 border text-xs flex flex-wrap items-center justify-between gap-2 ${
                                storeAccount.availableBalance > 0
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                    : 'bg-red-50 border-red-200 text-red-900'
                            }`}>
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider opacity-75">Saldo Rekening Toko Tersedia</p>
                                    <p className="text-base font-black font-mono">
                                        Rp {storeAccount.availableBalance.toLocaleString('id-ID')}
                                    </p>
                                </div>
                                {restockCostNum > 0 && restockForm.paidVia === 'rekening_toko' && (
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold uppercase tracking-wider opacity-75">Sisa Setelah Restok</p>
                                        <p className={`text-sm font-black font-mono ${isRestockBlockedByBalance ? 'text-red-600' : 'text-emerald-700'}`}>
                                            Rp {(storeAccount.availableBalance - restockCostNum).toLocaleString('id-ID')}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-600 mb-1 block">Bahan Baku *</label>
                                <select required value={restockForm.ingredientId} onChange={e => setRestockForm(f => ({ ...f, ingredientId: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900">
                                    <option value="">-- Pilih Bahan --</option>
                                    {alphabetizedIngredients.map(i => (
                                        <option key={i.id} value={i.id}>{i.name} (stok: {i.stock.toLocaleString('id-ID')} {i.unit})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-600 mb-1 block">Jumlah Tambahan *</label>
                                    <input required type="number" min={0} step="any" value={restockForm.addQty} onChange={e => setRestockForm(f => ({ ...f, addQty: e.target.value }))} placeholder={selectedRestockIng?.unit || ''} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-600 mb-1 block">Biaya Pembelian (Rp)</label>
                                    <input type="number" min={0} value={restockForm.costAmount} onChange={e => setRestockForm(f => ({ ...f, costAmount: e.target.value }))} placeholder="0 = tanpa biaya" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900" />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-600 mb-1 block">Suplier</label>
                                    <select value={restockForm.supplierName} onChange={e => setRestockForm(f => ({ ...f, supplierName: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900">
                                        <option value="">-- Tanpa suplier --</option>
                                        {suppliers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-600 mb-1 block">Dibayar Via</label>
                                    <select value={restockForm.paidVia} onChange={e => setRestockForm(f => ({ ...f, paidVia: e.target.value as 'kas_laci' | 'rekening_toko' }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900">
                                        <option value="rekening_toko">🏦 Rekening Toko</option>
                                        <option value="kas_laci">💵 Kas Laci</option>
                                    </select>
                                </div>
                            </div>

                            {/* Guard: Saldo Rekening Toko Tidak Mencukupi (A2) */}
                            {isRestockBlockedByBalance && (
                                <div role="alert" className="bg-red-50 border border-red-300 rounded-xl p-3 space-y-2.5 text-xs text-red-900">
                                    <div className="flex items-start gap-2">
                                        <AlertTriangle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-black text-red-700">Saldo Rekening Toko Tidak Mencukupi!</p>
                                            <p className="text-[11px] mt-0.5">
                                                Biaya restok <strong>Rp {restockCostNum.toLocaleString('id-ID')}</strong> kurang <strong className="font-mono">Rp {restockShortfall.toLocaleString('id-ID')}</strong> dari saldo tersedia.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <button
                                            type="button"
                                            onClick={() => openAccountMovementModal(
                                                'topup',
                                                restockShortfall,
                                                `Top-Up Modal Restok ${selectedRestockIng?.name || 'Bahan Baku'}`
                                            )}
                                            className="flex-1 py-2 px-3 rounded-lg bg-amber-400 hover:bg-amber-300 text-[#0D2B20] font-black text-[11px] transition flex items-center justify-center gap-1"
                                        >
                                            <Plus size={12} /> Top-Up Modal (+Rp {restockShortfall.toLocaleString('id-ID')})
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setRestockForm(f => ({ ...f, paidVia: 'kas_laci' }))}
                                            className="flex-1 py-2 px-3 rounded-lg bg-white hover:bg-amber-50 text-gray-800 border border-gray-300 font-bold text-[11px] transition"
                                        >
                                            Ganti ke 💵 Kas Laci
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-2 px-4 sm:px-6 pb-4 sm:pb-6 pt-2 flex-shrink-0 border-t border-gray-100">
                            <button type="button" onClick={() => setRestockModalOpen(false)} className="flex-1 py-2.5 border border-gray-300 text-gray-600 rounded-lg font-bold text-sm hover:bg-gray-50">Batal</button>
                            <button
                                type="submit"
                                disabled={isRestockBlockedByBalance}
                                className={`flex-1 py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition ${
                                    isRestockBlockedByBalance
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                                }`}
                            >
                                <Save size={14} /> {isRestockBlockedByBalance ? 'Saldo Kurang' : 'Simpan Restok'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* ============ MODAL: SUPLIER ============ */}
            {supModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-4 sm:p-6 space-y-4 max-h-[90dvh] overflow-y-auto">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-bold font-serif">{editingSupId ? 'Edit Suplier' : 'Tambah Suplier'}</h3>
                            <button onClick={() => setSupModalOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-bold text-gray-600 mb-1 block">Nama Suplier *</label>
                                <input type="text" value={supForm.name} onChange={e => setSupForm(f => ({ ...f, name: e.target.value }))} placeholder="cth: CV Teh Nusantara" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-600 mb-1 block">Contact Person</label>
                                    <input type="text" value={supForm.contactPerson} onChange={e => setSupForm(f => ({ ...f, contactPerson: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-600 mb-1 block">No. Telepon</label>
                                    <input type="tel" value={supForm.phone} onChange={e => setSupForm(f => ({ ...f, phone: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-600 mb-1 block">Alamat</label>
                                <input type="text" value={supForm.address} onChange={e => setSupForm(f => ({ ...f, address: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-600 mb-1 block">Bahan yang Disuplai</label>
                                <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
                                    {alphabetizedIngredients.map(i => (
                                        <label key={i.id} className="flex items-center gap-1.5 text-xs text-gray-700">
                                            <input
                                                type="checkbox"
                                                checked={supForm.itemsSupplied.includes(i.id)}
                                                onChange={e => setSupForm(f => ({
                                                    ...f,
                                                    itemsSupplied: e.target.checked ? [...f.itemsSupplied, i.id] : f.itemsSupplied.filter(x => x !== i.id),
                                                }))}
                                                className="accent-forest"
                                            />
                                            {i.name}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2 pt-2">
                            <button onClick={() => setSupModalOpen(false)} className="flex-1 py-2.5 border border-gray-300 text-gray-600 rounded-lg font-bold text-sm hover:bg-gray-50">Batal</button>
                            <button onClick={saveSup} className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 flex items-center justify-center gap-2"><Save size={14} /> Simpan</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ============ MODAL: MEMBER LOYALTY ============ */}
            {custModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-4 sm:p-6 space-y-4 max-h-[90dvh] overflow-y-auto">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-bold font-serif">{editingCustId ? 'Edit Member' : 'Tambah Member Loyalty'}</h3>
                            <button onClick={() => setCustModalOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-bold text-gray-600 mb-1 block">Nama Member *</label>
                                <input type="text" value={custForm.name} onChange={e => setCustForm(f => ({ ...f, name: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-600 mb-1 block">No. HP *</label>
                                <input type="tel" value={custForm.phone} onChange={e => setCustForm(f => ({ ...f, phone: e.target.value }))} placeholder="08xxxxxxxxxx" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono text-gray-900" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-600 mb-1 block">Poin</label>
                                    <input type="number" min={0} value={custForm.points} onChange={e => setCustForm(f => ({ ...f, points: Number(e.target.value) }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-600 mb-1 block">Total Belanja (Rp)</label>
                                    <input type="number" min={0} value={custForm.totalSpent} onChange={e => setCustForm(f => ({ ...f, totalSpent: Number(e.target.value) }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900" />
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2 pt-2">
                            <button onClick={() => setCustModalOpen(false)} className="flex-1 py-2.5 border border-gray-300 text-gray-600 rounded-lg font-bold text-sm hover:bg-gray-50">Batal</button>
                            <button onClick={saveCust} className="flex-1 py-2.5 bg-violet-600 text-white rounded-lg font-bold text-sm hover:bg-violet-700 flex items-center justify-center gap-2"><Save size={14} /> Simpan</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ============ MODAL: KARYAWAN ============ */}
            {staffModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-4 sm:p-6 space-y-4 max-h-[90dvh] overflow-y-auto">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-bold font-serif">{editingStaffId ? 'Edit Akun Karyawan' : 'Tambah Karyawan'}</h3>
                            <button onClick={() => setStaffModalOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-bold text-gray-600 mb-1 block">Nama Lengkap *</label>
                                <input type="text" value={staffForm.name} onChange={e => setStaffForm(f => ({ ...f, name: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-600 mb-1 block">Username *</label>
                                    <input type="text" value={staffForm.username} onChange={e => setStaffForm(f => ({ ...f, username: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono text-gray-900" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-600 mb-1 block">Password *</label>
                                    <input type="text" value={staffForm.password} onChange={e => setStaffForm(f => ({ ...f, password: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono text-gray-900" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-600 mb-1 block">Role</label>
                                <select value={staffForm.role} onChange={e => setStaffForm(f => ({ ...f, role: e.target.value as Role }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900">
                                    <option value="cashier">Kasir (akses POS)</option>
                                    <option value="admin">Admin (akses penuh)</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex gap-2 pt-2">
                            <button onClick={() => setStaffModalOpen(false)} className="flex-1 py-2.5 border border-gray-300 text-gray-600 rounded-lg font-bold text-sm hover:bg-gray-50">Batal</button>
                            <button onClick={saveStaff} className="flex-1 py-2.5 bg-[#0D2B20] text-amber-400 rounded-lg font-bold text-sm hover:bg-[#1a3d2e] flex items-center justify-center gap-2"><Save size={14} /> Simpan</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ============ CONFIRM MODALS ============ */}
            <ConfirmModal
                isOpen={!!confirmDelete}
                title="Hapus Produk?"
                message={`Produk "${confirmDelete?.name}" akan dihapus permanen dari sistem dan tidak bisa dikembalikan.`}
                confirmLabel="Ya, Hapus"
                danger
                onConfirm={doDelete}
                onCancel={() => setConfirmDelete(null)}
            />
            <ConfirmModal
                isOpen={!!confirmDeleteIng}
                title="Hapus Bahan Baku Inventaris?"
                message={
                    confirmDeleteIng && confirmDeleteIng.usedCount > 0
                        ? `Bahan "${confirmDeleteIng.name}" saat ini terhubung ke ${confirmDeleteIng.usedCount} resep menu BOM. Jika dihapus, bahan ini juga otomatis dilepas dari resep menu & daftar suplier secara permanen.`
                        : `Bahan baku "${confirmDeleteIng?.name}" akan dihapus permanen dari inventaris gudang.`
                }
                confirmLabel="Ya, Hapus Bahan"
                danger
                onConfirm={() => {
                    if (confirmDeleteIng) {
                        deleteIngredient(confirmDeleteIng.id);
                        addLog("DELETE_INGREDIENT", `Hapus bahan baku: ${confirmDeleteIng.name}`, user.name);
                        toast.success(`Bahan "${confirmDeleteIng.name}" berhasil dihapus permanen.`);
                        setConfirmDeleteIng(null);
                    }
                }}
                onCancel={() => setConfirmDeleteIng(null)}
            />
            <ConfirmModal
                isOpen={confirmReset}
                title="Reset Semua Data?"
                message="PERHATIAN: Semua data penjualan, pesanan, log, dan sesi akan dihapus permanen. Tindakan ini tidak dapat dibatalkan!"
                confirmLabel="Ya, Reset Sekarang"
                danger
                onConfirm={doReset}
                onCancel={() => setConfirmReset(false)}
            />
            <ConfirmModal
                isOpen={!!confirmCancelOrder}
                title="Batalkan Pesanan?"
                message="Pesanan akan dibatalkan dan stok produk akan dikembalikan secara otomatis."
                confirmLabel="Ya, Batalkan"
                danger
                onConfirm={() => {
                    if (confirmCancelOrder) {
                        updateOrderStatus(confirmCancelOrder, 'cancelled');
                        addLog("CANCEL_ORDER", `Cancelled order #${confirmCancelOrder.slice(0, 6)}`, user?.name || "Admin");
                        toast.success("Pesanan dibatalkan dan stok telah dikembalikan.");
                        setConfirmCancelOrder(null);
                    }
                }}
                onCancel={() => setConfirmCancelOrder(null)}
            />

            {/* ============ SHIFT SUMMARY ============ */}
            {shiftSummary && (
                <ShiftSummaryModal
                    isOpen={!!shiftSummary}
                    session={shiftSummary}
                    orders={orders}
                    onClose={() => setShiftSummary(null)}
                />
            )}

            {/* ============ MODAL: INVENTORY BAHAN BAKU ============ */}
            {ingModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-4 sm:p-6 space-y-4 max-h-[90dvh] overflow-y-auto">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-bold font-serif">{editingIngId ? 'Edit Bahan Baku' : 'Tambah Bahan Baku'}</h3>
                            <button onClick={() => setIngModalOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-bold text-gray-600 mb-1 block">Nama Bahan *</label>
                                <input type="text" placeholder="cth: Daun Teh Hitam" value={ingForm.name}
                                    onChange={e => setIngForm(f => ({ ...f, name: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0D2B20] transition" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-600 mb-1 block">Stok Saat Ini</label>
                                    <input type="number" min={0} value={ingForm.stock}
                                        onChange={e => setIngForm(f => ({ ...f, stock: Number(e.target.value) }))}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0D2B20] transition" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-600 mb-1 block">Satuan</label>
                                    <select value={ingForm.unit} onChange={e => setIngForm(f => ({ ...f, unit: e.target.value as 'ml' | 'gram' | 'pcs' }))}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0D2B20] transition bg-white">
                                        <option value="ml">ml (mililiter)</option>
                                        <option value="gram">gram</option>
                                        <option value="pcs">pcs (buah)</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-600 mb-1 block">Batas Minimum Stok (peringatan)</label>
                                <input type="number" min={0} value={ingForm.minStockThreshold}
                                    onChange={e => setIngForm(f => ({ ...f, minStockThreshold: Number(e.target.value) }))}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0D2B20] transition" />
                            </div>
                        </div>
                        <div className="flex gap-2 pt-2">
                            <button onClick={() => setIngModalOpen(false)} className="flex-1 py-2.5 border border-gray-300 text-gray-600 rounded-lg font-bold text-sm hover:bg-gray-50 transition">Batal</button>
                            <button onClick={saveIng} className="flex-1 py-2.5 bg-[#0D2B20] text-amber-400 rounded-lg font-bold text-sm hover:bg-[#1a3d2e] transition flex items-center justify-center gap-2">
                                <Save size={14} /> Simpan
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ============ MODAL: PROMO ENGINE ============ */}
            {promoModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-4 sm:p-6 space-y-4 max-h-[90dvh] overflow-y-auto">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-bold font-serif">{editingPromoId ? 'Edit Promo' : 'Buat Promo Baru'}</h3>
                            <button onClick={() => setPromoModalOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-bold text-gray-600 mb-1 block">Nama Promo *</label>
                                <input type="text" placeholder="cth: Happy Hour Sore" value={promoForm.name}
                                    onChange={e => setPromoForm(f => ({ ...f, name: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 transition" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-600 mb-1 block">Tipe Promo</label>
                                <select
                                    value={promoForm.type}
                                    onChange={e => {
                                        const nextType = e.target.value as PromoType;
                                        setPromoForm(f => ({
                                            ...f,
                                            type: nextType,
                                            value: nextType === 'bundle' && f.value <= 100 ? 10000 : f.value,
                                            alwaysApplyInPkl: nextType === 'bundle' ? true : f.alwaysApplyInPkl,
                                        }));
                                    }}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 transition bg-white"
                                >
                                    <option value="percent">Diskon Persen (%)</option>
                                    <option value="amount">Diskon Nominal (Rp)</option>
                                    <option value="happy_hour">Happy Hour (Jam Tertentu)</option>
                                    <option value="bundle">Paket Bundle Produk (misal 3 Cup = Rp 10.000)</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-600 mb-1 block">
                                    {promoForm.type === 'bundle'
                                        ? 'Harga Paket Bundle (Rp)'
                                        : `Nilai Diskon ${promoForm.type === 'amount' ? '(Rp)' : '(%)'}`}
                                </label>
                                <input type="number" min={0} value={promoForm.value}
                                    onChange={e => setPromoForm(f => ({ ...f, value: Number(e.target.value) }))}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 transition" />
                            </div>
                            {promoForm.type === 'bundle' && (
                                <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 space-y-3">
                                    <div>
                                        <label className="text-xs font-bold text-amber-900 mb-1 block">Produk Target</label>
                                        <select
                                            value={promoForm.productId}
                                            onChange={e => setPromoForm(f => ({ ...f, productId: e.target.value }))}
                                            className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-amber-500"
                                        >
                                            {products.map(p => (
                                                <option key={p.id} value={p.id}>
                                                    {p.name} (Rp {p.price.toLocaleString('id-ID')})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs font-bold text-amber-900 mb-1 block">Ukuran Target</label>
                                            <select
                                                value={promoForm.targetSize}
                                                onChange={e => setPromoForm(f => ({ ...f, targetSize: e.target.value as 'M' | 'L' }))}
                                                className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-amber-500"
                                            >
                                                <option value="M">Size M (Normal)</option>
                                                <option value="L">Size L (Large)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-amber-900 mb-1 block">Jumlah Cup / Paket</label>
                                            <input
                                                type="number"
                                                min={2}
                                                value={promoForm.bundleQty}
                                                onChange={e => setPromoForm(f => ({ ...f, bundleQty: Math.max(2, Number(e.target.value) || 2) }))}
                                                className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-amber-500"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-amber-900/80 font-medium leading-snug">
                                        Simulasi: {promoForm.bundleQty || 3} cup ({promoForm.targetSize}) = Rp {Number(promoForm.value || 0).toLocaleString('id-ID')} · {(promoForm.bundleQty || 3) * 2} cup = Rp {(Number(promoForm.value || 0) * 2).toLocaleString('id-ID')}
                                    </p>
                                    <label className="flex items-center gap-2 text-xs font-bold text-amber-900 cursor-pointer pt-1">
                                        <input
                                            type="checkbox"
                                            checked={promoForm.alwaysApplyInPkl}
                                            onChange={e => setPromoForm(f => ({ ...f, alwaysApplyInPkl: e.target.checked }))}
                                            className="rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                                        />
                                        Tetap berlaku di Mode PKL (Kasir &amp; Web Menu)
                                    </label>
                                </div>
                            )}
                            {promoForm.type === 'happy_hour' && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-bold text-gray-600 mb-1 block">Jam Mulai</label>
                                        <input type="number" min={0} max={23} value={promoForm.startHour}
                                            onChange={e => setPromoForm(f => ({ ...f, startHour: Number(e.target.value) }))}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 transition" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-600 mb-1 block">Jam Selesai</label>
                                        <input type="number" min={0} max={23} value={promoForm.endHour}
                                            onChange={e => setPromoForm(f => ({ ...f, endHour: Number(e.target.value) }))}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 transition" />
                                    </div>
                                </div>
                            )}
                            <div>
                                <label className="text-xs font-bold text-gray-600 mb-1 block">Min. Belanja (Rp) — opsional</label>
                                <input type="number" min={0} placeholder="Kosongkan jika tidak ada batas" value={promoForm.minSubtotal}
                                    onChange={e => setPromoForm(f => ({ ...f, minSubtotal: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 transition" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-600 mb-1 block">Deskripsi — opsional</label>
                                <input type="text" placeholder="cth: Berlaku setiap hari pukul 15.00-17.00" value={promoForm.description}
                                    onChange={e => setPromoForm(f => ({ ...f, description: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 transition" />
                            </div>
                            <div className="flex items-center gap-3 pt-1">
                                <button type="button" onClick={() => setPromoForm(f => ({ ...f, isActive: !f.isActive }))}
                                    className={`relative w-11 h-6 rounded-full transition-colors ${promoForm.isActive ? 'bg-amber-500' : 'bg-gray-300'}`}>
                                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${promoForm.isActive ? 'translate-x-5' : ''}`} />
                                </button>
                                <span className="text-sm font-bold text-gray-700">{promoForm.isActive ? 'Promo Aktif' : 'Promo Nonaktif'}</span>
                            </div>
                        </div>
                        <div className="flex gap-2 pt-2">
                            <button onClick={() => setPromoModalOpen(false)} className="flex-1 py-2.5 border border-gray-300 text-gray-600 rounded-lg font-bold text-sm hover:bg-gray-50 transition">Batal</button>
                            <button onClick={savePromo} className="flex-1 py-2.5 bg-amber-500 text-white rounded-lg font-bold text-sm hover:bg-amber-600 transition flex items-center justify-center gap-2">
                                <Save size={14} /> Simpan Promo
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ============ MODAL: PENGELUARAN TOKO (PETTY CASH) ============ */}
            {expenseModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md max-h-[90dvh] flex flex-col shadow-2xl overflow-hidden border border-gray-100 animate-scale-up">
                        <div className="bg-[#0D2B20] text-cream px-4 sm:px-6 py-4 flex justify-between items-center border-b border-gold/20 flex-shrink-0">
                            <div className="flex items-center gap-2 min-w-0">
                                <div className="p-2 bg-gold/20 rounded-lg text-gold flex-shrink-0">
                                    <Wallet size={18} />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-serif font-bold text-gold text-base">Catat Pengeluaran Toko</h3>
                                    <p className="text-xs text-cream/70">Petty Cash &amp; Operasional Kedai</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setExpenseModalOpen(false)}
                                className="text-cream/70 hover:text-white p-1 hover:bg-white/10 rounded-lg transition flex-shrink-0"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveExpense} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                    Nominal Pengeluaran (Rp) <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-gray-500 text-sm">Rp</span>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        placeholder="0"
                                        value={expenseForm.amount}
                                        onChange={e => setExpenseForm(f => ({ ...f, amount: e.target.value }))}
                                        className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0D2B20] font-bold text-lg text-forest"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                    Keperluan / Deskripsi <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Contoh: Beli es kristal 2 karung, gas elpiji..."
                                    value={expenseForm.description}
                                    onChange={e => setExpenseForm(f => ({ ...f, description: e.target.value }))}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0D2B20] text-sm"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                        Kategori
                                    </label>
                                    <select
                                        value={expenseForm.category}
                                        onChange={e => setExpenseForm(f => ({ ...f, category: e.target.value as ExpenseCategory }))}
                                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0D2B20] text-xs font-medium bg-white"
                                    >
                                        {EXPENSE_CATEGORIES.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                        Sumber Kas
                                    </label>
                                    <select
                                        value={expenseForm.paidVia}
                                        onChange={e => setExpenseForm(f => ({ ...f, paidVia: e.target.value as 'kas_laci' | 'rekening_toko' }))}
                                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0D2B20] text-xs font-medium bg-white"
                                    >
                                        <option value="kas_laci">💵 Kas Laci (Potong Laci)</option>
                                        <option value="rekening_toko">🏦 Rekening Toko / Transfer</option>
                                    </select>
                                </div>
                            </div>

                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-800 flex items-start gap-2">
                                <AlertTriangle size={14} className="flex-shrink-0 mt-0.5 text-amber-600" />
                                <div>
                                    {expenseForm.paidVia === 'kas_laci'
                                        ? <span><strong>Kas Laci:</strong> Pengeluaran memotong uang laci kasir sekaligus memperbarui saldo Rekening Toko (Saldo: <strong>Rp {storeAccount.availableBalance.toLocaleString('id-ID')}</strong>).</span>
                                        : <span><strong>Rekening Toko:</strong> Saldo tersedia saat ini <strong className="font-mono">Rp {storeAccount.availableBalance.toLocaleString('id-ID')}</strong> (tidak memotong laci kasir).</span>
                                    }
                                </div>
                            </div>

                            {isExpenseBlockedByBalance && (
                                <div role="alert" className="bg-red-50 border border-red-300 rounded-xl p-3 space-y-2.5 text-xs text-red-900">
                                    <div className="flex items-start gap-2">
                                        <AlertTriangle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-black text-red-700">Saldo Rekening Toko Tidak Mencukupi!</p>
                                            <p className="text-[11px] mt-0.5">
                                                Kurang <strong className="font-mono">Rp {expenseShortfall.toLocaleString('id-ID')}</strong> untuk mencatat biaya via Rekening Toko.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <button
                                            type="button"
                                            onClick={() => openAccountMovementModal('topup', expenseShortfall, 'Top-Up Modal Operasional Kedai')}
                                            className="flex-1 py-2 px-3 rounded-lg bg-amber-400 hover:bg-amber-300 text-[#0D2B20] font-black text-[11px] transition flex items-center justify-center gap-1"
                                        >
                                            <Plus size={12} /> Top-Up (+Rp {expenseShortfall.toLocaleString('id-ID')})
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setExpenseForm(f => ({ ...f, paidVia: 'kas_laci' }))}
                                            className="flex-1 py-2 px-3 rounded-lg bg-white hover:bg-amber-50 text-gray-800 border border-gray-300 font-bold text-[11px] transition"
                                        >
                                            Ganti ke 💵 Kas Laci
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                    Catatan / Keterangan Tambahan
                                </label>
                                <textarea
                                    rows={2}
                                    placeholder="Catatan tambahan (opsional)..."
                                    value={expenseForm.notes}
                                    onChange={e => setExpenseForm(f => ({ ...f, notes: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0D2B20] text-xs"
                                />
                            </div>

                            <div className="flex gap-2 pt-2 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setExpenseModalOpen(false)}
                                    className="flex-1 py-2.5 border border-gray-300 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-50 transition"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isExpenseBlockedByBalance}
                                    className={`flex-1 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md transition ${
                                        isExpenseBlockedByBalance
                                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                            : 'bg-[#0D2B20] text-amber-400 hover:bg-[#1a3d2e]'
                                    }`}
                                >
                                    <Save size={15} /> {isExpenseBlockedByBalance ? 'Saldo Kurang' : 'Simpan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ============ MODAL: STOCK OPNAME FISIK ============ */}
            {opnameModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md max-h-[90dvh] flex flex-col shadow-2xl overflow-hidden border border-gray-100 animate-scale-up">
                        <div className="bg-amber-600 text-white px-4 sm:px-6 py-4 flex justify-between items-center flex-shrink-0">
                            <div className="flex items-center gap-2 min-w-0">
                                <div className="p-2 bg-white/20 rounded-lg flex-shrink-0">
                                    <ClipboardCheck size={18} />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-serif font-bold text-base">Input Stock Opname Fisik</h3>
                                    <p className="text-xs text-amber-100">Penghitungan fisik riil bahan &amp; penyesuaian selisih</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setOpnameModalOpen(false)}
                                className="text-white/80 hover:text-white p-1 hover:bg-white/10 rounded-lg transition flex-shrink-0"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveOpname} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                    Pilih Bahan Baku <span className="text-red-500">*</span>
                                </label>
                                <select
                                    required
                                    value={opnameForm.ingredientId}
                                    onChange={e => {
                                        const ing = ingredients.find(i => i.id === e.target.value);
                                        setOpnameForm(f => ({
                                            ...f,
                                            ingredientId: e.target.value,
                                            actualStock: ing ? String(ing.stock) : ''
                                        }));
                                    }}
                                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm font-semibold bg-white"
                                >
                                    <option value="">-- Pilih Bahan --</option>
                                    {alphabetizedIngredients.map(ing => (
                                        <option key={ing.id} value={ing.id}>
                                            {ing.name} (Stok Sistem: {ing.stock.toLocaleString('id-ID')} {ing.unit})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {(() => {
                                const selectedIng = ingredients.find(i => i.id === opnameForm.ingredientId);
                                if (!selectedIng) return null;
                                const actual = parseFloat(opnameForm.actualStock) || 0;
                                const diff = actual - selectedIng.stock;
                                const isZero = diff === 0;
                                const isNegative = diff < 0;

                                return (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200 text-xs">
                                            <div>
                                                <span className="text-gray-500 block">Stok Tercatat Sistem:</span>
                                                <span className="font-mono font-bold text-gray-800 text-base">{selectedIng.stock.toLocaleString('id-ID')} {selectedIng.unit}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500 block">Selisih (Variance):</span>
                                                <span className={`font-mono font-black text-base ${isZero ? 'text-gray-500' : isNegative ? 'text-red-600' : 'text-green-600'}`}>
                                                    {diff > 0 ? `+${diff}` : diff} {selectedIng.unit}
                                                </span>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                                Stok Fisik Nyata ({selectedIng.unit}) <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="number"
                                                step="any"
                                                required
                                                min="0"
                                                placeholder="0"
                                                value={opnameForm.actualStock}
                                                onChange={e => setOpnameForm(f => ({ ...f, actualStock: e.target.value }))}
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold text-lg text-forest"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                                Alasan Penyesuaian / Selisih <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                value={opnameForm.reason}
                                                onChange={e => setOpnameForm(f => ({ ...f, reason: e.target.value as 'tumpah' | 'basi' | 'rusak' | 'koreksi_hitung' | 'lainnya' }))}
                                                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs font-medium bg-white"
                                            >
                                                <option value="koreksi_hitung">🔍 Koreksi Hitung / Kesalahan Input Kasir</option>
                                                <option value="tumpah">💧 Bahan Tumpah / Spillage Saat Operasional</option>
                                                <option value="basi">🍂 Bahan Basi / Melewati Batas Kadaluwarsa</option>
                                                <option value="rusak">📦 Kemasan Bocor / Rusak Pengiriman</option>
                                                <option value="lainnya">⚙️ Alasan Lainnya</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                                Catatan Detail Auditor
                                            </label>
                                            <textarea
                                                rows={2}
                                                placeholder="Contoh: Susu basi 200ml karena kulkas sempat mati 2 jam..."
                                                value={opnameForm.notes}
                                                onChange={e => setOpnameForm(f => ({ ...f, notes: e.target.value }))}
                                                className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs"
                                            />
                                        </div>
                                    </div>
                                );
                            })()}

                            <div className="flex gap-2 pt-2 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setOpnameModalOpen(false)}
                                    className="flex-1 py-2.5 border border-gray-300 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-50 transition"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={!opnameForm.ingredientId}
                                    className="flex-1 py-2.5 bg-amber-600 text-white rounded-xl font-bold text-sm hover:bg-amber-700 disabled:opacity-50 transition flex items-center justify-center gap-2 shadow-md"
                                >
                                    <Save size={15} /> Simpan Opname
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Pengaturan Buka / Tutup (Lock / Unlock) Kedai & Menu Online Pelanggan */}
            {storeLockModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90dvh] flex flex-col overflow-hidden border border-gray-100 animate-fade-in">
                        <div className="bg-[#0D2B20] text-white p-4 sm:p-5 flex items-center justify-between gap-2 flex-shrink-0">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isOnlineOrderOpen ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/25 text-red-300'}`}>
                                    {isOnlineOrderOpen ? <Store size={20} /> : <Lock size={20} />}
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-bold text-sm sm:text-base text-amber-400">
                                        Kontrol Buka / Tutup Kedai Online
                                    </h3>
                                    <p className="text-xs text-white/70">
                                        Kunci atau buka akses katalog menu pelanggan (/menu) kapan saja
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setStoreLockModalOpen(false)}
                                className="p-1.5 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition flex-shrink-0"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveLockOnlineStore} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
                            {/* Status Saat Ini + Tombol Buka Cepat jika sedang tutup */}
                            <div className={`p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${isOnlineOrderOpen ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Status Kedai Saat Ini</p>
                                    <p className={`text-sm font-black mt-0.5 ${isOnlineOrderOpen ? 'text-emerald-700' : 'text-red-700'}`}>
                                        {isOnlineOrderOpen ? '🟢 BUKA — Menu Pelanggan Aktif' : `🔴 TUTUP — ${closedBadge}`}
                                    </p>
                                </div>
                                {!isOnlineOrderOpen && (
                                    <button
                                        type="button"
                                        onClick={handleUnlockOnlineStore}
                                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition flex items-center gap-1.5 shadow"
                                    >
                                        <Unlock size={14} /> Buka Kedai Sekarang
                                    </button>
                                )}
                            </div>

                            {/* Preset Alasan Tutup / Libur */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                                    Pilih Preset Alasan Tutup / Hari Libur:
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {SHOP_CLOSE_PRESETS.map((preset) => (
                                        <button
                                            key={preset.id}
                                            type="button"
                                            onClick={() =>
                                                setLockForm({
                                                    badge: preset.badge,
                                                    message: preset.message,
                                                    reopenInfo: preset.reopenHint,
                                                })
                                            }
                                            className={`p-2.5 rounded-xl border text-left text-xs font-bold transition ${
                                                lockForm.badge === preset.badge
                                                    ? 'bg-[#0D2B20] text-amber-300 border-[#0D2B20] shadow-xs'
                                                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                                            }`}
                                        >
                                            {preset.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Label Status Tutup (Tampil di Badge)
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={lockForm.badge}
                                    onChange={(e) => setLockForm({ ...lockForm, badge: e.target.value })}
                                    placeholder="Contoh: Libur Operasional / Libur Hari Raya / Kedai Sedang Tutup"
                                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-forest"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Pesan Pengumuman untuk Pelanggan
                                </label>
                                <textarea
                                    rows={3}
                                    required
                                    value={lockForm.message}
                                    onChange={(e) => setLockForm({ ...lockForm, message: e.target.value })}
                                    placeholder="Tulis alasan kedai tutup / libur agar pelanggan mengetahui informasinya..."
                                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-forest resize-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Info Jadwal Buka Kembali (Opsional)
                                </label>
                                <input
                                    type="text"
                                    value={lockForm.reopenInfo}
                                    onChange={(e) => setLockForm({ ...lockForm, reopenInfo: e.target.value })}
                                    placeholder="Contoh: Buka kembali Besok pukul 09.00 WIB"
                                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-forest"
                                />
                            </div>

                            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => setStoreLockModalOpen(false)}
                                    className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-bold transition"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-black transition flex items-center justify-center gap-2 shadow-md"
                                >
                                    <Lock size={15} />
                                    {isOnlineOrderOpen ? 'Kunci & Tutup Kedai Sekarang' : 'Simpan Perubahan Pesan Tutup'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ============ MODAL: TOP-UP MODAL / TARIK DANA REKENING TOKO ============ */}
            {accountModalMode && (
                <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md max-h-[90dvh] flex flex-col shadow-2xl overflow-hidden border border-gray-100 animate-scale-up">
                        <div className={`px-4 sm:px-6 py-4 flex justify-between items-center flex-shrink-0 text-white ${
                            accountModalMode === 'topup' ? 'bg-emerald-700' : 'bg-red-700'
                        }`}>
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="p-2 bg-white/15 rounded-xl flex-shrink-0">
                                    <Landmark size={18} />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-serif font-bold text-base">
                                        {accountModalMode === 'topup' ? 'Top-Up Modal Rekening Toko' : 'Tarik Dana / Ambil Laba'}
                                    </h3>
                                    <p className="text-xs text-white/80">
                                        Saldo Saat Ini: <strong className="font-mono">Rp {storeAccount.availableBalance.toLocaleString('id-ID')}</strong>
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setAccountModalMode(null)}
                                className="p-1 hover:bg-white/10 rounded-lg flex-shrink-0"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveAccountMovement} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                    Nominal {accountModalMode === 'topup' ? 'Setoran Modal' : 'Penarikan'} (Rp) <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-gray-500 text-sm">Rp</span>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        placeholder="0"
                                        value={accountForm.amount}
                                        onChange={e => setAccountForm(f => ({ ...f, amount: e.target.value }))}
                                        className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0D2B20] font-bold text-lg text-forest"
                                    />
                                </div>
                                {accountModalMode === 'topup' && (
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                        {[50000, 100000, 250000, 500000].map(preset => (
                                            <button
                                                key={preset}
                                                type="button"
                                                onClick={() => setAccountForm(f => ({ ...f, amount: String(preset) }))}
                                                className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold font-mono transition"
                                            >
                                                +Rp {preset.toLocaleString('id-ID')}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {accountAmountNum > 0 && (
                                <div className={`rounded-xl p-3 border text-xs flex items-center justify-between ${
                                    isWithdrawOverBalance
                                        ? 'bg-red-50 border-red-300 text-red-800'
                                        : 'bg-gray-50 border-gray-200 text-gray-700'
                                }`}>
                                    <span className="font-bold">Estimasi Saldo Setelah Mutasi:</span>
                                    <span className={`font-black font-mono ${isWithdrawOverBalance ? 'text-red-600' : 'text-[#0D2B20]'}`}>
                                        Rp {(accountModalMode === 'topup'
                                            ? storeAccount.availableBalance + accountAmountNum
                                            : storeAccount.availableBalance - accountAmountNum
                                        ).toLocaleString('id-ID')}
                                    </span>
                                </div>
                            )}

                            {isWithdrawOverBalance && (
                                <p className="text-xs text-red-600 font-bold flex items-center gap-1.5">
                                    <AlertTriangle size={14} className="flex-shrink-0" />
                                    Nominal melebihi saldo Rekening Toko tersedia!
                                </p>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                    Keterangan <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={accountForm.description}
                                    onChange={e => setAccountForm(f => ({ ...f, description: e.target.value }))}
                                    placeholder={accountModalMode === 'topup' ? 'cth: Modal Awal Kedai / Suntikan Modal Restok' : 'cth: Setor Laba Harian ke Pemilik'}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0D2B20] text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                    Catatan Tambahan (Opsional)
                                </label>
                                <textarea
                                    rows={2}
                                    value={accountForm.notes}
                                    onChange={e => setAccountForm(f => ({ ...f, notes: e.target.value }))}
                                    placeholder="No. referensi transfer / keterangan..."
                                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0D2B20] text-xs"
                                />
                            </div>

                            <div className="flex gap-2 pt-2 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setAccountModalMode(null)}
                                    className="flex-1 py-2.5 border border-gray-300 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-50 transition"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isWithdrawOverBalance}
                                    className={`flex-1 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md transition ${
                                        isWithdrawOverBalance
                                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                            : accountModalMode === 'topup'
                                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                                : 'bg-red-600 hover:bg-red-700 text-white'
                                    }`}
                                >
                                    <Save size={15} />
                                    {accountModalMode === 'topup' ? 'Simpan Top-Up' : 'Simpan Penarikan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Detail & Cetak Struk Pesanan */}
            {viewReceiptOrder && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <ReceiptModal
                        order={viewReceiptOrder}
                        onClose={() => setViewReceiptOrder(null)}
                    />
                </div>
            )}
        </div>
    );
}

// ====== Helper Sub-components ======

/**
 * Komponen Bar Filter Per Hari & Per Sesi Shift (mendukung operasional 2+ sesi shift dalam 1 hari).
 * Dipakai seragam pada tab Dashboard, Pesanan POS, serta Laba Rugi & Kas.
 */
function DayShiftFilterBar({
    filterDateMode,
    customFilterDate,
    selectedShiftId,
    sessionsOnSelectedDate,
    allEnrichedSessions,
    activePeriodLabel,
    isFilterActive,
    onChangeDateMode,
    onSelectShift,
    onReset,
}: {
    filterDateMode: 'all' | 'today' | 'yesterday' | 'custom';
    customFilterDate: string;
    selectedShiftId: string;
    sessionsOnSelectedDate: EnrichedStoreSession[];
    allEnrichedSessions: EnrichedStoreSession[];
    activePeriodLabel: string;
    isFilterActive: boolean;
    onChangeDateMode: (mode: 'all' | 'today' | 'yesterday' | 'custom', customDateVal?: string) => void;
    onSelectShift: (shiftId: string, syncDate?: boolean) => void;
    onReset: () => void;
}) {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-3.5 md:p-4 space-y-3">
            {/* Baris 1: Filter Per Hari */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-gray-600 flex items-center gap-1.5 mr-1">
                        <Calendar size={14} className="text-amber-600" /> Filter Hari:
                    </span>
                    {([
                        { id: 'all', label: 'Semua Hari' },
                        { id: 'today', label: 'Hari Ini' },
                        { id: 'yesterday', label: 'Kemarin' },
                    ] as const).map(opt => (
                        <button
                            key={opt.id}
                            type="button"
                            onClick={() => onChangeDateMode(opt.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                                filterDateMode === opt.id
                                    ? 'bg-[#0D2B20] text-amber-300 border-[#0D2B20] shadow-xs'
                                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                            }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                    <div className={`flex flex-wrap items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs transition ${
                        filterDateMode === 'custom'
                            ? 'bg-[#0D2B20] text-amber-300 border-[#0D2B20] shadow-xs'
                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}>
                        <span className="font-bold whitespace-nowrap">Pilih Tanggal:</span>
                        <input
                            type="date"
                            value={customFilterDate}
                            onChange={e => {
                                if (e.target.value) {
                                    onChangeDateMode('custom', e.target.value);
                                }
                            }}
                            className={`bg-transparent font-mono font-bold text-xs focus:outline-none cursor-pointer ${
                                filterDateMode === 'custom' ? 'text-amber-300 [color-scheme:dark]' : 'text-gray-800'
                            }`}
                        />
                    </div>
                </div>

                {isFilterActive && (
                    <div className="flex items-center gap-2 self-start lg:self-auto">
                        <span className="text-[11px] font-semibold text-forest bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                            📌 {activePeriodLabel}
                        </span>
                        <button
                            type="button"
                            onClick={onReset}
                            className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-2.5 py-1 rounded-lg transition flex items-center gap-1"
                        >
                            <X size={12} /> Reset
                        </button>
                    </div>
                )}
            </div>

            {/* Baris 2: Filter Per Sesi Shift (Shift 1, Shift 2, dst.) */}
            <div className="pt-2.5 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="text-xs font-bold text-gray-600 flex items-center gap-1.5 whitespace-nowrap mr-1">
                    <Filter size={13} className="text-forest" /> Sesi Shift:
                </span>

                {filterDateMode !== 'all' ? (
                    sessionsOnSelectedDate.length > 0 ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                                type="button"
                                onClick={() => onSelectShift('all')}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                                    selectedShiftId === 'all'
                                        ? 'bg-[#0D2B20] text-amber-300 border-[#0D2B20] shadow-xs'
                                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                                }`}
                            >
                                Semua Shift ({sessionsOnSelectedDate.length} Sesi)
                            </button>
                            {sessionsOnSelectedDate.map(sess => (
                                <button
                                    key={sess.id}
                                    type="button"
                                    onClick={() => onSelectShift(sess.id)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border flex items-center gap-1.5 ${
                                        selectedShiftId === sess.id
                                            ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                                            : 'bg-amber-50/60 text-gray-800 border-amber-200 hover:bg-amber-100/70'
                                    }`}
                                >
                                    <span className={`w-2 h-2 rounded-full ${sess.status === 'open' ? 'bg-green-500 animate-pulse' : 'bg-amber-600'}`} />
                                    <span>{sess.shiftBadge} · {sess.cashierName}</span>
                                    <span className={`text-[10px] font-mono ${selectedShiftId === sess.id ? 'text-white/90' : 'text-gray-500'}`}>
                                        ({sess.timeRangeLabel})
                                    </span>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <span className="text-xs text-gray-400 italic">
                            Belum ada sesi buka/tutup shift pada tanggal ini (menampilkan seluruh transaksi tanggal terpilih).
                        </span>
                    )
                ) : (
                    <div className="flex items-center gap-2 flex-1 max-w-md">
                        <select
                            value={selectedShiftId}
                            onChange={e => onSelectShift(e.target.value, e.target.value !== 'all')}
                            className="w-full border border-gray-200 rounded-xl text-xs font-bold text-gray-700 px-3 py-1.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#0D2B20] transition"
                        >
                            <option value="all">Semua Sesi Shift ({allEnrichedSessions.length} total sesi tercatat)</option>
                            {allEnrichedSessions.slice().reverse().map(sess => {
                                const dStr = new Date(sess.startTime).toLocaleDateString('id-ID', {
                                    day: '2-digit', month: 'short', year: 'numeric'
                                });
                                return (
                                    <option key={sess.id} value={sess.id}>
                                        {dStr} — {sess.shiftBadge}{sess.totalShiftsOnDay > 1 ? ` (dari ${sess.totalShiftsOnDay} shift)` : ''} · {sess.cashierName} ({sess.timeRangeLabel})
                                    </option>
                                );
                            })}
                        </select>
                    </div>
                )}
            </div>
        </div>
    );
}

function OrderStatusBadge({ status }: { status?: string }) {
    const map: Record<string, { cls: string; icon: React.ReactNode; label: string }> = {
        pending: {
            cls: 'bg-amber-50 text-amber-900 border border-amber-300 shadow-xs',
            icon: <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping inline-block" />,
            label: '1. Pesan Masuk',
        },
        awaiting_payment: {
            cls: 'bg-orange-50 text-orange-900 border border-orange-300 shadow-xs',
            icon: <Clock size={11} className="animate-pulse text-orange-600" />,
            label: '2. Menunggu Bayar',
        },
        processing: {
            cls: 'bg-blue-50 text-blue-900 border border-blue-300 shadow-xs',
            icon: <Loader size={11} className="animate-spin text-blue-600" />,
            label: '3. Sedang Diracik',
        },
        completed: {
            cls: 'bg-emerald-50 text-emerald-900 border border-emerald-300 shadow-xs',
            icon: <CheckCircle size={11} className="text-emerald-600" />,
            label: '4. Selesai',
        },
        cancelled: {
            cls: 'bg-red-50 text-red-700 border border-red-200',
            icon: <XCircle size={11} className="text-red-500" />,
            label: 'Dibatalkan',
        },
    };
    const s = status || 'pending';
    const { cls, icon, label } = map[s] || map.pending;
    return (
        <span className={`px-2.5 py-1 text-[11px] rounded-full font-bold tracking-wide inline-flex items-center gap-1.5 ${cls}`}>
            {icon} {label}
        </span>
    );
}

function OrderActions({
    order,
    updateOrderStatus,
    addLog,
    userName,
    onCancel,
    onViewReceipt,
}: {
    order: Order;
    updateOrderStatus: (id: string, status: Order['status']) => void;
    addLog: (action: string, detail: string, user: string) => void;
    userName: string;
    onCancel: () => void;
    onViewReceipt?: () => void;
}) {
    const shortId = order.id.slice(0, 6).toUpperCase();
    return (
        <div className="flex gap-1.5 flex-wrap justify-end items-center">
            {(!order.status || order.status === 'pending') && (
                <>
                    <button
                        onClick={() => {
                            updateOrderStatus(order.id, 'processing');
                            addLog("PROCESS_ORDER", `Terima & mulai racik pesanan #${shortId}`, userName);
                        }}
                        className="px-2.5 py-1.5 bg-[#0D2B20] text-amber-300 border border-amber-400/40 rounded-xl text-xs font-bold hover:bg-[#1a4433] transition flex items-center gap-1 shadow-xs"
                        title="Terima pesanan dan teruskan ke barista/dapur"
                    >
                        ✓ Terima &amp; Racik
                    </button>
                    <button
                        onClick={() => {
                            updateOrderStatus(order.id, 'awaiting_payment');
                            addLog("AWAIT_PAYMENT", `Pindahkan pesanan #${shortId} ke status menunggu bayar`, userName);
                        }}
                        className="px-2 py-1.5 bg-orange-50 text-orange-800 border border-orange-200 rounded-xl text-xs font-bold hover:bg-orange-100 transition flex items-center gap-1"
                        title="Tandai pesanan menunggu pelunasan (QRIS / Transfer)"
                    >
                        <Clock size={11} /> Tagih Bayar
                    </button>
                    <button
                        onClick={onCancel}
                        className="px-2 py-1.5 bg-gray-100 text-gray-500 hover:text-red-600 hover:bg-red-50 border border-gray-200 rounded-xl text-xs font-bold transition"
                        title="Tolak atau batalkan pesanan ini"
                    >
                        ✕ Tolak
                    </button>
                </>
            )}
            {order.status === 'awaiting_payment' && (
                <>
                    <button
                        onClick={() => {
                            updateOrderStatus(order.id, 'processing');
                            addLog("CONFIRM_PAYMENT", `Konfirmasi bayar lunas & mulai racik pesanan #${shortId}`, userName);
                        }}
                        className="px-2.5 py-1.5 bg-orange-600 text-white rounded-xl text-xs font-bold hover:bg-orange-700 transition flex items-center gap-1 shadow-xs"
                    >
                        💵 Lunas &amp; Racik
                    </button>
                    <button
                        onClick={onCancel}
                        className="px-2 py-1.5 bg-gray-100 text-gray-500 hover:text-red-600 hover:bg-red-50 border border-gray-200 rounded-xl text-xs font-bold transition"
                    >
                        ✕ Batal
                    </button>
                </>
            )}
            {order.status === 'processing' && (
                <button
                    onClick={() => {
                        updateOrderStatus(order.id, 'completed');
                        addLog("COMPLETE_ORDER", `Pesanan #${shortId} selesai diracik & diserahkan`, userName);
                    }}
                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition flex items-center gap-1 shadow-xs"
                >
                    <CheckCircle size={12} /> Selesai Diracik
                </button>
            )}
            {order.status === 'completed' && onViewReceipt && (
                <button
                    onClick={onViewReceipt}
                    className="px-2.5 py-1.5 bg-gray-50 text-forest hover:bg-amber-50 border border-gray-200 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                >
                    🧾 Cetak Struk
                </button>
            )}
        </div>
    );
}
