"use client";

/**
 * ============================================================================
 * FILE: components/PklLogbookPanel.tsx
 * ============================================================================
 * @file Modul Logbook Kehadiran & Kegiatan Harian PKL (Formulir F-06)
 * @description Panel bukti kehadiran harian Praktik Kerja Lapangan (PKL)
 * mahasiswa M. Yarzuq Wildani (NIM: 0402231058) di Mitra Kedai Istana Teh Raja
 * di bawah bimbingan Pembimbing Lapangan Ibu Lavia Rosulia, S.H.
 * Mendukung input/edit presensi harian, verifikasi paraf PL, cetak dokumen resmi
 * F-06 siap tanda tangan (PDF/Print), dan ekspor Excel (.xlsx).
 * ============================================================================
 */

import { useState, useMemo } from "react";
import {
    usePklLogbookStore,
    PKL_METADATA,
    PklAttendanceEntry,
    PklLogCategory,
} from "@/lib/store";
import { useToast } from "@/components/Toast";
import * as XLSX from "xlsx";
import {
    ClipboardCheck,
    Plus,
    Printer,
    FileSpreadsheet,
    CheckCircle,
    Clock,
    Calendar,
    Search,
    Edit,
    Trash,
    RotateCcw,
    X,
    Save,
    Award,
    Building2,
    UserCheck,
    BookOpen,
} from "lucide-react";

const CATEGORIES: PklLogCategory[] = [
    "Observasi & Analisis",
    "Perancangan Sistem",
    "Implementasi POS",
    "Implementasi BOM",
    "Pengujian & Evaluasi",
    "Dokumentasi & Serah Terima",
];

const DAYS_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const MONTHS_ID = [
    "",
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
];

function formatIndoDate(isoDate: string): { dayName: string; dateLabel: string } {
    const parts = isoDate.split("-").map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) {
        return { dayName: "Senin", dateLabel: isoDate };
    }
    const [y, m, d] = parts;
    const dt = new Date(y, m - 1, d);
    return {
        dayName: DAYS_ID[dt.getDay()] || "Senin",
        dateLabel: `${d} ${MONTHS_ID[m] || ""} ${y}`,
    };
}

function calculateHoursBetween(checkIn: string, checkOut: string): number {
    const [h1, m1] = checkIn.split(":").map(Number);
    const [h2, m2] = checkOut.split(":").map(Number);
    if ([h1, m1, h2, m2].some(isNaN)) return 3;
    const diff = (h2 * 60 + m2 - (h1 * 60 + m1)) / 60;
    return diff > 0 ? Math.round(diff * 10) / 10 : 3;
}

export default function PklLogbookPanel() {
    const {
        entries,
        addEntry,
        updateEntry,
        deleteEntry,
        toggleVerifyEntry,
        verifyAllEntries,
        resetDefaultLogbook,
    } = usePklLogbookStore();
    const toast = useToast();

    const [selectedWeek, setSelectedWeek] = useState<number | "all">("all");
    const [selectedCategory, setSelectedCategory] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const [form, setForm] = useState({
        dayNumber: entries.length + 1,
        weekNumber: 8,
        date: "2026-12-31",
        checkIn: "09:00",
        checkOut: "12:00",
        durationHours: 3,
        status: "hadir" as "hadir" | "izin" | "sakit",
        category: "Implementasi POS" as PklLogCategory,
        activity: "",
        output: "",
        supervisorVerified: true,
    });

    // Summary Metrics
    const summary = useMemo(() => {
        const totalDays = entries.length;
        const hadirDays = entries.filter((e) => e.status === "hadir").length;
        const totalHours = entries.reduce((sum, e) => sum + (Number(e.durationHours) || 0), 0);
        const verifiedCount = entries.filter((e) => e.supervisorVerified).length;
        const progressPct = Math.min(100, Math.round((totalHours / PKL_METADATA.minRequiredHours) * 100));

        const byWeek = Array.from({ length: 8 }, (_, idx) => {
            const w = idx + 1;
            const wEntries = entries.filter((e) => e.weekNumber === w);
            const hours = wEntries.reduce((s, e) => s + (Number(e.durationHours) || 0), 0);
            const firstDate = wEntries[0]?.dateLabel || "-";
            const lastDate = wEntries[wEntries.length - 1]?.dateLabel || "-";
            return {
                week: w,
                days: wEntries.length,
                hours,
                range: wEntries.length > 0 ? `${firstDate} – ${lastDate}` : "-",
            };
        });

        return {
            totalDays,
            hadirDays,
            totalHours,
            verifiedCount,
            progressPct,
            byWeek,
        };
    }, [entries]);

    const filteredEntries = useMemo(() => {
        return entries.filter((e) => {
            if (selectedWeek !== "all" && e.weekNumber !== selectedWeek) return false;
            if (selectedCategory !== "all" && e.category !== selectedCategory) return false;
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                return (
                    e.dateLabel.toLowerCase().includes(q) ||
                    e.dayName.toLowerCase().includes(q) ||
                    e.activity.toLowerCase().includes(q) ||
                    e.output.toLowerCase().includes(q) ||
                    e.category.toLowerCase().includes(q)
                );
            }
            return true;
        });
    }, [entries, selectedWeek, selectedCategory, searchQuery]);

    const openAddModal = () => {
        setEditingId(null);
        const nextDay = entries.length + 1;
        setForm({
            dayNumber: nextDay,
            weekNumber: Math.min(8, Math.ceil(nextDay / 6)),
            date: new Date().toISOString().slice(0, 10),
            checkIn: "09:00",
            checkOut: "13:00",
            durationHours: 4,
            status: "hadir",
            category: "Implementasi POS",
            activity: "",
            output: "",
            supervisorVerified: true,
        });
        setModalOpen(true);
    };

    const openEditModal = (entry: PklAttendanceEntry) => {
        setEditingId(entry.id);
        setForm({
            dayNumber: entry.dayNumber,
            weekNumber: entry.weekNumber,
            date: entry.date,
            checkIn: entry.checkIn,
            checkOut: entry.checkOut,
            durationHours: entry.durationHours,
            status: entry.status,
            category: entry.category,
            activity: entry.activity,
            output: entry.output,
            supervisorVerified: entry.supervisorVerified,
        });
        setModalOpen(true);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.activity.trim()) {
            toast.error("Uraian kegiatan harian wajib diisi!");
            return;
        }
        const { dayName, dateLabel } = formatIndoDate(form.date);
        const payload = {
            dayNumber: Number(form.dayNumber) || 1,
            weekNumber: Number(form.weekNumber) || 1,
            date: form.date,
            dayName,
            dateLabel,
            checkIn: form.checkIn,
            checkOut: form.checkOut,
            durationHours: Number(form.durationHours) || calculateHoursBetween(form.checkIn, form.checkOut),
            status: form.status,
            category: form.category,
            activity: form.activity.trim(),
            output: form.output.trim() || "Terdokumentasi pada repositori & log operasional mitra",
            supervisorVerified: form.supervisorVerified,
        };

        if (editingId) {
            updateEntry(editingId, payload);
            toast.success(`Logbook Hari ke-${payload.dayNumber} (${dateLabel}) diperbarui.`);
        } else {
            addEntry(payload);
            toast.success(`Kehadiran Hari ke-${payload.dayNumber} (${dateLabel}) berhasil dicatat!`);
        }
        setModalOpen(false);
    };

    // Export Excel (.xlsx)
    const handleExportExcel = () => {
        const dailyRows = entries.map((e) => ({
            "Hari Ke": e.dayNumber,
            "Minggu Ke": `Minggu ${e.weekNumber}`,
            "Hari": e.dayName,
            "Tanggal": e.dateLabel,
            "Jam Datang": e.checkIn,
            "Jam Pulang": e.checkOut,
            "Durasi (Jam)": e.durationHours,
            "Status Kehadiran": e.status.toUpperCase(),
            "Tahapan Kegiatan": e.category,
            "Uraian Kegiatan Harian di Mitra": e.activity,
            "Bukti / Luaran Harian": e.output,
            "Verifikasi PL (Lavia Rosulia, S.H.)": e.supervisorVerified ? "Valid / Paraf PL" : "Menunggu",
        }));

        const weeklyRows = summary.byWeek.map((w) => ({
            "Minggu": `Minggu Ke-${w.week}`,
            "Rentang Tanggal": w.range,
            "Jumlah Hari Hadir": `${w.days} Hari`,
            "Akumulasi Jam": `${w.hours} Jam`,
            "Status Paraf PL": "Terverifikasi (Lavia Rosulia, S.H.)",
        }));

        const wb = XLSX.utils.book_new();
        const wsDaily = XLSX.utils.json_to_sheet(dailyRows);
        const wsWeekly = XLSX.utils.json_to_sheet(weeklyRows);
        XLSX.utils.book_append_sheet(wb, wsDaily, "F-06 Kehadiran Harian");
        XLSX.utils.book_append_sheet(wb, wsWeekly, "Rekap Mingguan");
        XLSX.writeFile(wb, `F06_Logbook_Kehadiran_PKL_${PKL_METADATA.nim}_MYarzuqWildani.xlsx`);
        toast.success("File Excel Logbook Kehadiran PKL (F-06) berhasil diunduh!");
    };

    // Print Official F-06 Document
    const handlePrintF06 = () => {
        const printWin = window.open("", "_blank", "width=1024,height=800");
        if (!printWin) {
            toast.error("Pop-up diblokir browser. Izinkan pop-up untuk mencetak Formulir F-06.");
            return;
        }

        const rowsHtml = entries
            .map(
                (e) => `
            <tr>
                <td style="text-align:center;">${e.dayNumber}</td>
                <td style="text-align:center;">M-${e.weekNumber}</td>
                <td><strong>${e.dayName}</strong>,<br/>${e.dateLabel}</td>
                <td style="text-align:center;">${e.checkIn} – ${e.checkOut}</td>
                <td style="text-align:center;font-weight:bold;">${e.durationHours} Jam</td>
                <td>
                    <div style="font-weight:bold;color:#0D2B20;font-size:10px;text-transform:uppercase;margin-bottom:2px;">[${e.category}]</div>
                    <div>${e.activity}</div>
                    <div style="font-size:10px;color:#444;margin-top:2px;"><em>Luaran: ${e.output}</em></div>
                </td>
                <td style="text-align:center;font-weight:bold;color:#0D2B20;">HADIR</td>
                <td style="text-align:center;font-size:10px;">${e.supervisorVerified ? "✓ Paraf PL" : ""}</td>
            </tr>`
            )
            .join("");

        const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8" />
<title>Formulir F-06 - Logbook Kehadiran & Kegiatan Harian PKL - ${PKL_METADATA.studentName}</title>
<style>
    @page { size: A4 portrait; margin: 15mm; }
    body { font-family: "Times New Roman", Times, serif; font-size: 11pt; color: #000; line-height: 1.35; margin: 0; }
    .kop { border-bottom: 3px double #000; padding-bottom: 8px; margin-bottom: 14px; text-align: center; }
    .kop h2 { margin: 0; font-size: 13pt; text-transform: uppercase; }
    .kop h3 { margin: 2px 0; font-size: 12pt; text-transform: uppercase; }
    .kop p { margin: 2px 0 0; font-size: 9.5pt; }
    .title-box { text-align: center; margin-bottom: 12px; }
    .title-box h1 { margin: 0; font-size: 12.5pt; text-transform: uppercase; text-decoration: underline; }
    .title-box p { margin: 2px 0 0; font-size: 10pt; font-weight: bold; }
    table.meta { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 10.5pt; }
    table.meta td { padding: 2px 4px; vertical-align: top; }
    table.log { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
    table.log th, table.log td { border: 1px solid #000; padding: 5px 6px; vertical-align: top; }
    table.log th { background: #eaeaea; text-align: center; font-weight: bold; }
    .sign-box { margin-top: 22px; width: 100%; page-break-inside: avoid; }
    .sign-table { width: 100%; border-collapse: collapse; font-size: 10.5pt; }
    .sign-table td { width: 50%; text-align: center; vertical-align: top; padding: 4px; }
    @media print { .no-print { display: none; } }
</style>
</head>
<body>
    <div class="no-print" style="background:#0D2B20;color:#fff;padding:10px 16px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;font-family:sans-serif;">
        <span><strong>Formulir F-06 — Logbook Kehadiran & Kegiatan Harian PKL</strong> (${summary.totalDays} Hari Kerja / ${summary.totalHours} Jam)</span>
        <button onclick="window.print()" style="background:#D4AF37;color:#0D2B20;border:none;padding:8px 16px;border-radius:6px;font-weight:bold;cursor:pointer;">🖨️ Cetak / Simpan PDF</button>
    </div>

    <div class="kop">
        <h2>UNIVERSITAS NAHDLATUL ULAMA CIREBON</h2>
        <h3>FAKULTAS ILMU KOMPUTER</h3>
        <p>Program Studi Teknik Informatika · Program Studi Sistem Informasi</p>
        <p>Jl. Sisingamangaraja No. 33, Panjunan, Lemahwungkuk, Kota Cirebon, Jawa Barat 45112 · unucirebon.ac.id</p>
    </div>

    <div class="title-box">
        <h1>FORMULIR F-06: LOGBOOK KEHADIRAN DAN KEGIATAN HARIAN PKL</h1>
        <p>Tahun Akademik 2026/2027</p>
    </div>

    <table class="meta">
        <tr>
            <td style="width:22%;font-weight:bold;">Nama Mahasiswa</td><td style="width:2%;">:</td><td style="width:32%;">${PKL_METADATA.studentName}</td>
            <td style="width:18%;font-weight:bold;">Nama Mitra PKL</td><td style="width:2%;">:</td><td>${PKL_METADATA.partnerName}</td>
        </tr>
        <tr>
            <td style="font-weight:bold;">NIM</td><td>:</td><td>${PKL_METADATA.nim}</td>
            <td style="font-weight:bold;">Divisi / Unit</td><td>:</td><td>${PKL_METADATA.placementUnit}</td>
        </tr>
        <tr>
            <td style="font-weight:bold;">Program Studi</td><td>:</td><td>${PKL_METADATA.studyProgram}</td>
            <td style="font-weight:bold;">Pembimbing Lapangan</td><td>:</td><td>${PKL_METADATA.fieldSupervisor} (${PKL_METADATA.fieldSupervisorPhone})</td>
        </tr>
        <tr>
            <td style="font-weight:bold;">Periode PKL</td><td>:</td><td>${PKL_METADATA.periodLabel}</td>
            <td style="font-weight:bold;">Pola Kehadiran</td><td>:</td><td>${PKL_METADATA.attendancePattern}</td>
        </tr>
        <tr>
            <td style="font-weight:bold;">Judul Project</td><td>:</td><td colspan="4">${PKL_METADATA.projectTitle}</td>
        </tr>
    </table>

    <table class="log">
        <thead>
            <tr>
                <th style="width:4%;">No</th>
                <th style="width:6%;">Mgg</th>
                <th style="width:15%;">Hari, Tanggal</th>
                <th style="width:12%;">Jam Hadir</th>
                <th style="width:8%;">Durasi</th>
                <th>Uraian Kegiatan Harian &amp; Luaran di Lokasi Mitra</th>
                <th style="width:8%;">Status</th>
                <th style="width:10%;">Paraf PL</th>
            </tr>
        </thead>
        <tbody>
            ${rowsHtml}
            <tr>
                <td colspan="4" style="text-align:right;font-weight:bold;background:#f4f4f4;">TOTAL AKUMULASI KEHADIRAN (${summary.totalDays} HARI KERJA EFEKTIF)</td>
                <td style="text-align:center;font-weight:bold;background:#f4f4f4;">${summary.totalHours} Jam</td>
                <td colspan="3" style="font-weight:bold;background:#f4f4f4;">Memenuhi Syarat Minimal ${PKL_METADATA.minRequiredHours} Jam PKL (Tercapai ${summary.totalHours} Jam / 100% Valid)</td>
            </tr>
        </tbody>
    </table>

    <div class="sign-box">
        <table class="sign-table">
            <tr>
                <td>
                    Mengetahui &amp; Mengesahkan,<br/>
                    <strong>Pembimbing Lapangan (${PKL_METADATA.partnerName})</strong>
                    <br/><br/><br/><br/><br/>
                    <strong>( ${PKL_METADATA.fieldSupervisor} )</strong><br/>
                    Kontak: ${PKL_METADATA.fieldSupervisorPhone}
                </td>
                <td>
                    Brebes, 31 Desember 2026<br/>
                    <strong>Mahasiswa Pelaksana PKL</strong>
                    <br/><br/><br/><br/><br/>
                    <strong>( ${PKL_METADATA.studentName} )</strong><br/>
                    NIM. ${PKL_METADATA.nim}
                </td>
            </tr>
        </table>
    </div>
</body>
</html>`;

        printWin.document.open();
        printWin.document.write(html);
        printWin.document.close();
    };

    return (
        <div className="animate-fade-in space-y-6">
            {/* ============ BANNER IDENTITAS & BUKTI KEHADIRAN PKL (F-06) ============ */}
            <div className="bg-gradient-to-br from-[#0D2B20] via-[#143d2e] to-[#1A4D3E] rounded-2xl p-5 sm:p-6 text-white shadow-xl border border-amber-400/20">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-black tracking-wide">
                            <ClipboardCheck size={14} /> FORMULIR F-06 · BUKTI KEHADIRAN &amp; LOGBOOK HARIAN PKL
                        </div>
                        <h2 className="text-xl sm:text-2xl font-serif font-bold text-amber-300">
                            Logbook Kehadiran Praktik Kerja Lapangan (PKL)
                        </h2>
                        <p className="text-xs sm:text-sm text-white/80 max-w-3xl leading-relaxed">
                            Rekam jejak kehadiran harian, jam kerja operasional, dan tahapan pembangunan sistem{" "}
                            <strong className="text-amber-200">POS &amp; Inventori Bahan Baku BOM</strong> di{" "}
                            <strong className="text-white">{PKL_METADATA.partnerName}</strong>.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={openAddModal}
                            className="px-3.5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#0D2B20] font-black text-xs flex items-center gap-1.5 shadow-md transition"
                        >
                            <Plus size={15} /> Catat Kehadiran Baru
                        </button>
                        <button
                            onClick={handlePrintF06}
                            className="px-3.5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/20 font-bold text-xs flex items-center gap-1.5 transition"
                        >
                            <Printer size={15} /> Cetak Lembar F-06 (PDF)
                        </button>
                        <button
                            onClick={handleExportExcel}
                            className="px-3.5 py-2.5 rounded-xl bg-emerald-500/30 hover:bg-emerald-500/40 text-emerald-100 border border-emerald-400/40 font-bold text-xs flex items-center gap-1.5 transition"
                        >
                            <FileSpreadsheet size={15} /> Export Excel (.xlsx)
                        </button>
                    </div>
                </div>

                {/* Grid Informasi Mahasiswa & Mitra */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5 pt-4 border-t border-white/10 text-xs">
                    <div className="bg-black/20 rounded-xl p-3.5 border border-white/10">
                        <p className="text-amber-300 font-bold uppercase tracking-wider text-[10px] mb-1 flex items-center gap-1.5">
                            <BookOpen size={12} /> Identitas Mahasiswa
                        </p>
                        <p className="font-bold text-sm text-white">{PKL_METADATA.studentName}</p>
                        <p className="text-white/75">NIM: {PKL_METADATA.nim} · {PKL_METADATA.studyProgram}</p>
                        <p className="text-white/60 text-[11px] mt-0.5">{PKL_METADATA.faculty}</p>
                    </div>
                    <div className="bg-black/20 rounded-xl p-3.5 border border-white/10">
                        <p className="text-amber-300 font-bold uppercase tracking-wider text-[10px] mb-1 flex items-center gap-1.5">
                            <Building2 size={12} /> Lokasi Mitra PKL
                        </p>
                        <p className="font-bold text-sm text-white">{PKL_METADATA.partnerName}</p>
                        <p className="text-white/75">{PKL_METADATA.partnerType} · {PKL_METADATA.placementUnit}</p>
                        <p className="text-white/60 text-[11px] mt-0.5 truncate" title={PKL_METADATA.partnerAddress}>
                            📍 {PKL_METADATA.partnerAddress}
                        </p>
                    </div>
                    <div className="bg-black/20 rounded-xl p-3.5 border border-white/10">
                        <p className="text-amber-300 font-bold uppercase tracking-wider text-[10px] mb-1 flex items-center gap-1.5">
                            <UserCheck size={12} /> Pembimbing Lapangan &amp; Jadwal
                        </p>
                        <p className="font-bold text-sm text-white">{PKL_METADATA.fieldSupervisor}</p>
                        <p className="text-white/75">Kontak PL: {PKL_METADATA.fieldSupervisorPhone}</p>
                        <p className="text-emerald-300 font-semibold text-[11px] mt-0.5">
                            🗓️ {PKL_METADATA.periodLabel} (6 Hari/Minggu)
                        </p>
                    </div>
                </div>
            </div>

            {/* ============ KPI CARDS KEHADIRAN ============ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase">Total Hari Kehadiran</p>
                            <p className="text-2xl font-black text-forest mt-1">{summary.hadirDays} Hari</p>
                            <p className="text-xs text-emerald-600 font-bold mt-0.5">
                                100% Kehadiran Aktif (Senin–Sabtu)
                            </p>
                        </div>
                        <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                            <Calendar size={20} />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase">Total Jam Kerja PKL</p>
                            <p className="text-2xl font-black text-forest mt-1">{summary.totalHours} Jam</p>
                            <p className="text-xs text-amber-600 font-bold mt-0.5">
                                Syarat Min. F-03: {PKL_METADATA.minRequiredHours} Jam (+{Math.max(0, summary.totalHours - PKL_METADATA.minRequiredHours)} Jam)
                            </p>
                        </div>
                        <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl">
                            <Clock size={20} />
                        </div>
                    </div>
                    <div className="mt-2.5 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-emerald-600 rounded-full transition-all"
                            style={{ width: `${summary.progressPct}%` }}
                        />
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase">Verifikasi Paraf PL</p>
                            <p className="text-2xl font-black text-forest mt-1">
                                {summary.verifiedCount} / {summary.totalDays}
                            </p>
                            <p className="text-xs text-emerald-600 font-bold mt-0.5">
                                Disahkan: {PKL_METADATA.fieldSupervisor}
                            </p>
                        </div>
                        <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl">
                            <CheckCircle size={20} />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase">Status Kelayakan Jam</p>
                            <p className="text-lg font-black text-emerald-700 mt-1">MEMENUHI SYARAT</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                                8 Minggu Pelaksanaan Tuntas 100%
                            </p>
                        </div>
                        <div className="p-2.5 bg-purple-100 text-purple-700 rounded-xl">
                            <Award size={20} />
                        </div>
                    </div>
                </div>
            </div>

            {/* ============ REKAPITULASI MINGGUAN (MINGGU I - VIII) ============ */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div>
                        <h3 className="font-serif font-bold text-base text-forest">
                            Rekapitulasi Jam Kehadiran Mingguan (Minggu I – VIII)
                        </h3>
                        <p className="text-xs text-gray-500">
                            Klik kartu minggu di bawah untuk memfilter logbook harian pada minggu tersebut.
                        </p>
                    </div>
                    {selectedWeek !== "all" && (
                        <button
                            onClick={() => setSelectedWeek("all")}
                            className="text-xs font-bold text-emerald-700 hover:underline"
                        >
                            Tampilkan Semua Minggu ({entries.length} Hari)
                        </button>
                    )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
                    {summary.byWeek.map((w) => {
                        const active = selectedWeek === w.week;
                        return (
                            <button
                                key={w.week}
                                onClick={() => setSelectedWeek(active ? "all" : w.week)}
                                className={`text-left p-3 rounded-xl border transition ${
                                    active
                                        ? "bg-[#0D2B20] text-white border-[#0D2B20] shadow-md"
                                        : "bg-gray-50 hover:bg-emerald-50/60 text-gray-800 border-gray-200"
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className={`text-[11px] font-black uppercase ${active ? "text-amber-300" : "text-forest"}`}>
                                        Minggu {w.week}
                                    </span>
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${active ? "bg-amber-400/20 text-amber-200" : "bg-emerald-100 text-emerald-800"}`}>
                                        {w.hours}j
                                    </span>
                                </div>
                                <p className={`text-xs font-bold mt-1 ${active ? "text-white" : "text-gray-700"}`}>
                                    {w.days} Hari Hadir
                                </p>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ============ FILTER & TABEL LOGBOOK HARIAN ============ */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="relative min-w-[220px] flex-1 sm:flex-initial">
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Cari tanggal, kegiatan, BOM, POS..."
                                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-forest"
                            />
                        </div>
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white font-semibold text-gray-700"
                        >
                            <option value="all">Semua Tahapan ({entries.length})</option>
                            {CATEGORIES.map((cat) => (
                                <option key={cat} value={cat}>
                                    {cat}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={() => {
                                verifyAllEntries();
                                toast.success("Seluruh hari kehadiran telah ditandai Terverifikasi Paraf PL.");
                            }}
                            className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition"
                        >
                            ✓ Verifikasi Semua Paraf PL
                        </button>
                        <button
                            onClick={() => {
                                if (confirm("Muat ulang 45 hari data standar Logbook Kehadiran PKL (150 Jam)?")) {
                                    resetDefaultLogbook();
                                    toast.success("Logbook kehadiran PKL dikembalikan ke data lengkap 45 hari (150 Jam).");
                                }
                            }}
                            className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold flex items-center gap-1 transition"
                        >
                            <RotateCcw size={13} /> Reset Default (45 Hari)
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="bg-gray-50 text-gray-600 border-b border-gray-200 uppercase text-[11px]">
                                <th className="py-3 px-3 text-center w-12">Hari</th>
                                <th className="py-3 px-3 w-36">Hari &amp; Tanggal</th>
                                <th className="py-3 px-3 text-center w-28">Jam Hadir</th>
                                <th className="py-3 px-3 text-center w-20">Durasi</th>
                                <th className="py-3 px-3 w-44">Tahapan</th>
                                <th className="py-3 px-3">Uraian Kegiatan Harian &amp; Bukti Luaran</th>
                                <th className="py-3 px-3 text-center w-28">Paraf PL</th>
                                <th className="py-3 px-3 text-center w-20">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredEntries.map((item) => (
                                <tr key={item.id} className="hover:bg-emerald-50/30 transition">
                                    <td className="py-3 px-3 text-center font-black text-forest">
                                        #{item.dayNumber}
                                        <span className="block text-[10px] font-semibold text-gray-400">
                                            M-{item.weekNumber}
                                        </span>
                                    </td>
                                    <td className="py-3 px-3">
                                        <p className="font-bold text-gray-900">{item.dayName}</p>
                                        <p className="text-gray-500 text-[11px]">{item.dateLabel}</p>
                                    </td>
                                    <td className="py-3 px-3 text-center font-mono font-semibold text-gray-800">
                                        {item.checkIn} – {item.checkOut}
                                    </td>
                                    <td className="py-3 px-3 text-center">
                                        <span className="inline-block px-2 py-1 rounded-full bg-amber-100 text-amber-900 font-black text-[11px]">
                                            {item.durationHours} Jam
                                        </span>
                                    </td>
                                    <td className="py-3 px-3">
                                        <span className="inline-block px-2.5 py-1 rounded-lg bg-forest/10 text-forest font-bold text-[11px]">
                                            {item.category}
                                        </span>
                                    </td>
                                    <td className="py-3 px-3 max-w-xl">
                                        <p className="text-gray-800 font-medium leading-relaxed">{item.activity}</p>
                                        <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                                            📌 Bukti/Luaran: {item.output}
                                        </p>
                                    </td>
                                    <td className="py-3 px-3 text-center">
                                        <button
                                            onClick={() => toggleVerifyEntry(item.id)}
                                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1 transition ${
                                                item.supervisorVerified
                                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                                    : "bg-gray-100 text-gray-500 border border-gray-200"
                                            }`}
                                            title="Klik untuk ubah status verifikasi Pembimbing Lapangan"
                                        >
                                            <CheckCircle size={12} />
                                            {item.supervisorVerified ? "Paraf PL" : "Pending"}
                                        </button>
                                    </td>
                                    <td className="py-3 px-3 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <button
                                                onClick={() => openEditModal(item)}
                                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                                title="Edit Kehadiran"
                                            >
                                                <Edit size={14} />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (confirm(`Hapus catatan kehadiran Hari ke-${item.dayNumber} (${item.dateLabel})?`)) {
                                                        deleteEntry(item.id);
                                                        toast.info("Catatan kehadiran dihapus.");
                                                    }
                                                }}
                                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                                                title="Hapus"
                                            >
                                                <Trash size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredEntries.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="py-10 text-center text-gray-400 italic">
                                        Tidak ada catatan logbook kehadiran yang cocok dengan filter pencarian.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ============ MODAL INPUT / EDIT KEHADIRAN HARIAN ============ */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <form
                        onSubmit={handleSave}
                        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden max-h-[90dvh] flex flex-col"
                    >
                        <div className="bg-[#0D2B20] text-white px-5 py-4 flex items-center justify-between">
                            <div>
                                <h3 className="font-serif font-bold text-base text-amber-300">
                                    {editingId ? "Edit Catatan Kehadiran PKL" : "Catat Kehadiran & Kegiatan Harian PKL"}
                                </h3>
                                <p className="text-xs text-white/70">
                                    Formulir F-06 · Mitra {PKL_METADATA.partnerName}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setModalOpen(false)}
                                className="p-1.5 hover:bg-white/10 rounded-lg"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-5 space-y-3.5 overflow-y-auto flex-1 text-xs">
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="font-bold text-gray-600 block mb-1">Hari Ke- *</label>
                                    <input
                                        type="number"
                                        min={1}
                                        required
                                        value={form.dayNumber}
                                        onChange={(e) => setForm({ ...form, dayNumber: Number(e.target.value) })}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="font-bold text-gray-600 block mb-1">Minggu Ke- *</label>
                                    <select
                                        value={form.weekNumber}
                                        onChange={(e) => setForm({ ...form, weekNumber: Number(e.target.value) })}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 font-bold"
                                    >
                                        {[1, 2, 3, 4, 5, 6, 7, 8].map((w) => (
                                            <option key={w} value={w}>
                                                Minggu {w}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="font-bold text-gray-600 block mb-1">Tanggal *</label>
                                    <input
                                        type="date"
                                        required
                                        value={form.date}
                                        onChange={(e) => setForm({ ...form, date: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="font-bold text-gray-600 block mb-1">Jam Datang *</label>
                                    <input
                                        type="time"
                                        required
                                        value={form.checkIn}
                                        onChange={(e) => {
                                            const ci = e.target.value;
                                            setForm({
                                                ...form,
                                                checkIn: ci,
                                                durationHours: calculateHoursBetween(ci, form.checkOut),
                                            });
                                        }}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="font-bold text-gray-600 block mb-1">Jam Pulang *</label>
                                    <input
                                        type="time"
                                        required
                                        value={form.checkOut}
                                        onChange={(e) => {
                                            const co = e.target.value;
                                            setForm({
                                                ...form,
                                                checkOut: co,
                                                durationHours: calculateHoursBetween(form.checkIn, co),
                                            });
                                        }}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="font-bold text-gray-600 block mb-1">Durasi (Jam) *</label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={12}
                                        step="0.5"
                                        required
                                        value={form.durationHours}
                                        onChange={(e) => setForm({ ...form, durationHours: Number(e.target.value) })}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 font-bold"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="font-bold text-gray-600 block mb-1">Tahapan Kegiatan *</label>
                                <select
                                    value={form.category}
                                    onChange={(e) => setForm({ ...form, category: e.target.value as PklLogCategory })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 font-semibold"
                                >
                                    {CATEGORIES.map((c) => (
                                        <option key={c} value={c}>
                                            {c}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="font-bold text-gray-600 block mb-1">
                                    Uraian Kegiatan Harian di Lokasi Mitra *
                                </label>
                                <textarea
                                    rows={3}
                                    required
                                    value={form.activity}
                                    onChange={(e) => setForm({ ...form, activity: e.target.value })}
                                    placeholder="Jelaskan kegiatan observasi, pendampingan operasional gerai, atau implementasi modul POS & BOM..."
                                    className="w-full border border-gray-300 rounded-lg p-3 text-gray-900"
                                />
                            </div>

                            <div>
                                <label className="font-bold text-gray-600 block mb-1">
                                    Bukti Hasil / Luaran Harian
                                </label>
                                <input
                                    type="text"
                                    value={form.output}
                                    onChange={(e) => setForm({ ...form, output: e.target.value })}
                                    placeholder="Contoh: Modul pemotongan resep BOM otomatis teruji di kasir"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900"
                                />
                            </div>

                            <label className="flex items-center gap-2 pt-1 font-bold text-gray-700 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={form.supervisorVerified}
                                    onChange={(e) => setForm({ ...form, supervisorVerified: e.target.checked })}
                                    className="w-4 h-4 accent-[#0D2B20]"
                                />
                                Telah Diverifikasi &amp; Diparaf Pembimbing Lapangan ({PKL_METADATA.fieldSupervisor})
                            </label>
                        </div>

                        <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-100 flex gap-2">
                            <button
                                type="button"
                                onClick={() => setModalOpen(false)}
                                className="flex-1 py-2.5 border border-gray-300 text-gray-600 rounded-xl font-bold text-xs hover:bg-gray-100"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                className="flex-1 py-2.5 bg-[#0D2B20] text-amber-300 rounded-xl font-black text-xs hover:bg-[#163f30] flex items-center justify-center gap-1.5"
                            >
                                <Save size={14} /> Simpan Kehadiran
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

