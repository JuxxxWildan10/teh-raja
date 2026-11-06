/**
 * ============================================================================
 * FILE: lib/gemini.ts
 * ============================================================================
 * @file Gemini API Client (server-only)
 * @description Klien bersama untuk semua route AI. Fitur:
 *   - Model cepat (default gemini-3.5-flash-lite, ±1-2 detik) + model cadangan otomatis.
 *   - Timeout per permintaan agar tidak melebihi batas Serverless Function Vercel.
 *   - Mode JSON terstruktur (responseMimeType + responseSchema).
 *   - Menggabungkan seluruh "parts" teks (abaikan bagian "thought").
 *   Hanya diimpor dari Route Handler (server) — API key tidak pernah terkirim ke browser.
 *
 * KETERKAITAN DENGAN FILE LAIN (Digunakan pada Fitur Pengembangan Lanjutan / Skripsi):
 * - Dipanggil oleh `app/api/ai/forecast/route.ts` untuk narasi analisis peramalan penjualan.
 * - Dipanggil oleh `app/api/ai/voice-pos/route.ts` untuk menerjemahkan suara kasir menjadi item keranjang.
 * - Dipanggil oleh `app/api/ai/crm-upsell/route.ts` untuk membuat pesan penawaran WhatsApp member.
 * ============================================================================
 */

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

const PRIMARY = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
const FALLBACKS = (process.env.GEMINI_FALLBACK_MODELS || 'gemini-3.8-flash,gemini-2.5-flash,gemini-flash-lite-latest,gemini-3.1-flash-lite,gemini-2.0-flash')
    .split(',').map(s => s.trim()).filter(Boolean);

export class GeminiError extends Error {
    constructor(message: string, public status = 500) { super(message); }
}

export interface GeminiOptions {
    prompt: string;
    system?: string;
    json?: boolean;
    schema?: Record<string, unknown>;
    temperature?: number;
    maxOutputTokens?: number;
    /** Batas waktu per model (ms). */
    timeoutMs?: number;
    /** 'minimal' | 'low' | 'medium' | 'high' — semakin rendah semakin cepat. */
    thinkingLevel?: 'minimal' | 'low' | 'medium' | 'high';
}

export function hasGeminiKey() {
    const k = process.env.GEMINI_API_KEY;
    return !!k && k.trim() !== '' && k !== 'your_gemini_api_key_here';
}

async function callModel(model: string, o: GeminiOptions, apiKey: string) {
    const generationConfig: Record<string, unknown> = {
        temperature: o.temperature ?? 0.4,
        thinkingConfig: { thinkingLevel: o.thinkingLevel ?? 'low' },
    };
    if (o.maxOutputTokens) generationConfig.maxOutputTokens = o.maxOutputTokens;
    if (o.json) generationConfig.responseMimeType = 'application/json';
    if (o.schema) generationConfig.responseSchema = o.schema;

    const body: Record<string, unknown> = {
        contents: [{ role: 'user', parts: [{ text: o.prompt }] }],
        generationConfig,
    };
    if (o.system) body.systemInstruction = { parts: [{ text: o.system }] };

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), o.timeoutMs ?? 20000);
    try {
        const res = await fetch(`${BASE}/${model}:generateContent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
            body: JSON.stringify(body),
            signal: ctrl.signal,
            cache: 'no-store',
        });
        if (!res.ok) {
            const txt = await res.text();
            let msg = txt;
            try { msg = JSON.parse(txt)?.error?.message ?? txt; } catch { /* ignore */ }
            throw new GeminiError(`[${model}] ${res.status}: ${msg.slice(0, 300)}`, res.status);
        }
        const data = await res.json();
        const parts: { text?: string; thought?: boolean }[] = data?.candidates?.[0]?.content?.parts ?? [];
        const text = parts.filter(p => !p.thought && p.text).map(p => p.text).join('').trim();
        if (!text) {
            const reason = data?.candidates?.[0]?.finishReason || data?.promptFeedback?.blockReason || 'kosong';
            throw new GeminiError(`[${model}] Respons AI kosong (${reason})`, 502);
        }
        return { text, model: (data?.modelVersion as string) || model };
    } catch (e: unknown) {
        if (e instanceof GeminiError) throw e;
        if ((e as Error)?.name === 'AbortError') throw new GeminiError(`[${model}] Timeout setelah ${(o.timeoutMs ?? 20000) / 1000} detik`, 504);
        throw new GeminiError(`[${model}] ${(e as Error)?.message ?? 'Network error'}`, 502);
    } finally {
        clearTimeout(timer);
    }
}

/** Memanggil Gemini dengan fallback otomatis ke model cadangan saat error / timeout. */
export async function generate(o: GeminiOptions): Promise<{ text: string; model: string }> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!hasGeminiKey() || !apiKey) {
        throw new GeminiError('GEMINI_API_KEY belum dikonfigurasi (Vercel → Settings → Environment Variables).', 503);
    }
    const models = [PRIMARY, ...FALLBACKS.filter(m => m !== PRIMARY)];
    const errors: string[] = [];
    for (const model of models) {
        try {
            return await callModel(model, o, apiKey);
        } catch (e) {
            const err = e as GeminiError;
            errors.push(err.message);
            // 400 karena parameter (mis. thinkingLevel tidak didukung) → coba tanpa thinkingConfig
            if (err.status === 400 && /thinking/i.test(err.message)) {
                try { return await callModel(model, { ...o, thinkingLevel: undefined as never }, apiKey); } catch (e2) { errors.push((e2 as Error).message); }
            }
            // 401/403 = API key salah → tidak perlu mencoba model lain
            if (err.status === 401 || err.status === 403) break;
        }
    }
    throw new GeminiError(`Semua model AI gagal: ${errors.join(' | ')}`, 502);
}

export async function generateJSON<T>(o: GeminiOptions): Promise<{ data: T; model: string }> {
    const { text, model } = await generate({ ...o, json: true });
    try {
        return { data: JSON.parse(text) as T, model };
    } catch {
        const match = text.match(/[\[{][\s\S]*[\]}]/);
        if (match) return { data: JSON.parse(match[0]) as T, model };
        throw new GeminiError('Format JSON dari AI tidak valid', 502);
    }
}
