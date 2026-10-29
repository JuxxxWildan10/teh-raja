"use client";

/**
 * @file ForecastDashboard.tsx
 * @description Komponen Dashboard Peramalan Penjualan (Forecasting) & Analitik Deret Waktu untuk Kedai Teh Raja.
 * Dirancang komprehensif untuk kebutuhan operasional bisnis dan materi ilmiah Skripsi:
 *   - Komparasi 9 model statistik (Holt-Winters, Holt, SES, WMA, SMA, S-Naive, Naive, Regresi, Ensemble)
 *   - Metrik akurasi standar akademik: MAE, RMSE, MAPE (Lewis 1982), sMAPE
 *   - Proyeksi kebutuhan bahan baku (BOM - Bill of Materials)
 *   - Analisis narasi strategis bertenaga Gemini 3.5 Flash Lite
 *   - Generator data simulasi realistis F&B & Import CSV / Excel
 *   - Export laporan ke Microsoft Excel (.xlsx) untuk lampiran Skripsi
 */

import { useState, useMemo, useEffect, useRef } from "react";
import {
    useSalesStore, useProductStore, useInventoryStore, useForecastHistoryStore,
    ExtendedProduct, Ingredient
} from "@/lib/store";
import {
    buildDaily, toSeries, productTotals, ingredientNeeds,
    generateSimulation, parseImportRows, Target, SourceFilter, TARGET_LABEL,
    formatDateID, DAY_NAMES, DailyRecord
} from "@/lib/forecast/data";
import { runForecast, ForecastResult, ModelEvaluation, assessQuality } from "@/lib/forecast/engine";
import { interpretMape, Criterion } from "@/lib/forecast/metrics";
import { MODELS } from "@/lib/forecast/models";
import { useToast } from "@/components/Toast";
import * as XLSX from "xlsx";
import { Line, Bar } from "react-chartjs-2";
import {
    Sparkles, BrainCircuit, RefreshCw, Download, FileSpreadsheet,
    TrendingUp, Calendar, Box, AlertTriangle, CheckCircle, Info,
    Database, Upload, Trash2, ArrowUpRight, ArrowDownRight, Layers,
    Copy, Check, FileText, BarChart3, HelpCircle
} from "lucide-react";

export default function ForecastDashboard() {
    const toast = useToast();
    const { orders } = useSalesStore();
    const { products } = useProductStore();
    const { ingredients } = useInventoryStore();
    const { records: historyRecords, addRecords, clearBySource, clearAll } = useForecastHistoryStore();

    // ── Filter Sumber Data ─────────────────────────────────────────
    const [sourceFilter, setSourceFilter] = useState<SourceFilter>({
        pos: true,
        import: true,
        simulasi: true,
    });

    // ── Opsi Peramalan ─────────────────────────────────────────────
    const [target, setTarget] = useState<Target>("revenue");
    const [horizon, setHorizon] = useState<number>(14);
    const [criterion, setCriterion] = useState<Criterion>("mape");
    const [selectedModelId, setSelectedModelId] = useState<string>("auto");
    const [activeSubTab, setActiveSubTab] = useState<"forecast" | "models" | "bom" | "narrative" | "data">("forecast");

    // ── State Komputasi & AI ───────────────────────────────────────
    const [forecastResult, setForecastResult] = useState<ForecastResult | null>(null);
    const [isComputing, setIsComputing] = useState(false);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [aiNarrative, setAiNarrative] = useState<string>("");
    const [aiSource, setAiSource] = useState<string>("");
    const [copiedTable, setCopiedTable] = useState(false);

    // ── Modal / Import State ───────────────────────────────────────
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isSimulateModalOpen, setIsSimulateModalOpen] = useState(false);
    const [simDays, setSimDays] = useState(90);
    const [simTx, setSimTx] = useState(45);
    const [simGrowth, setSimGrowth] = useState(3.5);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── 1. Agregasi Deret Waktu Harian ─────────────────────────────
    const dailyData = useMemo(() => {
        return buildDaily(orders, historyRecords, sourceFilter, { fillToToday: true });
    }, [orders, historyRecords, sourceFilter]);

    const series = useMemo(() => {
        return toSeries(dailyData, target);
    }, [dailyData, target]);

    const dataQuality = useMemo(() => {
        return assessQuality(series.map(s => s.value));
    }, [series]);

    // ── 2. Jalankan Peramalan Statistik ────────────────────────────
    const handleRunForecast = () => {
        if (series.length < 4) {
            toast.error("Data deret waktu belum cukup (minimal 4 hari). Buat data simulasi atau impor file Excel.");
            return;
        }
        setIsComputing(true);
        setTimeout(() => {
            try {
                const res = runForecast(series, {
                    horizon,
                    criterion,
                    m: 7,
                    forceModelId: selectedModelId === "auto" ? undefined : selectedModelId,
                });
                setForecastResult(res);
                if (res) {
                    const mapeStr = res.best.metrics?.mape !== null && res.best.metrics?.mape !== undefined ? `${res.best.metrics.mape.toFixed(2)}%` : 'N/A';
                    toast.success(`Model terbaik: ${res.best.name} (MAPE: ${mapeStr})`);
                } else {
                    toast.error("Gagal melakukan perhitungan peramalan.");
                }
            } catch (err: any) {
                console.error("Forecast Error:", err);
                toast.error("Error: " + err.message);
            } finally {
                setIsComputing(false);
            }
        }, 50);
    };

    // Jalankan peramalan otomatis saat pertama kali atau saat target/horizon/model berubah
    useEffect(() => {
        if (series.length >= 4) {
            handleRunForecast();
        } else {
            setForecastResult(null);
        }
    }, [series.length, target, horizon, criterion, selectedModelId]);

    // ── 3. Analisis Kebutuhan Bahan Baku (BOM) ─────────────────────
    const bomAnalysis = useMemo(() => {
        if (!forecastResult || !dailyData.length) return null;
        const pTotals = productTotals(dailyData);
        const topProducts = pTotals.map(p => ({
            key: p.key,
            name: p.name,
            total: Math.round((p.qty / Math.max(1, dailyData.length)) * horizon),
        }));
        return ingredientNeeds(topProducts, products, ingredients, horizon);
    }, [forecastResult, dailyData, products, ingredients, horizon]);

    // ── 4. Generate Narasi AI (Gemini) ─────────────────────────────
    const handleGenerateAiNarrative = async () => {
        if (!forecastResult) {
            toast.error("Harap jalankan perhitungan model terlebih dahulu.");
            return;
        }
        setIsAiLoading(true);
        try {
            const totalProjected = forecastResult.future.reduce((s, f) => s + f.yhat, 0);
            const avgDailyProjected = forecastResult.future.length ? totalProjected / forecastResult.future.length : 0;
            const histAvg = forecastResult.quality.mean;
            const growthPct = histAvg > 0 ? ((avgDailyProjected - histAvg) / histAvg) * 100 : 0;

            const pTotals = productTotals(dailyData);
            const topProducts = pTotals.slice(0, 8).map(p => ({
                key: p.key,
                name: p.name,
                historicalQty: p.qty,
                projectedQty: Math.round((p.qty / Math.max(1, dailyData.length)) * horizon),
                revenue: p.revenue,
            }));

            const summary = {
                target,
                horizon,
                criterion,
                dataQuality: forecastResult.quality,
                bestModel: {
                    id: forecastResult.best.id,
                    name: forecastResult.best.name,
                    shortName: forecastResult.best.shortName,
                    metrics: forecastResult.best.metrics,
                    params: forecastResult.best.params,
                    formula: forecastResult.best.formula,
                },
                modelRankings: forecastResult.evaluations.map(e => ({
                    rank: e.rank,
                    name: e.name,
                    shortName: e.shortName,
                    eligible: e.eligible,
                    reason: e.reason,
                    metrics: e.metrics,
                    params: e.params,
                    formula: e.formula,
                })),
                projectedStats: {
                    totalProjected,
                    avgDailyProjected,
                    growthPct,
                    projectedDates: forecastResult.future,
                },
                topProducts,
                bomRequirements: bomAnalysis?.rows || [],
            };

            const res = await fetch("/api/ai/forecast", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ summary }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Gagal memproses narasi AI");

            setAiNarrative(data.narrative || "");
            setAiSource(data.source || "gemini");
            setActiveSubTab("narrative");
            toast.success("Narasi akademik dan rekomendasi AI berhasil dibuat!");
        } catch (err: any) {
            console.error("AI Narrative Error:", err);
            toast.error("Gagal mendapatkan narasi AI: " + err.message);
        } finally {
            setIsAiLoading(false);
        }
    };

    // ── 5. Generate Data Simulasi Realistis ─────────────────────────
    const handleCreateSimulation = () => {
        try {
            const todayStr = new Date().toISOString().slice(0, 10);
            const simRecords = generateSimulation(products, {
                days: simDays,
                endDate: todayStr,
                baseTransactions: simTx,
                trendPct: simGrowth,
                noisePct: 15,
                seed: 2026,
            });
            addRecords(simRecords);
            setIsSimulateModalOpen(false);
            toast.success(`Berhasil menambahkan ${simRecords.length} hari data simulasi penjualan.`);
        } catch (err: any) {
            toast.error("Gagal membuat simulasi: " + err.message);
        }
    };

    // ── 6. Import File CSV / Excel ──────────────────────────────────
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: "binary", cellDates: true });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

                if (!data.length) {
                    toast.error("File Excel kosong atau tidak memiliki data.");
                    return;
                }

                const parsed = parseImportRows(data, products);
                addRecords(parsed.records);
                setIsImportModalOpen(false);
                toast.success(`Berhasil mengimpor ${parsed.records.length} hari histori dari ${parsed.rows} baris.`);
                if (parsed.unmatched.length) {
                    toast.warning(`${parsed.unmatched.length} nama produk tidak cocok persis di menu, tetap tersimpan.`);
                }
            } catch (err: any) {
                console.error("Import Error:", err);
                toast.error("Gagal membaca file: " + err.message);
            }
        };
        reader.readAsBinaryString(file);
        if (e.target) e.target.value = "";
    };

    // ── 7. Export Laporan ke Excel (.xlsx) ──────────────────────────
    const handleExportExcel = () => {
        if (!forecastResult) {
            toast.error("Jalankan peramalan terlebih dahulu sebelum ekspor.");
            return;
        }

        const wb = XLSX.utils.book_new();

        // Sheet 1: Proyeksi Harian
        const fRows = forecastResult.future.map((f, i) => ({
            "Hari ke": i + 1,
            "Tanggal": f.date,
            "Hari": DAY_NAMES[f.dow],
            "Prediksi (ŷ)": Math.round(f.yhat),
            "Batas Bawah 95% (Lo)": Math.round(f.lo),
            "Batas Atas 95% (Hi)": Math.round(f.hi),
        }));
        const ws1 = XLSX.utils.json_to_sheet(fRows);
        XLSX.utils.book_append_sheet(wb, ws1, "Proyeksi Harian");

        // Sheet 2: Evaluasi Model (Skripsi)
        const mRows = forecastResult.evaluations.map(e => ({
            "Peringkat": e.rank || "-",
            "Nama Metode": e.name,
            "Rumus Matematis": e.formula,
            "Status": e.eligible ? "Memenuhi Syarat" : `Tidak Layak: ${e.reason}`,
            "MAPE (%)": e.metrics?.mape !== null && e.metrics?.mape !== undefined ? Number(e.metrics.mape.toFixed(2)) : "N/A",
            "Kategori Lewis": e.metrics?.mape !== null && e.metrics?.mape !== undefined ? interpretMape(e.metrics.mape).label : "N/A",
            "RMSE": e.metrics ? Math.round(e.metrics.rmse) : "N/A",
            "MAE": e.metrics ? Math.round(e.metrics.mae) : "N/A",
            "sMAPE (%)": e.metrics ? Number(e.metrics.smape.toFixed(2)) : "N/A",
            "Parameter Optimal": JSON.stringify(e.params),
        }));
        const ws2 = XLSX.utils.json_to_sheet(mRows);
        XLSX.utils.book_append_sheet(wb, ws2, "Evaluasi Model Skripsi");

        // Sheet 3: Kebutuhan Bahan Baku (BOM)
        if (bomAnalysis?.rows) {
            const bRows = bomAnalysis.rows.map(b => ({
                "Bahan Baku": b.name,
                "Stok Saat Ini": b.stock,
                "Satuan": b.unit,
                "Kebutuhan Proyeksi": Math.round(b.need),
                "Kebutuhan / Hari": Math.round(b.perDay),
                "Ketahanan Stok (Hari)": isFinite(b.daysCover) ? Math.floor(b.daysCover) : "> 90",
                "Defisit (Kekurangan)": Math.round(b.shortage),
                "Saran Restok Minimal": Math.ceil(b.reorder),
                "Status": b.shortage > 0 ? "KRITIS" : b.daysCover <= horizon ? "PERINGATAN" : "AMAN",
            }));
            const ws3 = XLSX.utils.json_to_sheet(bRows);
            XLSX.utils.book_append_sheet(wb, ws3, "Analisis Kebutuhan BOM");
        }

        // Sheet 4: Data Historis Asli
        const hRows = series.map((s, idx) => ({
            "No": idx + 1,
            "Tanggal": s.date,
            "Hari": DAY_NAMES[new Date(s.date).getDay()],
            "Nilai Aktual": s.value,
        }));
        const ws4 = XLSX.utils.json_to_sheet(hRows);
        XLSX.utils.book_append_sheet(wb, ws4, "Data Historis");

        const fileName = `Laporan_Peramalan_TehRaja_${new Date().toISOString().slice(0, 10)}.xlsx`;
        XLSX.writeFile(wb, fileName);
        toast.success(`Berhasil mengunduh ${fileName}`);
    };

    // ── 8. Salin Tabel Markdown untuk Word/Skripsi ──────────────────
    const handleCopyMarkdownTable = () => {
        if (!forecastResult) return;
        let md = `| Peringkat | Metode Peramalan | MAPE (%) | Kategori Lewis | RMSE | MAE | Parameter |\n`;
        md += `| :---: | :--- | :---: | :---: | :---: | :---: | :--- |\n`;
        forecastResult.evaluations.forEach(e => {
            const mape = e.metrics?.mape !== null && e.metrics?.mape !== undefined ? `${e.metrics.mape.toFixed(2)}%` : "N/A";
            const kat = e.metrics?.mape !== null && e.metrics?.mape !== undefined ? interpretMape(e.metrics.mape).label : "-";
            const rmse = e.metrics ? Math.round(e.metrics.rmse).toLocaleString("id-ID") : "-";
            const mae = e.metrics ? Math.round(e.metrics.mae).toLocaleString("id-ID") : "-";
            const par = Object.keys(e.params).length ? Object.entries(e.params).map(([k, v]) => `${k}=${v}`).join(", ") : "-";
            md += `| ${e.rank || "-"} | **${e.name}** | ${mape} | ${kat} | ${rmse} | ${mae} | ${par} |\n`;
        });
        navigator.clipboard.writeText(md);
        setCopiedTable(true);
        setTimeout(() => setCopiedTable(false), 2500);
        toast.success("Tabel evaluasi berhasil disalin ke clipboard dalam format Markdown (siap tempel di Word/Skripsi)!");
    };

    // ── 9. Siapkan Data Visual Chart.js ────────────────────────────
    const chartData = useMemo(() => {
        if (!forecastResult) {
            return {
                labels: series.slice(-30).map(s => formatDateID(s.date)),
                datasets: [
                    {
                        label: `Aktual (${TARGET_LABEL[target]})`,
                        data: series.slice(-30).map(s => s.value),
                        borderColor: "#0D2B20",
                        backgroundColor: "rgba(13, 43, 32, 0.1)",
                        borderWidth: 2,
                        tension: 0.2,
                    }
                ]
            };
        }

        // Tampilkan 30 hari historis terakhir + future horizon
        const histSlice = series.slice(-30);
        const histLabels = histSlice.map(s => formatDateID(s.date));
        const futureLabels = forecastResult.future.map(f => formatDateID(f.date));
        const allLabels = [...histLabels, ...futureLabels];

        // Dataset 1: Aktual
        const actualData = [...histSlice.map(s => s.value), ...Array(forecastResult.future.length).fill(null)];

        // Dataset 2: Fitted in-sample
        const fittedSlice = forecastResult.fitted.slice(-30);
        const fittedData = [...fittedSlice, ...Array(forecastResult.future.length).fill(null)];

        // Dataset 3: Prediksi Masa Depan (Titik awal menyambung dari titik aktual terakhir)
        const lastActual = histSlice[histSlice.length - 1]?.value ?? null;
        const predData = [
            ...Array(histSlice.length - 1).fill(null),
            lastActual,
            ...forecastResult.future.map(f => Math.round(f.yhat)),
        ];

        // Dataset 4 & 5: Area Interval Kepercayaan 95%
        const upperData = [
            ...Array(histSlice.length - 1).fill(null),
            lastActual,
            ...forecastResult.future.map(f => Math.round(f.hi)),
        ];
        const lowerData = [
            ...Array(histSlice.length - 1).fill(null),
            lastActual,
            ...forecastResult.future.map(f => Math.round(f.lo)),
        ];

        return {
            labels: allLabels,
            datasets: [
                {
                    label: "Aktual Historis",
                    data: actualData,
                    borderColor: "#0D2B20",
                    backgroundColor: "rgba(13, 43, 32, 0.8)",
                    borderWidth: 2.5,
                    pointRadius: 3,
                    tension: 0.15,
                },
                {
                    label: `In-Sample Fit (${forecastResult.best.shortName})`,
                    data: fittedData,
                    borderColor: "#94a3b8",
                    borderWidth: 1.5,
                    borderDash: [4, 4],
                    pointRadius: 0,
                    tension: 0.15,
                },
                {
                    label: `Proyeksi Masa Depan (${forecastResult.best.shortName})`,
                    data: predData,
                    borderColor: "#f59e0b",
                    backgroundColor: "#f59e0b",
                    borderWidth: 3,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    tension: 0.2,
                },
                {
                    label: "Batas Atas 95% (Hi)",
                    data: upperData,
                    borderColor: "rgba(245, 158, 11, 0.3)",
                    borderWidth: 1,
                    pointRadius: 0,
                    fill: "+1",
                    backgroundColor: "rgba(245, 158, 11, 0.12)",
                },
                {
                    label: "Batas Bawah 95% (Lo)",
                    data: lowerData,
                    borderColor: "rgba(245, 158, 11, 0.3)",
                    borderWidth: 1,
                    pointRadius: 0,
                    fill: false,
                },
            ]
        };
    }, [series, forecastResult, target]);

    // Data musiman mingguan (Seasonal Index Bar Chart)
    const seasonalChartData = useMemo(() => {
        if (!forecastResult) return null;
        return {
            labels: DAY_NAMES,
            datasets: [
                {
                    label: "Indeks Musiman Relatif (1.0 = Rata-rata)",
                    data: forecastResult.seasonalIndex.map(v => Number(v.toFixed(2))),
                    backgroundColor: forecastResult.seasonalIndex.map(v =>
                        v >= 1.2 ? "#10b981" : v >= 0.95 ? "#f59e0b" : "#64748b"
                    ),
                    borderRadius: 8,
                }
            ]
        };
    }, [forecastResult]);

    // Hitung ringkasan angka proyeksi
    const totalProjected = forecastResult?.future.reduce((s, f) => s + f.yhat, 0) || 0;
    const avgDailyProjected = forecastResult?.future.length ? totalProjected / forecastResult.future.length : 0;
    const histAvg = forecastResult?.quality.mean || 0;
    const growthPct = histAvg > 0 ? ((avgDailyProjected - histAvg) / histAvg) * 100 : 0;

    return (
        <div className="space-y-6 animate-fade-in pb-12">
            {/* ============ 1. HEADER & STATUS UTAMA ============ */}
            <div className="bg-gradient-to-br from-[#0D2B20] via-[#123829] to-[#1a4433] rounded-2xl p-6 text-white shadow-xl border border-amber-400/20 relative overflow-hidden">
                <div className="absolute -right-12 -top-12 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl pointer-events-none"></div>

                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 relative z-10">
                    <div className="flex items-start sm:items-center gap-4">
                        <div className="p-3 bg-amber-400 text-[#0D2B20] rounded-2xl shadow-lg shadow-amber-400/20 flex-shrink-0">
                            <BrainCircuit size={32} />
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-2xl sm:text-3xl font-black text-amber-400 tracking-tight">AI Sales Forecasting Lab</h2>
                                <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[11px] font-mono px-2.5 py-0.5 rounded-full font-bold">
                                    Skripsi Ready 🎓
                                </span>
                            </div>
                            <p className="text-white/70 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
                                Sistem peramalan hibrida: komparasi 9 model statistik (Triple Exponential Smoothing, Holt Damped, Regresi Musiman, Ensemble) dengan metrik validasi MAPE/RMSE dan sintesis narasi AI.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        <button
                            onClick={handleRunForecast}
                            disabled={isComputing || series.length < 4}
                            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-2.5 rounded-xl font-bold text-xs transition active:scale-95 disabled:opacity-50"
                        >
                            <RefreshCw size={15} className={isComputing ? "animate-spin" : ""} />
                            {isComputing ? "Menghitung..." : "Hitung Ulang"}
                        </button>

                        <button
                            onClick={handleGenerateAiNarrative}
                            disabled={isAiLoading || !forecastResult}
                            className="flex items-center gap-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-[#0D2B20] px-5 py-2.5 rounded-xl font-black text-xs transition shadow-lg shadow-amber-400/20 hover:scale-105 active:scale-95 disabled:opacity-50"
                        >
                            {isAiLoading ? (
                                <><RefreshCw size={15} className="animate-spin" /> Menganalisis AI...</>
                            ) : (
                                <><Sparkles size={15} /> Analisis Narasi Gemini</>
                            )}
                        </button>

                        <button
                            onClick={handleExportExcel}
                            disabled={!forecastResult}
                            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl font-bold text-xs transition shadow-md active:scale-95 disabled:opacity-50"
                            title="Unduh seluruh data dan tabel evaluasi ke Microsoft Excel"
                        >
                            <FileSpreadsheet size={15} /> Export Excel
                        </button>
                    </div>
                </div>

                {/* Quick Info Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/10 text-xs">
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                        <span className="text-white/50 block text-[10px] uppercase font-bold tracking-wider">Volume Sampel</span>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                            <span className="text-lg font-black text-amber-400">{series.length} Hari</span>
                            <span className="text-white/60 text-[11px]">({dataQuality.activeDays} aktif)</span>
                        </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                        <span className="text-white/50 block text-[10px] uppercase font-bold tracking-wider">Kelayakan Data</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`w-2 h-2 rounded-full ${dataQuality.level === 'baik' || dataQuality.level === 'cukup' ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                            <span className="text-sm font-bold text-white">{dataQuality.label}</span>
                        </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                        <span className="text-white/50 block text-[10px] uppercase font-bold tracking-wider">Model Terpilih</span>
                        <span className="text-sm font-bold text-amber-300 truncate block mt-0.5">
                            {forecastResult ? forecastResult.best.shortName : "-"}
                        </span>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                        <span className="text-white/50 block text-[10px] uppercase font-bold tracking-wider">Akurasi (MAPE)</span>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                            <span className="text-lg font-black text-emerald-400">
                                {forecastResult?.best.metrics?.mape !== null && forecastResult?.best.metrics?.mape !== undefined
                                    ? `${forecastResult.best.metrics.mape.toFixed(2)}%`
                                    : "N/A"}
                            </span>
                            <span className="text-white/50 text-[10px]">
                                {forecastResult ? interpretMape(forecastResult.best.metrics?.mape ?? null).label : ""}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ============ 2. KONTROL DATA & PARAMETER ============ */}
            <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    {/* Sumber Data Toggle */}
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                        <span className="font-bold text-gray-700 flex items-center gap-1.5">
                            <Database size={15} className="text-emerald-700" /> Sumber Data:
                        </span>
                        <label className="flex items-center gap-1.5 cursor-pointer bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200 transition">
                            <input
                                type="checkbox"
                                checked={sourceFilter.pos}
                                onChange={e => setSourceFilter(f => ({ ...f, pos: e.target.checked }))}
                                className="accent-[#0D2B20] rounded"
                            />
                            <span className="font-medium text-gray-800">Transaksi POS ({orders.length})</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200 transition">
                            <input
                                type="checkbox"
                                checked={sourceFilter.import}
                                onChange={e => setSourceFilter(f => ({ ...f, import: e.target.checked }))}
                                className="accent-[#0D2B20] rounded"
                            />
                            <span className="font-medium text-gray-800">
                                Impor ({historyRecords.filter(r => r.source === 'import').length} hari)
                            </span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200 transition">
                            <input
                                type="checkbox"
                                checked={sourceFilter.simulasi}
                                onChange={e => setSourceFilter(f => ({ ...f, simulasi: e.target.checked }))}
                                className="accent-[#0D2B20] rounded"
                            />
                            <span className="font-medium text-gray-800">
                                Simulasi ({historyRecords.filter(r => r.source === 'simulasi').length} hari)
                            </span>
                        </label>
                    </div>

                    {/* Tombol Manajemen Data Historis */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsSimulateModalOpen(true)}
                            className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 px-3 py-1.5 rounded-lg font-bold text-xs transition"
                            title="Buat data simulasi 90-180 hari dengan pola musiman kedai teh"
                        >
                            🎲 Buat Simulasi Data
                        </button>

                        <button
                            onClick={() => setIsImportModalOpen(true)}
                            className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 px-3 py-1.5 rounded-lg font-bold text-xs transition"
                            title="Unggah file Excel (.xlsx / .csv) data penjualan"
                        >
                            <Upload size={14} /> Impor Excel / CSV
                        </button>

                        {historyRecords.length > 0 && (
                            <button
                                onClick={() => {
                                    if (confirm("Hapus semua data simulasi dan data impor histori?")) {
                                        clearAll();
                                        toast.success("Histori berhasil dibersihkan.");
                                    }
                                }}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition"
                                title="Bersihkan seluruh data histori tambahan"
                            >
                                <Trash2 size={16} />
                            </button>
                        )}
                    </div>
                </div>

                <div className="h-[1px] bg-gray-100"></div>

                {/* Filter Parameter Peramalan */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                        <label className="block text-gray-500 font-bold mb-1">Target Variabel</label>
                        <select
                            value={target}
                            onChange={e => setTarget(e.target.value as Target)}
                            className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-bold text-gray-800 focus:outline-none focus:border-[#0D2B20]"
                        >
                            <option value="revenue">Pendapatan (Rupiah)</option>
                            <option value="transactions">Jumlah Transaksi</option>
                            <option value="cups">Total Cup Terjual</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-gray-500 font-bold mb-1">Horizon Peramalan</label>
                        <select
                            value={horizon}
                            onChange={e => setHorizon(Number(e.target.value))}
                            className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-bold text-gray-800 focus:outline-none focus:border-[#0D2B20]"
                        >
                            <option value={7}>7 Hari (1 Minggu ke Depan)</option>
                            <option value={14}>14 Hari (2 Minggu ke Depan)</option>
                            <option value={30}>30 Hari (1 Bulan ke Depan)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-gray-500 font-bold mb-1">Metrik Optimasi</label>
                        <select
                            value={criterion}
                            onChange={e => setCriterion(e.target.value as Criterion)}
                            className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-bold text-gray-800 focus:outline-none focus:border-[#0D2B20]"
                        >
                            <option value="mape">MAPE (%) — Standar Skripsi</option>
                            <option value="rmse">RMSE — Galat Kuadrat Terkecil</option>
                            <option value="mae">MAE — Galat Rata-rata Absolut</option>
                            <option value="smape">sMAPE (%) — Simetrik</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-gray-500 font-bold mb-1">Pilihan Model</label>
                        <select
                            value={selectedModelId}
                            onChange={e => setSelectedModelId(e.target.value)}
                            className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-bold text-gray-800 focus:outline-none focus:border-[#0D2B20]"
                        >
                            <option value="auto">⭐ Otomatis (Model Terbaik)</option>
                            <option value="ensemble">Kombinasi (Ensemble Top-3)</option>
                            <option value="hw_add">Holt-Winters Aditif</option>
                            <option value="hw_mul">Holt-Winters Multiplikatif</option>
                            <option value="holt">Holt Damped Trend</option>
                            <option value="ses">Single Exponential Smoothing</option>
                            <option value="reg">Regresi Linear Musiman</option>
                            <option value="wma">Weighted Moving Average (WMA)</option>
                            <option value="sma">Simple Moving Average (SMA)</option>
                            <option value="snaive">Seasonal Naive (Mingguan)</option>
                            <option value="naive">Naive Baseline</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Warning Banner Jika Data Masih Sedikit */}
            {series.length < 14 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 flex items-start gap-3">
                    <AlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-bold">Data Historis Tersedia Masih {series.length} Hari</p>
                        <p className="text-amber-800/80 mt-0.5">
                            Metode peramalan seperti Holt-Winters memerlukan minimal 16 hari data untuk menangkap 2 siklus musiman mingguan.
                            Klik tombol <strong>"🎲 Buat Simulasi Data"</strong> di atas untuk membuat 90 hari data penjualan yang realistis sesuai pola kedai Teh Raja.
                        </p>
                    </div>
                </div>
            )}

            {/* ============ 3. TAB NAVIGASI SUB-FITUR ============ */}
            <div className="flex border-b border-gray-200 gap-1 overflow-x-auto text-xs font-bold">
                <button
                    onClick={() => setActiveSubTab("forecast")}
                    className={`py-3 px-4 border-b-2 transition flex items-center gap-2 whitespace-nowrap ${activeSubTab === "forecast"
                        ? "border-[#0D2B20] text-[#0D2B20]"
                        : "border-transparent text-gray-400 hover:text-gray-700"
                        }`}
                >
                    <TrendingUp size={16} /> Grafik Proyeksi & Interval 95%
                </button>

                <button
                    onClick={() => setActiveSubTab("models")}
                    className={`py-3 px-4 border-b-2 transition flex items-center gap-2 whitespace-nowrap ${activeSubTab === "models"
                        ? "border-[#0D2B20] text-[#0D2B20]"
                        : "border-transparent text-gray-400 hover:text-gray-700"
                        }`}
                >
                    <BarChart3 size={16} /> Tabel Komparasi Model (Bab 4 Skripsi)
                </button>

                <button
                    onClick={() => setActiveSubTab("bom")}
                    className={`py-3 px-4 border-b-2 transition flex items-center gap-2 whitespace-nowrap ${activeSubTab === "bom"
                        ? "border-[#0D2B20] text-[#0D2B20]"
                        : "border-transparent text-gray-400 hover:text-gray-700"
                        }`}
                >
                    <Box size={16} /> Kebutuhan Bahan Baku (BOM)
                    {bomAnalysis?.rows.some(r => r.shortage > 0) && (
                        <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    )}
                </button>

                <button
                    onClick={() => setActiveSubTab("narrative")}
                    className={`py-3 px-4 border-b-2 transition flex items-center gap-2 whitespace-nowrap ${activeSubTab === "narrative"
                        ? "border-[#0D2B20] text-[#0D2B20]"
                        : "border-transparent text-gray-400 hover:text-gray-700"
                        }`}
                >
                    <Sparkles size={16} className="text-amber-500" /> Laporan Narasi Gemini AI
                    {aiNarrative && <span className="w-2 h-2 rounded-full bg-amber-400"></span>}
                </button>
            </div>

            {/* ============ TAB 1: GRAFIK PROYEKSI ============ */}
            {activeSubTab === "forecast" && (
                <div className="space-y-6">
                    {/* Ringkasan Angka Proyeksi */}
                    {forecastResult && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                <span className="text-xs text-gray-500 font-bold uppercase tracking-wider block">Total Proyeksi {horizon} Hari</span>
                                <div className="flex items-baseline gap-2 mt-1">
                                    <span className="text-2xl sm:text-3xl font-black text-[#0D2B20]">
                                        {target === 'revenue' ? 'Rp ' : ''}{Math.round(totalProjected).toLocaleString('id-ID')}
                                    </span>
                                    <span className="text-xs text-gray-400 font-medium">
                                        {target === 'revenue' ? '' : target === 'transactions' ? 'order' : 'cup'}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-400 mt-2">
                                    Batas estimasi 95%: {target === 'revenue' ? 'Rp ' : ''}{Math.round(forecastResult.future.reduce((s, f) => s + f.lo, 0)).toLocaleString('id-ID')} s.d. {target === 'revenue' ? 'Rp ' : ''}{Math.round(forecastResult.future.reduce((s, f) => s + f.hi, 0)).toLocaleString('id-ID')}
                                </p>
                            </div>

                            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                <span className="text-xs text-gray-500 font-bold uppercase tracking-wider block">Rata-rata Harian Proyeksi</span>
                                <div className="flex items-baseline gap-2 mt-1">
                                    <span className="text-2xl sm:text-3xl font-black text-amber-600">
                                        {target === 'revenue' ? 'Rp ' : ''}{Math.round(avgDailyProjected).toLocaleString('id-ID')}
                                    </span>
                                    <span className="text-xs text-gray-400 font-medium">/ hari</span>
                                </div>
                                <div className="flex items-center gap-1 mt-2 text-xs font-bold">
                                    {growthPct >= 0 ? (
                                        <span className="text-emerald-600 flex items-center gap-0.5">
                                            <ArrowUpRight size={14} /> +{growthPct.toFixed(1)}% vs Rata-rata Historis
                                        </span>
                                    ) : (
                                        <span className="text-rose-600 flex items-center gap-0.5">
                                            <ArrowDownRight size={14} /> {growthPct.toFixed(1)}% vs Rata-rata Historis
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                <span className="text-xs text-gray-500 font-bold uppercase tracking-wider block">Model Juara & Akurasi</span>
                                <div className="mt-1">
                                    <p className="text-lg font-black text-emerald-700 truncate">{forecastResult.best.name}</p>
                                    <p className="text-xs font-mono text-gray-500 mt-0.5">
                                        MAPE: <strong className="text-emerald-700">{forecastResult.best.metrics?.mape !== null ? forecastResult.best.metrics?.mape.toFixed(2) + '%' : 'N/A'}</strong> (RMSE: {Math.round(forecastResult.best.metrics?.rmse || 0).toLocaleString('id-ID')})
                                    </p>
                                </div>
                                <p className="text-[11px] text-gray-400 mt-2 italic">
                                    Kategori Lewis 1982: <strong>{interpretMape(forecastResult.best.metrics?.mape ?? null).label}</strong>
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Grafik Utama Chart.js */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                            <div>
                                <h3 className="font-bold text-gray-800 text-base">Kurva Aktual Historis vs Proyeksi Masa Depan</h3>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    Garis kuning menunjukkan ramalan {horizon} hari ke depan dengan area interval kepercayaan 95%.
                                </p>
                            </div>
                            <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full font-mono font-medium self-start">
                                Model: {forecastResult?.best.name || "-"}
                            </span>
                        </div>

                        <div className="h-80 sm:h-96 w-full">
                            <Line
                                data={chartData}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    interaction: { mode: "index", intersect: false },
                                    plugins: {
                                        legend: { position: "top", labels: { boxWidth: 12, font: { size: 11, family: "sans-serif" } } },
                                        tooltip: {
                                            callbacks: {
                                                label: (ctx) => {
                                                    const val = ctx.parsed.y;
                                                    if (val === null || val === undefined) return "";
                                                    const prefix = target === "revenue" ? "Rp " : "";
                                                    return ` ${ctx.dataset.label}: ${prefix}${Math.round(val).toLocaleString("id-ID")}`;
                                                }
                                            }
                                        }
                                    },
                                    scales: {
                                        y: {
                                            beginAtZero: true,
                                            ticks: {
                                                callback: (v) => target === "revenue" ? `Rp ${(Number(v) / 1000).toFixed(0)}k` : v
                                            },
                                            grid: { color: "rgba(0,0,0,0.04)" }
                                        },
                                        x: {
                                            grid: { display: false },
                                            ticks: { maxRotation: 45, minRotation: 45, font: { size: 10 } }
                                        }
                                    }
                                }}
                            />
                        </div>
                    </div>

                    {/* Indeks Pola Musiman Mingguan */}
                    {seasonalChartData && (
                        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                            <div className="mb-4">
                                <h3 className="font-bold text-gray-800 text-base">Pola Musiman Mingguan (Seasonal Multiplier)</h3>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    Nilai &gt; 1.0 mengindikasikan hari dengan lonjakan omzet di atas rata-rata (cocok untuk penambahan stok & shift kasir).
                                </p>
                            </div>
                            <div className="h-56 w-full">
                                <Bar
                                    data={seasonalChartData}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: { legend: { display: false } },
                                        scales: {
                                            y: {
                                                beginAtZero: true,
                                                grid: { color: "rgba(0,0,0,0.04)" }
                                            },
                                            x: { grid: { display: false } }
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ============ TAB 2: TABEL KOMPARASI MODEL (SKRIPSI) ============ */}
            {activeSubTab === "models" && (
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 pb-4">
                        <div>
                            <h3 className="font-bold text-gray-800 text-lg">Tabel Komparasi Akurasi Model Peramalan</h3>
                            <p className="text-xs text-gray-400 mt-0.5">
                                Evaluasi one-step-ahead rolling origin cross-validation. Siap disalin sebagai Lampiran / Tabel Pembahasan Bab 4 Skripsi.
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleCopyMarkdownTable}
                                className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3.5 py-2 rounded-xl font-bold text-xs transition"
                            >
                                {copiedTable ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                                {copiedTable ? "Tersalin!" : "Salin Format Markdown"}
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-y border-gray-200 text-gray-600 font-bold uppercase tracking-wider">
                                    <th className="p-3 w-12 text-center">Rank</th>
                                    <th className="p-3">Metode Peramalan</th>
                                    <th className="p-3">Formula Matematis</th>
                                    <th className="p-3 text-right">MAPE (%)</th>
                                    <th className="p-3">Kategori Lewis</th>
                                    <th className="p-3 text-right">RMSE</th>
                                    <th className="p-3 text-right">MAE</th>
                                    <th className="p-3">Parameter Optimal</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {forecastResult?.evaluations.map((e) => {
                                    const isBest = e.rank === 1 && e.eligible;
                                    const mapeStatus = interpretMape(e.metrics?.mape ?? null);
                                    return (
                                        <tr key={e.id} className={`hover:bg-gray-50/80 transition ${isBest ? "bg-amber-50/40 font-semibold" : ""}`}>
                                            <td className="p-3 text-center">
                                                {isBest ? (
                                                    <span className="bg-amber-400 text-[#0D2B20] w-6 h-6 rounded-full inline-flex items-center justify-center font-black text-xs shadow">
                                                        1
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">{e.rank || "-"}</span>
                                                )}
                                            </td>

                                            <td className="p-3">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-bold text-gray-800">{e.name}</span>
                                                    {isBest && (
                                                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                                                            ★ Pemenang
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-gray-400 mt-0.5">{e.description}</p>
                                            </td>

                                            <td className="p-3 font-mono text-[11px] text-gray-600 max-w-xs truncate" title={e.formula}>
                                                {e.formula}
                                            </td>

                                            <td className="p-3 text-right font-mono font-bold">
                                                {e.metrics?.mape !== null && e.metrics?.mape !== undefined ? (
                                                    <span className={isBest ? "text-emerald-700 text-sm" : "text-gray-700"}>
                                                        {e.metrics.mape.toFixed(2)}%
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-300">N/A</span>
                                                )}
                                            </td>

                                            <td className="p-3">
                                                {e.eligible && e.metrics?.mape !== null ? (
                                                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${mapeStatus.color === 'emerald' ? 'bg-emerald-100 text-emerald-800' :
                                                        mapeStatus.color === 'green' ? 'bg-green-100 text-green-800' :
                                                            mapeStatus.color === 'amber' ? 'bg-amber-100 text-amber-800' :
                                                                'bg-red-100 text-red-800'
                                                        }`}>
                                                        {mapeStatus.label}
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] text-red-500 bg-red-50 px-2 py-0.5 rounded">
                                                        {e.reason || "Tidak Layak"}
                                                    </span>
                                                )}
                                            </td>

                                            <td className="p-3 text-right font-mono text-gray-600">
                                                {e.metrics ? Math.round(e.metrics.rmse).toLocaleString("id-ID") : "-"}
                                            </td>

                                            <td className="p-3 text-right font-mono text-gray-600">
                                                {e.metrics ? Math.round(e.metrics.mae).toLocaleString("id-ID") : "-"}
                                            </td>

                                            <td className="p-3 font-mono text-[11px] text-gray-500">
                                                {Object.keys(e.params).length > 0 ? (
                                                    Object.entries(e.params).map(([k, v]) => `${k}: ${v}`).join(", ")
                                                ) : (
                                                    "-"
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-xs text-gray-600 space-y-1">
                        <p className="font-bold text-gray-800">Pedoman Interpretasi Nilai MAPE (Lewis, 1982):</p>
                        <ul className="list-disc list-inside space-y-0.5 text-gray-500 text-[11px]">
                            <li><strong>&lt; 10%</strong>: Kemampuan peramalan sangat akurat (Highly Accurate)</li>
                            <li><strong>10% - 20%</strong>: Kemampuan peramalan baik (Good Forecasting)</li>
                            <li><strong>20% - 50%</strong>: Kemampuan peramalan cukup layak (Reasonable Forecasting)</li>
                            <li><strong>&gt; 50%</strong>: Kemampuan peramalan tidak akurat (Inaccurate)</li>
                        </ul>
                    </div>
                </div>
            )}

            {/* ============ TAB 3: KEBUTUHAN BAHAN BAKU (BOM) ============ */}
            {activeSubTab === "bom" && (
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-5">
                    <div>
                        <h3 className="font-bold text-gray-800 text-lg">Proyeksi Kebutuhan Bahan Baku (Bill of Materials)</h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                            Dihitung otomatis dari perkalian prediksi cup penjualan {horizon} hari ke depan dengan formula resep produk.
                        </p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-y border-gray-200 text-gray-600 font-bold uppercase tracking-wider">
                                    <th className="p-3">Bahan Baku</th>
                                    <th className="p-3 text-right">Stok Gudang</th>
                                    <th className="p-3 text-right">Kebutuhan {horizon} Hari</th>
                                    <th className="p-3 text-right">Kebutuhan / Hari</th>
                                    <th className="p-3 text-center">Ketahanan Stok</th>
                                    <th className="p-3 text-right">Saran Restok Minimal</th>
                                    <th className="p-3 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {bomAnalysis?.rows.map((b) => {
                                    const isCritical = b.shortage > 0;
                                    const isWarning = !isCritical && b.daysCover <= horizon;
                                    return (
                                        <tr key={b.id} className="hover:bg-gray-50 transition">
                                            <td className="p-3 font-bold text-gray-800">
                                                {b.name}
                                                <span className="block text-[11px] font-normal text-gray-400">
                                                    Batas Min: {b.minStockThreshold} {b.unit}
                                                </span>
                                            </td>

                                            <td className="p-3 text-right font-mono font-bold text-gray-700">
                                                {b.stock.toLocaleString("id-ID")} {b.unit}
                                            </td>

                                            <td className="p-3 text-right font-mono font-bold text-amber-700">
                                                {Math.round(b.need).toLocaleString("id-ID")} {b.unit}
                                            </td>

                                            <td className="p-3 text-right font-mono text-gray-500">
                                                {Math.round(b.perDay).toLocaleString("id-ID")} {b.unit}
                                            </td>

                                            <td className="p-3 text-center font-bold">
                                                <span className={isCritical ? "text-red-600" : isWarning ? "text-amber-600" : "text-emerald-600"}>
                                                    {isFinite(b.daysCover) ? `± ${Math.floor(b.daysCover)} hari` : "> 90 hari"}
                                                </span>
                                            </td>

                                            <td className="p-3 text-right font-mono font-bold">
                                                {b.reorder > 0 ? (
                                                    <span className="text-red-600">
                                                        +{Math.ceil(b.reorder).toLocaleString("id-ID")} {b.unit}
                                                    </span>
                                                ) : (
                                                    <span className="text-emerald-600">Cukup</span>
                                                )}
                                            </td>

                                            <td className="p-3 text-center">
                                                {isCritical ? (
                                                    <span className="bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded text-[10px]">
                                                        Kritis (Defisit)
                                                    </span>
                                                ) : isWarning ? (
                                                    <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded text-[10px]">
                                                        Perlu Restok
                                                    </span>
                                                ) : (
                                                    <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px]">
                                                        Aman
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ============ TAB 4: LAPORAN NARASI GEMINI AI ============ */}
            {activeSubTab === "narrative" && (
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl">
                                <Sparkles size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-800 text-lg">Sintesis Narasi & Rekomendasi Manajerial AI</h3>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    Dihasilkan oleh model {aiSource || "Gemini 3.5 Flash Lite"} berbasis data kuantitatif komputasi.
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={handleGenerateAiNarrative}
                            disabled={isAiLoading}
                            className="flex items-center gap-2 bg-[#0D2B20] text-amber-400 px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#153f30] transition disabled:opacity-50"
                        >
                            <RefreshCw size={14} className={isAiLoading ? "animate-spin" : ""} />
                            {isAiLoading ? "Menganalisis..." : "Generate Ulang Narasi"}
                        </button>
                    </div>

                    {!aiNarrative && !isAiLoading ? (
                        <div className="text-center py-12 text-gray-400 space-y-3">
                            <BrainCircuit size={48} className="mx-auto text-gray-300" />
                            <p className="font-medium text-sm">Belum ada narasi AI yang di-generate</p>
                            <button
                                onClick={handleGenerateAiNarrative}
                                className="bg-amber-400 text-[#0D2B20] font-black px-6 py-2.5 rounded-xl text-xs hover:bg-amber-300 transition shadow"
                            >
                                Generate Laporan Narasi AI Sekarang
                            </button>
                        </div>
                    ) : isAiLoading ? (
                        <div className="text-center py-16 space-y-3">
                            <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
                            <p className="font-bold text-gray-700 text-sm">Gemini AI sedang menyusun laporan akademik & manajerial...</p>
                            <p className="text-xs text-gray-400">Memeriksa nilai MAPE, ranking model, dan stok bahan baku</p>
                        </div>
                    ) : (
                        <div className="prose prose-sm max-w-none text-gray-800 leading-relaxed whitespace-pre-wrap bg-gray-50/70 p-6 rounded-2xl border border-gray-200">
                            {aiNarrative}
                        </div>
                    )}
                </div>
            )}

            {/* ============ MODAL SIMULASI DATA ============ */}
            {isSimulateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white text-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
                        <div className="flex justify-between items-center border-b pb-3">
                            <h3 className="font-bold text-lg text-[#0D2B20] flex items-center gap-2">
                                🎲 Generate Simulasi Data Penjualan
                            </h3>
                            <button onClick={() => setIsSimulateModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>

                        <p className="text-xs text-gray-500 leading-relaxed">
                            Simulasi ini membuat transaksi realistis dengan pola musiman kedai minuman (akhir pekan ramai, weekday stabil, tren pertumbuhan bulanan, dan variasi menu) untuk pengujian algoritma skripsi.
                        </p>

                        <div className="space-y-3 text-xs">
                            <div>
                                <label className="block font-bold text-gray-700 mb-1">Durasi Periode Historis</label>
                                <select
                                    value={simDays}
                                    onChange={e => setSimDays(Number(e.target.value))}
                                    className="w-full p-2.5 border rounded-lg bg-gray-50 font-bold"
                                >
                                    <option value={60}>60 Hari (2 Bulan)</option>
                                    <option value={90}>90 Hari (3 Bulan) — Sangat Disarankan Skripsi</option>
                                    <option value={120}>120 Hari (4 Bulan)</option>
                                    <option value={180}>180 Hari (Setengah Tahun)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block font-bold text-gray-700 mb-1">Rata-rata Transaksi per Hari</label>
                                <input
                                    type="number"
                                    value={simTx}
                                    onChange={e => setSimTx(Number(e.target.value))}
                                    className="w-full p-2.5 border rounded-lg bg-gray-50 font-bold"
                                    min={10}
                                    max={200}
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-gray-700 mb-1">Pertumbuhan Penjualan per Bulan (%)</label>
                                <input
                                    type="number"
                                    value={simGrowth}
                                    onChange={e => setSimGrowth(Number(e.target.value))}
                                    className="w-full p-2.5 border rounded-lg bg-gray-50 font-bold"
                                    step={0.5}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-3 border-t">
                            <button
                                onClick={() => setIsSimulateModalOpen(false)}
                                className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-lg"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleCreateSimulation}
                                className="px-5 py-2 text-xs font-black bg-amber-400 hover:bg-amber-300 text-[#0D2B20] rounded-lg shadow"
                            >
                                Buat Data Simulasi
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ============ MODAL IMPOR FILE EXCEL / CSV ============ */}
            {isImportModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white text-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
                        <div className="flex justify-between items-center border-b pb-3">
                            <h3 className="font-bold text-lg text-[#0D2B20] flex items-center gap-2">
                                <Upload size={18} /> Impor Data CSV / Excel
                            </h3>
                            <button onClick={() => setIsImportModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>

                        <p className="text-xs text-gray-500 leading-relaxed">
                            Pilih file Excel (.xlsx) atau CSV yang berisi catatan transaksi masa lalu. Format yang didukung:
                        </p>

                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-[11px] font-mono text-gray-600 space-y-1">
                            <p className="font-bold text-gray-800">Format Kolom yang Dikenali:</p>
                            <p>• <strong>tanggal</strong> (misal: 2026-09-01 atau 01/09/2026)</p>
                            <p>• <strong>produk</strong> (nama produk sesuai menu)</p>
                            <p>• <strong>qty</strong> (jumlah cup/porsi)</p>
                            <p>• <strong>pendapatan / total</strong> (nominal rupiah)</p>
                        </div>

                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-[#0D2B20] transition cursor-pointer"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <FileSpreadsheet size={36} className="mx-auto text-emerald-600 mb-2" />
                            <p className="text-xs font-bold text-gray-700">Klik untuk memilih file Excel / CSV</p>
                            <p className="text-[10px] text-gray-400 mt-1">.xlsx, .xls, atau .csv</p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                className="hidden"
                                onChange={handleFileUpload}
                            />
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                onClick={() => setIsImportModalOpen(false)}
                                className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-lg"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
