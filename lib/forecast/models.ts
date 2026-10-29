/**
 * @file Forecasting Models (Time Series)
 * @description Implementasi murni TypeScript dari metode peramalan deret waktu yang
 * dibandingkan secara otomatis oleh engine:
 *   1. Naive                         ŷ(t+h) = y(t)
 *   2. Seasonal Naive (m = 7)        ŷ(t+h) = y(t+h-m·k)
 *   3. Simple Moving Average (SMA)   ŷ = (1/k) Σ y(t-i)
 *   4. Weighted Moving Average (WMA) ŷ = Σ w_i·y(t-i) / Σ w_i
 *   5. Single Exponential Smoothing  ℓt = αyt + (1-α)ℓt-1
 *   6. Holt (Damped Trend)           ℓt, bt dengan faktor redaman φ
 *   7. Holt-Winters Aditif (Damped)  ℓt, bt, st — musiman mingguan
 *   8. Holt-Winters Multiplikatif    ℓt, bt, st — musiman proporsional
 *   9. Regresi Linear Musiman        y = β0 + β1·t + Σ γd·D(hari)
 *
 * Parameter tiap model dioptimasi dengan grid search untuk meminimalkan
 * Sum of Squared Errors (SSE) one-step-ahead pada data latih.
 */

export interface FitResult {
    /** Nilai ramalan one-step-ahead untuk setiap titik data latih (NaN bila belum tersedia). */
    fitted: number[];
    /** Ramalan h langkah ke depan. */
    forecast: (h: number) => number[];
    /** Parameter terpilih (untuk ditampilkan di laporan). */
    params: Record<string, number>;
}

export interface ModelSpec {
    id: string;
    name: string;
    shortName: string;
    /** Jumlah data minimum agar model dapat dijalankan. */
    minLength: (m: number) => number;
    /** Apakah model memerlukan seluruh data > 0 (mis. multiplikatif). */
    requiresPositive?: boolean;
    description: string;
    formula: string;
    fit: (y: number[], ctx: FitContext) => FitResult;
}

export interface FitContext {
    /** Panjang musim (7 = mingguan untuk data harian). */
    m: number;
    /** Indeks hari (0 = Minggu … 6 = Sabtu) untuk setiap titik y. */
    dow: number[];
    /** Mode cepat: grid lebih kasar (dipakai untuk peramalan per-produk). */
    fast?: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────
const sse = (y: number[], f: number[], start = 0) => {
    let s = 0;
    for (let i = start; i < y.length; i++) {
        if (Number.isFinite(f[i])) {
            const e = y[i] - f[i];
            s += e * e;
        }
    }
    return s;
};

const mean = (a: number[]) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0);

const GRID_FULL = [0.05, 0.1, 0.15, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
const GRID_FAST = [0.1, 0.3, 0.5, 0.7, 0.9];
const GRID_GAMMA_FULL = [0.05, 0.1, 0.2, 0.3, 0.5, 0.7];
const GRID_GAMMA_FAST = [0.1, 0.3, 0.6];
const PHI_FULL = [0.8, 0.9, 0.98, 1];
const PHI_FAST = [0.9, 1];

const dampSum = (phi: number, h: number) => {
    if (phi === 1) return h;
    let s = 0, p = 1;
    for (let i = 1; i <= h; i++) { p *= phi; s += p; }
    return s;
};

// ── 1. Naive ───────────────────────────────────────────────────────
const naive: ModelSpec = {
    id: 'naive',
    name: 'Naive',
    shortName: 'Naive',
    minLength: () => 2,
    description: 'Baseline: ramalan sama dengan nilai observasi terakhir.',
    formula: 'ŷ(t+h) = y(t)',
    fit: (y) => {
        const fitted = y.map((_, i) => (i === 0 ? NaN : y[i - 1]));
        const last = y[y.length - 1];
        return { fitted, forecast: (h) => Array(h).fill(last), params: {} };
    },
};

// ── 2. Seasonal Naive ──────────────────────────────────────────────
const seasonalNaive: ModelSpec = {
    id: 'snaive',
    name: 'Seasonal Naive (Mingguan)',
    shortName: 'S-Naive',
    minLength: (m) => m + 1,
    description: 'Baseline musiman: ramalan sama dengan nilai pada hari yang sama minggu lalu.',
    formula: 'ŷ(t+h) = y(t+h−m·⌈h/m⌉), m = 7',
    fit: (y, { m }) => {
        const n = y.length;
        const fitted = y.map((_, i) => (i < m ? NaN : y[i - m]));
        return {
            fitted,
            forecast: (h) => Array.from({ length: h }, (_, i) => {
                const k = Math.ceil((i + 1) / m);
                return y[n + i - m * k];
            }),
            params: { m },
        };
    },
};

// ── 3. Simple Moving Average ───────────────────────────────────────
function smaRun(y: number[], k: number) {
    const fitted = y.map((_, i) => (i < k ? NaN : mean(y.slice(i - k, i))));
    return fitted;
}
const sma: ModelSpec = {
    id: 'sma',
    name: 'Simple Moving Average',
    shortName: 'SMA',
    minLength: () => 4,
    description: 'Rata-rata k periode terakhir. Nilai k terbaik dipilih otomatis.',
    formula: 'ŷ(t+1) = (1/k) · Σ_{i=0}^{k−1} y(t−i)',
    fit: (y) => {
        let best = { k: 3, err: Infinity, fitted: [] as number[] };
        const maxStart = Math.max(...[3, 5, 7, 14].filter(k => k < y.length - 1), 3);
        for (const k of [3, 5, 7, 14]) {
            if (k >= y.length - 1) continue;
            const f = smaRun(y, k);
            // bandingkan pada rentang yang sama agar adil
            const err = sse(y, f, maxStart);
            if (err < best.err) best = { k, err, fitted: f };
        }
        const k = best.k;
        const last = mean(y.slice(-k));
        return { fitted: best.fitted.length ? best.fitted : smaRun(y, k), forecast: (h) => Array(h).fill(last), params: { k } };
    },
};

// ── 4. Weighted Moving Average ─────────────────────────────────────
function wmaValue(win: number[]) {
    let num = 0, den = 0;
    win.forEach((v, i) => { const w = i + 1; num += w * v; den += w; });
    return den ? num / den : 0;
}
const wma: ModelSpec = {
    id: 'wma',
    name: 'Weighted Moving Average',
    shortName: 'WMA',
    minLength: () => 4,
    description: 'Rata-rata tertimbang; data terbaru diberi bobot lebih besar (1, 2, …, k).',
    formula: 'ŷ(t+1) = Σ w_i·y(t−k+i) / Σ w_i,  w_i = i',
    fit: (y) => {
        let best = { k: 3, err: Infinity };
        const cands = [3, 5, 7, 14].filter(k => k < y.length - 1);
        const start = Math.max(...cands, 3);
        for (const k of cands) {
            const f = y.map((_, i) => (i < k ? NaN : wmaValue(y.slice(i - k, i))));
            const err = sse(y, f, start);
            if (err < best.err) best = { k, err };
        }
        const k = best.k;
        const fitted = y.map((_, i) => (i < k ? NaN : wmaValue(y.slice(i - k, i))));
        const last = wmaValue(y.slice(-k));
        return { fitted, forecast: (h) => Array(h).fill(last), params: { k } };
    },
};

// ── 5. Single Exponential Smoothing ────────────────────────────────
function sesRun(y: number[], alpha: number) {
    let l = y[0];
    const fitted: number[] = [NaN];
    for (let t = 1; t < y.length; t++) {
        fitted.push(l);
        l = alpha * y[t] + (1 - alpha) * l;
    }
    return { fitted, level: l };
}
const ses: ModelSpec = {
    id: 'ses',
    name: 'Single Exponential Smoothing',
    shortName: 'SES',
    minLength: () => 4,
    description: 'Pemulusan eksponensial untuk data tanpa tren & musiman.',
    formula: 'ℓt = α·yt + (1−α)·ℓt−1;  ŷ(t+h) = ℓt',
    fit: (y, { fast }) => {
        let best = { alpha: 0.3, err: Infinity };
        for (const a of fast ? GRID_FAST : GRID_FULL) {
            const { fitted } = sesRun(y, a);
            const err = sse(y, fitted, 1);
            if (err < best.err) best = { alpha: a, err };
        }
        const { fitted, level } = sesRun(y, best.alpha);
        return { fitted, forecast: (h) => Array(h).fill(level), params: { alpha: best.alpha } };
    },
};

// ── 6. Holt Linear (Damped) ────────────────────────────────────────
function holtRun(y: number[], a: number, b: number, phi: number) {
    let l = y[0];
    let tr = y.length > 1 ? y[1] - y[0] : 0;
    const fitted: number[] = [NaN];
    for (let t = 1; t < y.length; t++) {
        fitted.push(l + phi * tr);
        const lPrev = l;
        l = a * y[t] + (1 - a) * (lPrev + phi * tr);
        tr = b * (l - lPrev) + (1 - b) * phi * tr;
    }
    return { fitted, l, tr };
}
const holt: ModelSpec = {
    id: 'holt',
    name: 'Holt Damped Trend',
    shortName: 'Holt',
    minLength: () => 6,
    description: 'Double Exponential Smoothing dengan tren teredam (φ) untuk data bertren.',
    formula: 'ℓt = α·yt + (1−α)(ℓt−1 + φbt−1);  bt = β(ℓt − ℓt−1) + (1−β)φbt−1;  ŷ(t+h) = ℓt + (φ+…+φ^h)·bt',
    fit: (y, { fast }) => {
        const G = fast ? GRID_FAST : GRID_FULL;
        let best = { a: 0.3, b: 0.1, phi: 0.98, err: Infinity };
        for (const a of G) for (const b of G) for (const phi of fast ? PHI_FAST : PHI_FULL) {
            if (b > a) continue; // praktik umum: β ≤ α
            const { fitted } = holtRun(y, a, b, phi);
            const err = sse(y, fitted, 2);
            if (err < best.err) best = { a, b, phi, err };
        }
        const { fitted, l, tr } = holtRun(y, best.a, best.b, best.phi);
        return {
            fitted,
            forecast: (h) => Array.from({ length: h }, (_, i) => l + dampSum(best.phi, i + 1) * tr),
            params: { alpha: best.a, beta: best.b, phi: best.phi },
        };
    },
};

// ── 7 & 8. Holt-Winters ────────────────────────────────────────────
type HWType = 'add' | 'mul';
function hwInit(y: number[], m: number, type: HWType) {
    const s1 = y.slice(0, m), s2 = y.slice(m, 2 * m);
    const l0 = mean(s1);
    const b0 = (mean(s2) - mean(s1)) / m;
    const season = s1.map(v => (type === 'add' ? v - l0 : l0 === 0 ? 1 : v / l0));
    return { l0, b0, season };
}
function hwRun(y: number[], m: number, type: HWType, a: number, b: number, g: number, phi: number) {
    const { l0, b0, season } = hwInit(y, m, type);
    const s = [...season];
    let l = l0, tr = b0;
    const fitted: number[] = Array(m).fill(NaN);
    for (let t = m; t < y.length; t++) {
        const sPrev = s[t - m];
        const base = l + phi * tr;
        fitted.push(type === 'add' ? base + sPrev : base * sPrev);
        const lPrev = l;
        if (type === 'add') {
            l = a * (y[t] - sPrev) + (1 - a) * base;
            tr = b * (l - lPrev) + (1 - b) * phi * tr;
            s.push(g * (y[t] - l) + (1 - g) * sPrev);
        } else {
            l = a * (sPrev === 0 ? y[t] : y[t] / sPrev) + (1 - a) * base;
            tr = b * (l - lPrev) + (1 - b) * phi * tr;
            s.push(g * (l === 0 ? 1 : y[t] / l) + (1 - g) * sPrev);
        }
    }
    return { fitted, l, tr, s };
}
function makeHW(type: HWType): ModelSpec {
    return {
        id: type === 'add' ? 'hw_add' : 'hw_mul',
        name: type === 'add' ? 'Holt-Winters Aditif' : 'Holt-Winters Multiplikatif',
        shortName: type === 'add' ? 'HW-Add' : 'HW-Mul',
        minLength: (m) => 2 * m + 2,
        requiresPositive: type === 'mul',
        description: type === 'add'
            ? 'Triple Exponential Smoothing: level + tren teredam + musiman mingguan (aditif).'
            : 'Triple Exponential Smoothing dengan musiman proporsional terhadap level (multiplikatif).',
        formula: type === 'add'
            ? 'ℓt = α(yt − st−m) + (1−α)(ℓt−1 + φbt−1);  bt = β(ℓt − ℓt−1) + (1−β)φbt−1;  st = γ(yt − ℓt) + (1−γ)st−m;  ŷ(t+h) = ℓt + φ_h·bt + st+h−m'
            : 'ℓt = α(yt / st−m) + (1−α)(ℓt−1 + φbt−1);  bt = β(ℓt − ℓt−1) + (1−β)φbt−1;  st = γ(yt / ℓt) + (1−γ)st−m;  ŷ(t+h) = (ℓt + φ_h·bt)·st+h−m',
        fit: (y, { m, fast }) => {
            const G = fast ? GRID_FAST : GRID_FULL;
            const GG = fast ? GRID_GAMMA_FAST : GRID_GAMMA_FULL;
            let best = { a: 0.3, b: 0.05, g: 0.1, phi: 0.98, err: Infinity };
            for (const a of G) for (const b of G) {
                if (b > a) continue;
                for (const g of GG) {
                    if (g > 1 - a) continue; // batas umum: 0 ≤ γ ≤ 1 − α
                    for (const phi of fast ? PHI_FAST : PHI_FULL) {
                        const { fitted } = hwRun(y, m, type, a, b, g, phi);
                        const err = sse(y, fitted, m);
                        if (err < best.err) best = { a, b, g, phi, err };
                    }
                }
            }
            const { fitted, l, tr, s } = hwRun(y, m, type, best.a, best.b, best.g, best.phi);
            const n = s.length;
            return {
                fitted,
                forecast: (h) => Array.from({ length: h }, (_, i) => {
                    const season = s[n - m + (i % m)];
                    const base = l + dampSum(best.phi, i + 1) * tr;
                    return type === 'add' ? base + season : base * season;
                }),
                params: { alpha: best.a, beta: best.b, gamma: best.g, phi: best.phi },
            };
        },
    };
}

// ── 9. Seasonal Linear Regression (OLS) ────────────────────────────
/** Menyelesaikan sistem persamaan linear Ax = b dengan eliminasi Gauss (partial pivoting). */
function solve(A: number[][], b: number[]): number[] | null {
    const n = b.length;
    const M = A.map((row, i) => [...row, b[i]]);
    for (let c = 0; c < n; c++) {
        let p = c;
        for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
        if (Math.abs(M[p][c]) < 1e-10) return null;
        [M[c], M[p]] = [M[p], M[c]];
        for (let r = 0; r < n; r++) {
            if (r === c) continue;
            const f = M[r][c] / M[c][c];
            for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
        }
    }
    return M.map((row, i) => row[n] / row[i]);
}
function regRow(t: number, d: number) {
    // intercept, trend, 6 dummy hari (Minggu sebagai referensi)
    const row = [1, t];
    for (let k = 1; k <= 6; k++) row.push(d === k ? 1 : 0);
    return row;
}
function olsFit(X: number[][], y: number[], ridge = 1e-6) {
    const p = X[0].length;
    const XtX = Array.from({ length: p }, () => Array(p).fill(0));
    const Xty = Array(p).fill(0);
    X.forEach((row, i) => {
        for (let a = 0; a < p; a++) {
            Xty[a] += row[a] * y[i];
            for (let b = 0; b < p; b++) XtX[a][b] += row[a] * row[b];
        }
    });
    for (let a = 1; a < p; a++) XtX[a][a] += ridge;
    return solve(XtX, Xty);
}
const regression: ModelSpec = {
    id: 'reg',
    name: 'Regresi Linear Musiman',
    shortName: 'Regresi',
    minLength: () => 14,
    description: 'Regresi linear berganda (OLS) dengan variabel tren dan dummy hari dalam seminggu.',
    formula: 'ŷt = β0 + β1·t + Σ_{d=Sen}^{Sab} γd·D_d(t)',
    fit: (y, { dow }) => {
        const X = y.map((_, t) => regRow(t, dow[t]));
        const beta = olsFit(X, y) ?? [mean(y), 0, 0, 0, 0, 0, 0, 0];
        const pred = (row: number[]) => row.reduce((s, v, i) => s + v * beta[i], 0);
        const fitted = X.map(pred);
        const n = y.length, lastDow = dow[n - 1];
        return {
            fitted,
            forecast: (h) => Array.from({ length: h }, (_, i) => pred(regRow(n + i, (lastDow + i + 1) % 7))),
            params: { b0: Math.round(beta[0] * 100) / 100, b1: Math.round(beta[1] * 1000) / 1000 },
        };
    },
};

export const MODELS: ModelSpec[] = [
    naive,
    seasonalNaive,
    sma,
    wma,
    ses,
    holt,
    makeHW('add'),
    makeHW('mul'),
    regression,
];

export const getModel = (id: string) => MODELS.find(m => m.id === id);
