import { NextResponse } from 'next/server';

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent`;

async function callGemini(prompt: string): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
        throw new Error('GEMINI_API_KEY belum dikonfigurasi di .env.local');
    }
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 300 },
        }),
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
        const { customer, orderHistory, currentCart, availableProducts } = await req.json();

        if (!customer) {
            return NextResponse.json({ error: 'Data pelanggan diperlukan.' }, { status: 400 });
        }

        const topProducts = availableProducts?.slice(0, 8).map((p: any) => p.name).join(', ') || '-';
        const historyText = orderHistory && orderHistory.length > 0
            ? orderHistory.slice(-10).map((o: any) =>
                o.items?.map((i: any) => `${i.quantity}x ${i.name}`).join(', ')
              ).join(' | ')
            : 'Belum ada riwayat (pelanggan baru)';
        const cartText = currentCart && currentCart.length > 0
            ? currentCart.map((i: any) => `${i.quantity}x ${i.name}`).join(', ')
            : 'Keranjang masih kosong';

        const prompt = `Kamu adalah kasir cerdas di kedai teh premium "Teh Raja". Tugasmu adalah memberikan saran upsell yang natural kepada kasir berdasarkan data pelanggan.

DATA PELANGGAN:
- Nama: ${customer.name || 'Tamu'}
- Total Kunjungan: ${customer.totalSpent ? `Rp ${Number(customer.totalSpent).toLocaleString('id-ID')}` : 'Baru pertama kali'}
- Poin Loyalitas: ${customer.points || 0} poin (${Math.floor((customer.points || 0) * 100)} = Rp ${((customer.points || 0) * 100).toLocaleString('id-ID')})
- Riwayat Pesanan Terakhir: ${historyText}

KERANJANG SAAT INI: ${cartText}

PRODUK TERSEDIA DI MENU: ${topProducts}

Berikan saran upsell kepada kasir dalam 1-2 kalimat singkat, natural, dan persuasif dalam Bahasa Indonesia. 
Fokus pada: produk favorit pelanggan, varian baru yang mungkin cocok, atau penggunaan poin.
Format: langsung ke kalimat saran, tanpa awalan "Saran:" atau "Rekomendasi:". Singkat dan actionable.`;

        const suggestion = await callGemini(prompt);
        return NextResponse.json({ suggestion: suggestion.trim() });

    } catch (error: any) {
        console.error('[CRM Upsell Error]', error);
        // Graceful fallback
        return NextResponse.json({ suggestion: null, error: error.message }, { status: 200 });
    }
}
