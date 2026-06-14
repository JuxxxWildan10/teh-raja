"use client";

/**
 * @file Receipt Modal Component
 * @description Komponen tampilan UI untuk struk belanja. Menyediakan opsi untuk mencetak via Bluetooth Thermal atau mendownloadnya sebagai gambar.
 */


import { useRef } from "react";
import { Order, formatVariantLabel } from "@/lib/store";
import { X, Printer, Share2, Bluetooth } from "lucide-react";
import { motion } from "framer-motion";
import { buildReceiptPayload, printViaBluetooth } from "@/lib/printer";
import html2canvas from "html2canvas";

interface ReceiptModalProps {
    order: Order;
    onClose: () => void;
}

const PAYMENT_LABEL: Record<string, string> = {
    cash: 'Tunai',
    qris: 'QRIS',
    transfer: 'Transfer Bank',
};

function formatRp(n: number) {
    return 'Rp ' + n.toLocaleString('id-ID');
}

export default function ReceiptModal({ order, onClose }: ReceiptModalProps) {
    const receiptRef = useRef<HTMLDivElement>(null);

    const handleBluetoothPrint = async () => {
        try {
            const payload = buildReceiptPayload(order);
            await printViaBluetooth(payload);
        } catch (err: any) {
            alert(err.message || 'Gagal menyambung ke Printer Bluetooth');
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handleWhatsApp = async () => {
        if (!receiptRef.current) return;
        try {
            const canvas = await html2canvas(receiptRef.current, { scale: 2 });
            canvas.toBlob(async (blob) => {
                if (!blob) return;
                const file = new File([blob], `Struk_${order.id.slice(0, 8)}.png`, { type: 'image/png' });
                
                const text = `*Struk Teh Raja*\nOrder #${order.id.slice(0, 8).toUpperCase()}\nTotal: ${formatRp(order.total)}`;

                if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        title: 'Struk Teh Raja',
                        text: text,
                        files: [file]
                    });
                } else {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = file.name;
                    a.click();
                    URL.revokeObjectURL(url);
                    window.open(`https://wa.me/?text=${encodeURIComponent(text + '\n\nSilakan lampirkan gambar struk yang baru saja diunduh.')}`, '_blank');
                }
            }, 'image/png');
        } catch (err) {
            console.error('Error generating receipt image:', err);
            alert('Gagal membuat gambar struk');
        }
    };

    const payLabel = order.paymentMethod ? PAYMENT_LABEL[order.paymentMethod] : '-';

    return (
        <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white text-black w-full max-w-[320px] rounded-lg overflow-hidden shadow-2xl relative"
        >
            {/* Close button (top-right) */}
            <div className="absolute top-2 right-2 print:hidden z-10">
                <button onClick={onClose} className="p-1.5 bg-gray-100 rounded-full hover:bg-gray-200 transition">
                    <X size={14} />
                </button>
            </div>

            {/* Receipt Content — id used by @media print */}
            <div id="print-receipt" ref={receiptRef} className="p-6 bg-white font-mono text-[11px] relative max-h-[85vh] overflow-y-auto scrollbar-hide">
                {/* Paper top edge */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-b from-gray-200 to-transparent opacity-20" />

                {/* Store Header */}
                <div className="text-center mb-4 border-b border-dashed border-gray-400 pb-3">
                    <h2 className="text-base font-bold uppercase tracking-widest">TEH RAJA</h2>
                    <p className="text-gray-500 text-[10px]">Authentic Tea &amp; Blends</p>
                    <p className="text-gray-500 text-[10px] mt-0.5">Jl. Raja Tea No. 1, Indonesia</p>
                    <p className="text-gray-500 text-[10px]">@tehraja.id</p>
                </div>

                {/* Order Info */}
                <div className="mb-3 border-b border-dashed border-gray-300 pb-3 space-y-0.5">
                    <div className="flex justify-between">
                        <span className="text-gray-600">No. Order</span>
                        <span className="font-bold">#{order.id.slice(0, 8).toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">Tanggal</span>
                        <span>{new Date(order.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">Waktu</span>
                        <span>{new Date(order.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">Kasir</span>
                        <span>{order.cashierName || 'Staff'}</span>
                    </div>
                </div>

                {/* Customer Info */}
                <div className="mb-3 border-b border-dashed border-gray-300 pb-3 space-y-0.5">
                    <div className="flex justify-between">
                        <span className="text-gray-600">Pelanggan</span>
                        <span className="font-bold">{order.customerName || 'Guest'}</span>
                    </div>
                    {order.tableNumber && (
                        <div className="flex justify-between">
                            <span className="text-gray-600">No. Meja</span>
                            <span className="font-bold">{order.tableNumber}</span>
                        </div>
                    )}
                    {order.orderType && (
                        <div className="flex justify-between">
                            <span className="text-gray-600">Tipe Order</span>
                            <span className="font-bold uppercase">{order.orderType === 'dine-in' ? 'Makan di Tempat' : 'Bawa Pulang'}</span>
                        </div>
                    )}
                </div>

                {/* Items */}
                <div className="mb-3 border-b border-dashed border-gray-300 pb-3 space-y-2">
                    <p className="font-bold text-[10px] uppercase tracking-widest text-gray-500 mb-1">Pesanan</p>
                    {order.items.map((item, index) => {
                        const variantLabel = formatVariantLabel(item.variants);
                        const finalPrice = item.finalPrice ?? item.price;
                        return (
                            <div key={index}>
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <span className="font-bold">{item.quantity}x</span> {item.name}
                                    </div>
                                    <span className="ml-2 flex-shrink-0">{formatRp(finalPrice * item.quantity)}</span>
                                </div>
                                <div className="flex justify-between text-gray-500 text-[9px] pl-4 font-bold">
                                    <span>
                                        @ {formatRp(finalPrice)} 
                                        {variantLabel && <span className="text-amber-600 font-normal ml-1">· {variantLabel}</span>}
                                    </span>
                                </div>
                                {item.note && (
                                    <div className="text-[9px] text-gray-500 italic pl-4">
                                        * {item.note}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Subtotal + Discount + Total */}
                <div className="mb-3 border-b border-dashed border-gray-400 pb-3 space-y-0.5">
                    {order.discount && order.discount > 0 && (
                        <>
                            <div className="flex justify-between text-sm text-gray-500">
                                <span>Subtotal</span>
                                <span>{formatRp(order.subtotal || order.total + order.discount)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-red-600 font-bold">
                                <span>
                                    Diskon{order.discountType === 'percent' ? ` (${order.discountValue}%)` : ''}
                                </span>
                                <span>-{formatRp(order.discount)}</span>
                            </div>
                        </>
                    )}
                    <div className="flex justify-between font-bold text-sm">
                        <span>TOTAL</span>
                        <span>{formatRp(order.total)}</span>
                    </div>
                </div>

                {/* Payment Info */}
                <div className="mb-4 space-y-0.5">
                    <div className="flex justify-between">
                        <span className="text-gray-500">Metode Bayar</span>
                        <span className="font-bold">{payLabel}</span>
                    </div>
                    {order.paymentMethod === 'cash' && order.cashReceived != null && (
                        <>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Diterima</span>
                                <span className="font-bold">{formatRp(order.cashReceived)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-green-700">
                                <span>Kembalian</span>
                                <span>{formatRp(order.changeAmount ?? 0)}</span>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="text-center text-[9px] text-gray-400 space-y-0.5">
                    <p>- - - - - - - - - - - - - - - - - -</p>
                    <p className="font-bold">Terima kasih telah berbelanja!</p>
                    <p>Simpan struk ini sebagai bukti pembayaran.</p>
                    <p>Follow us @tehraja.id</p>
                    <p className="mt-1">Dibuat dengan ❤ oleh Teh Raja POS</p>
                </div>
            </div>

            {/* Footer Actions (Hidden in Print) */}
            <div className="bg-gray-50 p-3 border-t border-gray-100 space-y-2 print:hidden">
                {/* WhatsApp — prominent full-width */}
                <button
                    onClick={handleWhatsApp}
                    className="w-full py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 flex items-center justify-center gap-2 text-sm transition shadow-lg shadow-green-500/20"
                >
                    <Share2 size={16} /> Kirim via WhatsApp
                </button>
                {/* Print row */}
                <div className="flex gap-2">
                    <button
                        onClick={handlePrint}
                        className="flex-1 py-2.5 bg-forest text-gold rounded-lg font-bold hover:bg-forest-light flex items-center justify-center gap-1.5 text-xs transition"
                    >
                        <Printer size={14} /> Cetak (Browser)
                    </button>
                    <button
                        onClick={handleBluetoothPrint}
                        className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 flex items-center justify-center gap-1.5 text-xs transition shadow-lg shadow-blue-500/20"
                    >
                        <Bluetooth size={14} /> Thermal
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-100 text-xs transition font-medium"
                    >
                        Tutup
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
