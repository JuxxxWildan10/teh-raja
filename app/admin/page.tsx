"use client";

/**
 * @file Admin Dashboard
 * @description Halaman Panel Kendali (Admin). Berfungsi untuk melihat grafik penjualan, laporan harian, manajemen stok produk, pengaturan promo, dan manajemen pelanggan.
 * Terlindungi oleh Firebase Authentication.
 */


import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
    useProductStore, useSalesStore, useAuthStore, usePromoStore,
    useCustomerStore, useInventoryStore, useSupplierStore, useExpenseStore,
    ExtendedProduct, Order, ExpenseCategory, EXPENSE_CATEGORIES, OpnameLog
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
    Menu, Search, Filter, Sparkles, BrainCircuit, RefreshCw, Ticket, Users as UsersIcon, Box,
    Building2, BarChart2, TrendingUp, FileSpreadsheet, Bell, Wallet, DollarSign, Upload, Database, ClipboardCheck
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
    const { user, loginWithPassword, logout, users, addUser, removeUser, updateUser } = useAuthStore();
    const router = useRouter();
    const toast = useToast();
    const [loginUsername, setLoginUsername] = useState("");
    const [loginPassword, setLoginPassword] = useState("");
    const [loginError, setLoginError] = useState("");

    // Stores
    const { products, addProduct, updateProduct, deleteProduct } = useProductStore();
    const { getDailySales, getProductPopularity, getPeakHours, orders, logs, addLog, resetData, updateOrderStatus, sessions, closeStore } = useSalesStore();
    const [isClient, setIsClient] = useState(false);

    const { promos, addPromo, updatePromo, deletePromo, togglePromo } = usePromoStore();
    const { customers } = useCustomerStore();
    const { ingredients, addIngredient, updateIngredient, deleteIngredient } = useInventoryStore();
    const { suppliers } = useSupplierStore();

    // ── Inventory CRUD State ──────────────────────────────────────
    const [ingModalOpen, setIngModalOpen] = useState(false);
    const [editingIngId, setEditingIngId] = useState<string | null>(null);
    const [ingForm, setIngForm] = useState({ name: '', stock: 0, unit: 'ml' as 'ml' | 'gram' | 'pcs', minStockThreshold: 100 });

    // ── Promo CRUD State ──────────────────────────────────────────
    const [promoModalOpen, setPromoModalOpen] = useState(false);
    const [editingPromoId, setEditingPromoId] = useState<string | null>(null);
    const [promoForm, setPromoForm] = useState({ name: '', type: 'percent' as 'percent' | 'amount' | 'happy_hour', value: 10, minSubtotal: '', startHour: 9, endHour: 17, description: '', isActive: true });

    // UI State
    const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'logs' | 'orders' | 'karyawan' | 'ai-forecast' | 'promos' | 'loyalty' | 'inventory' | 'cabang' | 'analytics' | 'keuangan'>('dashboard');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // ── Expense & P&L State ──────────────────────────────────────
    const { expenses, addExpense, deleteExpense } = useExpenseStore();
    const [expenseModalOpen, setExpenseModalOpen] = useState(false);
    const [expenseForm, setExpenseForm] = useState({
        amount: '',
        description: '',
        category: 'bahan_tambahan' as ExpenseCategory,
        paidVia: 'kas_laci' as 'kas_laci' | 'rekening_toko',
        notes: ''
    });

    // ── Stock Opname State ───────────────────────────────────────
    const { opnameLogs, recordOpname } = useInventoryStore();
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
    const [confirmReset, setConfirmReset] = useState(false);
    const [confirmCancelOrder, setConfirmCancelOrder] = useState<string | null>(null);

    // Orders filter & sort
    const [orderSearch, setOrderSearch] = useState('');
    const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | Order['status']>('all');
    const [orderSortMode, setOrderSortMode] = useState<'newest' | 'pipeline' | 'oldest'>('newest');
    const [viewReceiptOrder, setViewReceiptOrder] = useState<Order | null>(null);

    // Shift summary
    const [shiftSummary, setShiftSummary] = useState<import("@/lib/store").StoreSession | null>(null);

    const [formData, setFormData] = useState<ExtendedProduct>({
        id: '', name: '', price: 0, description: '',
        image: '/images/royal-milk-tea.png', category: 'signature',
        attributes: { sweet: 5, creamy: 5, fruity: 5 },
        isAvailable: true, stock: 50, minStockThreshold: 10
    });

    useEffect(() => { setIsClient(true); }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginError("");
        const loggedInUser = await loginWithPassword(loginUsername, loginPassword);
        if (loggedInUser) {
            addLog("LOGIN", `${loggedInUser.role === 'admin' ? 'Admin' : 'Cashier'} logged in`, loggedInUser.name);
            if (loggedInUser.role === 'cashier') {
                router.push('/pos');
            }
        } else {
            setLoginError("Username atau Password salah!");
        }
    };

    const handleLogout = async () => {
        addLog("LOGOUT", `${user?.name} logged out`, user?.name || "Unknown");
        await logout();
    };

    const openAddModal = () => {
        setEditingId(null);
        setFormData({
            id: nanoid(), name: '', price: 15000, description: '',
            image: '/images/royal-milk-tea.png', category: 'signature',
            attributes: { sweet: 5, creamy: 5, fruity: 5 },
            isAvailable: true, stock: 50, minStockThreshold: 10
        });
        setIsModalOpen(true);
    };

    const openEditModal = (product: ExtendedProduct) => {
        setEditingId(product.id);
        setFormData({ ...product });
        setIsModalOpen(true);
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

    const handleExportCSV = () => {
        const headers = ["Order ID", "Date", "Customer", "Items", "Total", "Payment", "Status"];
        const rows = orders.map(order => [
            order.id,
            new Date(order.date).toLocaleString('id-ID'),
            order.customerName || "Guest",
            order.items.map(i => `${i.name} (x${i.quantity})`).join("; "),
            order.total,
            order.paymentMethod || '-',
            order.status,
        ]);
        const csvContent = "data:text/csv;charset=utf-8,"
            + [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `laporan_penjualan_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        addLog("EXPORT_CSV", "Exported sales data to CSV", user?.name || "Unknown");
        toast.success("Data penjualan berhasil di-export ke CSV!");
    };

    const handleTabChange = (tab: 'dashboard' | 'products' | 'logs' | 'orders' | 'karyawan' | 'ai-forecast' | 'promos' | 'loyalty' | 'inventory' | 'cabang' | 'analytics' | 'keuangan') => {
        setActiveTab(tab);
        setIsMobileMenuOpen(false);
    };

    // Export to Excel
    const handleExportExcel = async () => {
        const XLSX = await import('xlsx');
        const wsData = [
            ["Order ID", "Tanggal", "Waktu", "Pelanggan", "No. HP", "Items", "Subtotal", "Diskon", "Total", "Metode Bayar", "Status", "Kasir"],
            ...orders.map(o => [
                o.id,
                new Date(o.date).toLocaleDateString('id-ID'),
                new Date(o.date).toLocaleTimeString('id-ID'),
                o.customerName || 'Guest',
                o.customerPhone || '-',
                o.items.map(i => `${i.quantity}x ${i.name}`).join('; '),
                o.subtotal ?? o.total,
                o.discount ?? 0,
                o.total,
                o.paymentMethod || '-',
                o.status,
                o.cashierName || '-',
            ])
        ];
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        // Column widths
        ws['!cols'] = [12,12,10,18,14,40,12,10,12,12,12,14].map(w => ({ wch: w }));
        XLSX.utils.book_append_sheet(wb, ws, 'Laporan Penjualan');

        // Sheet 2: Product Summary
        const popMap = new Map<string, number>();
        orders.forEach(o => o.items.forEach(i => popMap.set(i.name, (popMap.get(i.name) || 0) + i.quantity)));
        const popData = [['Nama Produk', 'Qty Terjual'], ...Array.from(popMap.entries()).sort((a,b) => b[1]-a[1])];
        const ws2 = XLSX.utils.aoa_to_sheet(popData);
        XLSX.utils.book_append_sheet(wb, ws2, 'Ringkasan Produk');

        XLSX.writeFile(wb, `Laporan_TehRaja_${new Date().toISOString().split('T')[0]}.xlsx`);
        addLog("EXPORT_XLSX", "Exported full report to Excel", user?.name || "Admin");
        toast.success("Berhasil export ke Excel!");
    };

    // ── Live Today Stats (Semua pesanan: Web/Menu & Manual POS) ───
    const todayOrders = useMemo(() => {
        const todayStr = new Date().toDateString();
        return orders.filter(o => {
            const d = new Date(o.date);
            return !isNaN(d.getTime()) && d.toDateString() === todayStr;
        });
    }, [orders]);

    const todayValidOrders = useMemo(() => {
        return todayOrders.filter(o => o.status !== 'cancelled');
    }, [todayOrders]);

    const todayGrossRevenue = useMemo(() => {
        return todayValidOrders.reduce((sum, o) => sum + o.total, 0);
    }, [todayValidOrders]);

    const todayCompletedOrders = useMemo(() => {
        return todayOrders.filter(o => o.status === 'completed');
    }, [todayOrders]);

    // ── Financials (P&L) Calculations ─────────────────────────────
    const validOrders = useMemo(() => orders.filter(o => o.status !== 'cancelled'), [orders]);
    const grossRevenue = useMemo(() => validOrders.reduce((sum, o) => sum + o.total, 0), [validOrders]);
    const estimatedCOGS = useMemo(() => Math.round(grossRevenue * 0.30), [grossRevenue]); // 30% standar HPP tea shop
    const grossProfit = useMemo(() => grossRevenue - estimatedCOGS, [grossRevenue, estimatedCOGS]);
    const totalExpenses = useMemo(() => expenses.reduce((sum, e) => sum + e.amount, 0), [expenses]);
    const netProfit = useMemo(() => grossProfit - totalExpenses, [grossProfit, totalExpenses]);
    const netMargin = useMemo(() => grossRevenue > 0 ? ((netProfit / grossRevenue) * 100).toFixed(1) : '0.0', [grossRevenue, netProfit]);
    const drawerExpenses = useMemo(() => expenses.filter(e => e.paidVia === 'kas_laci').reduce((sum, e) => sum + e.amount, 0), [expenses]);
    const transferExpenses = useMemo(() => expenses.filter(e => e.paidVia === 'rekening_toko').reduce((sum, e) => sum + e.amount, 0), [expenses]);

    const handleSaveExpense = (e: React.FormEvent) => {
        e.preventDefault();
        const amt = parseFloat(String(expenseForm.amount).replace(/\D/g, '')) || 0;
        if (amt <= 0 || !expenseForm.description.trim()) {
            toast.error("Nominal dan keperluan pengeluaran wajib diisi!");
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

    const handleExportPNL = () => {
        const wb = XLSX.utils.book_new();

        const pnlRows = [
            ["LAPORAN LABA RUGI (PROFIT & LOSS) - TEH RAJA"],
            [`Periode Cetak: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}`],
            [`Dicatat Oleh : ${user?.name || 'Admin'}`],
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
            ["No", "Tanggal", "Kategori", "Keperluan / Deskripsi", "Metode Bayar", "Jumlah (Rp)", "Dicatat Oleh"],
            ...expenses.map((e, idx) => [
                idx + 1,
                new Date(e.date).toLocaleDateString('id-ID'),
                EXPENSE_CATEGORIES.find(c => c.id === e.category)?.label || e.category,
                e.description,
                e.paidVia === 'kas_laci' ? 'Kas Laci Kasir' : 'Rekening Toko',
                e.amount,
                e.cashierName || 'Admin'
            ])
        ];
        const wsExp = XLSX.utils.aoa_to_sheet(expRows);
        XLSX.utils.book_append_sheet(wb, wsExp, "Daftar Pengeluaran");

        XLSX.writeFile(wb, `Laporan_Laba_Rugi_TehRaja_${new Date().toISOString().slice(0, 10)}.xlsx`);
        toast.success("Laporan Laba Rugi (.xlsx) berhasil diunduh!");
    };

    const handleExportBackup = () => {
        const backupData = {
            appName: "Teh Raja POS & Management",
            version: "3.0.0",
            exportDate: new Date().toISOString(),
            products: useProductStore.getState().products,
            orders: useSalesStore.getState().orders,
            ingredients: useInventoryStore.getState().ingredients,
            opnameLogs: useInventoryStore.getState().opnameLogs || [],
            expenses: useExpenseStore.getState().expenses,
            promos: usePromoStore.getState().promos,
            customers: useCustomerStore.getState().customers,
            sessions: useSalesStore.getState().sessions,
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
                    if (data.expenses) useExpenseStore.setState({ expenses: data.expenses });
                    if (data.promos) usePromoStore.setState({ promos: data.promos });
                    if (data.customers) useCustomerStore.setState({ customers: data.customers });
                    if (data.sessions) useSalesStore.setState({ sessions: data.sessions });
                    toast.success("Database toko berhasil dipulihkan secara penuh!");
                }
            } catch (err: any) {
                toast.error("Gagal membaca file backup: " + err.message);
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    // AI Forecast State
    const [aiForecastText, setAiForecastText] = useState("");
    const [isForecasting, setIsForecasting] = useState(false);
    const [upsellSuggestion, setUpsellSuggestion] = useState<string | null>(null);
    const [isUpselling, setIsUpselling] = useState(false);
    const [upsellPhone, setUpsellPhone] = useState('');

    const handleUpsell = async (phone: string) => {
        if (!phone.trim()) return;
        setIsUpselling(true);
        setUpsellSuggestion(null);
        try {
            const customer = customers.find((c: any) => c.phone === phone.trim());
            const orderHistory = customer ? orders.filter((o: any) => o.customerPhone === phone.trim()) : [];
            const availableProducts = products.filter((p: any) => p.isAvailable).slice(0, 10);
            const res = await fetch('/api/ai/crm-upsell', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ customer, orderHistory, availableProducts, currentCart: [] })
            });
            const data = await res.json();
            if (data.suggestion) setUpsellSuggestion(data.suggestion);
            else throw new Error('Tidak ada saran dari AI');
        } catch (err: any) {
            toast.error('Gagal mengambil saran AI: ' + err.message);
        } finally {
            setIsUpselling(false);
        }
    };

    const handleAIForecast = async () => {
        setIsForecasting(true);
        setAiForecastText("");
        try {
            const res = await fetch('/api/ai/forecast', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orders: orders.slice(-100),
                    products: products.map(p => ({ id: p.id, name: p.name, stock: p.stock, category: p.category })),
                    ingredients: ingredients.map(i => ({ name: i.name, stock: i.stock, unit: i.unit, minStockThreshold: i.minStockThreshold }))
                })
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || `HTTP Error ${res.status}`);
            }
            if (!data.forecast) throw new Error('Respon AI kosong.');
            setAiForecastText(data.forecast);
            toast.success("AI berhasil menganalisis penjualan!");
        } catch (err: any) {
            console.error('[AI Forecast Error]', err);
            toast.error(`Gagal: ${err.message}`);
        } finally {
            setIsForecasting(false);
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

    // ── Promo CRUD Handlers ─────────────────────────────────────
    const openAddPromo = () => {
        setEditingPromoId(null);
        setPromoForm({ name: '', type: 'percent', value: 10, minSubtotal: '', startHour: 9, endHour: 17, description: '', isActive: true });
        setPromoModalOpen(true);
    };
    const openEditPromo = (promo: typeof promos[0]) => {
        setEditingPromoId(promo.id);
        setPromoForm({
            name: promo.name, type: promo.type, value: promo.value,
            minSubtotal: promo.minSubtotal ? String(promo.minSubtotal) : '',
            startHour: promo.startHour ?? 9, endHour: promo.endHour ?? 17,
            description: promo.description ?? '', isActive: promo.isActive
        });
        setPromoModalOpen(true);
    };
    const savePromo = () => {
        if (!promoForm.name.trim()) { toast.error('Nama promo wajib diisi!'); return; }
        const payload = {
            name: promoForm.name, type: promoForm.type, value: Number(promoForm.value),
            minSubtotal: promoForm.minSubtotal ? Number(promoForm.minSubtotal) : undefined,
            startHour: promoForm.type === 'happy_hour' ? promoForm.startHour : undefined,
            endHour: promoForm.type === 'happy_hour' ? promoForm.endHour : undefined,
            description: promoForm.description, isActive: promoForm.isActive,
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

    // Lifecycle Stage Counts (1. Pesan -> 2. Bayar -> 3. Racik -> 4. Selesai)
    const orderStageCounts = useMemo(() => {
        return {
            all: orders.length,
            pending: orders.filter(o => !o.status || o.status === 'pending').length,
            awaiting_payment: orders.filter(o => o.status === 'awaiting_payment').length,
            processing: orders.filter(o => o.status === 'processing').length,
            completed: orders.filter(o => o.status === 'completed').length,
            cancelled: orders.filter(o => o.status === 'cancelled').length,
        };
    }, [orders]);

    // Filtered & Sorted orders: Newest ALWAYS at the top by timestamp
    const filteredOrders = useMemo(() => {
        const statusWeight: Record<string, number> = {
            pending: 1,           // 1. Pesan Masuk
            awaiting_payment: 2,  // 2. Pembayaran
            processing: 3,        // 3. Sedang Diracik
            completed: 4,         // 4. Selesai
            cancelled: 5,         // Dibatalkan
        };

        const list = orders.filter(order => {
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
                if (wA !== wB) return wA - wB; // Prioritas alur: Pesan -> Bayar -> Racik
                return timeB - timeA;          // Di dalam tahap yang sama, pesanan baru paling atas
            } else if (orderSortMode === 'oldest') {
                return timeA - timeB;
            } else {
                // Default 'newest': Pesanan baru SELALU paling atas (Timestamp descending)
                return timeB - timeA;
            }
        });
    }, [orders, orderStatusFilter, orderSearch, orderSortMode]);

    // Charts Data
    const dailySales = getDailySales();
    const popularity = getProductPopularity();
    const peakHours = getPeakHours();

    // Variant analysis
    const variantAnalysis = useMemo(() => {
        const sizeMap = new Map<string, number>();
        const sugarMap = new Map<string, number>();
        const tempMap = new Map<string, number>();
        orders.forEach(o => o.items.forEach(item => {
            const v = item.variants;
            if (v?.size) sizeMap.set(v.size, (sizeMap.get(v.size) || 0) + item.quantity);
            if (v?.sugar) sugarMap.set(v.sugar, (sugarMap.get(v.sugar) || 0) + item.quantity);
            if (v?.temperature) tempMap.set(v.temperature, (tempMap.get(v.temperature) || 0) + item.quantity);
        }));
        return { size: sizeMap, sugar: sugarMap, temp: tempMap };
    }, [orders]);

    // Low stock alerts
    const lowStockProducts = products.filter(p => p.stock <= (p.minStockThreshold ?? 5) && p.isAvailable);
    const lowStockIngredients = ingredients.filter(i => i.stock <= i.minStockThreshold);

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
                label: "Jumlah Cup",
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

    if (!isClient) return null;

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-forest relative overflow-hidden px-4">
                <div className="absolute inset-0 z-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                <div className="p-6 sm:p-8 glass rounded-2xl w-full max-w-md text-center bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl z-10">
                    <div className="mb-6">
                        <h1 className="text-3xl sm:text-4xl font-serif text-gold font-bold">TEH RAJA</h1>
                        <p className="text-cream opacity-60 text-sm tracking-widest mt-2 uppercase">Official Admin Panel</p>
                    </div>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <input
                            type="text"
                            className="w-full p-4 bg-white/10 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-gold transition"
                            placeholder="Username"
                            value={loginUsername}
                            onChange={(e) => setLoginUsername(e.target.value)}
                        />
                        <input
                            type="password"
                            className="w-full p-4 bg-white/10 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-gold transition"
                            placeholder="Password"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                        />
                        {loginError && <p className="text-red-400 text-sm bg-red-400/10 p-2 rounded">{loginError}</p>}
                        <button type="submit" className="w-full py-4 bg-gold text-forest font-bold rounded-lg hover:bg-gold-light transition hover:scale-[1.02] shadow-lg shadow-gold/20">
                            Masuk Dashboard
                        </button>
                    </form>
                    <div className="mt-8 pt-6 border-t border-white/10 text-xs text-white/30 flex justify-between">
                        <span>© 2024 Teh Raja</span>
                        <span>v3.0.0</span>
                    </div>
                </div>
            </div>
        );
    }

    const pendingCount = orders.filter(o => !o.status || o.status === 'pending' || o.status === 'awaiting_payment').length;
    const lowStockAlertCount = products.filter(p => p.stock <= (p.minStockThreshold ?? 5)).length + ingredients.filter(i => i.stock <= i.minStockThreshold).length;
    const tabs = [
        { id: 'dashboard' as const, label: 'Dashboard' },
        ...(user.role === 'admin' ? [{ id: 'keuangan' as const, label: 'Laba Rugi (P&L) 💰', icon: <Wallet size={18} /> }] : []),
        { id: 'products' as const, label: 'Menu & Stok' },
        ...(user.role === 'admin' ? [{ id: 'analytics' as const, label: 'Analitik BI', icon: <BarChart2 size={18} /> }] : []),
        ...(user.role === 'admin' ? [{ id: 'inventory' as const, label: 'Inventaris & BOM', icon: <Box size={18} />, badge: lowStockAlertCount }] : []),
        { id: 'orders' as const, label: 'Pesanan', badge: pendingCount },
        ...(user.role === 'admin' ? [{ id: 'promos' as const, label: 'Promo Engine', icon: <Ticket size={18} /> }] : []),
        ...(user.role === 'admin' ? [{ id: 'loyalty' as const, label: 'Loyalty Pelanggan', icon: <UsersIcon size={18} /> }] : []),
        ...(user.role === 'admin' ? [{ id: 'cabang' as const, label: 'Multi Cabang', icon: <Building2 size={18} /> }] : []),
        ...(user.role === 'admin' ? [{ id: 'karyawan' as const, label: 'Karyawan' }] : []),
        ...(user.role === 'admin' ? [{ id: 'logs' as const, label: 'Log Aktivitas' }] : []),
        ...(user.role === 'admin' ? [{ id: 'ai-forecast' as const, label: 'AI Forecast ✨' }] : []),
    ];

    return (
        <div className="min-h-screen bg-gray-50 text-forest relative flex flex-col">
            {/* ============ ADMIN NAVBAR ============ */}
            <nav className="bg-forest text-cream shadow-lg sticky top-0 z-30">
                <div className="px-4 sm:px-6 py-3 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="md:hidden p-2 hover:bg-white/10 rounded-lg transition"
                            aria-label="Toggle menu"
                        >
                            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>
                        <h1 className="text-lg sm:text-xl font-serif font-bold text-gold">TEH RAJA</h1>
                        <span className="opacity-30 hidden sm:block">|</span>
                        <span className="text-xs opacity-50 hidden sm:block uppercase tracking-wider">Admin Panel</span>
                    </div>
                    <div className="flex gap-3 sm:gap-4 items-center">
                        <div className="text-right leading-tight hidden sm:block">
                            <p className="font-bold text-sm text-gold">{user.name}</p>
                            <p className="text-xs opacity-60 uppercase tracking-wider">{user.role}</p>
                        </div>
                        <div className="h-8 w-[1px] bg-white/10 hidden sm:block"></div>
                        <Link href="/pos" className="opacity-70 hover:opacity-100 flex items-center gap-1.5 text-xs sm:text-sm whitespace-nowrap">
                            <span className="hidden sm:inline text-amber-400 font-bold">Buka POS</span>
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse flex-shrink-0"></span>
                        </Link>
                        <button onClick={handleLogout} className="p-2 hover:bg-red-500/20 text-red-300 rounded-full transition" title="Logout">
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>

                {/* Desktop Nav Tabs */}
                <div className="hidden md:flex px-6 pb-0 gap-1 text-sm bg-black/20">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id)}
                            className={`px-4 py-2 rounded-t-md transition relative font-medium ${activeTab === tab.id
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
                    <div className="md:hidden border-t border-white/10 bg-forest-light">
                        <div className="px-4 py-3 border-b border-white/10 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center">
                                <span className="text-gold font-bold text-sm">{user.name.charAt(0)}</span>
                            </div>
                            <div>
                                <p className="font-bold text-sm text-gold">{user.name}</p>
                                <p className="text-xs opacity-60 uppercase tracking-wider">{user.role}</p>
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
                            <h2 className="text-xl md:text-2xl font-bold">Laporan Kinerja</h2>
                            <div className="flex gap-2 flex-wrap">
                                <button onClick={handleExportCSV} className="flex items-center gap-2 text-forest bg-white border border-gray-200 px-3 py-2 rounded text-sm hover:bg-gray-50 shadow-sm transition">
                                    <Download size={16} /> CSV
                                </button>
                                <button onClick={handleExportExcel} className="flex items-center gap-2 bg-green-700 text-white px-3 py-2 rounded text-sm hover:bg-green-800 shadow-sm transition">
                                    <FileSpreadsheet size={16} /> Excel
                                </button>
                                <ReportGenerator orders={orders} />
                            </div>
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


                        {/* KPI Cards (Live Real-Time: Web / Menu & Manual POS) */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-white rounded-2xl p-4 md:p-5 border border-gray-100 shadow-sm flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Order Hari Ini</p>
                                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                    </div>
                                    <p className="text-2xl md:text-3xl font-black text-blue-600 mt-1 font-mono">
                                        {todayOrders.length}
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
                                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Omset Hari Ini</p>
                                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">Live</span>
                                    </div>
                                    <p className="text-2xl md:text-3xl font-black text-amber-600 mt-1 font-mono">
                                        Rp {todayGrossRevenue.toLocaleString('id-ID')}
                                    </p>
                                </div>
                                <p className="text-[11px] text-gray-400 mt-2 pt-2 border-t border-gray-50 flex items-center justify-between">
                                    <span>{todayValidOrders.length} pesanan valid</span>
                                    <span className="font-semibold text-forest font-mono">Rp {grossRevenue.toLocaleString('id-ID')} all</span>
                                </p>
                            </div>

                            <div className="bg-white rounded-2xl p-4 md:p-5 border border-gray-100 shadow-sm flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Perlu Tindakan</p>
                                        {pendingCount > 0 && <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />}
                                    </div>
                                    <p className="text-2xl md:text-3xl font-black text-orange-600 mt-1 font-mono">
                                        {pendingCount}
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
                                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Selesai Hari Ini</p>
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

                        {/* Riwayat Sesi */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-4 md:p-6 border-b border-gray-100 bg-gray-50/50">
                                <h3 className="font-bold text-lg text-forest flex items-center gap-2">
                                    <Clock size={20} className="text-amber-500" /> Riwayat Laporan Harian (Sesi)
                                </h3>
                                <p className="text-sm text-gray-500 mt-1">Laporan pendapatan setiap kali toko dibuka dan ditutup.</p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold tracking-wider">
                                        <tr>
                                            <th className="p-4">Staff Kasir</th>
                                            <th className="p-4">Waktu Buka</th>
                                            <th className="p-4">Waktu Tutup</th>
                                            <th className="p-4 text-center">Jml Transaksi</th>
                                            <th className="p-4 text-right">Total Pendapatan</th>
                                            <th className="p-4 text-right">Detail</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {sessions.slice().reverse().map(session => (
                                            <tr key={session.id} className="hover:bg-blue-50/50 transition bg-white">
                                                <td className="p-4 font-bold text-gray-800 flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs">
                                                        {session.cashierName.charAt(0)}
                                                    </div>
                                                    {session.cashierName}
                                                </td>
                                                <td className="p-4 text-sm text-gray-600">
                                                    {new Date(session.startTime).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                                                </td>
                                                <td className="p-4 text-sm text-gray-600">
                                                    {session.endTime
                                                        ? new Date(session.endTime).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
                                                        : <span className="text-green-600 font-bold text-xs bg-green-50 px-2 py-1 rounded">SEDANG BUKA</span>
                                                    }
                                                </td>
                                                <td className="p-4 text-center font-mono">{session.totalOrders}</td>
                                                <td className="p-4 text-right font-bold text-forest">
                                                    Rp {session.totalSales.toLocaleString('id-ID')}
                                                </td>
                                                <td className="p-4 text-right">
                                                    <button
                                                        onClick={() => setShiftSummary(session)}
                                                        className="text-xs text-blue-600 hover:text-blue-800 font-bold transition"
                                                    >
                                                        Lihat
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {sessions.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="p-8 text-center text-gray-400 italic">
                                                    Belum ada riwayat sesi toko tersimpan.
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
                                    <p className="text-xs text-red-600 mt-1">Hati-hati, tindakan ini tidak dapat dibatalkan.</p>
                                </div>
                                <button onClick={handleReset} className="w-full sm:w-auto px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-bold text-sm transition">
                                    Reset Semua Data
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* === KEUNANGAN & LABA RUGI (P&L) TAB === */}
                {activeTab === 'keuangan' && user.role === 'admin' && (
                    <div className="animate-fade-in space-y-6">
                        {/* Header Banner */}
                        <div className="bg-gradient-to-br from-[#0D2B20] to-[#1a4433] rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-amber-400 rounded-xl text-[#0D2B20]">
                                    <Wallet size={28} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-amber-400">Laporan Laba Rugi (P&L) & Arus Kas</h2>
                                    <p className="text-white/70 text-sm mt-0.5">Analisis profitabilitas riil, margin laba bersih, dan pengeluaran kas kecil (petty cash) kedai.</p>
                                </div>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                <button
                                    onClick={() => setExpenseModalOpen(true)}
                                    className="flex items-center gap-2 bg-amber-400 text-[#0D2B20] px-4 py-2.5 rounded-xl font-black text-xs hover:bg-amber-300 transition shadow-lg">
                                    <Plus size={15} /> Catat Biaya Operasional
                                </button>
                                <button
                                    onClick={handleExportPNL}
                                    className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-2.5 rounded-xl font-bold text-xs transition">
                                    <FileSpreadsheet size={15} /> Export P&L (.xlsx)
                                </button>
                                <button
                                    onClick={handleExportBackup}
                                    className="flex items-center gap-2 bg-blue-600/80 hover:bg-blue-600 text-white px-3.5 py-2.5 rounded-xl font-bold text-xs transition">
                                    <Database size={15} /> Backup Data
                                </button>
                                <button
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

                        {/* 4 Primary Financial Cards */}
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
                            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                                <div>
                                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                        <DollarSign size={18} className="text-amber-500" /> Rincian Pengeluaran Operasional & Kas Kecil (Petty Cash)
                                    </h3>
                                    <p className="text-xs text-gray-400 mt-0.5">Catatan uang keluar untuk es batu kristal, galon, token listrik, dan keperluan darurat kedai.</p>
                                </div>
                                <button
                                    onClick={() => setExpenseModalOpen(true)}
                                    className="bg-amber-100 hover:bg-amber-200 text-[#0D2B20] font-bold text-xs px-3 py-1.5 rounded-lg transition flex items-center gap-1.5">
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
                                        {expenses.map(e => (
                                            <tr key={e.id} className="hover:bg-gray-50 transition">
                                                <td className="p-3.5 text-gray-500 font-mono">
                                                    {new Date(e.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
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
                                        ))}
                                        {expenses.length === 0 && (
                                            <tr>
                                                <td colSpan={7} className="p-8 text-center text-gray-400">
                                                    Belum ada pengeluaran yang dicatat. Klik "Catat Biaya Operasional".
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* === ANALYTICS BI TAB === */}
                {activeTab === 'analytics' && user.role === 'admin' && (
                    <div className="animate-fade-in space-y-6">
                        {/* Header */}
                        <div className="bg-gradient-to-br from-[#1a1a3e] to-[#2d2d6e] rounded-2xl p-6 text-white shadow-xl">
                            <div className="flex items-center gap-4 mb-5">
                                <div className="p-3 bg-violet-400 rounded-xl">
                                    <BarChart2 size={28} className="text-white" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-violet-200">Business Intelligence</h2>
                                    <p className="text-white/60 text-sm mt-0.5">Analitik mendalam · Berbasis data transaksi nyata</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {[
                                    { label: 'Total Pendapatan', value: `Rp ${orders.reduce((s,o) => s+o.total,0).toLocaleString('id-ID')}`, icon: '💰' },
                                    { label: 'Rata-rata/Order', value: `Rp ${orders.length ? Math.round(orders.reduce((s,o) => s+o.total,0)/orders.length).toLocaleString('id-ID') : '0'}`, icon: '📊' },
                                    { label: 'Pelanggan Unik', value: new Set(orders.filter(o=>o.customerPhone).map(o=>o.customerPhone)).size, icon: '👥' },
                                    { label: 'Item Terjual', value: orders.reduce((s,o) => s + o.items.reduce((si,i)=>si+i.quantity,0),0), icon: '🍵' },
                                ].map(({ label, value, icon }) => (
                                    <div key={label} className="bg-white/10 border border-white/10 rounded-xl p-3 text-center">
                                        <p className="text-2xl mb-1">{icon}</p>
                                        <p className="text-lg font-black text-violet-200">{value}</p>
                                        <p className="text-white/50 text-[10px] mt-0.5">{label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Charts Row 1 */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                                <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><span className="w-1 h-5 bg-violet-500 rounded-full"></span> Metode Pembayaran</h3>
                                {orders.length > 0 ? (
                                    <div className="h-52 flex items-center justify-center">
                                        <Doughnut data={{ labels: ['Tunai','QRIS','Transfer'], datasets: [{ data: [orders.filter(o=>o.paymentMethod==='cash').length, orders.filter(o=>o.paymentMethod==='qris').length, orders.filter(o=>o.paymentMethod==='transfer').length], backgroundColor: ['#1A4D3E','#D4AF37','#6366F1'], borderWidth: 2 }] }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
                                    </div>
                                ) : <p className="text-gray-400 text-center py-16 text-sm">Belum ada data.</p>}
                            </div>
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                                <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><span className="w-1 h-5 bg-amber-500 rounded-full"></span> Tipe Pesanan</h3>
                                {orders.length > 0 ? (
                                    <div className="h-52 flex items-center justify-center">
                                        <Doughnut data={{ labels: ['Dine-in','Take Away','Lainnya'], datasets: [{ data: [orders.filter(o=>o.orderType==='dine-in').length, orders.filter(o=>o.orderType==='take-away').length, orders.filter(o=>!o.orderType).length], backgroundColor: ['#1A4D3E','#D4AF37','#9333EA'], borderWidth: 2 }] }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
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

                        {/* Charts Row 2 - Variant Analysis */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                            <h3 className="font-bold text-gray-700 mb-5 flex items-center gap-2"><span className="w-1 h-5 bg-green-500 rounded-full"></span> Analisis Varian Favorit Pelanggan</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Size */}
                                <div>
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">📏 Ukuran Cup</p>
                                    {variantAnalysis.size.size > 0 ? (
                                        <div className="h-40 flex items-center justify-center">
                                            <Doughnut data={{ labels: Array.from(variantAnalysis.size.keys()), datasets: [{ data: Array.from(variantAnalysis.size.values()), backgroundColor: ['#1A4D3E','#D4AF37'], borderWidth: 2 }] }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
                                        </div>
                                    ) : <p className="text-gray-400 text-xs text-center py-8">Data muncul setelah ada order dengan varian.</p>}
                                </div>
                                {/* Sugar */}
                                <div>
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">🍯 Level Gula</p>
                                    {variantAnalysis.sugar.size > 0 ? (
                                        <div className="space-y-2">
                                            {Array.from(variantAnalysis.sugar.entries()).sort((a,b)=>b[1]-a[1]).map(([sugar, count]) => {
                                                const total = Array.from(variantAnalysis.sugar.values()).reduce((s,c)=>s+c,0);
                                                const pct = total ? Math.round(count/total*100) : 0;
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
                                {/* Temperature */}
                                <div>
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">🌡️ Suhu Minuman</p>
                                    {variantAnalysis.temp.size > 0 ? (
                                        <div className="h-40 flex items-center justify-center">
                                            <Doughnut data={{ labels: Array.from(variantAnalysis.temp.keys()).map(t => t==='panas' ? '☕ Panas' : '🧊 Es'), datasets: [{ data: Array.from(variantAnalysis.temp.values()), backgroundColor: ['#EF4444','#3B82F6'], borderWidth: 2 }] }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
                                        </div>
                                    ) : <p className="text-gray-400 text-xs text-center py-8">Belum ada data varian suhu.</p>}
                                </div>
                            </div>
                        </div>

                        {/* Revenue Table by Day */}
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
                                            const prev = dailySales[idx-1];
                                            const growth = prev && prev.total > 0 ? ((day.total - prev.total) / prev.total * 100) : 0;
                                            return (
                                                <tr key={day.date} className="hover:bg-gray-50 transition">
                                                    <td className="p-4 font-bold text-gray-800">{day.date}</td>
                                                    <td className="p-4 text-right font-mono text-gray-700">{day.count}</td>
                                                    <td className="p-4 text-right font-black text-forest">Rp {day.total.toLocaleString('id-ID')}</td>
                                                    <td className="p-4 text-right text-sm text-gray-600">Rp {day.count ? Math.round(day.total/day.count).toLocaleString('id-ID') : '0'}</td>
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
                                        onChange={e => setOrderSortMode(e.target.value as any)}
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

                                            return (
                                                <tr key={order.id} className="hover:bg-amber-50/30 transition bg-white">
                                                    <td className="p-4">
                                                        <div className="font-mono font-bold text-gray-800 text-xs">#{order.id.slice(0, 6).toUpperCase()}</div>
                                                        <div className="flex items-center gap-1 mt-1">
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
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="font-bold text-gray-800 text-sm">{order.customerName || "Pelanggan Tamu"}</div>
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
                                                                            📝 "{i.note}"
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
                                                            <div className="text-[10px] text-red-500 font-semibold">-Rp {order.discount.toLocaleString('id-ID')}</div>
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
                                                    {orderSearch || orderStatusFilter !== 'all'
                                                        ? 'Tidak ada pesanan yang sesuai dengan filter pencarian.'
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
                                        {orderSearch || orderStatusFilter !== 'all' ? 'Tidak ada pesanan yang sesuai filter.' : 'Belum ada pesanan masuk.'}
                                    </p>
                                )}
                                {filteredOrders.map(order => {
                                    const orderTime = new Date(order.date);
                                    const diffMins = Math.floor((Date.now() - orderTime.getTime()) / 60000);
                                    const isVeryRecent = diffMins < 5;

                                    return (
                                        <div key={order.id} className="p-4 space-y-3 bg-white">
                                            <div className="flex justify-between items-start gap-2">
                                                <div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-bold text-gray-800 text-sm">{order.customerName || "Pelanggan Tamu"}</span>
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
                                                        {i.note && <span className="text-[10px] text-blue-600 italic">"{i.note}"</span>}
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="flex justify-between items-center pt-1 border-t border-gray-50">
                                                <div>
                                                    <span className="text-xs text-gray-400 block font-mono uppercase">{order.paymentMethod || 'TUNAI'}</span>
                                                    <span className="font-black text-forest text-sm">Rp {order.total.toLocaleString('id-ID')}</span>
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

                {/* === PRODUCTS TAB === */}
                {activeTab === 'products' && (
                    <div className="animate-fade-in">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-4 md:p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <div>
                                    <h2 className="text-lg md:text-xl font-bold font-serif">Manajemen Inventaris</h2>
                                    <p className="text-sm text-gray-400 mt-0.5">Kelola menu, harga, dan stok barang.</p>
                                </div>
                                {user.role === 'admin' && (
                                    <button onClick={openAddModal} className="px-3 md:px-4 py-2 bg-forest text-gold rounded-lg font-bold flex items-center gap-2 hover:bg-forest-light shadow transition hover:-translate-y-1 text-sm">
                                        <Plus size={16} /> <span className="hidden sm:inline">Tambah</span> Menu
                                    </button>
                                )}
                            </div>

                            {/* Desktop Table */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold tracking-wider">
                                        <tr>
                                            <th className="p-4 w-20">Gambar</th>
                                            <th className="p-4">Nama Produk</th>
                                            <th className="p-4">Kategori</th>
                                            <th className="p-4">Stok</th>
                                            <th className="p-4 text-right">Harga</th>
                                            {user.role === 'admin' && <th className="p-4 text-right">Aksi</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {products.map(item => (
                                            <tr key={item.id} className="hover:bg-blue-50/50 transition bg-white">
                                                <td className="p-4">
                                                    <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden border border-gray-200 relative">
                                                        {item.image ? (
                                                            <Image src={item.image} alt={item.name} fill className="object-cover" />
                                                        ) : <ImageIcon className="m-auto text-gray-300 mt-3" />}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <p className="font-bold text-gray-800">{item.name}</p>
                                                    <p className="text-xs text-gray-400 line-clamp-1">{item.description}</p>
                                                </td>
                                                <td className="p-4">
                                                    <span className="px-2 py-1 text-xs rounded border border-gray-200 bg-gray-50 font-bold text-gray-600 uppercase">
                                                        {item.category}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`font-mono font-bold text-lg ${item.stock === 0 ? 'text-red-500' :
                                                            item.stock <= (item.minStockThreshold || 5) ? 'text-yellow-600' : 'text-green-600'
                                                            }`}>
                                                            {item.stock}
                                                        </span>
                                                        {item.stock <= (item.minStockThreshold || 5) && (
                                                            <AlertTriangle size={16} className={`text-yellow-500 ${item.stock === 0 && 'hidden'}`} />
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-right font-mono font-bold text-forest">
                                                    Rp {item.price.toLocaleString('id-ID')}
                                                </td>
                                                {user.role === 'admin' && (
                                                    <td className="p-4 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <button onClick={() => openEditModal(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded transition"><Edit size={16} /></button>
                                                            <button onClick={() => handleDelete(item.id, item.name)} className="p-2 text-red-600 hover:bg-red-50 rounded transition"><Trash size={16} /></button>
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Cards */}
                            <div className="md:hidden divide-y divide-gray-100">
                                {products.map(item => (
                                    <div key={item.id} className="p-4 flex gap-3 items-start">
                                        <div className="w-14 h-14 flex-shrink-0 rounded-xl bg-gray-100 overflow-hidden border border-gray-200 relative">
                                            {item.image ? (
                                                <Image src={item.image} alt={item.name} fill className="object-cover" />
                                            ) : <ImageIcon className="m-auto text-gray-300 mt-4" size={20} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start gap-2">
                                                <p className="font-bold text-gray-800 text-sm leading-tight">{item.name}</p>
                                                {user.role === 'admin' && (
                                                    <div className="flex gap-1 flex-shrink-0">
                                                        <button onClick={() => openEditModal(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition"><Edit size={14} /></button>
                                                        <button onClick={() => handleDelete(item.id, item.name)} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"><Trash size={14} /></button>
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{item.description}</p>
                                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                <span className="px-1.5 py-0.5 text-[10px] rounded border border-gray-200 bg-gray-50 font-bold text-gray-600 uppercase">{item.category}</span>
                                                <div className="flex items-center gap-1">
                                                    <span className={`font-mono font-bold text-sm ${item.stock === 0 ? 'text-red-500' : item.stock <= (item.minStockThreshold || 5) ? 'text-yellow-600' : 'text-green-600'}`}>
                                                        {item.stock} cup
                                                    </span>
                                                    {item.stock <= (item.minStockThreshold || 5) && item.stock > 0 && (
                                                        <AlertTriangle size={12} className="text-yellow-500" />
                                                    )}
                                                </div>
                                                <span className="font-mono font-bold text-sm text-forest ml-auto">Rp {item.price.toLocaleString('id-ID')}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* === LOGS TAB === */}
                {activeTab === 'logs' && user.role === 'admin' && (
                    <div className="animate-fade-in bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><History size={22} /></div>
                            <div>
                                <h2 className="text-lg md:text-xl font-bold font-serif">Log Aktivitas</h2>
                                <p className="text-sm text-gray-500">Rekam jejak tindakan sistem.</p>
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
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-fade-in space-y-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-4">
                            <div>
                                <h2 className="text-lg md:text-xl font-bold font-serif">Manajemen Karyawan</h2>
                                <p className="text-sm text-gray-500">Kelola akun kasir dan hak akses login.</p>
                            </div>
                            <button
                                onClick={() => {
                                    const uName = prompt("Masukkan Username Karyawan:");
                                    if (!uName) return;
                                    const pwd = prompt("Masukkan Password Sementara:");
                                    if (!pwd) return;
                                    const nama = prompt("Nama Lengkap Karyawan:", uName);
                                    if (!nama) return;
                                    addUser({ id: nanoid(), username: uName, password: pwd, role: 'cashier', name: nama });
                                    toast.success("Karyawan kasir berhasil ditambahkan.");
                                }}
                                className="bg-forest text-gold px-4 py-2 rounded-lg font-bold text-sm hover:bg-forest-light transition flex items-center gap-2"
                            >
                                <Plus size={16} /> Tambah Kasir
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold tracking-wider">
                                    <tr>
                                        <th className="p-4 rounded-tl-lg">Nama</th>
                                        <th className="p-4">Username</th>
                                        <th className="p-4">Role</th>
                                        <th className="p-4 text-right rounded-tr-lg">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {users.map(u => (
                                        <tr key={u.id} className="hover:bg-gray-50 transition">
                                            <td className="p-4 font-bold text-gray-800">{u.name}</td>
                                            <td className="p-4 text-sm text-gray-600 font-mono">{u.username}</td>
                                            <td className="p-4 font-bold text-xs uppercase">
                                                <span className={`px-2 py-1 rounded ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                    {u.role === 'admin' ? 'Admin' : 'Kasir'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                {u.role !== 'admin' && (
                                                    <button
                                                        onClick={() => {
                                                            if (confirm(`User "${u.name}" akan dihapus permanen. Lanjutkan?`)) {
                                                                removeUser(u.id);
                                                                addLog("DELETE_USER", `Deleted user: ${u.username}`, user.name);
                                                                toast.success(`User ${u.username} dihapus.`);
                                                            }
                                                        }}
                                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                                                    >
                                                        <Trash size={16} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ============ TAB: INVENTORY & BOM ============ */}
                {activeTab === 'inventory' && user.role === 'admin' && (
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-fade-in space-y-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-4">
                            <div>
                                <h2 className="text-lg md:text-xl font-bold font-serif">Inventaris & Bill of Materials</h2>
                                <p className="text-sm text-gray-500">Kelola stok bahan baku, lakukan stock opname berkala, dan lacak pemborosan.</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => setOpnameModalOpen(true)}
                                    className="bg-amber-600 text-white px-3.5 py-2 rounded-lg font-bold text-sm hover:bg-amber-700 transition flex items-center gap-2 shadow-sm"
                                >
                                    <ClipboardCheck size={16} /> Stock Opname Fisik
                                </button>
                                <button onClick={openAddIng} className="bg-[#0D2B20] text-amber-400 px-4 py-2 rounded-lg font-bold text-sm hover:bg-[#1a3d2e] transition flex items-center gap-2">
                                    <Plus size={16} /> Tambah Bahan
                                </button>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold tracking-wider">
                                    <tr>
                                        <th className="p-4 rounded-tl-lg">Nama Bahan</th>
                                        <th className="p-4">Satuan</th>
                                        <th className="p-4 text-right">Stok Saat Ini</th>
                                        <th className="p-4 text-right">Min. Stok</th>
                                        <th className="p-4 text-center">Status</th>
                                        <th className="p-4 text-right rounded-tr-lg">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {ingredients.map(ing => {
                                        const isLow = ing.stock <= ing.minStockThreshold;
                                        return (
                                            <tr key={ing.id} className={`hover:bg-gray-50 transition ${isLow ? 'bg-red-50' : ''}`}>
                                                <td className="p-4 font-bold text-gray-800">{ing.name}</td>
                                                <td className="p-4 text-sm text-gray-500 font-mono uppercase">{ing.unit}</td>
                                                <td className={`p-4 text-right font-black text-lg ${isLow ? 'text-red-600' : 'text-[#0D2B20]'}`}>
                                                    {ing.stock.toLocaleString('id-ID')}
                                                </td>
                                                <td className="p-4 text-right text-sm text-gray-500">{ing.minStockThreshold.toLocaleString('id-ID')}</td>
                                                <td className="p-4 text-center">
                                                    {isLow
                                                        ? <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full"><AlertTriangle size={10} /> Menipis</span>
                                                        : <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full"><CheckCircle size={10} /> Aman</span>
                                                    }
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="flex gap-2 justify-end">
                                                        <button onClick={() => openEditIng(ing)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"><Edit size={14} /></button>
                                                        <button onClick={() => { if (confirm(`Hapus bahan "${ing.name}"?`)) { deleteIngredient(ing.id); toast.success('Bahan dihapus.'); } }} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"><Trash size={14} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {ingredients.length === 0 && (
                                        <tr><td colSpan={6} className="p-8 text-center text-gray-400">Belum ada bahan baku terdaftar. Klik "Tambah Bahan".</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Riwayat Stock Opname & Penyesuaian Selisih (Waste & Shrinkage Tracker) */}
                        <div className="pt-6 border-t border-gray-100 mt-6">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
                                <div>
                                    <h3 className="font-bold text-lg font-serif flex items-center gap-2 text-forest">
                                        <ClipboardCheck size={20} className="text-amber-500" />
                                        Log Stock Opname &amp; Waste Management
                                    </h3>
                                    <p className="text-xs text-gray-500">Rekap audit fisik bahan, pelacakan selisih bahan tumpah, basi, rusak, atau salah hitung.</p>
                                </div>
                                <button
                                    onClick={() => setOpnameModalOpen(true)}
                                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 shadow-sm"
                                >
                                    <Plus size={14} /> Catat Opname Fisik
                                </button>
                            </div>

                            <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider">
                                        <tr>
                                            <th className="p-3">Waktu &amp; Tanggal</th>
                                            <th className="p-3">Bahan Baku</th>
                                            <th className="p-3 text-right">Stok Sistem</th>
                                            <th className="p-3 text-right">Fisik Nyata</th>
                                            <th className="p-3 text-right">Selisih</th>
                                            <th className="p-3 text-center">Alasan</th>
                                            <th className="p-3">Keterangan / Auditor</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {(opnameLogs || []).map(log => {
                                            const isNegative = log.difference < 0;
                                            const isZero = log.difference === 0;
                                            const reasonLabels: Record<string, { label: string; badge: string }> = {
                                                tumpah: { label: 'Tumpah / Spillage', badge: 'bg-amber-100 text-amber-800' },
                                                basi: { label: 'Basi / Kedaluwarsa', badge: 'bg-red-100 text-red-800' },
                                                rusak: { label: 'Kemasan Rusak', badge: 'bg-rose-100 text-rose-800' },
                                                koreksi_hitung: { label: 'Koreksi Hitung', badge: 'bg-blue-100 text-blue-800' },
                                                lainnya: { label: 'Lainnya', badge: 'bg-gray-100 text-gray-700' },
                                            };
                                            const rInfo = reasonLabels[log.reason] || reasonLabels.lainnya;
                                            return (
                                                <tr key={log.id} className="hover:bg-gray-50 transition">
                                                    <td className="p-3 text-gray-500 whitespace-nowrap">
                                                        {new Date(log.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}{' '}
                                                        <span className="font-mono text-gray-400">({new Date(log.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })})</span>
                                                    </td>
                                                    <td className="p-3 font-bold text-gray-800">{log.ingredientName}</td>
                                                    <td className="p-3 text-right font-mono text-gray-500">{log.systemStock.toLocaleString('id-ID')} {log.unit}</td>
                                                    <td className="p-3 text-right font-mono font-bold text-gray-800">{log.actualStock.toLocaleString('id-ID')} {log.unit}</td>
                                                    <td className={`p-3 text-right font-mono font-black ${isZero ? 'text-gray-400' : isNegative ? 'text-red-600' : 'text-green-600'}`}>
                                                        {log.difference > 0 ? `+${log.difference}` : log.difference} {log.unit}
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        <span className={`inline-block px-2 py-0.5 rounded-full font-bold text-[10px] ${rInfo.badge}`}>
                                                            {rInfo.label}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 text-gray-600 max-w-xs truncate">
                                                        {log.notes ? <span>"{log.notes}" &bull; </span> : null}
                                                        <span className="text-gray-400 font-medium">Oleh: {log.recordedBy}</span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {(!opnameLogs || opnameLogs.length === 0) && (
                                            <tr>
                                                <td colSpan={7} className="p-6 text-center text-gray-400 italic">
                                                    Belum ada riwayat stock opname fisik. Tekan "Catat Opname Fisik" untuk mencocokkan stok nyata kedai.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Suppliers */}
                        <div className="pt-6 border-t border-gray-100 mt-6">
                            <h3 className="font-bold text-lg font-serif mb-4 flex items-center gap-2">
                                <Building2 size={20} className="text-forest" />
                                Manajemen Suplier & Vendor
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {suppliers.map(sup => (
                                    <div key={sup.id} className="border border-gray-200 rounded-xl p-4 bg-gray-50 flex flex-col gap-2 relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-forest"></div>
                                        <div className="flex justify-between items-start pl-2">
                                            <div>
                                                <p className="font-bold text-gray-800">{sup.name}</p>
                                                <p className="text-xs text-gray-500 font-mono flex items-center gap-1 mt-1">📞 {sup.phone} ({sup.contactPerson})</p>
                                            </div>
                                            <span className="text-xs font-bold text-gray-500 bg-gray-200 px-2 py-1 rounded">Suplier</span>
                                        </div>
                                        <p className="text-xs text-gray-600 pl-2 mt-1 line-clamp-1">{sup.address}</p>
                                        <div className="mt-2 pl-2 flex gap-1 flex-wrap">
                                            {sup.itemsSupplied.map(itemId => {
                                                const ing = ingredients.find(i => i.id === itemId);
                                                return ing ? <span key={itemId} className="text-[10px] bg-white border border-gray-200 px-1.5 py-0.5 rounded shadow-sm font-bold text-gray-600">{ing.name}</span> : null;
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ============ TAB: PROMO ENGINE ============ */}
                {activeTab === 'promos' && user.role === 'admin' && (
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-fade-in space-y-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-4">
                            <div>
                                <h2 className="text-lg md:text-xl font-bold font-serif">Promo Engine</h2>
                                <p className="text-sm text-gray-500">Kelola diskon otomatis. Promo aktif akan diterapkan saat checkout kasir.</p>
                            </div>
                            <button onClick={openAddPromo} className="bg-amber-500 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-amber-600 transition flex items-center gap-2">
                                <Plus size={16} /> Buat Promo
                            </button>
                        </div>
                        {promos.length === 0 && (
                            <div className="text-center py-12 text-gray-400">
                                <Ticket size={40} className="mx-auto mb-3 opacity-30" />
                                <p>Belum ada promo. Klik &quot;Buat Promo&quot; untuk memulai.</p>
                            </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {promos.map(promo => (
                                <div key={promo.id} className={`p-4 border-2 rounded-xl ${promo.isActive ? 'border-amber-400 bg-amber-50' : 'border-gray-200 bg-gray-50'}`}>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold text-gray-800 text-base">{promo.name}</h3>
                                            <p className="text-xs text-gray-500 uppercase font-mono mt-0.5">
                                                {promo.type === 'percent' ? '📉 Diskon Persen' : promo.type === 'amount' ? '💵 Diskon Nominal' : '⏰ Happy Hour'}
                                            </p>
                                        </div>
                                        <div className="flex gap-1.5">
                                            <button onClick={() => togglePromo(promo.id)} className={`text-xs font-bold px-2.5 py-1 rounded-full transition ${promo.isActive ? 'bg-amber-400 text-amber-900 hover:bg-amber-500' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>
                                                {promo.isActive ? 'Aktif' : 'Nonaktif'}
                                            </button>
                                            <button onClick={() => openEditPromo(promo)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition"><Edit size={14} /></button>
                                            <button onClick={() => { if (confirm(`Hapus promo "${promo.name}"?`)) { deletePromo(promo.id); toast.success('Promo dihapus.'); } }} className="p-1.5 text-red-500 hover:bg-red-100 rounded-lg transition"><Trash size={14} /></button>
                                        </div>
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-gray-200 text-sm space-y-1.5">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Nilai Diskon</span>
                                            <span className="font-black text-amber-600 text-base">{promo.type === 'percent' ? `${promo.value}%` : `Rp ${promo.value.toLocaleString('id-ID')}`}</span>
                                        </div>
                                        {promo.type === 'happy_hour' && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Jam Berlaku</span>
                                                <span className="font-mono font-bold">{String(promo.startHour).padStart(2,'0')}:00 – {String(promo.endHour).padStart(2,'0')}:00</span>
                                            </div>
                                        )}
                                        {promo.minSubtotal && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Min. Belanja</span>
                                                <span>Rp {promo.minSubtotal.toLocaleString('id-ID')}</span>
                                            </div>
                                        )}
                                        {promo.description && <p className="text-xs italic text-gray-400 pt-1">{promo.description}</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ============ TAB: LOYALTY ============ */}
                {activeTab === 'loyalty' && user.role === 'admin' && (
                <div className="animate-fade-in space-y-6">
                <div className="bg-gradient-to-br from-violet-900 to-purple-900 rounded-2xl p-6 text-white shadow-xl mb-6">
                        <div className="flex items-center gap-3 mb-4">
                            <Sparkles size={24} className="text-violet-300" />
                            <div>
                                <h2 className="text-lg font-black">AI Smart Upsell & CRM</h2>
                                <p className="text-violet-300 text-sm">Gemini AI memberi saran personal berdasarkan riwayat pelanggan.</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="tel"
                                placeholder="Nomor HP pelanggan..."
                                value={upsellPhone}
                                onChange={e => setUpsellPhone(e.target.value)}
                                className="flex-1 px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 text-sm focus:outline-none focus:border-violet-300"
                            />
                            <button
                                onClick={() => handleUpsell(upsellPhone)}
                                disabled={isUpselling || !upsellPhone.trim()}
                                className="px-4 py-2 bg-violet-400 text-white font-bold rounded-xl text-sm hover:bg-violet-300 transition disabled:opacity-50 flex items-center gap-2"
                            >
                                {isUpselling ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                Analisis
                            </button>
                        </div>
                        {upsellSuggestion && (
                            <div className="mt-4 bg-white/10 border border-white/20 rounded-xl p-4">
                                <p className="text-xs font-bold text-violet-300 mb-1">Saran Kasir dari AI:</p>
                                <p className="text-sm text-white leading-relaxed">{upsellSuggestion}</p>
                            </div>
                        )}
                    </div>
                                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-fade-in space-y-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-4">
                            <div>
                                <h2 className="text-lg md:text-xl font-bold font-serif">Loyalty Pelanggan</h2>
                                <p className="text-sm text-gray-500">Daftar member dan akumulasi poin (1 poin = Rp100).</p>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold tracking-wider">
                                    <tr>
                                        <th className="p-4 rounded-tl-lg">Nama</th>
                                        <th className="p-4">No. HP</th>
                                        <th className="p-4 text-right">Poin</th>
                                        <th className="p-4 text-right rounded-tr-lg">Total Belanja</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {customers.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="p-8 text-center text-gray-400">Belum ada pelanggan terdaftar.</td>
                                        </tr>
                                    )}
                                    {customers.sort((a, b) => b.points - a.points).map(c => (
                                        <tr key={c.id} className="hover:bg-gray-50 transition">
                                            <td className="p-4 font-bold text-gray-800">{c.name}</td>
                                            <td className="p-4 text-sm text-gray-600 font-mono">{c.phone}</td>
                                            <td className="p-4 text-right font-bold text-amber-600">{c.points}</td>
                                            <td className="p-4 text-right text-sm font-mono text-green-700">Rp {c.totalSpent.toLocaleString('id-ID')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                )}
            </div>

            {/* ============ TAB: MULTI CABANG ============ */}
            {activeTab === 'cabang' && user.role === 'admin' && (
                <div className="animate-fade-in space-y-6">
                    <div className="bg-gradient-to-br from-blue-900 to-indigo-900 rounded-2xl p-6 text-white shadow-xl">
                        <div className="flex items-center gap-3 mb-2">
                            <Building2 size={28} className="text-blue-300" />
                            <div>
                                <h2 className="text-xl font-black">Manajemen Multi-Cabang</h2>
                                <p className="text-blue-300 text-sm">Pantau dan kelola semua cabang Teh Raja dari satu dasbor terpusat.</p>
                            </div>
                        </div>
                    </div>

                    {/* Branch Overview Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[
                            { id: 'main', name: 'Cabang Utama', location: 'Jl. Raya Sitanggal No. 1', status: 'open', color: 'green' },
                            { id: 'branch-2', name: 'Cabang Kota', location: 'Jl. Ahmad Yani No. 45', status: 'coming-soon', color: 'gray' },
                            { id: 'branch-3', name: 'Cabang Mall', location: 'City Walk Lt. 2', status: 'coming-soon', color: 'gray' },
                        ].map(branch => (
                            <div key={branch.id} className={`bg-white rounded-2xl shadow-sm p-5 border-2 ${branch.status === 'open' ? 'border-green-200' : 'border-dashed border-gray-200 opacity-60'}`}>
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <p className="font-black text-gray-800">{branch.name}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">{branch.location}</p>
                                    </div>
                                    <span className={`text-[10px] font-black px-2 py-1 rounded-full ${branch.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                        {branch.status === 'open' ? 'AKTIF' : 'SEGERA'}
                                    </span>
                                </div>
                                {branch.status === 'open' ? (
                                    <div className="grid grid-cols-2 gap-2 mt-3">
                                        <div className="bg-green-50 rounded-xl p-3 text-center">
                                            <p className="text-xl font-black text-green-700">{orders.length}</p>
                                            <p className="text-[11px] text-green-600">Total Order</p>
                                        </div>
                                        <div className="bg-amber-50 rounded-xl p-3 text-center">
                                            <p className="text-sm font-black text-amber-700">Rp{Math.round(orders.reduce((s, o) => s + o.total, 0)/1000)}rb</p>
                                            <p className="text-[11px] text-amber-600">Omzet</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mt-3 text-center py-4 bg-gray-50 rounded-xl">
                                        <p className="text-xs text-gray-400 font-medium">Belum aktif</p>
                                        <p className="text-[11px] text-blue-400 mt-1">Hubungi tim teknis untuk aktivasi</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Active Branch Selector */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <h3 className="font-bold text-gray-800 mb-1 flex items-center gap-2">
                            <Building2 size={18} className="text-blue-500" /> Set Cabang Aktif Perangkat Ini
                        </h3>
                        <p className="text-sm text-gray-500 mb-4">Setiap transaksi dan sesi shift di perangkat ini akan dilabeli dengan ID cabang yang dipilih.</p>
                        <div className="flex gap-2 flex-wrap">
                            {[
                                { id: 'main', label: 'Cabang Utama' },
                                { id: 'branch-2', label: 'Cabang Kota' },
                                { id: 'branch-3', label: 'Cabang Mall' },
                            ].map(b => (
                                <button
                                    key={b.id}
                                    onClick={() => {
                                        (useSalesStore as any).getState().setBranch(b.id, b.label);
                                        toast.success(`Cabang aktif: ${b.label}`);
                                    }}
                                    className="px-4 py-2 rounded-xl text-sm font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition"
                                >
                                    Aktifkan {b.label}
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-gray-400 mt-3">* Perubahan ini tersimpan di perangkat dan akan diterapkan pada shift berikutnya.</p>
                    </div>

                    {/* Firebase Path Info */}
                    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
                        <h3 className="font-bold text-gray-700 mb-2 text-sm">Struktur Data Firebase (Multi-Branch)</h3>
                        <pre className="text-xs text-gray-500 bg-white rounded-xl p-4 border overflow-x-auto">
{`firebase-rtdb/
  branches/
    main/
      orders/ { ...sesi kasir cabang utama }
      sessions/ { ...shift }
      ingredients/ { ...stok BOM }
    branch-2/
      orders/ { ...sesi kasir cabang 2 }
      sessions/ { ... }
  products/  ← Katalog produk dibagikan lintas cabang`}
                        </pre>
                        <p className="text-[11px] text-gray-400 mt-2">* Arsitektur ini sudah dipersiapkan. Migrasi penuh ke branch-isolated data memerlukan re-deployment.</p>
                    </div>
                </div>
            )}


            {/* ============ MODAL FORM ============ */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white text-forest rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl animate-scale-in">
                        <div className="p-4 sm:p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                            <h3 className="text-lg sm:text-xl font-bold font-serif">{editingId ? 'Edit Produk' : 'Tambah Produk Baru'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
                        </div>
                        <div className="p-4 sm:p-6 space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-600">Nama Produk *</label>
                                    <input
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-forest text-sm text-gray-900"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-600">Harga (Rp)</label>
                                    <input
                                        type="number"
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-forest text-sm text-gray-900"
                                        value={formData.price}
                                        onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-yellow-800">Stok Saat Ini (Cup)</label>
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
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-forest h-24 text-sm text-gray-900"
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
                                        onChange={e => setFormData({ ...formData, category: e.target.value as 'signature' | 'classic' | 'milk' | 'fruit' | 'snack' | 'food' })}
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
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
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
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
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
                                <select value={promoForm.type} onChange={e => setPromoForm(f => ({ ...f, type: e.target.value as 'percent' | 'amount' | 'happy_hour' }))}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 transition bg-white">
                                    <option value="percent">Diskon Persen (%)</option>
                                    <option value="amount">Diskon Nominal (Rp)</option>
                                    <option value="happy_hour">Happy Hour (Jam Tertentu)</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-600 mb-1 block">
                                    Nilai Diskon {promoForm.type === 'percent' ? '(%)' : '(Rp)'}
                                </label>
                                <input type="number" min={0} value={promoForm.value}
                                    onChange={e => setPromoForm(f => ({ ...f, value: Number(e.target.value) }))}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 transition" />
                            </div>
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
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-100 animate-scale-up">
                        <div className="bg-[#0D2B20] text-cream px-6 py-4 flex justify-between items-center border-b border-gold/20">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-gold/20 rounded-lg text-gold">
                                    <Wallet size={18} />
                                </div>
                                <div>
                                    <h3 className="font-serif font-bold text-gold text-base">Catat Pengeluaran Toko</h3>
                                    <p className="text-xs text-cream/70">Petty Cash &amp; Operasional Kedai</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setExpenseModalOpen(false)}
                                className="text-cream/70 hover:text-white p-1 hover:bg-white/10 rounded-lg transition"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveExpense} className="p-6 space-y-4">
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

                            <div className="grid grid-cols-2 gap-3">
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
                                        ? <span><strong>Kas Laci:</strong> Pengeluaran ini otomatis memotong total uang tunai yang wajib disetor kasir saat tutup shift.</span>
                                        : <span><strong>Rekening Toko:</strong> Pengeluaran dicatat ke Laporan Laba Rugi tanpa mengurangi saldo fisik kas laci kasir.</span>
                                    }
                                </div>
                            </div>

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
                                    className="flex-1 py-2.5 bg-[#0D2B20] text-amber-400 rounded-xl font-bold text-sm hover:bg-[#1a3d2e] transition flex items-center justify-center gap-2 shadow-md"
                                >
                                    <Save size={15} /> Simpan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ============ MODAL: STOCK OPNAME FISIK ============ */}
            {opnameModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-100 animate-scale-up">
                        <div className="bg-amber-600 text-white px-6 py-4 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-white/20 rounded-lg">
                                    <ClipboardCheck size={18} />
                                </div>
                                <div>
                                    <h3 className="font-serif font-bold text-base">Input Stock Opname Fisik</h3>
                                    <p className="text-xs text-amber-100">Penghitungan fisik riil bahan &amp; penyesuaian selisih</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setOpnameModalOpen(false)}
                                className="text-white/80 hover:text-white p-1 hover:bg-white/10 rounded-lg transition"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveOpname} className="p-6 space-y-4">
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
                                    {ingredients.map(ing => (
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
                                                onChange={e => setOpnameForm(f => ({ ...f, reason: e.target.value as any }))}
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

            {/* Modal Detail & Cetak Struk Pesanan */}
            {viewReceiptOrder && (
                <ReceiptModal
                    order={viewReceiptOrder}
                    onClose={() => setViewReceiptOrder(null)}
                />
            )}
        </div>
    );
}

// ====== Helper Sub-components ======

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