"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    danger?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ConfirmModal({
    isOpen,
    title,
    message,
    confirmLabel = "Ya, Lanjutkan",
    cancelLabel = "Batal",
    danger = false,
    onConfirm,
    onCancel,
}: ConfirmModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={onCancel}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 10 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 10 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        onClick={e => e.stopPropagation()}
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
                    >
                        {/* Header */}
                        <div className={`p-5 flex items-start gap-4 ${danger ? "bg-red-50" : "bg-amber-50"}`}>
                            <div className={`p-2 rounded-full flex-shrink-0 ${danger ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"}`}>
                                <AlertTriangle size={22} />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-black text-gray-900 text-base">{title}</h3>
                                <p className="text-sm text-gray-500 mt-1 leading-relaxed">{message}</p>
                            </div>
                            <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition flex-shrink-0">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Actions */}
                        <div className="p-4 flex gap-3 bg-white">
                            <button
                                onClick={onCancel}
                                className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 transition"
                            >
                                {cancelLabel}
                            </button>
                            <button
                                onClick={() => { onConfirm(); }}
                                className={`flex-1 py-2.5 rounded-xl text-sm font-black transition hover:scale-[1.02] active:scale-[0.98] ${danger
                                    ? "bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-200"
                                    : "bg-[#0D2B20] text-amber-400 hover:bg-[#1a4433] shadow-lg shadow-green-900/20"
                                    }`}
                            >
                                {confirmLabel}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
