import React from "react";
import { Leaf, GraduationCap } from "lucide-react";

interface FooterProps {
    className?: string;
    variant?: "dark" | "light";
}

export default function Footer({ className = "", variant = "dark" }: FooterProps) {
    const isDark = variant === "dark";

    return (
        <footer
            className={`border-t select-none transition-colors ${
                isDark
                    ? "border-white/10 bg-black/40 text-white/60"
                    : "border-gray-200 bg-white text-gray-600"
            } px-4 sm:px-6 py-8 text-center text-xs space-y-2.5 ${className}`}
        >
            <div className="flex items-center justify-center gap-1.5">
                <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center ${
                        isDark ? "bg-amber-400/20 text-amber-400" : "bg-emerald-800/10 text-emerald-800"
                    }`}
                >
                    <Leaf size={11} />
                </div>
                <p className={`font-serif font-bold tracking-wider uppercase ${isDark ? "text-white/90" : "text-gray-900"}`}>
                    TEH RAJA &copy; 2026 · Authentic Tea &amp; Blends
                </p>
            </div>

            <p className="text-xs">
                Dibuat oleh{" "}
                <strong className={`font-bold ${isDark ? "text-amber-400" : "text-emerald-900"}`}>
                    M. Yarzuq Wildani
                </strong>{" "}
                (NIM:{" "}
                <span className={`font-mono font-bold ${isDark ? "text-amber-300" : "text-amber-700"}`}>
                    0402231058
                </span>
                )
            </p>

            <div className={`flex items-center justify-center gap-1.5 text-[11px] ${isDark ? "text-white/40" : "text-gray-400"}`}>
                <GraduationCap size={13} className="inline opacity-70" />
                <span>
                    Praktik Kerja Lapangan (PKL) · Teknik Informatika 2026 · Universitas Nahdlatul Ulama Cirebon
                </span>
            </div>
        </footer>
    );
}

