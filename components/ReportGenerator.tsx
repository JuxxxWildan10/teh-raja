"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Order } from "@/lib/store";
import { Download, FileText } from "lucide-react";

interface ReportGeneratorProps {
    orders: Order[];
}

export default function ReportGenerator({ orders }: ReportGeneratorProps) {

    const generatePDF = () => {
        const doc = new jsPDF();

        // --- Header ---
        doc.setFillColor(26, 77, 62); // Forest Green
        doc.rect(0, 0, 210, 30, 'F');

        doc.setTextColor(255, 255, 255);
        // doc.setFont("times", "bold"); // Removing custom font for now to avoid issues
        doc.setFontSize(22);
        doc.text("TEH RAJA", 105, 15, { align: "center" });

        doc.setFontSize(10);
        // doc.setFont("helvetica", "normal");
        doc.text("Authentic Premium Tea | Est. 2024", 105, 22, { align: "center" });

        // --- Info ---
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(14);
        doc.text("Laporan Penjualan Harian", 14, 45);

        doc.setFontSize(10);
        doc.text(`Tanggal Cetak: ${new Date().toLocaleString('id-ID')}`, 14, 52);

        const total = orders.reduce((acc, curr) => acc + curr.total, 0);
        doc.text(`Total Omset: Rp ${total.toLocaleString('id-ID')}`, 14, 58);

        // --- Table ---
        const tableColumn = ["Order", "Waktu", "Kasir", "Detail", "Total"];
        const tableRows: any[] = [];

        orders.forEach(order => {
            const itemsString = order.items.map(i => `${i.name} (x${i.quantity})`).join(', ');
            const orderData = [
                order.id.substring(0, 6),
                new Date(order.date).toLocaleTimeString('id-ID'),
                order.customerName || "Guest",
                itemsString,
                `Rp ${order.total.toLocaleString('id-ID')}`
            ];
            tableRows.push(orderData);
        });

        // @ts-ignore
        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 65,
            theme: 'grid',
            headStyles: { fillColor: [212, 175, 55], textColor: [26, 77, 62] },
        });

        // --- Footer ---
        // @ts-ignore
        const finalY = doc.lastAutoTable.finalY || 150;

        doc.setFontSize(10);
        doc.text("Mengetahui,", 160, finalY + 20, { align: 'center' });
        doc.text("( Manajer )", 160, finalY + 40, { align: 'center' });

        doc.save(`Laporan_Harian_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    return (
        <button onClick={generatePDF} className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded shadow hover:bg-red-700 transition">
            <FileText size={16} /> Export PDF (Resmi)
        </button>
    );
}
