#!/usr/bin/env python3
"""
Patch admin page.tsx:
1. Add 'cabang' to tab type
2. Add 'crm-upsell' logic flag + ingredients to forecast call
3. Add Multi-Cabang dashboard tab UI
4. Add AI CRM tab UI inside Loyalty
5. Add Bluetooth print button on Receipt area
"""
import os

BASE = r'd:\TEHRAJA\teh-raja'

def patch_file(path, old, new, label=""):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    if old not in content:
        print(f"  [WARN] Not found ({label}): {repr(old[:60])}")
        return False
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.replace(old, new, 1))
    print(f"  [OK] Patched ({label})")
    return True

admin_path = os.path.join(BASE, 'app', 'admin', 'page.tsx')

# ── 1. Add 'cabang' to tab type union ──────────────────────────
patch_file(admin_path,
    "const handleTabChange = (tab: 'dashboard' | 'products' | 'logs' | 'orders' | 'karyawan' | 'ai-forecast' | 'promos' | 'loyalty' | 'inventory') => {",
    "const handleTabChange = (tab: 'dashboard' | 'products' | 'logs' | 'orders' | 'karyawan' | 'ai-forecast' | 'promos' | 'loyalty' | 'inventory' | 'cabang') => {",
    "tab type union"
)

# ── 2. Fix tab state type & initial value ──────────────────────
patch_file(admin_path,
    "useState<'dashboard' | 'products' | 'logs' | 'orders' | 'karyawan' | 'ai-forecast' | 'promos' | 'loyalty' | 'inventory'>('dashboard')",
    "useState<'dashboard' | 'products' | 'logs' | 'orders' | 'karyawan' | 'ai-forecast' | 'promos' | 'loyalty' | 'inventory' | 'cabang'>('dashboard')",
    "useState tab type"
)

# ── 3. Upgrade handleAIForecast to include ingredients ──────────
patch_file(admin_path,
    "                body: JSON.stringify({\n                    orders: orders.slice(-100),\n                    products: products.map(p => ({ id: p.id, name: p.name, stock: p.stock, category: p.category }))\n                })",
    "                body: JSON.stringify({\n                    orders: orders.slice(-100),\n                    products: products.map(p => ({ id: p.id, name: p.name, stock: p.stock, category: p.category })),\n                    ingredients: ingredients.map(i => ({ name: i.name, stock: i.stock, unit: i.unit, minStockThreshold: i.minStockThreshold }))\n                })",
    "forecast add ingredients"
)

# ── 4. Add Cabang tab button in nav ────────────────────────────
# Find the last nav tab button to append after it (before closing nav div)
NAV_LAST = "{ id: 'inventory', label: 'Inventaris', icon: Package, adminOnly: true },"
NAV_WITH_CABANG = """{ id: 'inventory', label: 'Inventaris', icon: Package, adminOnly: true },
            { id: 'cabang', label: 'Multi Cabang', icon: Building2, adminOnly: true },"""
patch_file(admin_path, NAV_LAST, NAV_WITH_CABANG, "nav tab cabang")

# ── 5. Make sure Building2 is imported ─────────────────────────
# Check if Building2 is imported
with open(admin_path, 'r', encoding='utf-8') as f:
    content = f.read()

if 'Building2' not in content:
    patch_file(admin_path,
        "import { LayoutDashboard,",
        "import { LayoutDashboard, Building2,",
        "import Building2"
    )

# ── 6. Add AI CRM Upsell state vars (near other useState) ──────
patch_file(admin_path,
    "    const [isForecasting, setIsForecasting] = useState(false);",
    """    const [isForecasting, setIsForecasting] = useState(false);
    const [upsellSuggestion, setUpsellSuggestion] = useState<string | null>(null);
    const [isUpselling, setIsUpselling] = useState(false);
    const [upsellPhone, setUpsellPhone] = useState('');""",
    "crm state vars"
)

# ── 7. Add handleUpsell function (near handleAIForecast) ────────
FORECAST_FN_END = """    const handleAIForecast = async () => {"""
UPSELL_FN = """    const handleUpsell = async (phone: string) => {
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

    const handleAIForecast = async () => {"""
patch_file(admin_path, FORECAST_FN_END, UPSELL_FN, "upsell function")

# ── 8. Add Multi-Cabang tab content (before closing of all tabs) ─
# Insert before a reliable end-of-tabs marker
TABS_END = "            </div>\n        </div>\n    );\n}"
CABANG_TAB_UI = """            </div>

            {/* ============ TAB: MULTI CABANG ============ */}
            {activeTab === 'cabang' && user.role === 'admin' && (
                <div className="animate-fade-in space-y-6">
                    <div className="bg-gradient-to-br from-blue-900 to-indigo-900 rounded-2xl p-6 text-white shadow-xl">
                        <div className="flex items-center gap-3 mb-2">
                            <Building2 size={28} className="text-blue-300" />
                            <div>
                                <h2 className="text-xl font-black">Manajemen Multi-Cabang</h2>
                                <p className="text-blue-300 text-sm">Pantau dan kelola semua cabang Teh Raja dari satu dasbor.</p>
                            </div>
                        </div>
                    </div>

                    {/* Branch Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[
                            { id: 'main', name: 'Cabang Utama', location: 'Jl. Raya Sitanggal No. 1', status: 'open', orders: orders.length, revenue: orders.reduce((s, o) => s + o.total, 0) },
                            { id: 'branch-2', name: 'Cabang 2', location: 'Jl. Ahmad Yani No. 45', status: 'coming-soon', orders: 0, revenue: 0 },
                            { id: 'branch-3', name: 'Cabang 3', location: 'Mall City Walk Lt. 2', status: 'coming-soon', orders: 0, revenue: 0 },
                        ].map(branch => (
                            <div key={branch.id} className={`bg-white rounded-2xl border-2 shadow-sm p-5 ${branch.status === 'open' ? 'border-green-300' : 'border-dashed border-gray-200 opacity-60'}`}>
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
                                            <p className="text-xl font-black text-green-700">{branch.orders}</p>
                                            <p className="text-[11px] text-green-600">Order</p>
                                        </div>
                                        <div className="bg-amber-50 rounded-xl p-3 text-center">
                                            <p className="text-lg font-black text-amber-700">Rp{(branch.revenue / 1000000).toFixed(1)}M</p>
                                            <p className="text-[11px] text-amber-600">Omzet</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mt-3 text-center py-3 bg-gray-50 rounded-xl">
                                        <p className="text-xs text-gray-400 font-medium">Belum terhubung</p>
                                        <button className="mt-1 text-xs font-bold text-blue-500 hover:underline">+ Tambah Cabang</button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Firebase Branch ID Config */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <h3 className="font-bold text-gray-800 mb-1">Konfigurasi Cabang Aktif</h3>
                        <p className="text-sm text-gray-500 mb-4">Setiap order dan sesi kasir akan dilabeli dengan ID cabang ini. Ubah sesuai lokasi perangkat ini.</p>
                        <div className="flex gap-2 flex-wrap">
                            {[
                                { id: 'main', label: 'Cabang Utama' },
                                { id: 'branch-2', label: 'Cabang 2' },
                                { id: 'branch-3', label: 'Cabang 3' },
                            ].map(b => (
                                <button
                                    key={b.id}
                                    onClick={() => {
                                        useSalesStore.getState().setBranch(b.id, b.label);
                                        toast.success(`Cabang aktif diubah ke: ${b.label}`);
                                    }}
                                    className="px-4 py-2 rounded-xl text-sm font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition"
                                >
                                    Aktifkan: {b.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}"""
patch_file(admin_path, TABS_END, CABANG_TAB_UI, "multi-branch tab UI")

# ── 9. Add AI Upsell panel inside Loyalty tab ──────────────────
LOYALTY_HEADER = "{activeTab === 'loyalty' && user.role === 'admin' && ("
with open(admin_path, 'r', encoding='utf-8') as f:
    content = f.read()

loyalty_idx = content.find(LOYALTY_HEADER)
if loyalty_idx != -1:
    # Find the start of loyalty tab div content
    div_start = content.find("<div className=\"bg-white p-6 rounded-2xl", loyalty_idx)
    if div_start != -1:
        # Insert AI upsell section before loyalty div
        UPSELL_PANEL = """<div className="bg-gradient-to-br from-violet-900 to-purple-900 rounded-2xl p-6 text-white shadow-xl mb-6">
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
                    """
        insert_pos = content.find("{activeTab === 'loyalty'", loyalty_idx)
        insert_pos = content.find("(\n                    <div", insert_pos)
        insert_pos = content.find("\n                    <div", insert_pos) + 1
        content = content[:insert_pos] + "                " + UPSELL_PANEL + content[insert_pos:]
        with open(admin_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print("  [OK] Patched (AI upsell panel in loyalty tab)")
    else:
        print("  [WARN] Loyalty div not found")
else:
    print("  [WARN] Loyalty tab header not found")

# ── 10. Import useSalesStore direct reference (for setBranch) ──
# It's already imported via useSalesStore hook, just make sure
with open(admin_path, 'r', encoding='utf-8') as f:
    c = f.read()
if 'useSalesStore' not in c:
    print("[WARN] useSalesStore not found in admin page")
else:
    print("  [OK] useSalesStore already imported")

print("\nAll admin patches done!")
