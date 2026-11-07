"use client";

/**
 * ============================================================================
 * FILE: components/ReportGenerator.tsx
 * ============================================================================
 * FUNGSI UTAMA:
 * Komponen pembuat laporan penjualan resmi dalam format dokumen **PDF (`jsPDF` & `jspdf-autotable`)**.
 *
 * ALUR KERJA (`generatePDF`):
 * 1. Memfilter hanya transaksi yang valid (`status !== 'cancelled'`).
 * 2. Menghitung total omzet, jumlah pesanan valid, dan total diskon.
 * 3. Mencetak tabel transaksi lengkap ke dalam file PDF bernama `Laporan_Penjualan_TehRaja_YYYY-MM-DD.pdf`.
 * ============================================================================
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Order } from "@/lib/store";
import { FileText } from "lucide-react";

interface ReportGeneratorProps {
    orders: Order[];
    periodLabel?: string;
}

export default function ReportGenerator({ orders, periodLabel }: ReportGeneratorProps) {

    const generatePDF = () => {
        const doc = new jsPDF();
        const validOrders = orders.filter(o => o.status !== 'cancelled');

        // --- Header ---
        doc.setFillColor(13, 43, 32); // Forest Green
        doc.rect(0, 0, 210, 32, 'F');

        doc.setTextColor(212, 175, 55);
        doc.setFontSize(22);
        doc.text("TEH RAJA", 105, 15, { align: "center" });

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.text("Authentic Premium Tea & Blends | Laporan Resmi POS", 105, 23, { align: "center" });

        // --- Info ---
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(14);
        doc.text("Laporan Penjualan & Transaksi", 14, 44);

        const totalOmset = validOrders.reduce((acc, curr) => acc + curr.total, 0);
        const totalDiscount = validOrders.reduce((acc, curr) => acc + (curr.discount || 0), 0);

        doc.setFontSize(10);
        doc.text(`Tanggal Cetak   : ${new Date().toLocaleString('id-ID')}`, 14, 51);
        doc.text(`Periode / Shift : ${periodLabel || 'Semua Hari — Semua Sesi Shift'}`, 14, 57);
        doc.text(`Transaksi Valid : ${validOrders.length} pesanan (Dibatalkan: ${orders.length - validOrders.length})`, 14, 63);
        doc.text(`Total Diskon    : Rp ${totalDiscount.toLocaleString('id-ID')}`, 14, 69);
        doc.text(`Total Omset     : Rp ${totalOmset.toLocaleString('id-ID')}`, 14, 75);

        // --- Table ---
        const tableColumn = ["Order ID", "Waktu", "Pelanggan", "Metode", "Rincian Menu", "Total"];
        const tableRows: string[][] = [];

        validOrders.forEach(order => {
            const itemsString = order.items.map(i => `${i.name} (x${i.quantity})`).join(', ');
            const orderData = [
                `#${order.id.substring(0, 6).toUpperCase()}`,
                new Date(order.date).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }),
                order.customerName || "Guest",
                (order.paymentMethod || 'cash').toUpperCase(),
                itemsString,
                `Rp ${order.total.toLocaleString('id-ID')}`
            ];
            tableRows.push(orderData);
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 81,
            theme: 'grid',
            headStyles: { fillColor: [212, 175, 55], textColor: [13, 43, 32] },
            styles: { fontSize: 8.5 },
        });

        // --- Footer ---
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const finalY = (doc as any).lastAutoTable?.finalY || 150;

        doc.setFontSize(10);
        doc.text("Mengetahui,", 160, finalY + 20, { align: 'center' });
        doc.text("( Manajer Operasional Teh Raja )", 160, finalY + 40, { align: 'center' });

        doc.save(`Laporan_Penjualan_TehRaja_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    return (
        <button onClick={generatePDF} className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded shadow hover:bg-red-700 transition text-sm font-bold">
            <FileText size={16} /> Export PDF
        </button>
    );
}
