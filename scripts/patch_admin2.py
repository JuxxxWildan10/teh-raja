#!/usr/bin/env python3
import os

BASE = r'd:\TEHRAJA\teh-raja'
admin_path = os.path.join(BASE, 'app', 'admin', 'page.tsx')

with open(admin_path, 'r', encoding='utf-8') as f:
    content = f.read()

def patch(old, new, label):
    global content
    if old not in content:
        print(f"  [WARN] Not found ({label})")
        return False
    content = content.replace(old, new, 1)
    print(f"  [OK] ({label})")
    return True

# ── 1. Add cabang to nav tabs (after loyalty entry) ──────────
OLD_NAV = "...(user.role === 'admin' ? [{ id: 'loyalty' as const, label: 'Loyalty Pelanggan', icon: <UsersIcon size={18} /> }] : []),"
NEW_NAV = """...(user.role === 'admin' ? [{ id: 'loyalty' as const, label: 'Loyalty Pelanggan', icon: <UsersIcon size={18} /> }] : []),
        ...(user.role === 'admin' ? [{ id: 'cabang' as const, label: 'Multi Cabang', icon: <Building2 size={18} /> }] : []),"""
patch(OLD_NAV, NEW_NAV, "nav tab cabang")

# ── 2. Add Building2 to lucide imports ───────────────────────
idx = content.find("from 'lucide-react'")
# go back to find the import statement start
start = content.rfind("import {", 0, idx)
line_end = content.find("} from 'lucide-react'", start)
lucide_imports = content[start:line_end]
if 'Building2' not in lucide_imports:
    # Append Building2 to the last item before closing brace
    content = content[:line_end] + ", Building2" + content[line_end:]
    print("  [OK] (add Building2 import)")
else:
    print("  [OK] (Building2 already imported)")

# ── 3. Add Multi-Cabang tab content before end of file ──────
END_MARKER = "        </div>\n    );\n}"
CABANG_TAB_CONTENT = """        </div>

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

    </div>
    );
}"""

# Replace end of file marker with tab content
if END_MARKER in content:
    # Replace only the last occurrence
    last_idx = content.rfind(END_MARKER)
    content = content[:last_idx] + CABANG_TAB_CONTENT
    print("  [OK] (multi-branch tab UI)")
else:
    print("  [WARN] End marker not found")
    # Try alternative
    END2 = "    );\n}"
    last_idx = content.rfind(END2)
    if last_idx != -1:
        content = content[:last_idx] + "\n" + CABANG_TAB_CONTENT.strip()
        print("  [OK] (multi-branch tab UI via alt marker)")

with open(admin_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("\nDone!")
