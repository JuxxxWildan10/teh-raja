import { NextResponse } from 'next/server';
import { generate, hasGeminiKey } from '@/lib/gemini';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { text, menu } = body;

        if (!text || !menu) {
            return NextResponse.json({ error: 'Parameter text dan menu diperlukan' }, { status: 400 });
        }

        if (!hasGeminiKey()) {
            return NextResponse.json({ error: 'GEMINI_API_KEY belum dikonfigurasi di server.' }, { status: 503 });
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

        return NextResponse.json({ items: Array.isArray(parsed) ? parsed : [] });

    } catch (error: any) {
        console.error('Voice POS AI Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
