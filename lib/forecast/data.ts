/**
 * @file Forecast Data Layer
 * @description Mengubah transaksi POS (orders) + data histori (impor/simulasi)
 * menjadi deret waktu harian yang kontinu (hari tanpa penjualan diisi 0).
 * Semua tanggal dihitung pada zona waktu Asia/Jakarta (WIB).
 */
import type { Order, ExtendedProduct, RecipeItem, Ingredient } from '@/lib/store';

export const TZ = 'Asia/Jakarta';
export const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
export const DAY_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

// ── Date utils ─────────────────────────────────────────────────────
const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
export const dateKey = (d: Date | string | number) => fmt.format(new Date(d));
export const todayKey = () => dateKey(new Date());
export function addDays(key: string, n: number) {
    const d = new Date(`${key}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
}
export const dayOfWeek = (key: string) => new Date(`${key}T12:00:00Z`).getUTCDay();
export function diffDays(a: string, b: string) {
    return Math.round((new Date(`${b}T12:00:00Z`).getTime() - new Date(`${a}T12:00:00Z`).getTime()) / 86400000);
}
export function formatDateID(key: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) {
    return new Date(`${key}T12:00:00Z`).toLocaleDateString('id-ID', { ...opts, timeZone: 'UTC' });
}

// ── Types ──────────────────────────────────────────────────────────
export type HistorySource = 'import' | 'simulasi';

export interface DailyItem { name: string; qty: number; revenue: number }

/** Disimpan di Firebase: salesHistory/{id} */
export interface DailyRecord {
    id: string;              // `${date}_${source}`
    date: string;            // YYYY-MM-DD
    source: HistorySource;
    transactions: number;
    revenue: number;
    items: Record<string, DailyItem>;
    createdAt: string;
}

export interface DailyAgg {
    date: string;
    revenue: number;
    transactions: number;
    cups: number;
    items: Record<string, DailyItem>;
    sources: { pos: number; import: number; simulasi: number };
}

export interface SourceFilter { pos: boolean; import: boolean; simulasi: boolean }

export type Target = 'revenue' | 'transactions' | 'cups';
export const TARGET_LABEL: Record<Target, string> = {
    revenue: 'Pendapatan (Rp)',
    transactions: 'Jumlah Transaksi',
    cups: 'Item Terjual (cup/porsi)',
};

/** Order dihitung sebagai penjualan bila tidak dibatalkan / belum dibayar. */
export const isSaleOrder = (o: Order) => o.status !== 'cancelled' && o.status !== 'awaiting_payment';

export const itemKey = (id: string | undefined, name: string) => (id ? String(id) : `name:${name.trim().toLowerCase()}`);

// ── Aggregation ────────────────────────────────────────────────────
function emptyAgg(date: string): DailyAgg {
    return { date, revenue: 0, transactions: 0, cups: 0, items: {}, sources: { pos: 0, import: 0, simulasi: 0 } };
}

function addItem(agg: DailyAgg, key: string, name: string, qty: number, revenue: number) {
    const it = agg.items[key] ?? (agg.items[key] = { name, qty: 0, revenue: 0 });
    it.qty += qty;
    it.revenue += revenue;
    agg.cups += qty;
}

export function buildDaily(
    orders: Order[],
    history: DailyRecord[],
    filter: SourceFilter,
    opts: { endDate?: string; fillToToday?: boolean } = {},
): DailyAgg[] {
    const map = new Map<string, DailyAgg>();
    const get = (d: string) => map.get(d) ?? (map.set(d, emptyAgg(d)), map.get(d)!);

    if (filter.pos) {
        for (const o of orders) {
            if (!o?.date || !isSaleOrder(o)) continue;
            const agg = get(dateKey(o.date));
            agg.revenue += Number(o.total) || 0;
            agg.transactions += 1;
            agg.sources.pos += 1;
            (o.items ?? []).forEach(i => {
                const q = Number(i.quantity) || 0;
                addItem(agg, itemKey(i.id, i.name), i.name, q, (Number(i.finalPrice ?? i.price) || 0) * q);
            });
        }
    }
    for (const r of history) {
        if (!r?.date || !filter[r.source]) continue;
        const agg = get(r.date);
        agg.revenue += Number(r.revenue) || 0;
        agg.transactions += Number(r.transactions) || 0;
        agg.sources[r.source] += Number(r.transactions) || 1;
        Object.entries(r.items ?? {}).forEach(([k, it]) => addItem(agg, k, it.name, Number(it.qty) || 0, Number(it.revenue) || 0));
    }

    if (!map.size) return [];
    const keys = [...map.keys()].sort();
    const start = keys[0];
    let end = opts.endDate ?? keys[keys.length - 1];
    if (opts.fillToToday) {
        const y = addDays(todayKey(), -1);
        if (y > end) end = y;
    }
    const out: DailyAgg[] = [];
    for (let d = start; d <= end; d = addDays(d, 1)) out.push(map.get(d) ?? emptyAgg(d));
    return out;
}

export function toSeries(daily: DailyAgg[], target: Target, productKey?: string) {
    return daily.map(d => ({
        date: d.date,
        value: productKey
            ? d.items[productKey]?.qty ?? 0
            : target === 'revenue' ? d.revenue : target === 'transactions' ? d.transactions : d.cups,
    }));
}

/** Daftar produk yang pernah terjual, diurutkan berdasarkan total kuantitas. */
export function productTotals(daily: DailyAgg[]) {
    const m = new Map<string, { key: string; name: string; qty: number; revenue: number; days: number }>();
    daily.forEach(d => Object.entries(d.items).forEach(([k, it]) => {
        const cur = m.get(k) ?? { key: k, name: it.name, qty: 0, revenue: 0, days: 0 };
        cur.qty += it.qty; cur.revenue += it.revenue; if (it.qty > 0) cur.days++;
        cur.name = it.name || cur.name;
        m.set(k, cur);
    }));
    return [...m.values()].sort((a, b) => b.qty - a.qty);
}

// ── Ingredient projection (BOM) ────────────────────────────────────
export function ingredientNeeds(
    productForecast: { key: string; total: number }[],
    products: ExtendedProduct[],
    ingredients: Ingredient[],
    horizon: number,
) {
    const need = new Map<string, number>();
    let coveredProducts = 0;
    productForecast.forEach(pf => {
        const p = products.find(x => String(x.id) === pf.key);
        const recipe: RecipeItem[] = p?.recipe ?? [];
        if (recipe.length) coveredProducts++;
        recipe.forEach(r => need.set(r.ingredientId, (need.get(r.ingredientId) ?? 0) + r.quantity * pf.total));
    });
    const rows = ingredients.map(ing => {
        const total = need.get(ing.id) ?? 0;
        const perDay = total / horizon;
        const daysCover = perDay > 0 ? ing.stock / perDay : Infinity;
        const shortage = Math.max(0, total - ing.stock);
        const reorder = Math.max(0, total + ing.minStockThreshold - ing.stock);
        return { ...ing, need: total, perDay, daysCover, shortage, reorder };
    });
    return { rows, coveredProducts };
}

// ── Import CSV / Excel ─────────────────────────────────────────────
const norm = (s: unknown) => String(s ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
const COLS = {
    date: ['tanggal', 'tgl', 'date', 'hari', 'tanggaltransaksi'],
    product: ['produk', 'product', 'namaproduk', 'menu', 'item', 'nama'],
    qty: ['qty', 'jumlah', 'terjual', 'kuantitas', 'quantity', 'cup', 'porsi'],
    price: ['harga', 'price', 'hargasatuan'],
    revenue: ['pendapatan', 'revenue', 'total', 'omzet', 'subtotal', 'nominal'],
    transactions: ['transaksi', 'jumlahtransaksi', 'transactions', 'struk', 'nota', 'order'],
};
function findCol(headers: string[], names: string[]) {
    const h = headers.map(norm);
    for (const n of names) { const i = h.indexOf(n); if (i >= 0) return headers[i]; }
    for (const n of names) { const i = h.findIndex(x => x.includes(n)); if (i >= 0) return headers[i]; }
    return null;
}
export function parseDateCell(v: unknown): string | null {
    if (v === null || v === undefined || v === '') return null;
    if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString().slice(0, 10);
    if (typeof v === 'number' && v > 20000 && v < 80000) {
        // Excel serial date (basis 1899-12-30)
        const d = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86400000);
        return d.toISOString().slice(0, 10);
    }
    const s = String(v).trim();
    let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
    m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
    if (m) {
        const yr = m[3].length === 2 ? `20${m[3]}` : m[3];
        return `${yr}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; // format Indonesia DD/MM/YYYY
    }
    return null;
}
const num = (v: unknown) => {
    if (typeof v === 'number') return v;
    const s = String(v ?? '').replace(/rp/i, '').replace(/\s/g, '');
    // "15.000" atau "15,000" → 15000 ; "1,5" → 1.5
    if (/^\d{1,3}([.,]\d{3})+$/.test(s)) return Number(s.replace(/[.,]/g, ''));
    return Number(s.replace(',', '.')) || 0;
};

export interface ImportResult {
    records: DailyRecord[];
    rows: number;
    skipped: number;
    unmatched: string[];
    columns: Record<string, string | null>;
    estimatedTransactions: boolean;
}

export function parseImportRows(rows: Record<string, unknown>[], products: ExtendedProduct[]): ImportResult {
    const headers = rows.length ? Object.keys(rows[0]) : [];
    const columns = Object.fromEntries(Object.entries(COLS).map(([k, names]) => [k, findCol(headers, names)])) as Record<keyof typeof COLS, string | null>;
    if (!columns.date) throw new Error('Kolom "tanggal" tidak ditemukan. Gunakan template yang disediakan.');
    if (!columns.product && !columns.revenue) throw new Error('Minimal harus ada kolom "produk" + "qty" atau kolom "pendapatan".');

    const byDate = new Map<string, DailyRecord>();
    const txByDate = new Map<string, number>();
    const unmatched = new Set<string>();
    let skipped = 0;
    const now = new Date().toISOString();

    rows.forEach(r => {
        const date = parseDateCell(r[columns.date!]);
        if (!date) { skipped++; return; }
        const rec = byDate.get(date) ?? { id: `${date}_import`, date, source: 'import' as const, transactions: 0, revenue: 0, items: {}, createdAt: now };
        byDate.set(date, rec);

        const name = columns.product ? String(r[columns.product] ?? '').trim() : '';
        const qty = columns.qty ? num(r[columns.qty]) : name ? 1 : 0;
        const prod = name ? products.find(p => norm(p.name) === norm(name) || String(p.id) === name) : undefined;
        if (name && !prod) unmatched.add(name);
        const price = columns.price ? num(r[columns.price]) : prod?.price ?? 0;
        const revenue = columns.revenue ? num(r[columns.revenue]) : price * qty;

        rec.revenue += revenue;
        if (name) {
            const key = prod ? String(prod.id) : itemKey(undefined, name);
            const it = rec.items[key] ?? (rec.items[key] = { name: prod?.name ?? name, qty: 0, revenue: 0 });
            it.qty += qty; it.revenue += revenue;
        }
        if (columns.transactions) txByDate.set(date, (txByDate.get(date) ?? 0) + num(r[columns.transactions]));
    });

    const estimatedTransactions = !columns.transactions;
    byDate.forEach((rec, date) => {
        const qty = Object.values(rec.items).reduce((s, i) => s + i.qty, 0);
        rec.transactions = columns.transactions ? Math.round(txByDate.get(date) ?? 0) : Math.max(qty ? 1 : 0, Math.round(qty / 1.6));
    });
    return { records: [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)), rows: rows.length, skipped, unmatched: [...unmatched], columns, estimatedTransactions };
}

// ── Simulation (data sintetis untuk uji coba) ──────────────────────
/** PRNG deterministik (mulberry32) agar data simulasi dapat direproduksi dengan seed yang sama. */
function mulberry32(seed: number) {
    return () => {
        seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
function gauss(rnd: () => number) {
    const u = 1 - rnd(), v = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export interface SimulationOptions {
    days: number;
    endDate: string;           // tanggal terakhir (inklusif)
    baseTransactions: number;  // rata-rata transaksi/hari
    trendPct: number;          // pertumbuhan per bulan (%)
    noisePct: number;          // volatilitas harian (%)
    seed: number;
    skipDates?: Set<string>;   // tanggal yang sudah punya data asli
}

/** Faktor musiman mingguan khas kedai minuman (Min..Sab). */
export const WEEKLY_PATTERN = [1.35, 0.82, 0.86, 0.9, 0.95, 1.15, 1.42];

export function generateSimulation(products: ExtendedProduct[], o: SimulationOptions): DailyRecord[] {
    const rnd = mulberry32(o.seed);
    const sellable = products.filter(p => p.price > 0);
    if (!sellable.length) return [];
    // bobot popularitas: minuman lebih laris daripada makanan, dengan variasi acak per produk
    const weights = sellable.map(p => (['snack', 'food'].includes(p.category) ? 0.4 : 1) * (0.5 + rnd() * 1.5));
    const wSum = weights.reduce((s, w) => s + w, 0);
    const pick = () => {
        let r = rnd() * wSum;
        for (let i = 0; i < sellable.length; i++) { r -= weights[i]; if (r <= 0) return sellable[i]; }
        return sellable[sellable.length - 1];
    };
    const out: DailyRecord[] = [];
    const now = new Date().toISOString();
    const start = addDays(o.endDate, -(o.days - 1));
    for (let i = 0; i < o.days; i++) {
        const date = addDays(start, i);
        if (o.skipDates?.has(date)) continue;
        const trend = 1 + (o.trendPct / 100) * (i / 30);
        const noise = Math.exp(gauss(rnd) * (o.noisePct / 100));
        // hari libur/tutup acak (≈2%)
        if (rnd() < 0.02) continue;
        const expected = o.baseTransactions * WEEKLY_PATTERN[dayOfWeek(date)] * trend * noise;
        const tx = Math.max(0, Math.round(expected));
        const rec: DailyRecord = { id: `${date}_simulasi`, date, source: 'simulasi', transactions: tx, revenue: 0, items: {}, createdAt: now };
        for (let t = 0; t < tx; t++) {
            const lines = 1 + (rnd() < 0.35 ? 1 : 0) + (rnd() < 0.1 ? 1 : 0);
            for (let l = 0; l < lines; l++) {
                const p = pick();
                const q = rnd() < 0.8 ? 1 : 2;
                const price = p.price + (rnd() < 0.3 ? 2000 : 0); // sebagian ukuran L
                const key = String(p.id);
                const it = rec.items[key] ?? (rec.items[key] = { name: p.name, qty: 0, revenue: 0 });
                it.qty += q; it.revenue += price * q;
                rec.revenue += price * q;
            }
        }
        out.push(rec);
    }
    return out;
}
