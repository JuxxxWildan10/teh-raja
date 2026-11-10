"use client";

/**
 * ============================================================================
 * FILE: app/global-error.tsx
 * ============================================================================
 * @file Global Root Layout Error Boundary
 * @description Menangkap error tingkat akar (Root Layout) di seluruh aplikasi Next.js.
 * ============================================================================
 */

import { useEffect } from "react";
import { RefreshCcw, AlertCircle } from "lucide-react";

export default function GlobalRootError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("[Teh Raja Global Root Error]", error);

        const msg = String(error?.message || "");
        if (
            (msg.includes("ChunkLoadError") || msg.includes("Loading chunk") || msg.includes("Cannot read properties of undefined")) &&
            typeof window !== "undefined"
        ) {
            const lastReload = sessionStorage.getItem("teh_raja_root_auto_reload");
            const now = Date.now();
            if (!lastReload || now - parseInt(lastReload, 10) > 15000) {
                sessionStorage.setItem("teh_raja_root_auto_reload", String(now));
                try {
                    window.caches.keys().then((names) => {
                        Promise.all(names.map((name) => window.caches.delete(name))).finally(() => {
                            window.location.reload();
                        });
                    }).catch(() => {
                        window.location.reload();
                    });
                } catch {
                    window.location.reload();
                }
            }
        }
    }, [error]);

    const handleClearAndReload = async () => {
        try {
            if (typeof window !== "undefined") {
                if ("serviceWorker" in navigator) {
                    const registrations = await navigator.serviceWorker.getRegistrations();
                    for (const reg of registrations) {
                        await reg.unregister();
                    }
                }
                if ("caches" in window) {
                    const keys = await caches.keys();
                    for (const key of keys) {
                        await caches.delete(key);
                    }
                }
                sessionStorage.clear();
                window.location.href = "/";
            }
        } catch {
            window.location.reload();
        }
    };

    return (
        <html lang="id">
            <body className="min-h-screen bg-[#07221B] text-amber-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-[#0D2B20] border border-amber-400/30 rounded-3xl p-6 sm:p-8 shadow-2xl text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-amber-400/20 rounded-2xl flex items-center justify-center border border-amber-400/30">
                        <AlertCircle size={32} className="text-amber-400" />
                    </div>

                    <h1 className="text-xl sm:text-2xl font-black text-amber-400 font-serif mb-2">
                        Pembaruan Sistem Teh Raja
                    </h1>

                    <p className="text-xs sm:text-sm text-white/80 leading-relaxed mb-6">
                        Aplikasi telah diperbarui dengan versi terbaru di server. Silakan muat ulang untuk menyinkronkan data & tampilan terbaru di HP Anda.
                    </p>

                    <div className="space-y-3">
                        <button
                            onClick={handleClearAndReload}
                            className="w-full py-3.5 px-4 bg-amber-400 text-[#07221B] font-black rounded-xl text-sm hover:bg-amber-300 active:scale-95 transition flex items-center justify-center gap-2 shadow-lg"
                        >
                            <RefreshCcw size={16} />
                            Muat Ulang & Bersihkan Cache
                        </button>

                        <button
                            onClick={() => reset()}
                            className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs transition"
                        >
                            Coba Lagi
                        </button>
                    </div>
                </div>
            </body>
        </html>
    );
}
