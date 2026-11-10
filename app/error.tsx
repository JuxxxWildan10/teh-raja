"use client";

/**
 * ============================================================================
 * FILE: app/error.tsx
 * ============================================================================
 * @file Client-Side Error Boundary & PWA Recovery
 * @description Menangkap error runtime di sisi klien (misal: ChunkLoadError
 * akibat pembaruan build Vercel, service worker cache mismatch, atau network hiccup)
 * dan memberikan opsi recovery / pembersihan cache otomatis agar aplikasi tidak
 * menampilkan layar putih crash "Application error: a client-side exception has occurred".
 * ============================================================================
 */

import { useEffect } from "react";
import { RefreshCcw, Home, AlertCircle } from "lucide-react";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("[Teh Raja Client Error]", error);

        // Auto-recover from stale PWA chunk mismatch after a new Vercel deployment
        const msg = String(error?.message || "");
        const isChunkError =
            msg.includes("ChunkLoadError") ||
            msg.includes("Loading chunk") ||
            msg.includes("failed to fetch") ||
            msg.includes("Cannot read properties of undefined");

        if (isChunkError && typeof window !== "undefined") {
            const lastReload = sessionStorage.getItem("teh_raja_chunk_auto_reload");
            const now = Date.now();
            if (!lastReload || now - parseInt(lastReload, 10) > 15000) {
                sessionStorage.setItem("teh_raja_chunk_auto_reload", String(now));
                // Clear service worker caches and hard reload
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

    const handleHardReload = async () => {
        try {
            if (typeof window !== "undefined") {
                if ("serviceWorker" in navigator) {
                    const registrations = await navigator.serviceWorker.getRegistrations();
                    for (const registration of registrations) {
                        await registration.unregister();
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
        <div className="min-h-screen bg-[#07221B] text-amber-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-[#0D2B20] border border-amber-400/30 rounded-3xl p-6 sm:p-8 shadow-2xl text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-amber-400/20 rounded-2xl flex items-center justify-center border border-amber-400/30">
                    <AlertCircle size={32} className="text-amber-400" />
                </div>

                <h1 className="text-xl sm:text-2xl font-black text-amber-400 font-serif mb-2">
                    Pembaruan Sistem Teh Raja
                </h1>

                <p className="text-xs sm:text-sm text-white/80 leading-relaxed mb-6">
                    Aplikasi mendeteksi pembaruan versi terbaru pada server. Silakan muat ulang untuk menyinkronkan data & tampilan terbaru.
                </p>

                <div className="space-y-3">
                    <button
                        onClick={handleHardReload}
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

                    <button
                        onClick={() => {
                            if (typeof window !== "undefined") window.location.href = "/";
                        }}
                        className="w-full py-2.5 px-4 text-white/60 hover:text-white text-xs transition flex items-center justify-center gap-1.5"
                    >
                        <Home size={14} />
                        Kembali ke Halaman Utama
                    </button>
                </div>

                {error?.message && (
                    <p className="mt-6 text-[10px] text-white/30 font-mono break-all line-clamp-2">
                        Ref: {error.message}
                    </p>
                )}
            </div>
        </div>
    );
}
