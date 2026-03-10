"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function PWAInstall() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showInstallBadge, setShowInstallBadge] = useState(false);

    useEffect(() => {
        // Register Service Worker
        if ("serviceWorker" in navigator) {
            window.addEventListener("load", () => {
                navigator.serviceWorker
                    .register("/sw.js")
                    .then((registration) => {
                        console.log("Service Worker registered:", registration.scope);
                    })
                    .catch((error) => {
                        console.error("Service Worker registration failed:", error);
                    });
            });
        }

        // Handle Install Prompt
        const handleBeforeInstallPrompt = (e: any) => {
            // Prevent Chrome 67 and earlier from automatically showing the prompt
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setDeferredPrompt(e);
            // Update UI notify the user they can install the PWA
            setShowInstallBadge(true);
        };

        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        // Show the install prompt
        deferredPrompt.prompt();

        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);

        // We've used the prompt, and can't use it again, throw it away
        setDeferredPrompt(null);
        setShowInstallBadge(false);
    };

    return (
        <AnimatePresence>
            {showInstallBadge && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 20, opacity: 0 }}
                    className="fixed bottom-6 right-6 z-[100] group"
                >
                    <div className="flex flex-col items-end gap-2">
                        {/* Tooltip-like message */}
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className="bg-white text-[#0D2B20] text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg border border-amber-100 flex items-center gap-2 whitespace-nowrap"
                        >
                            <span>Install App Teh Raja</span>
                            <button
                                onClick={() => setShowInstallBadge(false)}
                                className="hover:text-red-500 transition"
                            >
                                <X size={12} />
                            </button>
                        </motion.div>

                        {/* Main Floating Button */}
                        <button
                            onClick={handleInstallClick}
                            className="bg-amber-400 text-[#0D2B20] p-4 rounded-2xl shadow-2xl hover:bg-amber-300 transition-all transform hover:scale-110 active:scale-95 flex items-center gap-2 border-2 border-white"
                        >
                            <Download size={24} className="animate-bounce" />
                            <span className="font-black text-sm pr-2">PASANG APLIKASI</span>
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
