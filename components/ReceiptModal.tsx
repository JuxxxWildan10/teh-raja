"use client";

import { useRef } from "react";
import { Order } from "@/lib/store";
import { X, Download, Share2 } from "lucide-react";
import { motion } from "framer-motion";

interface ReceiptModalProps {
    order: Order;
    onClose: () => void;
}

export default function ReceiptModal({ order, onClose }: ReceiptModalProps) {
    const receiptRef = useRef<HTMLDivElement>(null);

    const handleDownload = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm print:bg-white print:p-0">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white text-black w-full max-w-sm rounded-lg overflow-hidden shadow-2xl relative print:shadow-none print:w-full print:max-w-none"
            >
                {/* Header Actions (Hidden in Print) */}
                <div className="absolute top-2 right-2 flex gap-2 print:hidden z-10">
                    <button onClick={onClose} className="p-1 bg-gray-100 rounded-full hover:bg-gray-200">
                        <X size={16} />
                    </button>
                </div>

                {/* Receipt Content */}
                <div ref={receiptRef} className="p-8 bg-white font-mono text-sm relative">
                    {/* Paper Texture Effect */}
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-b from-gray-200 to-transparent opacity-20" />

                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold uppercase tracking-widest border-b-2 border-black pb-2 mb-2">TEH RAJA</h2>
                        <p className="text-xs text-gray-500">Authentic Tea & Blends</p>
                        <p className="text-xs text-gray-500">{new Date(order.date).toLocaleString('id-ID')}</p>
                        <p className="text-xs text-gray-500 mt-1">Order ID: #{order.id.slice(0, 8)}</p>
                    </div>

                    <div className="mb-6 border-b border-dashed border-gray-300 pb-4">
                        <div className="flex justify-between mb-2 text-gray-600">
                            <span>Pelanggan</span>
                            <span className="font-bold">{order.customerName || "Guest"}</span>
                        </div>
                    </div>

                    <div className="space-y-3 mb-6">
                        {order.items.map((item, index) => (
                            <div key={index} className="flex justify-between items-start">
                                <div>
                                    <div>
                                        <span className="font-bold">{item.quantity}x</span> {item.name}
                                    </div>
                                    {item.note && (
                                        <div className="text-xs text-gray-500 italic pl-5">
                                            "{item.note}"
                                        </div>
                                    )}
                                </div>
                                <span>Rp {(item.price * item.quantity).toLocaleString('id-ID')}</span>
                            </div>
                        ))}
                    </div>

                    <div className="border-t-2 border-black pt-4 mb-8">
                        <div className="flex justify-between text-lg font-bold">
                            <span>TOTAL</span>
                            <span>Rp {order.total.toLocaleString('id-ID')}</span>
                        </div>
                    </div>

                    <div className="text-center text-xs text-gray-400 space-y-1">
                        <p>Terima kasih telah berbelanja!</p>
                        <p>Simpan struk ini sebagai bukti pembayaran.</p>
                        <p>Follow us @tehraja.id</p>
                    </div>

                    {/* Jagged Bottom Edge */}
                    <div className="absolute bottom-0 left-0 w-full h-4 bg-white" style={{
                        backgroundImage: 'linear-gradient(45deg, transparent 75%, white 75%), linear-gradient(-45deg, transparent 75%, white 75%)',
                        backgroundSize: '20px 20px',
                        backgroundPosition: '0 10px'
                    }}></div>
                </div>

                {/* Footer Actions (Hidden in Print) */}
                <div className="bg-gray-50 p-4 border-t border-gray-100 flex gap-3 print:hidden">
                    <button onClick={handleDownload} className="flex-1 py-2 bg-black text-white rounded font-bold hover:bg-gray-800 flex items-center justify-center gap-2">
                        <Download size={16} /> Simpan / Cetak
                    </button>
                    <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100">
                        Tutup
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
