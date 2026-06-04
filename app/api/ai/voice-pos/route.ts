import { NextResponse } from 'next/server';

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`;

async function callGemini(prompt: string, jsonMode = false): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
        throw new Error('GEMINI_API_KEY belum dikonfigurasi di .env.local');
    }

    const body: any = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
            temperature: jsonMode ? 0.1 : 0.4,
        },
    };

    if (jsonMode) {
        body.generationConfig.responseMimeType = 'application/json';
    }

    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Gemini API Error ${res.status}: ${errText}`);
    }

    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { text, menu } = body;

        if (!text || !menu) {
            return NextResponse.json({ error: 'Missing text or menu' }, { status: 400 });
        }

        const prompt = `
Anda adalah AI asisten kasir Point of Sale (POS) bernama Teh Raja POS.
Tugas Anda adalah mengekstrak pesanan dari transkrip suara kasir menjadi format JSON murni.

Berikut adalah daftar menu yang tersedia:
${JSON.stringify(menu.map((m: any) => ({ id: m.id, name: m.name, category: m.category })), null, 2)}

Transkrip Suara Kasir: "${text}"

Ekstrak item pesanan dari transkrip tersebut. 
Untuk setiap item, tentukan:
- productId: ID produk yang paling cocok dari daftar menu (pastikan ejaannya mirip, misalnya "teh raja" -> "teh-raja-signature")
- quantity: Jumlah yang dipesan (angka).
- variants: (Opsional) Objek varian jika disebutkan. Properti varian yang valid:
    - size: "M" atau "L" (default "M" jika tidak disebut, "besar" = "L", "sedang/kecil" = "M")
    - sugar: "0%" | "25%" | "50%" | "75%" | "100%" (default "100%", "less" atau "sedikit" = "50%")
    - ice: "no-ice" | "less" | "normal" | "extra" (default "normal")
    - temperature: "panas" | "es" (default "es")
- note: (Opsional) Catatan tambahan jika ada (misal "dibungkus pisah").

Format Output (HANYA JSON Array of Objects, TANPA markdown, TANPA penjelasan):
[
  {
    "productId": "teh-raja-signature",
    "quantity": 2,
    "variants": { "size": "L", "sugar": "50%", "ice": "normal", "temperature": "es" },
    "note": ""
  }
]
`;

        const rawText = await callGemini(prompt, true);

        let parsed: any[] = [];
        try {
            parsed = JSON.parse(rawText);
        } catch {
            const jsonMatch = rawText.match(/\[[\s\S]*\]/);
            if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
        }

        return NextResponse.json({ items: parsed });

    } catch (error: any) {
        console.error('Voice POS AI Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
