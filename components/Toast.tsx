"use client";

import { createContext, useContext, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
}

interface ToastContextValue {
    toast: (message: string, type?: ToastType, duration?: number) => void;
    success: (message: string) => void;
    error: (message: string) => void;
    warning: (message: string) => void;
    info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const counterRef = useRef(0);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const addToast = useCallback((message: string, type: ToastType = "info", duration = 3500) => {
        const id = `toast-${++counterRef.current}`;
        setToasts(prev => [...prev, { id, message, type, duration }]);
        setTimeout(() => removeToast(id), duration);
    }, [removeToast]);

    const ctx: ToastContextValue = {
        toast: addToast,
        success: (m) => addToast(m, "success"),
        error: (m) => addToast(m, "error", 4500),
        warning: (m) => addToast(m, "warning", 4000),
        info: (m) => addToast(m, "info"),
    };

    const icons: Record<ToastType, React.ReactNode> = {
        success: <CheckCircle size={18} className="flex-shrink-0" />,
        error: <XCircle size={18} className="flex-shrink-0" />,
        warning: <AlertTriangle size={18} className="flex-shrink-0" />,
        info: <Info size={18} className="flex-shrink-0" />,
    };

    const styles: Record<ToastType, string> = {
        success: "bg-green-800 text-green-50 border-green-600",
        error: "bg-red-900 text-red-50 border-red-600",
        warning: "bg-amber-800 text-amber-50 border-amber-500",
        info: "bg-[#0D2B20] text-white border-amber-400/40",
    };

    return (
        <ToastContext.Provider value={ctx}>
            {children}
            <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none" aria-live="polite">
                <AnimatePresence initial={false}>
                    {toasts.map(t => (
                        <motion.div
                            key={t.id}
                            initial={{ opacity: 0, x: 80, scale: 0.9 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 80, scale: 0.9 }}
                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                            className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border shadow-2xl max-w-xs text-sm font-medium ${styles[t.type]}`}
                        >
                            {icons[t.type]}
                            <span className="flex-1 leading-snug">{t.message}</span>
                            <button
                                onClick={() => removeToast(t.id)}
                                className="opacity-60 hover:opacity-100 transition flex-shrink-0 mt-0.5"
                                aria-label="Tutup notifikasi"
                            >
                                <X size={14} />
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
}

export function useToast(): ToastContextValue {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error("useToast must be used within ToastProvider");
    return ctx;
}
