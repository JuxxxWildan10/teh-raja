import { NextResponse } from 'next/server';
import { generate, hasGeminiKey } from '@/lib/gemini';

const WORD_TO_NUM: Record<string, number> = {
    satu: 1, se: 1, dua: 2, tiga: 3, empat: 4, lima: 5,
    enam: 6, tujuh: 7, delapan: 8, sembilan: 9, sepuluh: 10,
};

function parseVoiceTranscriptFallback(text: string, menu: any[]) {
    const lower = text.toLowerCase();
    const segments = lower.split(/\b(?:dan|sama|tambah|plus|terus|lalu|,)\b/).map(s => s.trim()).filter(Boolean);
    const results: any[] = [];

    const extractFromText = (chunk: string) => {
        let bestProduct: any = null;
        let bestScore = 0;

        for (const item of menu) {
            const itemName = String(item.name || '').toLowerCase();
            const tokens = itemName.split(/\s+/).filter((t: string) => t.length > 2);
            let score = 0;
            if (chunk.includes(itemName)) {
                score = 100 + itemName.length;
            } else {
                for (const tok of tokens) {
                    if (chunk.includes(tok)) score += 20;
                }
            }
            if (score > bestScore) {
                bestScore = score;
                bestProduct = item;
            }
        }

        if (!bestProduct) return null;

        let quantity = 1;
        const digitMatch = chunk.match(/(\d+)/);
        if (digitMatch) {
            quantity = Math.max(1, parseInt(digitMatch[1], 10));
        } else {
            for (const [w, n] of Object.entries(WORD_TO_NUM)) {
                if (new RegExp(`\\b${w}\\b`).test(chunk)) {
                    quantity = n;
                    break;
                }
            }
        }

        const isFoodOrSnack = bestProduct.category === 'snack' || bestProduct.category === 'food';
        const size: 'M' | 'L' = /\b(large|besar|ukuran l|cup l)\b/.test(chunk) ? 'L' : 'M';
        const temperature: 'panas' | 'es' = /\b(panas|hangat|hot)\b/.test(chunk) ? 'panas' : 'es';
        let sugar: '0%' | '25%' | '50%' | '75%' | '100%' = '100%';
        if (/\b(tanpa gula|no sugar|0%|diet)\b/.test(chunk)) sugar = '0%';
        else if (/\b(less sugar|sedikit gula|kurang manis|50%)\b/.test(chunk)) sugar = '50%';
        else if (/\b(25%)\b/.test(chunk)) sugar = '25%';
        else if (/\b(75%)\b/.test(chunk)) sugar = '75%';

        let ice: 'no-ice' | 'less' | 'normal' | 'extra' = 'normal';
        if (/\b(tanpa es|no ice)\b/.test(chunk)) ice = 'no-ice';
        else if (/\b(sedikit es|less ice|es dikit)\b/.test(chunk)) ice = 'less';
        else if (/\b(extra es|banyak es|extra ice)\b/.test(chunk)) ice = 'extra';

        return {
            productId: bestProduct.id,
            quantity,
            variants: isFoodOrSnack ? { size } : { size, sugar, ice, temperature },
            note: '',
        };
    };

    for (const seg of segments) {
        const item = extractFromText(seg);
        if (item) results.push(item);
    }

    if (results.length === 0) {
        const single = extractFromText(lower);
        if (single) results.push(single);
    }

    return results;
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { text, menu } = body;

        if (!text || !menu) {
            return NextResponse.json({ error: 'Parameter text dan menu diperlukan' }, { status: 400 });
        }

        if (!hasGeminiKey()) {
            const fallbackItems = parseVoiceTranscriptFallback(text, menu);
            return NextResponse.json({ items: fallbackItems, source: 'rule-based' });
        }

        const prompt = `Anda adalah asisten AI kasir Point of Sale (POS) untuk kedai teh "Teh Raja".
Tugas Anda: mengekstrak pesanan dari transkrip suara kasir menjadi format JSON murni.

Daftar Menu Tersedia:
${JSON.stringify(menu.map((m: any) => ({ id: m.id, name: m.name, category: m.category })), null, 2)}

Transkrip Suara Kasir: "${text}"

Instruksi Ekstraksi:
- productId: ID produk yang paling cocok dari daftar menu (cocokkan toleran ejaan / nama panggilan)
- quantity: Jumlah yang dipesan (angka bulat positif, default 1 jika tidak disebut)
- variants: Objek varian jika disebutkan:
    - size: "M" atau "L" (default "M", jika bilang "besar" / "large" -> "L")
    - sugar: "0%" | "25%" | "50%" | "75%" | "100%" (default "100%", "less sugar" / "sedikit gula" -> "50%", "tanpa gula" -> "0%")
    - ice: "no-ice" | "less" | "normal" | "extra" (default "normal", "tanpa es" -> "no-ice", "sedikit es" -> "less")
    - temperature: "panas" | "es" (default "es", "hangat/panas" -> "panas")
- note: Catatan khusus jika ada (misal: "jangan terlalu manis", "dibungkus pisah")

Format Output: HANYA JSON array tanpa pembuka markdown dan tanpa teks lain:
[
  {
    "productId": "1",
    "quantity": 2,
    "variants": { "size": "L", "sugar": "50%", "ice": "normal", "temperature": "es" },
    "note": ""
  }
]`;

        try {
            const { text: rawText } = await generate({
                prompt,
                json: true,
                temperature: 0.1,
                timeoutMs: 15000,
                thinkingLevel: 'low',
            });

            let parsed: any[] = [];
            try {
                parsed = JSON.parse(rawText);
            } catch {
                const jsonMatch = rawText.match(/\[[\s\S]*\]/);
                if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
            }

            if (Array.isArray(parsed) && parsed.length > 0) {
                return NextResponse.json({ items: parsed, source: 'gemini' });
            }
        } catch (aiErr) {
            console.warn('[Voice POS] Gemini error, using local fallback:', aiErr);
        }

        const fallbackItems = parseVoiceTranscriptFallback(text, menu);
        return NextResponse.json({ items: fallbackItems, source: 'rule-based' });

    } catch (error: any) {
        console.error('Voice POS AI Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
