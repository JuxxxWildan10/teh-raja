import { NextResponse } from 'next/server';
import { generate, hasGeminiKey } from '@/lib/gemini';

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

        const prompt = `Kamu adalah kasir cerdas di kedai teh premium "Teh Raja". Berikan 1 saran upsell / cross-sell yang sangat natural, ramah, dan persuasif kepada kasir untuk diucapkan kepada pembeli ini.

DATA PELANGGAN:
- Nama: ${customer.name || 'Tamu'}
- Total Belanja Historis: ${customer.totalSpent ? `Rp ${Number(customer.totalSpent).toLocaleString('id-ID')}` : 'Baru pertama kali'}
- Poin Loyalitas: ${customer.points || 0} poin (${(customer.points || 0) * 100 ? `senilai Rp ${((customer.points || 0) * 100).toLocaleString('id-ID')}` : '0'})
- Riwayat Pesanan Terakhir: ${historyText}

KERANJANG SAAT INI: ${cartText}
PRODUK TERSEDIA DI MENU: ${topProducts}

Format: Berikan HANYA 1 atau 2 kalimat saran langsung dalam Bahasa Indonesia yang siap diucapkan kasir (tanpa tanda kutip, tanpa kata "Saran:", langsung ke kalimatnya). Singkat, sopan, dan relevan.`;

        if (!hasGeminiKey()) {
            // Rule-based fallback if no API key
            const fav = orderHistory?.[0]?.items?.[0]?.name;
            const fallback = fav
                ? `Kak ${customer.name || ''}, biasanya suka pesan ${fav}, mau sekalian tambah itu atau coba varian baru hari ini?`
                : (customer.points || 0) >= 10
                    ? `Kak ${customer.name || ''}, ada ${customer.points} poin loyalitas yang bisa langsung ditukar diskon lho!`
                    : `Kak, mau sekalian tambah snack French Fries atau Roti Bakar hangat untuk teman minum tehnya?`;
            return NextResponse.json({ suggestion: fallback });
        }

        const { text } = await generate({
            prompt,
            temperature: 0.7,
            maxOutputTokens: 200,
            timeoutMs: 12000,
            thinkingLevel: 'low',
        });

        return NextResponse.json({ suggestion: text.trim().replace(/^["']|["']$/g, '') });

    } catch (error: any) {
        console.error('[CRM Upsell Error]', error);
        // Fallback gracefully so POS cashier UI never breaks
        return NextResponse.json({
            suggestion: 'Tawarkan upgrade ukuran Large (+Rp 2.000) atau cemilan pendamping hangat!',
            error: error.message
        }, { status: 200 });
    }
}
