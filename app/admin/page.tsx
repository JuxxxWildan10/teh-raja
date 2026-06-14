"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useProductStore, useSalesStore, useAuthStore, usePromoStore, useCustomerStore, useInventoryStore, ExtendedProduct, Order } from "@/lib/store";
import { useToast } from "@/components/Toast";
import ConfirmModal from "@/components/ConfirmModal";
import ShiftSummaryModal from "@/components/ShiftSummaryModal";
import { Line, Bar } from "react-chartjs-2";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
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
    Menu, Search, Filter, Sparkles, BrainCircuit, RefreshCw, Ticket, Users as UsersIcon, Box
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { nanoid } from "nanoid";
import ReportGenerator from "@/components/ReportGenerator";

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
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
    const { getDailySales, getProductPopularity, orders, logs, addLog, resetData, updateOrderStatus, sessions, closeStore } = useSalesStore();
    const [isClient, setIsClient] = useState(false);

    const { promos, addPromo, updatePromo, deletePromo, togglePromo } = usePromoStore();
    const { customers } = useCustomerStore();
    const { ingredients, addIngredient, updateIngredient, deleteIngredient } = useInventoryStore();

    // ── Inventory CRUD State ──────────────────────────────────────
    const [ingModalOpen, setIngModalOpen] = useState(false);
    const [editingIngId, setEditingIngId] = useState<string | null>(null);
    const [ingForm, setIngForm] = useState({ name: '', stock: 0, unit: 'ml' as 'ml' | 'gram' | 'pcs', minStockThreshold: 100 });

    // ── Promo CRUD State ──────────────────────────────────────────
    const [promoModalOpen, setPromoModalOpen] = useState(false);
    const [editingPromoId, setEditingPromoId] = useState<string | null>(null);
    const [promoForm, setPromoForm] = useState({ name: '', type: 'percent' as 'percent' | 'amount' | 'happy_hour', value: 10, minSubtotal: '', startHour: 9, endHour: 17, description: '', isActive: true });

    // UI State
    const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'logs' | 'orders' | 'karyawan' | 'ai-forecast' | 'promos' | 'loyalty' | 'inventory'>('dashboard');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Confirm modals
    const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
    const [confirmReset, setConfirmReset] = useState(false);
    const [confirmCancelOrder, setConfirmCancelOrder] = useState<string | null>(null);

    // Orders filter
    const [orderSearch, setOrderSearch] = useState('');
    const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | Order['status']>('all');

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

    const handleTabChange = (tab: 'dashboard' | 'products' | 'logs' | 'orders' | 'karyawan' | 'ai-forecast' | 'promos' | 'loyalty' | 'inventory') => {
        setActiveTab(tab);
        setIsMobileMenuOpen(false);
    };

    // AI Forecast State
    const [aiForecastText, setAiForecastText] = useState("");
    const [isForecasting, setIsForecasting] = useState(false);

    const handleAIForecast = async () => {
        setIsForecasting(true);
        setAiForecastText("");
        try {
            const res = await fetch('/api/ai/forecast', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orders: orders.slice(-100),
                    products: products.map(p => ({ id: p.id, name: p.name, stock: p.stock, category: p.category }))
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

    // Filtered orders
    const filteredOrders = useMemo(() => {
        return orders.slice().reverse().filter(order => {
            const matchStatus = orderStatusFilter === 'all' || order.status === orderStatusFilter;
            const q = orderSearch.toLowerCase();
            const matchSearch = !q
                || (order.customerName || '').toLowerCase().includes(q)
                || order.id.toLowerCase().includes(q)
                || order.items.some(i => i.name.toLowerCase().includes(q));
            return matchStatus && matchSearch;
        });
    }, [orders, orderStatusFilter, orderSearch]);

    // Charts Data
    const dailySales = getDailySales();
    const popularity = getProductPopularity();

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

    const pendingCount = orders.filter(o => o.status === 'pending').length;
    const tabs = [
        { id: 'dashboard' as const, label: 'Dashboard' },
        { id: 'products' as const, label: 'Menu & Stok' },
        ...(user.role === 'admin' ? [{ id: 'inventory' as const, label: 'Inventaris & BOM', icon: <Box size={18} /> }] : []),
        { id: 'orders' as const, label: 'Pesanan', badge: pendingCount },
        ...(user.role === 'admin' ? [{ id: 'promos' as const, label: 'Promo Engine', icon: <Ticket size={18} /> }] : []),
        ...(user.role === 'admin' ? [{ id: 'loyalty' as const, label: 'Loyalty Pelanggan', icon: <UsersIcon size={18} /> }] : []),
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
                            {tab.badge && tab.badge > 0 && (
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
                                {tab.badge && tab.badge > 0 && (
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
                            {tab.badge && tab.badge > 0 && (
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
                                <ReportGenerator orders={orders} />
                            </div>
                        </div>

                        {/* KPI Cards */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                { label: 'Total Order', value: orders.length, color: 'blue', suffix: '' },
                                { label: 'Selesai', value: orders.filter(o => o.status === 'completed').length, color: 'green', suffix: '' },
                                { label: 'Pending', value: pendingCount, color: 'yellow', suffix: '' },
                                { label: 'Omset Hari Ini', value: orders.filter(o => new Date(o.date).toDateString() === new Date().toDateString()).reduce((s, o) => s + o.total, 0), color: 'amber', isRp: true, suffix: '' },
                            ].map(({ label, value, color, isRp }) => (
                                <div key={label} className={`bg-white rounded-xl p-4 border border-gray-100 shadow-sm`}>
                                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{label}</p>
                                    <p className={`text-2xl font-black mt-1 ${color === 'green' ? 'text-green-600' : color === 'yellow' ? 'text-yellow-600' : color === 'amber' ? 'text-amber-600' : 'text-blue-600'}`}>
                                        {isRp ? `Rp ${(value as number).toLocaleString('id-ID')}` : value}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* Charts */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
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

                {/* === ORDERS TAB === */}
                {activeTab === 'orders' && (
                    <div className="animate-fade-in">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-4 md:p-6 border-b border-gray-100 bg-gray-50/50">
                                <h2 className="text-lg md:text-xl font-bold font-serif">Daftar Pesanan Masuk</h2>
                                <p className="text-sm text-gray-400 mt-0.5">Pantau dan kelola pesanan pelanggan.</p>
                            </div>

                            {/* Filter Bar */}
                            <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
                                <div className="relative flex-1">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Cari nama pelanggan, ID order, atau menu..."
                                        value={orderSearch}
                                        onChange={e => setOrderSearch(e.target.value)}
                                        className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-forest transition bg-gray-50"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <Filter size={14} className="text-gray-400 flex-shrink-0" />
                                    <select
                                        value={orderStatusFilter}
                                        onChange={e => setOrderStatusFilter(e.target.value as typeof orderStatusFilter)}
                                        className="border border-gray-200 rounded-lg text-sm text-gray-700 px-3 py-2 focus:outline-none focus:border-forest bg-gray-50 transition"
                                    >
                                        <option value="all">Semua Status</option>
                                        <option value="pending">Pending</option>
                                        <option value="processing">Processing</option>
                                        <option value="completed">Selesai</option>
                                        <option value="cancelled">Dibatalkan</option>
                                    </select>
                                </div>
                            </div>

                            <p className="px-4 py-2 text-xs text-gray-400">{filteredOrders.length} order ditemukan</p>

                            {/* Desktop Table */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold tracking-wider">
                                        <tr>
                                            <th className="p-4">Order ID</th>
                                            <th className="p-4">Waktu</th>
                                            <th className="p-4">Pelanggan</th>
                                            <th className="p-4">Menu</th>
                                            <th className="p-4">Total</th>
                                            <th className="p-4">Status</th>
                                            <th className="p-4 text-right">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredOrders.map(order => (
                                            <tr key={order.id} className="hover:bg-blue-50/50 transition bg-white">
                                                <td className="p-4 font-mono text-xs text-gray-500">#{order.id.slice(0, 6)}</td>
                                                <td className="p-4 text-sm">
                                                    {new Date(order.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                </td>
                                                <td className="p-4 font-bold text-gray-800">{order.customerName || "Guest"}</td>
                                                <td className="p-4 text-sm text-gray-600 max-w-xs">
                                                    {order.items.map((i, idx) => (
                                                        <div key={idx} className="mb-1 border-b border-gray-50 last:border-0 pb-1">
                                                            <span className="font-bold text-gray-700">{i.quantity}x {i.name}</span>
                                                            {i.note && (
                                                                <div className="text-xs text-blue-600 italic flex items-center gap-1">
                                                                    📝 {i.note}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </td>
                                                <td className="p-4 font-bold text-forest">
                                                    Rp {order.total.toLocaleString('id-ID')}
                                                    {order.discount && order.discount > 0 && (
                                                        <div className="text-xs text-red-500 font-normal">-Rp {order.discount.toLocaleString('id-ID')}</div>
                                                    )}
                                                </td>
                                                <td className="p-4">
                                                    <OrderStatusBadge status={order.status} />
                                                </td>
                                                <td className="p-4 text-right">
                                                    <OrderActions
                                                        order={order}
                                                        updateOrderStatus={updateOrderStatus}
                                                        addLog={addLog}
                                                        userName={user?.name || "Admin"}
                                                        onCancel={() => setConfirmCancelOrder(order.id)}
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredOrders.length === 0 && (
                                            <tr>
                                                <td colSpan={7} className="p-8 text-center text-gray-400 italic">
                                                    {orderSearch || orderStatusFilter !== 'all' ? 'Tidak ada order yang sesuai filter.' : 'Belum ada pesanan masuk.'}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Cards */}
                            <div className="md:hidden divide-y divide-gray-100">
                                {filteredOrders.length === 0 && (
                                    <p className="p-8 text-center text-gray-400 italic text-sm">
                                        {orderSearch || orderStatusFilter !== 'all' ? 'Tidak ada order yang sesuai filter.' : 'Belum ada pesanan masuk.'}
                                    </p>
                                )}
                                {filteredOrders.map(order => (
                                    <div key={order.id} className="p-4 space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-bold text-gray-800">{order.customerName || "Guest"}</p>
                                                <p className="text-xs text-gray-400 font-mono mt-0.5">
                                                    #{order.id.slice(0, 6)} · {new Date(order.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                            <OrderStatusBadge status={order.status} />
                                        </div>
                                        <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                                            {order.items.map((i, idx) => (
                                                <div key={idx}>
                                                    <span className="text-sm font-medium text-gray-700">{i.quantity}x {i.name}</span>
                                                    {i.note && <div className="text-xs text-blue-600 italic">📝 {i.note}</div>}
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <span className="font-bold text-forest">Rp {order.total.toLocaleString('id-ID')}</span>
                                                {order.discount && order.discount > 0 && (
                                                    <span className="text-xs text-red-500 ml-1">(-Rp {order.discount.toLocaleString('id-ID')})</span>
                                                )}
                                            </div>
                                            <OrderActions
                                                order={order}
                                                updateOrderStatus={updateOrderStatus}
                                                addLog={addLog}
                                                userName={user?.name || "Admin"}
                                                onCancel={() => setConfirmCancelOrder(order.id)}
                                            />
                                        </div>
                                    </div>
                                ))}
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
                    <div className="animate-fade-in space-y-6">
                        {/* Header */}
                        <div className="bg-gradient-to-br from-[#0D2B20] to-[#1a4433] rounded-2xl p-6 text-white shadow-xl">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-amber-400 rounded-xl">
                                        <BrainCircuit size={28} className="text-[#0D2B20]" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-amber-400">AI Sales Forecast</h2>
                                        <p className="text-white/60 text-sm mt-0.5">Ditenagai oleh Gemini AI · Analisis berbasis data historis</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleAIForecast}
                                    disabled={isForecasting || orders.length === 0}
                                    className="flex items-center gap-2 bg-amber-400 text-[#0D2B20] px-6 py-3 rounded-xl font-black hover:bg-amber-300 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:scale-105 active:scale-95"
                                >
                                    {isForecasting
                                        ? <><RefreshCw size={18} className="animate-spin" /> Menganalisis...</>
                                        : <><Sparkles size={18} /> Generate Laporan AI</>
                                    }
                                </button>
                            </div>

                            {/* Quick Stats */}
                            <div className="grid grid-cols-3 gap-3 mt-5">
                                {[
                                    { label: 'Total Order Dianalisis', value: orders.length },
                                    { label: 'Produk dalam Menu', value: products.length },
                                    { label: 'Order Hari Ini', value: orders.filter(o => new Date(o.date).toDateString() === new Date().toDateString()).length },
                                ].map(({ label, value }) => (
                                    <div key={label} className="bg-white/10 border border-white/10 rounded-xl p-3 text-center">
                                        <p className="text-2xl font-black text-amber-400">{value}</p>
                                        <p className="text-white/50 text-[11px] mt-0.5">{label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* AI Result Output */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="p-5 border-b border-gray-100 flex items-center gap-3">
                                <Sparkles size={20} className="text-amber-500" />
                                <h3 className="font-bold text-gray-800">Hasil Analisis & Rekomendasi AI</h3>
                            </div>
                            <div className="p-6 min-h-64">
                                {!aiForecastText && !isForecasting && (
                                    <div className="flex flex-col items-center justify-center h-48 text-center text-gray-400">
                                        <BrainCircuit size={48} className="mb-3 opacity-20" />
                                        <p className="font-medium">Belum ada laporan</p>
                                        <p className="text-sm mt-1">Klik tombol "Generate Laporan AI" untuk memulai analisis.</p>
                                        {orders.length === 0 && (
                                            <p className="text-xs mt-3 text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
                                                ⚠️ Belum ada data order. Lakukan beberapa transaksi dulu di POS.
                                            </p>
                                        )}
                                    </div>
                                )}
                                {isForecasting && (
                                    <div className="flex flex-col items-center justify-center h-48 text-center">
                                        <div className="relative">
                                            <div className="w-16 h-16 rounded-full border-4 border-amber-200 border-t-amber-500 animate-spin"></div>
                                            <BrainCircuit size={20} className="absolute inset-0 m-auto text-amber-500" />
                                        </div>
                                        <p className="font-bold text-gray-700 mt-4">AI sedang menganalisis data...</p>
                                        <p className="text-sm text-gray-400 mt-1">Proses ini membutuhkan beberapa detik</p>
                                    </div>
                                )}
                                {aiForecastText && !isForecasting && (
                                    <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed">
                                        {aiForecastText}
                                    </div>
                                )}
                            </div>
                            {aiForecastText && (
                                <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                                    <p className="text-xs text-gray-400 italic">* Analisis dilakukan oleh Gemini AI. Gunakan sebagai referensi, bukan keputusan tunggal.</p>
                                    <button
                                        onClick={handleAIForecast}
                                        disabled={isForecasting}
                                        className="flex items-center gap-1.5 text-xs font-bold text-[#0D2B20] hover:underline"
                                    >
                                        <RefreshCw size={12} /> Refresh
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
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
                                <p className="text-sm text-gray-500">Kelola stok bahan baku dan pantau peringatan stok menipis.</p>
                            </div>
                            <button onClick={openAddIng} className="bg-[#0D2B20] text-amber-400 px-4 py-2 rounded-lg font-bold text-sm hover:bg-[#1a3d2e] transition flex items-center gap-2">
                                <Plus size={16} /> Tambah Bahan
                            </button>
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
                )}
            </div>

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
        </div>
    );
}

// ====== Helper Sub-components ======

function OrderStatusBadge({ status }: { status?: string }) {
    const map: Record<string, { cls: string; icon: React.ReactNode; label: string }> = {
        completed: { cls: 'bg-green-100 text-green-700', icon: <CheckCircle size={11} />, label: 'selesai' },
        processing: { cls: 'bg-blue-100 text-blue-700', icon: <Loader size={11} className="animate-spin" />, label: 'diproses' },
        cancelled: { cls: 'bg-red-100 text-red-700', icon: <XCircle size={11} />, label: 'batal' },
        pending: { cls: 'bg-yellow-100 text-yellow-700', icon: <Clock size={11} />, label: 'pending' },
    };
    const s = status || 'pending';
    const { cls, icon, label } = map[s] || map.pending;
    return (
        <span className={`px-2 py-1 text-xs rounded-full font-bold uppercase tracking-wide inline-flex items-center gap-1 ${cls}`}>
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
}: {
    order: Order;
    updateOrderStatus: (id: string, status: Order['status']) => void;
    addLog: (action: string, detail: string, user: string) => void;
    userName: string;
    onCancel: () => void;
}) {
    return (
        <div className="flex gap-1.5 flex-wrap justify-end">
            {(!order.status || order.status === 'pending') && (
                <>
                    <button
                        onClick={() => {
                            updateOrderStatus(order.id, 'processing');
                            addLog("PROCESS_ORDER", `Processing order #${order.id.slice(0, 6)}`, userName);
                        }}
                        className="px-2.5 py-1 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700 transition"
                    >
                        Proses
                    </button>
                    <button
                        onClick={onCancel}
                        className="px-2.5 py-1 bg-gray-200 text-gray-600 rounded text-xs font-bold hover:bg-gray-300 transition"
                    >
                        Batal
                    </button>
                </>
            )}
            {order.status === 'processing' && (
                <button
                    onClick={() => {
                        updateOrderStatus(order.id, 'completed');
                        addLog("COMPLETE_ORDER", `Completed order #${order.id.slice(0, 6)}`, userName);
                    }}
                    className="px-2.5 py-1 bg-green-600 text-white rounded text-xs font-bold hover:bg-green-700 transition"
                >
                    Selesai
                </button>
            )}
        </div>
    );
}
