"use client";

import { useState, useEffect } from "react";
import { useProductStore, useSalesStore, useAuthStore, ExtendedProduct, ActivityLog } from "@/lib/store";
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
    CheckCircle, XCircle, ShieldAlert,
    History, User, AlertTriangle
} from "lucide-react";
import Link from "next/link";
import { nanoid } from "nanoid";
import ReportGenerator from "@/components/ReportGenerator"; // [NEW]

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
    const { user, login, logout } = useAuthStore();
    const [loginUsername, setLoginUsername] = useState("");
    const [loginPassword, setLoginPassword] = useState("");
    const [loginError, setLoginError] = useState("");

    // Stores
    const { products, addProduct, updateProduct, deleteProduct, toggleAvailability } = useProductStore();
    const { getDailySales, getProductPopularity, orders, logs, addLog, resetData } = useSalesStore();
    const [isClient, setIsClient] = useState(false);

    // UI State
    const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'logs'>('dashboard');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<ExtendedProduct>({
        id: '', name: '', price: 0, description: '',
        image: '/images/royal-milk-tea.png', category: 'signature',
        attributes: { sweet: 5, creamy: 5, fruity: 5 },
        isAvailable: true, stock: 50, minStockThreshold: 10
    });

    useEffect(() => { setIsClient(true); }, []);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setLoginError("");

        if (loginUsername === "admin" && loginPassword === "admin123") {
            login("admin", "admin");
            addLog("LOGIN", "Admin logged in", "Admin");
        } else if (loginUsername === "kasir" && loginPassword === "kasir123") {
            login("kasir", "cashier");
            addLog("LOGIN", "Cashier logged in", "Kasir");
        } else {
            setLoginError("Username atau Password salah!");
        }
    };

    const handleLogout = () => {
        addLog("LOGOUT", `${user?.name} logged out`, user?.name || "Unknown");
        logout();
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
        if (!formData.name) return alert("Nama produk wajib diisi");

        if (editingId) {
            updateProduct(editingId, formData);
            addLog("UPDATE_PRODUCT", `Updated product: ${formData.name}`, user?.name || "Unknown");
        } else {
            addProduct(formData);
            addLog("CREATE_PRODUCT", `Created product: ${formData.name}`, user?.name || "Unknown");
        }
        setIsModalOpen(false);
    };

    const handleDelete = (id: string, name: string) => {
        if (confirm(`Yakin ingin menghapus ${name}?`)) {
            deleteProduct(id);
            addLog("DELETE_PRODUCT", `Deleted product: ${name}`, user?.name || "Unknown");
        }
    }

    const handleReset = () => {
        if (confirm("PERINGATAN: Semua data penjualan akan dihapus permanen. Lanjutkan?")) {
            resetData();
            addLog("RESET_DATA", "All sales data reset", user?.name || "Unknown");
            alert("Data berhasil direset.");
            window.location.reload();
        }
    }

    const handleExportCSV = () => {
        const headers = ["Order ID", "Date", "Customer", "Items", "Total"];
        const rows = orders.map(order => [
            order.id,
            new Date(order.date).toLocaleString(),
            order.customerName || "Guest",
            order.items.map(i => `${i.name} (x${i.quantity})`).join("; "),
            order.total
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
    }

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
            <div className="min-h-screen flex items-center justify-center bg-forest relative overflow-hidden">
                <div className="absolute inset-0 z-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                <div className="p-8 glass rounded-2xl w-full max-w-md text-center bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl z-10">
                    <div className="mb-6">
                        <h1 className="text-4xl font-serif text-gold font-bold">TEH RAJA</h1>
                        <p className="text-cream opacity-60 text-sm tracking-widest mt-2 uppercase">Official Admin Panel</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <input
                            type="text"
                            className="w-full p-4 bg-white/10 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-gold transition"
                            placeholder="Username (admin / kasir)"
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
                        <span>v2.0.0 (Pro)</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 text-forest relative flex flex-col">
            {/* Admin Navbar */}
            <nav className="bg-forest text-cream px-6 py-4 flex justify-between items-center shadow-lg sticky top-0 z-30">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-serif font-bold text-gold">TEH RAJA</h1>
                    <span className="opacity-30">|</span>
                    <div className="flex gap-1 text-sm bg-black/20 rounded-lg p-1">
                        <button
                            onClick={() => setActiveTab('dashboard')}
                            className={`px-4 py-1.5 rounded-md transition ${activeTab === 'dashboard' ? 'bg-gold text-forest font-bold' : 'hover:bg-white/5'}`}
                        >
                            Dashboard
                        </button>
                        <button
                            onClick={() => setActiveTab('products')}
                            className={`px-4 py-1.5 rounded-md transition ${activeTab === 'products' ? 'bg-gold text-forest font-bold' : 'hover:bg-white/5'}`}
                        >
                            Menu & Stok
                        </button>
                        {user.role === 'admin' && (
                            <button
                                onClick={() => setActiveTab('logs')}
                                className={`px-4 py-1.5 rounded-md transition ${activeTab === 'logs' ? 'bg-gold text-forest font-bold' : 'hover:bg-white/5'}`}
                            >
                                Log Aktivitas
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex gap-6 items-center">
                    <div className="text-right leading-tight hidden md:block">
                        <p className="font-bold text-sm text-gold">{user.name}</p>
                        <p className="text-xs opacity-60 uppercase tracking-wider">{user.role}</p>
                    </div>
                    <div className="h-8 w-[1px] bg-white/10"></div>
                    <Link href="/" target="_blank" className="opacity-70 hover:opacity-100 flex items-center gap-2 text-sm">
                        Web Live <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    </Link>
                    <button onClick={handleLogout} className="p-2 hover:bg-red-500/20 text-red-300 rounded-full transition" title="Logout">
                        <LogOut size={18} />
                    </button>
                </div>
            </nav>

            <div className="flex-1 container mx-auto p-8">

                {activeTab === 'dashboard' && (
                    <div className="animate-fade-in space-y-8">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold">Laporan Kinerja</h2>
                            <div className="flex gap-2">
                                <button onClick={handleExportCSV} className="flex items-center gap-2 text-forest bg-white border border-gray-200 px-4 py-2 rounded hover:bg-gray-50 shadow-sm">
                                    <Download size={16} /> CSV
                                </button>
                                <ReportGenerator orders={orders} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-96">
                                <h3 className="font-bold text-lg mb-4 text-forest flex items-center gap-2">
                                    <span className="w-1 h-6 bg-gold rounded-full"></span> Tren Penjualan
                                </h3>
                                <Line data={salesData} options={{ responsive: true, maintainAspectRatio: false }} />
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-96">
                                <h3 className="font-bold text-lg mb-4 text-forest flex items-center gap-2">
                                    <span className="w-1 h-6 bg-forest rounded-full"></span> Produk Terpopuler
                                </h3>
                                <Bar data={popularityData} options={{ responsive: true, maintainAspectRatio: false }} />
                            </div>
                        </div>

                        {/* Admin Only Actions */}
                        {user.role === 'admin' && (
                            <div className="bg-red-50 p-6 rounded-xl border border-red-100 flex justify-between items-center">
                                <div>
                                    <h4 className="font-bold text-red-800 flex items-center gap-2"><ShieldAlert size={18} /> Danger Zone</h4>
                                    <p className="text-xs text-red-600">Hati-hati, tindakan ini tidak dapat dibatalkan.</p>
                                </div>
                                <button onClick={handleReset} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-bold text-sm">
                                    Reset Semua Data
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'products' && (
                    <div className="animate-fade-in bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h2 className="text-xl font-bold font-serif">Manajemen Inventaris</h2>
                                <p className="text-sm text-gray-400">Kelola menu, harga, dan stok barang.</p>
                            </div>
                            {user.role === 'admin' && (
                                <button onClick={openAddModal} className="px-4 py-2 bg-forest text-gold rounded-lg font-bold flex items-center gap-2 hover:bg-forest-light shadow transition hover:-translate-y-1">
                                    <Plus size={18} /> Tambah Menu
                                </button>
                            )}
                        </div>

                        <div className="overflow-x-auto">
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
                                                <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden border border-gray-200">
                                                    {item.image ? (
                                                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
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
                    </div>
                )}

                {activeTab === 'logs' && user.role === 'admin' && (
                    <div className="animate-fade-in bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><History size={24} /></div>
                            <div>
                                <h2 className="text-xl font-bold font-serif">Log Aktivitas</h2>
                                <p className="text-sm text-gray-500">Rekam jejak tindakan sistem.</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {logs.length === 0 && <p className="text-center text-gray-400 italic py-8">Belum ada aktivitas tercatat.</p>}
                            {logs.map(log => (
                                <div key={log.id} className="flex gap-4 p-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition">
                                    <div className="text-xs font-mono text-gray-400 w-32 pt-1">
                                        {new Date(log.timestamp).toLocaleString('id-ID')}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex gap-2 items-center mb-1">
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${log.action.includes('DELETE') ? 'bg-red-100 text-red-600' :
                                                log.action.includes('CREATE') ? 'bg-green-100 text-green-600' :
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

            </div>

            {/* Modal Form */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white text-forest rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                            <h3 className="text-xl font-bold font-serif">{editingId ? 'Edit Produk' : 'Tambah Produk Baru'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-600">Nama Produk</label>
                                    <input
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-forest"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-600">Harga (Rp)</label>
                                    <input
                                        type="number"
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-forest"
                                        value={formData.price}
                                        onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-yellow-800">Stok Saat Ini (Cup)</label>
                                    <input type="number" className="w-full p-2 border border-yellow-300 rounded" value={formData.stock} onChange={e => setFormData({ ...formData, stock: Number(e.target.value) })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-yellow-800">Batas Min. Alert</label>
                                    <input type="number" className="w-full p-2 border border-yellow-300 rounded" value={formData.minStockThreshold} onChange={e => setFormData({ ...formData, minStockThreshold: Number(e.target.value) })} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-600">Deskripsi</label>
                                <textarea
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-forest h-24"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-600">Kategori</label>
                                    <select
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-forest bg-white"
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                                    >
                                        <option value="signature">Signature (Khas)</option>
                                        <option value="classic">Classic Tea</option>
                                        <option value="milk">Milk Base</option>
                                        <option value="fruit">Fruit Series</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-600">URL Gambar</label>
                                    <input
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-forest"
                                        value={formData.image}
                                        placeholder="/images/example.png"
                                        onChange={e => setFormData({ ...formData, image: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-xl space-y-4 border border-gray-200">
                                <h4 className="font-bold flex items-center gap-2">
                                    <span className="w-2 h-6 bg-gold rounded-full"></span>
                                    Analisis Rasa (Algoritma)
                                </h4>
                                <div className="space-y-4">
                                    {/* Simple sliders */}
                                    {['sweet', 'creamy', 'fruity'].map(attr => (
                                        <div key={attr}>
                                            <div className="flex justify-between text-sm mb-1 uppercase font-bold text-gray-500">
                                                <span>{attr}</span>
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

                        <div className="p-6 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white z-10">
                            <button onClick={() => setIsModalOpen(false)} className="px-6 py-2 rounded-lg border border-gray-300 hover:bg-gray-50">Batal</button>
                            <button onClick={handleSave} className="px-6 py-2 rounded-lg bg-gold text-forest font-bold hover:bg-gold-light flex items-center gap-2">
                                <Save size={18} /> Simpan Produk
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
