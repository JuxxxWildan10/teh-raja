/**
 * ============================================================================
 * FILE: lib/forecast/metrics.ts
 * ============================================================================
 * @file Forecast Accuracy Metrics
 * @description Ukuran akurasi peramalan yang umum dipakai dalam penelitian:
 *   MAE   = (1/n) Σ |yt − ŷt|
 *   RMSE  = √[(1/n) Σ (yt − ŷt)²]
 *   MAPE  = (100/n) Σ |yt − ŷt| / |yt|          (hanya untuk yt ≠ 0)
 *   sMAPE = (100/n) Σ 2|yt − ŷt| / (|yt| + |ŷt|)
 *   WAPE  = 100 · Σ|yt − ŷt| / Σ|yt|
 *
 * KETERKAITAN DENGAN FILE LAIN:
 * - Dipanggil oleh `lib/forecast/engine.ts` dan ditampilkan di `components/forecast/ForecastDashboard.tsx`
 *   untuk menentukan model peramalan terbaik beserta kategori akurasi menurut kriteria Lewis (1982).
 * ============================================================================
 */

export interface Metrics {
    mae: number;
    rmse: number;
    mape: number | null;
    smape: number;
    wape: number | null;
    n: number;
}

export type Criterion = 'mape' | 'rmse' | 'mae' | 'smape';

export function computeMetrics(actual: number[], pred: number[]): Metrics {
    const n = Math.min(actual.length, pred.length);
    let ae = 0, se = 0, ape = 0, apeN = 0, sape = 0, absAct = 0;
    for (let i = 0; i < n; i++) {
        const y = actual[i], f = pred[i];
        const e = Math.abs(y - f);
        ae += e;
        se += e * e;
        absAct += Math.abs(y);
        if (y !== 0) { ape += e / Math.abs(y); apeN++; }
        const d = Math.abs(y) + Math.abs(f);
        sape += d === 0 ? 0 : (2 * e) / d;
    }
    return {
        mae: n ? ae / n : 0,
        rmse: n ? Math.sqrt(se / n) : 0,
        mape: apeN ? (ape / apeN) * 100 : null,
        smape: n ? (sape / n) * 100 : 0,
        wape: absAct ? (ae / absAct) * 100 : null,
        n,
    };
}

export function criterionValue(m: Metrics, c: Criterion): number {
    switch (c) {
        case 'mape': return m.mape ?? m.smape;
        case 'rmse': return m.rmse;
        case 'mae': return m.mae;
        case 'smape': return m.smape;
    }
}

/** Interpretasi MAPE menurut Lewis (1982). */
export function interpretMape(mape: number | null): { label: string; color: string } {
    if (mape === null || !Number.isFinite(mape)) return { label: 'Tidak dapat dihitung', color: 'gray' };
    if (mape < 10) return { label: 'Sangat Akurat', color: 'emerald' };
    if (mape < 20) return { label: 'Akurat (Baik)', color: 'green' };
    if (mape < 50) return { label: 'Cukup Layak', color: 'amber' };
    return { label: 'Tidak Akurat', color: 'red' };
}

export const CRITERION_LABEL: Record<Criterion, string> = {
    mape: 'MAPE (%)',
    smape: 'sMAPE (%)',
    rmse: 'RMSE',
    mae: 'MAE',
};
