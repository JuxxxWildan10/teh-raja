"use client";

/**
 * ============================================================================
 * FILE: components/SecretStaffModal.tsx
 * ============================================================================
 * FUNGSI UTAMA:
 * Komponen keamanan akses staf/admin melalui mekanisme rahasia **Tap Logo 5 Kali (`useSecretLogoTap`)**
 * serta pengatur kunci **Mode PKL (POS & BOM) vs Mode Pengembangan Lanjutan / Skripsi (`isAdvancedUnlocked`)**.
 *
 * FITUR PENTING:
 * 1. `useSecretLogoTap`: Hook pendeteksi 5 ketukan cepat (<2,5 detik) pada logo Teh Raja untuk membuka modal ini.
 * 2. Form Login Staf/Admin (`admin / 123` atau `kasir / 123`).
 * 3. Pintasan navigasi cepat ke `/pos`, `/admin`, Slide Sempro, dan Slide Laporan Akhir PKL.
 * 4. Tombol **`Unlock / Kunci Fitur Pengembangan Lanjutan`**: Membuka seluruh fitur Skripsi (AI Forecasting,
 *    Layar KDS Terpisah `/kds`, Voice POS, CRM, Multi-Cabang) dalam 1 klik saat ditanya Dosen Penguji.
 * 5. **Kontrol Buka / Tutup Kedai Online (`useStoreConfigStore`)**: Admin dapat kapan saja mengunci atau membuka
 *    akses menu online pelanggan (misal saat Hari Libur / Tanggal Merah) langsung dari portal 5x Tap ini.
 * ============================================================================
 */

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
    useAuthStore,
    useSalesStore,
    useStoreConfigStore,
    SHOP_CLOSE_PRESETS,
} from "@/lib/store";
import {
    ShieldCheck,
    Lock,
    Unlock,
    X,
    ShoppingCart,
    LayoutDashboard,
    ChefHat,
    Presentation,
    Sparkles,
    LogOut,
    Eye,
    EyeOff,
    KeyRound,
    ChevronRight,
    CheckCircle2,
    CalendarX2,
    Store,
} from "lucide-react";
import { useToast } from "./Toast";

/**
 * Custom hook to detect 5 rapid taps on the logo within 2.5 seconds.
 */
export function useSecretLogoTap(onUnlock: () => void) {
    const tapCountRef = useRef(0);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleLogoTap = useCallback(() => {
        tapCountRef.current += 1;

        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }

        if (tapCountRef.current >= 5) {
            tapCountRef.current = 0;
            onUnlock();
            return;
        }

        timerRef.current = setTimeout(() => {
            tapCountRef.current = 0;
        }, 2500);
    }, [onUnlock]);

    return handleLogoTap;
}

interface SecretStaffModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SecretStaffModal({ isOpen, onClose }: SecretStaffModalProps) {
    const router = useRouter();
    const { user, loginWithPassword, logout, isAdvancedUnlocked, toggleAdvancedUnlocked } = useAuthStore();
    const { addLog } = useSalesStore();
    const {
        isOnlineOrderOpen,
        closedBadge,
        closedMessage,
        reopenInfo,
        openOnlineStore,
        closeOnlineStore,
    } = useStoreConfigStore();
    const toast = useToast();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // State pengaturan alasan tutup / libur kedai
    const [showCloseConfig, setShowCloseConfig] = useState(false);
    const [draftBadge, setDraftBadge] = useState(closedBadge || SHOP_CLOSE_PRESETS[0].badge);
    const [draftMessage, setDraftMessage] = useState(closedMessage || SHOP_CLOSE_PRESETS[0].message);
    const [draftReopen, setDraftReopen] = useState(reopenInfo || SHOP_CLOSE_PRESETS[0].reopenHint);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (!username.trim() || !password.trim()) {
            setError("Masukkan username dan password terlebih dahulu.");
            return;
        }
        setIsLoading(true);
        try {
            const loggedIn = await loginWithPassword(username.trim(), password);
            if (loggedIn) {
                addLog("LOGIN", `${loggedIn.role === "admin" ? "Admin" : "Kasir"} login via 5x Tap Logo`, loggedIn.name);
                toast.success(`Selamat datang, ${loggedIn.name}! Akses sistem telah dibuka.`);
                setUsername("");
                setPassword("");
            } else {
                setError("Username atau password tidak valid!");
            }
        } catch {
            setError("Terjadi kesalahan saat verifikasi akses.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = async () => {
        if (user) {
            addLog("LOGOUT", `${user.name} mengunci kembali akses staf`, user.name);
        }
        await logout();
        toast.info("Mode Admin ditutup. Tampilan kembali ke mode Pelanggan.");
        onClose();
    };

    const handleToggleAdvanced = () => {
        const nextState = !isAdvancedUnlocked;
        toggleAdvancedUnlocked();
        if (nextState) {
            toast.success("🔓 Fitur Pengembangan Lanjutan (AI Forecast, KDS, Voice AI, CRM & Multi-Cabang) berhasil di-unlock!");
        } else {
            toast.info("🔒 Dikunci kembali ke Mode PKL (Fokus POS & Manajemen Bahan Baku BOM).");
        }
    };

    const handleOpenShopOnline = () => {
        openOnlineStore(user?.name || "Admin");
        setShowCloseConfig(false);
        addLog("STORE_ONLINE_OPEN", "Kedai & menu online pelanggan dibuka kembali via Portal 5x Tap", user?.name || "Admin");
        toast.success("🔓 Kedai dibuka! Pelanggan kini dapat mengakses katalog menu & order online.");
    };

    const handleConfirmCloseShopOnline = () => {
        closeOnlineStore({
            closedBadge: draftBadge.trim() || "Kedai Sedang Tutup",
            closedMessage: draftMessage.trim() || SHOP_CLOSE_PRESETS[0].message,
            reopenInfo: draftReopen.trim(),
            updatedBy: user?.name || "Admin",
        });
        setShowCloseConfig(false);
        addLog(
            "STORE_ONLINE_LOCK",
            `Kedai & menu online dikunci (${draftBadge.trim() || "Kedai Sedang Tutup"}) via Portal 5x Tap`,
            user?.name || "Admin"
        );
        toast.info(`🔒 Kedai berhasil ditutup (${draftBadge || "Libur"}). Pelanggan tidak dapat mengakses menu.`);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[250] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="w-full max-w-lg max-h-[90dvh] flex flex-col bg-[#07221B] border border-amber-400/30 rounded-3xl shadow-2xl overflow-hidden text-white"
                    >
                        {/* Header */}
                        <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-400/15 via-emerald-900/30 to-transparent border-b border-white/10 flex items-center justify-between gap-2 flex-shrink-0">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-400 text-[#07221B] flex items-center justify-center shadow-lg shadow-amber-400/20 flex-shrink-0">
                                    {user ? <ShieldCheck size={22} /> : <Lock size={20} />}
                                </div>
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                        <h2 className="text-base sm:text-lg font-serif font-bold text-amber-400">
                                            {user ? "Portal Akses Admin & Staf" : "Akses Rahasia Admin"}
                                        </h2>
                                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 whitespace-nowrap">
                                            5× Tap Mode
                                        </span>
                                    </div>
                                    <p className="text-xs text-white/60">
                                        {user
                                            ? `Terautentikasi sebagai ${user.name} (${user.role === "admin" ? "Administrator" : "Kasir"})`
                                            : "Hanya untuk staf & administrator resmi Teh Raja"}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-full bg-white/5 hover:bg-white/15 text-white/60 hover:text-white transition flex-shrink-0"
                                aria-label="Tutup"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0">
                            {!user ? (
                                <form onSubmit={handleLogin} className="space-y-4">
                                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-xs text-white/70 leading-relaxed flex items-start gap-3">
                                        <KeyRound size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
                                        <div>
                                            Masukkan kredensial resmi untuk membuka akses ke <strong className="text-amber-300">Kasir POS</strong>, <strong className="text-amber-300">Manajemen Resep &amp; Bahan Baku (BOM)</strong>, serta <strong className="text-amber-300">File Presentasi PKL</strong>.
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-1.5">
                                            Username Staf / Admin
                                        </label>
                                        <input
                                            type="text"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            placeholder="Masukkan username..."
                                            autoFocus
                                            className="w-full px-4 py-3.5 bg-black/30 border border-white/15 rounded-xl text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-amber-400 transition"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-1.5">
                                            Password
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder="Masukkan password..."
                                                className="w-full px-4 py-3.5 pr-11 bg-black/30 border border-white/15 rounded-xl text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-amber-400 transition"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition p-1"
                                            >
                                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>

                                    {error && (
                                        <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-bold text-center">
                                            {error}
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full py-3.5 bg-amber-400 hover:bg-amber-300 text-[#07221B] font-black rounded-xl transition shadow-lg shadow-amber-400/20 disabled:opacity-50 text-sm"
                                    >
                                        {isLoading ? "Memverifikasi..." : "Buka Akses Sistem"}
                                    </button>
                                </form>
                            ) : (
                                <div className="space-y-4">
                                    {/* Active user status */}
                                    <div className="flex flex-wrap items-center justify-between gap-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl px-3.5 sm:px-4 py-3">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-emerald-300">
                                                    {isAdvancedUnlocked
                                                        ? "Mode Pengembangan Lanjutan (Full Fitur Aktif)"
                                                        : "Mode PKL Aktif (Fokus POS & Bahan Baku BOM)"}
                                                </p>
                                                <p className="text-[11px] text-white/60">
                                                    Pilih modul operasional atau dokumen presentasi di bawah ini
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleLogout}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 text-xs font-bold transition whitespace-nowrap"
                                        >
                                            <LogOut size={13} /> Kunci Akses
                                        </button>
                                    </div>

                                    {/* System Modules Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <button
                                            onClick={() => {
                                                onClose();
                                                router.push("/pos");
                                            }}
                                            className="group p-4 rounded-2xl bg-emerald-400/10 hover:bg-emerald-400/20 border border-emerald-400/30 text-left transition flex items-start gap-3"
                                        >
                                            <div className="w-10 h-10 rounded-xl bg-emerald-400/20 flex items-center justify-center text-emerald-300 flex-shrink-0 group-hover:scale-110 transition">
                                                <ShoppingCart size={20} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold text-sm text-white group-hover:text-emerald-300 transition">Kasir POS</span>
                                                    <ChevronRight size={15} className="text-white/40 group-hover:translate-x-1 transition" />
                                                </div>
                                                <p className="text-[11px] text-white/60 mt-0.5">
                                                    Transaksi kasir (merangkap barista), QRIS &amp; cetak struk
                                                </p>
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => {
                                                onClose();
                                                router.push("/admin");
                                            }}
                                            className="group p-4 rounded-2xl bg-purple-400/10 hover:bg-purple-400/20 border border-purple-400/30 text-left transition flex items-start gap-3"
                                        >
                                            <div className="w-10 h-10 rounded-xl bg-purple-400/20 flex items-center justify-center text-purple-300 flex-shrink-0 group-hover:scale-110 transition">
                                                <LayoutDashboard size={20} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold text-sm text-white group-hover:text-purple-300 transition">
                                                        {isAdvancedUnlocked ? "Admin ERP & AI" : "Admin & Bahan Baku BOM"}
                                                    </span>
                                                    <ChevronRight size={15} className="text-white/40 group-hover:translate-x-1 transition" />
                                                </div>
                                                <p className="text-[11px] text-white/60 mt-0.5">
                                                    {isAdvancedUnlocked
                                                        ? "Menu BOM, Laba Rugi, Inventori & AI Forecast"
                                                        : "Kelola Menu, Resep BOM, Stok Bahan Baku & Laporan"}
                                                </p>
                                            </div>
                                        </button>

                                        {isAdvancedUnlocked && (
                                            <button
                                                onClick={() => {
                                                    onClose();
                                                    router.push("/kds");
                                                }}
                                                className="group p-4 rounded-2xl bg-blue-400/10 hover:bg-blue-400/20 border border-blue-400/30 text-left transition flex items-start gap-3 sm:col-span-2"
                                            >
                                                <div className="w-10 h-10 rounded-xl bg-blue-400/20 flex items-center justify-center text-blue-300 flex-shrink-0 group-hover:scale-110 transition">
                                                    <ChefHat size={20} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-bold text-sm text-white group-hover:text-blue-300 transition">
                                                            Kitchen Display System (KDS Dapur Terpisah)
                                                        </span>
                                                        <ChevronRight size={15} className="text-white/40 group-hover:translate-x-1 transition" />
                                                    </div>
                                                    <p className="text-[11px] text-white/60 mt-0.5">
                                                        Layar antrean khusus dapur (Fitur Pengembangan Lanjutan)
                                                    </p>
                                                </div>
                                            </button>
                                        )}
                                    </div>

                                    {/* Kontrol Buka / Tutup (Lock / Unlock) Kedai & Menu Online Pelanggan */}
                                    {user.role === "admin" && (
                                        <div
                                            className={`p-3.5 rounded-2xl border space-y-3 ${
                                                isOnlineOrderOpen
                                                    ? "bg-emerald-500/10 border-emerald-500/30"
                                                    : "bg-red-500/15 border-red-500/40"
                                            }`}
                                        >
                                            <div className="flex flex-wrap items-center justify-between gap-2.5">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div
                                                        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                                            isOnlineOrderOpen
                                                                ? "bg-emerald-400/20 text-emerald-300"
                                                                : "bg-red-500/25 text-red-300"
                                                        }`}
                                                    >
                                                        {isOnlineOrderOpen ? <Store size={15} /> : <CalendarX2 size={15} />}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold text-white">
                                                            Order Online Pelanggan:{" "}
                                                            <span className={isOnlineOrderOpen ? "text-emerald-300" : "text-red-300"}>
                                                                {isOnlineOrderOpen ? "BUKA (Menu Aktif)" : `DIKUNCI (${closedBadge})`}
                                                            </span>
                                                        </p>
                                                        <p className="text-[10px] text-white/60">
                                                            {isOnlineOrderOpen
                                                                ? "Pelanggan dapat mengakses /menu & memesan online"
                                                                : "Pelanggan tidak bisa akses menu (Sedang Tutup / Libur)"}
                                                        </p>
                                                    </div>
                                                </div>

                                                {isOnlineOrderOpen ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setDraftBadge(closedBadge || SHOP_CLOSE_PRESETS[0].badge);
                                                            setDraftMessage(closedMessage || SHOP_CLOSE_PRESETS[0].message);
                                                            setDraftReopen(reopenInfo || SHOP_CLOSE_PRESETS[0].reopenHint);
                                                            setShowCloseConfig((v) => !v);
                                                        }}
                                                        className="px-3 py-1.5 rounded-xl text-[11px] font-bold transition flex-shrink-0 bg-red-500/25 hover:bg-red-500/35 text-red-200 border border-red-400/40 whitespace-nowrap"
                                                    >
                                                        🔒 Tutup Kedai
                                                    </button>
                                                ) : (
                                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setDraftBadge(closedBadge);
                                                                setDraftMessage(closedMessage);
                                                                setDraftReopen(reopenInfo || "");
                                                                setShowCloseConfig((v) => !v);
                                                            }}
                                                            className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition bg-white/10 hover:bg-white/20 text-white/80 border border-white/15 whitespace-nowrap"
                                                            title="Ubah pesan libur / tutup"
                                                        >
                                                            ✏️ Pesan
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={handleOpenShopOnline}
                                                            className="px-3 py-1.5 rounded-xl text-[11px] font-black transition bg-emerald-400 hover:bg-emerald-300 text-[#07221B] shadow whitespace-nowrap"
                                                        >
                                                            🔓 Buka Kedai
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {showCloseConfig && (
                                                <div className="pt-2.5 border-t border-white/10 space-y-2.5">
                                                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                                                        Pilih Alasan Tutup / Libur (Atau Ketik Sendiri):
                                                    </p>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {SHOP_CLOSE_PRESETS.map((preset) => (
                                                            <button
                                                                key={preset.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    setDraftBadge(preset.badge);
                                                                    setDraftMessage(preset.message);
                                                                    setDraftReopen(preset.reopenHint);
                                                                }}
                                                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition ${
                                                                    draftBadge === preset.badge
                                                                        ? "bg-amber-400 text-[#07221B] border-amber-400"
                                                                        : "bg-black/30 text-white/75 border-white/15 hover:bg-white/10"
                                                                }`}
                                                            >
                                                                {preset.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={draftBadge}
                                                        onChange={(e) => setDraftBadge(e.target.value)}
                                                        placeholder="Judul Status (misal: Libur Hari Raya / Kedai Tutup)"
                                                        className="w-full px-3 py-2 bg-black/30 border border-white/15 rounded-xl text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-amber-400"
                                                    />
                                                    <textarea
                                                        rows={2}
                                                        value={draftMessage}
                                                        onChange={(e) => setDraftMessage(e.target.value)}
                                                        placeholder="Pesan untuk pelanggan yang membuka menu..."
                                                        className="w-full px-3 py-2 bg-black/30 border border-white/15 rounded-xl text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-amber-400 resize-none"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={draftReopen}
                                                        onChange={(e) => setDraftReopen(e.target.value)}
                                                        placeholder="Info buka kembali (opsional, misal: Buka Senin 09.00 WIB)"
                                                        className="w-full px-3 py-2 bg-black/30 border border-white/15 rounded-xl text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-amber-400"
                                                    />
                                                    <div className="flex flex-wrap justify-end gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowCloseConfig(false)}
                                                            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs text-white/70 font-bold"
                                                        >
                                                            Batal
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={handleConfirmCloseShopOnline}
                                                            className="px-3.5 py-1.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-black shadow"
                                                        >
                                                            🔒 Kunci &amp; Tutup Menu Pelanggan
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Toggle Unlock / Lock Fitur Pengembangan Selanjutnya (Skripsi) */}
                                    <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex flex-wrap items-center justify-between gap-2.5">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isAdvancedUnlocked ? "bg-amber-400/20 text-amber-300" : "bg-white/10 text-white/60"}`}>
                                                {isAdvancedUnlocked ? <Unlock size={15} /> : <Lock size={15} />}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-white">
                                                    {isAdvancedUnlocked
                                                        ? "Fitur Pengembangan Lanjutan: TERBUKA"
                                                        : "Fitur Pengembangan Lanjutan: TERKUNCI"}
                                                </p>
                                                <p className="text-[10px] text-white/50">
                                                    {isAdvancedUnlocked
                                                        ? "AI Forecasting, KDS Dapur, Voice AI, CRM & Multi-Cabang aktif"
                                                        : "Disembunyikan agar fokus pada POS & BOM untuk PKL"}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleToggleAdvanced}
                                            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition flex-shrink-0 border whitespace-nowrap ${
                                                isAdvancedUnlocked
                                                    ? "bg-white/10 hover:bg-white/20 text-white border-white/20"
                                                    : "bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border-amber-400/40"
                                            }`}
                                        >
                                            {isAdvancedUnlocked ? "🔒 Kunci (Mode PKL)" : "🔓 Unlock Fitur"}
                                        </button>
                                    </div>

                                    {/* Presentation Files Section */}
                                    <div className="pt-3 border-t border-white/10">
                                        <p className="text-[11px] font-bold uppercase tracking-wider text-amber-400/80 mb-2.5">
                                            Dokumen Presentasi PKL (Khusus Admin)
                                        </p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                            <Link
                                                href="/presentasi_sempro_tehraja.html"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-center gap-2 px-4 py-3 bg-amber-400 text-[#07221B] hover:bg-amber-300 rounded-xl text-xs font-black transition shadow-lg shadow-amber-400/20"
                                            >
                                                <Sparkles size={14} /> Slide Seminar Proposal
                                            </Link>
                                            <Link
                                                href="/presentasi_pkl_tehraja.html"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-center gap-2 px-4 py-3 bg-amber-400/15 hover:bg-amber-400/25 text-amber-300 border border-amber-400/30 rounded-xl text-xs font-bold transition"
                                            >
                                                <Presentation size={14} /> Slide Laporan Akhir
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
