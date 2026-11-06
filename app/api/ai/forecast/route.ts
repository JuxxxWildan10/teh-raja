/**
 * ============================================================================
 * FILE: app/api/ai/forecast/route.ts
 * ============================================================================
 * FUNGSI UTAMA (Fitur Pengembangan Lanjutan / Skripsi):
 * Endpoint API (`POST /api/ai/forecast`) untuk menghasilkan laporan narasi analisis
 * peramalan penjualan (AI Demand Forecasting) dan rekomendasi pengadaan bahan baku BOM.
 *
 * KEUNGGULAN:
 * - Memiliki `buildRuleBasedNarrative(summary)` sebagai *fallback* deterministik jika
 *   `GEMINI_API_KEY` tidak tersedia, sehingga narasi eksekutif selalu berhasil dibuat.
 *
 * KETERKAITAN DENGAN FILE LAIN:
 * - Dipanggil oleh komponen `components/forecast/ForecastDashboard.tsx` pada tab AI Forecast.
 * ============================================================================
 */
import { NextResponse } from 'next/server';
import { generate, hasGeminiKey } from '@/lib/gemini';
import { runForecast, assessQuality } from '@/lib/forecast/engine';
import { buildDaily, toSeries, ingredientNeeds, productTotals, Target, SourceFilter } from '@/lib/forecast/data';
import { interpretMape } from '@/lib/forecast/metrics';

interface ForecastPayload {
    summary?: any;
    orders?: any[];
    history?: any[];
    products?: any[];
    ingredients?: any[];
    target?: Target;
    horizon?: number;
    criterion?: 'mape' | 'rmse' | 'mae';
    filter?: SourceFilter;
}

function buildRuleBasedNarrative(summary: any): string {
    const { target, horizon, bestModel, projectedStats, historicalStats, bomRequirements, dataQuality } = summary;
    const targetLabel = target === 'revenue' ? 'Pendapatan' : target === 'transactions' ? 'Jumlah Transaksi' : 'Total Cup';
    const unit = target === 'revenue' ? 'Rp ' : '';
    const mapeVal = bestModel?.metrics?.mape !== null ? `${bestModel.metrics.mape.toFixed(2)}%` : 'N/A';
    const mapeStatus = interpretMape(bestModel?.metrics?.mape);

    const criticalBOM = (bomRequirements || []).filter((b: any) => b.shortage > 0 || b.daysCover <= horizon);

    return `## 📊 1. Ringkasan Eksekutif & Proyeksi ${horizon} Hari ke Depan
Berdasarkan data historis selama **${dataQuality?.n || 0} hari**, total estimasi **${targetLabel}** untuk ${horizon} hari mendatang diperkirakan mencapai **${unit}${Math.round(projectedStats?.totalProjected || 0).toLocaleString('id-ID')}**, dengan rata-rata harian sekitar **${unit}${Math.round(projectedStats?.avgDailyProjected || 0).toLocaleString('id-ID')}**.
${projectedStats?.growthPct !== undefined ? `Tren proyeksi menunjukkan perubahan **${projectedStats.growthPct >= 0 ? '+' : ''}${projectedStats.growthPct.toFixed(1)}%** dibandingkan periode rata-rata historis sebelumnya.` : ''}

## 🏆 2. Evaluasi Model Komparatif (Basis Ilmiah Skripsi)
Metode peramalan terbaik yang terpilih secara otomatis berdasarkan galat validasi terendah adalah **${bestModel?.name || 'Triple Exponential Smoothing'}**.
- **Model Terpilih**: \`${bestModel?.name}\` (${bestModel?.formula || 'Komparasi Multi-Model'})
- **Tingkat Akurasi (MAPE)**: **${mapeVal}** (${mapeStatus.label})
- **Galat Standar (RMSE)**: ${Math.round(bestModel?.metrics?.rmse || 0).toLocaleString('id-ID')}
- **Rata-rata Galat Absolut (MAE)**: ${Math.round(bestModel?.metrics?.mae || 0).toLocaleString('id-ID')}
Model ini mengungguli model baseline (Naive dan Moving Average) karena mampu menangkap kombinasi fluktuasi level serta pola musiman mingguan kedai Teh Raja.

## 📦 3. Analisis Kebutuhan Bahan Baku (BOM - Bill of Materials)
${criticalBOM.length > 0
    ? `Ditemukan **${criticalBOM.length} bahan baku** yang memerlukan pengadaan ulang (restok) sebelum periode peramalan ${horizon} hari berakhir:
${criticalBOM.map((b: any) => `- **${b.name}**: Sisa stok ${b.stock.toLocaleString('id-ID')} ${b.unit}, kebutuhan ${Math.round(b.need).toLocaleString('id-ID')} ${b.unit}. Ketahanan stok: **±${Math.floor(b.daysCover)} hari**. Disarankan pesan minimal **${Math.ceil(b.reorder).toLocaleString('id-ID')} ${b.unit}** segera.`).join('\n')}`
    : `✅ Semua bahan baku berada dalam batas aman dan mencukupi proyeksi kebutuhan selama ${horizon} hari ke depan.`}

## 🚀 4. Rekomendasi Strategis Bisnis
1. **Optimalisasi Jadwal Shift**: Sesuaikan jumlah kasir dan barista pada hari dengan pola ramalan tertinggi (khususnya akhir pekan).
2. **Pengadaan Stok Terjadwal**: Lakukan pemesanan bahan baku dengan pemasok utama 2-3 hari sebelum ambang batas kritis tercapai.
3. **Program Promosi Terarah**: Terapkan promo *Happy Hour* atau *Voucher Loyalty* pada hari-hari yang diprediksi mengalami penurunan trafik untuk mendongkrak penjualan.
4. **Pencatatan Berkelanjutan**: Terus catat transaksi secara disiplin di aplikasi POS ini agar variansi sampel bertambah dan nilai MAPE semakin presisi.`;
}

export async function POST(req: Request) {
    try {
        const body: ForecastPayload = await req.json();

        let summary = body.summary;

        // If client didn't precompute summary, compute it from raw data
        if (!summary && body.orders) {
            const filter = body.filter || { pos: true, import: true, simulasi: true };
            const daily = buildDaily(body.orders, body.history || [], filter, { fillToToday: true });
            const target = body.target || 'revenue';
            const horizon = body.horizon || 14;
            const criterion = body.criterion || 'mape';
            const series = toSeries(daily, target);

            const result = runForecast(series, { horizon, criterion, m: 7 });
            if (!result) {
                return NextResponse.json({ error: 'Data deret waktu belum cukup (minimal 4 hari).' }, { status: 400 });
            }

            const totalProjected = result.future.reduce((s, f) => s + f.yhat, 0);
            const avgDailyProjected = result.future.length ? totalProjected / result.future.length : 0;
            const histAvg = result.quality.mean;
            const growthPct = histAvg > 0 ? ((avgDailyProjected - histAvg) / histAvg) * 100 : 0;

            const pTotals = productTotals(daily);
            const topProducts = pTotals.slice(0, 8).map(p => ({
                key: p.key,
                name: p.name,
                historicalQty: p.qty,
                projectedQty: Math.round((p.qty / Math.max(1, daily.length)) * horizon),
                revenue: p.revenue,
            }));

            const { rows: bomRows } = ingredientNeeds(
                topProducts.map(p => ({ key: p.key, total: p.projectedQty })),
                body.products || [],
                body.ingredients || [],
                horizon
            );

            summary = {
                target,
                horizon,
                criterion,
                dataQuality: result.quality,
                bestModel: result.best,
                modelRankings: result.evaluations.map(e => ({
                    rank: e.rank,
                    name: e.name,
                    shortName: e.shortName,
                    eligible: e.eligible,
                    reason: e.reason,
                    metrics: e.metrics,
                    params: e.params,
                    formula: e.formula
                })),
                projectedStats: {
                    totalProjected,
                    avgDailyProjected,
                    growthPct,
                    projectedDates: result.future
                },
                topProducts,
                bomRequirements: bomRows,
                forecastResult: result
            };
        }

        if (!summary) {
            return NextResponse.json({ error: 'Data analisis tidak valid atau kosong' }, { status: 400 });
        }

        // If no Gemini API key configured, return structured rule-based narrative directly!
        if (!hasGeminiKey()) {
            const fallbackNarrative = buildRuleBasedNarrative(summary);
            return NextResponse.json({
                summary,
                narrative: fallbackNarrative,
                source: 'rule-based-engine',
                message: 'Hasil peramalan statistik dihitung secara matematis.'
            });
        }

        // Otherwise, enrich with Gemini intelligence using fast gemini-3.5-flash-lite!
        const prompt = `Anda adalah konsultan bisnis F&B profesional dan akademisi data science.
Tugas Anda adalah menulis Laporan Hasil Peramalan Penjualan & Analisis Strategis untuk kedai "Teh Raja".
Laporan ini akan digunakan sebagai dasar pengambilan keputusan manajerial dan Bab 4 (Hasil & Pembahasan) Skripsi.

DATA STATISTIK PERAMALAN (HASIL ENGINE):
- Target Peramalan: ${summary.target === 'revenue' ? 'Pendapatan (Rupiah)' : summary.target === 'transactions' ? 'Jumlah Transaksi' : 'Item Terjual (Cup)'}
- Horizon: ${summary.horizon} hari ke depan
- Jumlah Data Historis: ${summary.dataQuality?.n || 0} hari (${summary.dataQuality?.activeDays || 0} hari aktif bertransaksi)
- Kualitas Sampel: ${summary.dataQuality?.label} (${summary.dataQuality?.message})
- Model Terbaik Terpilih: ${summary.bestModel?.name}
- Parameter Model: ${JSON.stringify(summary.bestModel?.params || {})}
- Evaluasi Model Pemenang:
    * MAPE: ${summary.bestModel?.metrics?.mape !== null ? summary.bestModel?.metrics?.mape.toFixed(2) + '%' : 'N/A'} (Kriteria Lewis 1982: ${interpretMape(summary.bestModel?.metrics?.mape).label})
    * RMSE: ${Math.round(summary.bestModel?.metrics?.rmse || 0).toLocaleString('id-ID')}
    * MAE: ${Math.round(summary.bestModel?.metrics?.mae || 0).toLocaleString('id-ID')}
- Komparasi Ranking Model:
${(summary.modelRankings || []).slice(0, 5).map((m: any) => `  ${m.rank}. ${m.name} | MAPE: ${m.metrics?.mape !== null && m.metrics?.mape !== undefined ? m.metrics.mape.toFixed(2) + '%' : 'N/A'} | RMSE: ${Math.round(m.metrics?.rmse || 0)}`).join('\n')}

PROYEKSI MENDATANG:
- Total Proyeksi ${summary.horizon} Hari: ${summary.target === 'revenue' ? 'Rp ' : ''}${Math.round(summary.projectedStats?.totalProjected || 0).toLocaleString('id-ID')}
- Rata-rata Proyeksi Harian: ${summary.target === 'revenue' ? 'Rp ' : ''}${Math.round(summary.projectedStats?.avgDailyProjected || 0).toLocaleString('id-ID')}
- Perubahan Tren vs Historis: ${summary.projectedStats?.growthPct >= 0 ? '+' : ''}${(summary.projectedStats?.growthPct || 0).toFixed(1)}%

PERINGATAN BAHAN BAKU (BOM):
${(summary.bomRequirements || []).filter((b: any) => b.shortage > 0 || b.daysCover <= summary.horizon).map((b: any) => `  * ${b.name}: sisa ${b.stock} ${b.unit}, butuh ${Math.round(b.need)} ${b.unit} (habis dalam ±${Math.floor(b.daysCover)} hari)`).join('\n') || '  Semua bahan baku tercukupi'}

Susun laporan profesional dalam format Markdown terstruktur dengan bagian berikut:
1. 📊 RINGKASAN EKSEKUTIF PROYEKSI — Evaluasi angka proyeksi, tren naik/turun, dan implikasi omzet.
2. 🔬 PEMBAHASAN AKADEMIK & METODE PERAMALAN — Jelaskan mengapa model pemenang (${summary.bestModel?.name}) lebih unggul dibanding model baseline (Naive/SMA), interpretasikan nilai MAPE (${summary.bestModel?.metrics?.mape?.toFixed(2)}%) menurut standar ilmiah, dan sertakan formula matematisnya secara elegan.
3. 📦 MANAJEMEN BAHAN BAKU & SUPPLY CHAIN — Identifikasi bahan baku kritis yang harus direstok, estimasi waktu kehabisan, dan saran ukuran pemesanan kembali (reorder point).
4. 💡 REKOMENDASI MANAJERIAL TAKTIS — 4 langkah konkret yang terukur (operasional kasir, strategi promo jam/hari sepi, dan retensi pelanggan) untuk kedai Teh Raja.

Gunakan gaya bahasa profesional, presisi, berbasis data, dan mudah dipahami oleh dosen penguji maupun pemilik kedai.`;

        try {
            const { text, model } = await generate({
                prompt,
                temperature: 0.3,
                maxOutputTokens: 1200,
                timeoutMs: 25000,
                thinkingLevel: 'low',
            });

            return NextResponse.json({
                summary,
                narrative: text,
                source: model,
            });
        } catch (aiErr: any) {
            console.warn('[AI Forecast fallback triggered]', aiErr.message);
            // Graceful fallback to rule-based narrative
            const fallbackNarrative = buildRuleBasedNarrative(summary);
            return NextResponse.json({
                summary,
                narrative: fallbackNarrative,
                source: 'rule-based-fallback',
                warning: `AI narrative menggunakan engine cadangan: ${aiErr.message}`
            });
        }

    } catch (error: any) {
        console.error('Forecast Route Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
