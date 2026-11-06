/**
 * ============================================================================
 * FILE: lib/forecast/engine.ts
 * ============================================================================
 * @file Forecast Engine
 * @description Pipeline peramalan otomatis:
 *   1. Validasi kecukupan data & kelayakan tiap model.
 *   2. Rolling-origin validation (time-series cross-validation) — model dilatih
 *      pada data awal lalu diuji meramal periode berikutnya yang belum pernah dilihat.
 *   3. Seluruh model dibandingkan dengan MAE, RMSE, MAPE, sMAPE.
 *   4. Ditambah kandidat "Ensemble" (rata-rata 3 model terbaik) — kombinasi
 *      ramalan terbukti sering lebih akurat (Makridakis dkk., M4 Competition 2018).
 *   5. Model terbaik (berdasarkan kriteria pilihan) dilatih ulang pada seluruh
 *      data, lalu digunakan untuk meramal h hari ke depan beserta interval prediksi 95%.
 *
 * KETERKAITAN DENGAN FILE LAIN:
 * - Dipanggil oleh `components/forecast/ForecastDashboard.tsx` pada tab AI Forecast di halaman Admin.
 * ============================================================================
 */
import { MODELS, ModelSpec } from './models';
import { computeMetrics, criterionValue, Criterion, Metrics } from './metrics';
import { addDays, dayOfWeek } from './data';

export interface SeriesPoint {
    date: string; // YYYY-MM-DD
    value: number;
}

export interface ModelEvaluation {
    id: string;
    name: string;
    shortName: string;
    description: string;
    formula: string;
    eligible: boolean;
    reason?: string;
    params: Record<string, number>;
    metrics: Metrics | null;
    score: number;
    rank: number;
    /** Ramalan pada fold uji terakhir (untuk grafik). */
    testForecast: number[];
    components?: string[];
}

export interface FuturePoint {
    date: string;
    dow: number;
    yhat: number;
    lo: number;
    hi: number;
}

export type QualityLevel = 'tidak-cukup' | 'sangat-kurang' | 'kurang' | 'minimal' | 'cukup' | 'baik';

export interface DataQuality {
    n: number;
    zeros: number;
    activeDays: number;
    mean: number;
    cv: number;
    level: QualityLevel;
    label: string;
    message: string;
}

export interface ForecastResult {
    series: SeriesPoint[];
    horizon: number;
    criterion: Criterion;
    m: number;
    folds: number;
    testSize: number;
    testStartIndex: number;
    evaluations: ModelEvaluation[];
    best: ModelEvaluation;
    fitted: number[];
    future: FuturePoint[];
    sigma: number;
    seasonalIndex: number[]; // indeks hari Minggu..Sabtu (1 = rata-rata)
    quality: DataQuality;
    warnings: string[];
    computedAt: string;
    durationMs: number;
}

export interface ForecastOptions {
    horizon: number;
    criterion?: Criterion;
    m?: number;
    fast?: boolean;
    /** Paksa model tertentu (opsional, untuk analisis per-metode). */
    forceModelId?: string;
}

const clamp0 = (v: number) => (Number.isFinite(v) ? Math.max(0, v) : 0);

export function assessQuality(values: number[]): DataQuality {
    const n = values.length;
    const zeros = values.filter(v => v === 0).length;
    const mean = n ? values.reduce((s, v) => s + v, 0) / n : 0;
    const sd = n ? Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / n) : 0;
    const cv = mean ? sd / mean : 0;
    const base = { n, zeros, activeDays: n - zeros, mean, cv };
    if (n < 4) return { ...base, level: 'tidak-cukup', label: 'Tidak Cukup', message: `Hanya ${n} hari data. Minimal 4 hari untuk meramal; disarankan ≥ 56 hari (8 minggu).` };
    if (n < 8) return { ...base, level: 'sangat-kurang', label: 'Sangat Kurang', message: `${n} hari data. Hanya model sederhana (Naive, SMA, SES) yang dapat dipakai.` };
    if (n < 16) return { ...base, level: 'kurang', label: 'Kurang', message: `${n} hari data. Holt-Winters membutuhkan ≥ 16 hari (2 siklus mingguan).` };
    if (n < 28) return { ...base, level: 'minimal', label: 'Minimal', message: `${n} hari data. Semua model dapat berjalan, namun akurasi akan meningkat dengan ≥ 8 minggu data.` };
    if (n < 56) return { ...base, level: 'cukup', label: 'Cukup', message: `${n} hari data. Cukup untuk analisis musiman mingguan.` };
    return { ...base, level: 'baik', label: 'Baik', message: `${n} hari data (${Math.floor(n / 7)} minggu). Sangat memadai untuk validasi silang deret waktu.` };
}

/** Indeks musiman harian: rata-rata per hari ÷ rata-rata keseluruhan. */
export function seasonalIndex(series: SeriesPoint[]): number[] {
    const sum = Array(7).fill(0), cnt = Array(7).fill(0);
    series.forEach(p => { const d = dayOfWeek(p.date); sum[d] += p.value; cnt[d]++; });
    const overall = series.length ? series.reduce((s, p) => s + p.value, 0) / series.length : 0;
    return sum.map((s, i) => (cnt[i] && overall ? s / cnt[i] / overall : 0));
}

function validationPlan(n: number, fast?: boolean) {
    let testSize: number, folds: number;
    if (n >= 42) testSize = 7;
    else testSize = Math.max(1, Math.min(7, Math.floor(n * 0.2)));
    if (fast) folds = 1;
    else if (n >= 70) folds = 3;
    else if (n >= 42) folds = 2;
    else folds = 1;
    return { testSize, folds };
}

export function runForecast(series: SeriesPoint[], opts: ForecastOptions): ForecastResult | null {
    const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const { horizon, criterion = 'mape', m = 7, fast = false } = opts;
    const y = series.map(p => p.value);
    const dow = series.map(p => dayOfWeek(p.date));
    const n = y.length;
    const quality = assessQuality(y);
    const warnings: string[] = [];
    if (n < 4) return null;

    const { testSize, folds } = validationPlan(n, fast);
    const firstTrainLen = n - testSize * folds;
    const allPositive = y.every(v => v > 0);

    // ── Evaluasi tiap model dengan rolling-origin ─────────────────
    type Raw = { spec: ModelSpec; eligible: boolean; reason?: string; actual: number[]; pred: number[]; perFold: number[][]; lastParams: Record<string, number> };
    const raws: Raw[] = MODELS.map(spec => {
        const min = spec.minLength(m);
        if (firstTrainLen < min) return { spec, eligible: false, reason: `Butuh ≥ ${min} data latih (tersedia ${firstTrainLen})`, actual: [], pred: [], perFold: [], lastParams: {} };
        if (spec.requiresPositive && !allPositive) return { spec, eligible: false, reason: 'Ada hari bernilai 0 — model multiplikatif tidak dapat dipakai', actual: [], pred: [], perFold: [], lastParams: {} };
        const actual: number[] = [], pred: number[] = [], perFold: number[][] = [];
        let lastParams: Record<string, number> = {};
        try {
            for (let k = 0; k < folds; k++) {
                const trainEnd = firstTrainLen + k * testSize;
                const train = y.slice(0, trainEnd);
                const fit = spec.fit(train, { m, dow: dow.slice(0, trainEnd), fast });
                const f = fit.forecast(testSize).map(clamp0);
                if (f.some(v => !Number.isFinite(v))) throw new Error('non-finite');
                actual.push(...y.slice(trainEnd, trainEnd + testSize));
                pred.push(...f);
                perFold.push(f);
                lastParams = fit.params;
            }
        } catch {
            return { spec, eligible: false, reason: 'Model gagal konvergen pada data ini', actual: [], pred: [], perFold: [], lastParams: {} };
        }
        return { spec, eligible: true, actual, pred, perFold, lastParams };
    });

    const evals: ModelEvaluation[] = raws.map(r => {
        const metrics = r.eligible ? computeMetrics(r.actual, r.pred) : null;
        return {
            id: r.spec.id,
            name: r.spec.name,
            shortName: r.spec.shortName,
            description: r.spec.description,
            formula: r.spec.formula,
            eligible: r.eligible,
            reason: r.reason,
            params: r.lastParams,
            metrics,
            score: metrics ? criterionValue(metrics, criterion) : Infinity,
            rank: 0,
            testForecast: r.perFold[r.perFold.length - 1] ?? [],
        };
    });

    // ── Ensemble: rata-rata 3 model terbaik ───────────────────────
    const ranked = evals.filter(e => e.eligible).sort((a, b) => a.score - b.score);
    const top = ranked.slice(0, 3);
    if (top.length >= 2) {
        const comps = top.map(t => raws.find(r => r.spec.id === t.id)!);
        const pred = comps[0].pred.map((_, i) => comps.reduce((s, c) => s + c.pred[i], 0) / comps.length);
        const metrics = computeMetrics(comps[0].actual, pred);
        const lastFold = comps[0].perFold[comps[0].perFold.length - 1].map((_, i) =>
            comps.reduce((s, c) => s + c.perFold[c.perFold.length - 1][i], 0) / comps.length);
        evals.push({
            id: 'ensemble',
            name: `Ensemble (${top.map(t => t.shortName).join(' + ')})`,
            shortName: 'Ensemble',
            description: 'Kombinasi ramalan: rata-rata sederhana dari model-model dengan galat validasi terkecil.',
            formula: `ŷ = (1/${top.length}) · Σ ŷ_model`,
            eligible: true,
            params: {},
            metrics,
            score: criterionValue(metrics, criterion),
            rank: 0,
            testForecast: lastFold,
            components: top.map(t => t.id),
        });
    }

    const eligible = evals.filter(e => e.eligible).sort((a, b) => a.score - b.score || (a.metrics!.rmse - b.metrics!.rmse));
    eligible.forEach((e, i) => { e.rank = i + 1; });
    if (!eligible.length) return null;

    let best = eligible[0];
    if (opts.forceModelId) {
        const forced = eligible.find(e => e.id === opts.forceModelId);
        if (forced) best = forced;
    }

    // ── Latih ulang model terbaik pada seluruh data ───────────────
    const refit = (id: string) => {
        const spec = MODELS.find(s => s.id === id)!;
        return spec.fit(y, { m, dow, fast });
    };
    let fitted: number[];
    let futureVals: number[];
    if (best.id === 'ensemble' && best.components) {
        const fits = best.components.map(refit);
        fitted = y.map((_, i) => {
            const vals = fits.map(f => f.fitted[i]).filter(Number.isFinite);
            return vals.length === fits.length ? vals.reduce((s, v) => s + v, 0) / vals.length : NaN;
        });
        const fcs = fits.map(f => f.forecast(horizon));
        futureVals = fcs[0].map((_, i) => fcs.reduce((s, f) => s + f[i], 0) / fcs.length);
    } else {
        const fit = refit(best.id);
        fitted = fit.fitted;
        futureVals = fit.forecast(horizon);
        best.params = fit.params;
    }

    // ── Interval prediksi 95% berbasis galat ──────────────────────
    const resid = y.map((v, i) => v - fitted[i]).filter(Number.isFinite);
    const residSd = resid.length > 1 ? Math.sqrt(resid.reduce((s, e) => s + e * e, 0) / (resid.length - 1)) : 0;
    const sigma = Math.max(best.metrics?.rmse ?? 0, residSd);
    const lastDate = series[n - 1].date;
    const future: FuturePoint[] = futureVals.map((v, i) => {
        const date = addDays(lastDate, i + 1);
        const yhat = clamp0(v);
        const width = 1.96 * sigma * Math.sqrt(1 + i / Math.max(horizon, 7));
        return { date, dow: dayOfWeek(date), yhat, lo: clamp0(yhat - width), hi: yhat + width };
    });

    if (quality.level === 'sangat-kurang' || quality.level === 'kurang') {
        warnings.push('Jumlah data historis masih sedikit — hasil validasi belum stabil. Tambahkan data histori (impor) agar akurasi meningkat.');
    }
    if (quality.zeros / n > 0.3) {
        warnings.push(`${quality.zeros} dari ${n} hari tidak memiliki penjualan. Bila toko memang tutup pada hari tersebut, pertimbangkan untuk mengimpor data yang lengkap.`);
    }
    if (best.metrics?.mape !== null && (best.metrics?.mape ?? 0) > 50) {
        warnings.push('MAPE > 50% — pola penjualan sangat fluktuatif atau data masih kurang.');
    }

    const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now();
    return {
        series,
        horizon,
        criterion,
        m,
        folds,
        testSize,
        testStartIndex: n - testSize,
        evaluations: [...eligible, ...evals.filter(e => !e.eligible)],
        best,
        fitted,
        future,
        sigma,
        seasonalIndex: seasonalIndex(series),
        quality,
        warnings,
        computedAt: new Date().toISOString(),
        durationMs: Math.round(t1 - t0),
    };
}
