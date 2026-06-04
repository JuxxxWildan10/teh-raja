import { NextResponse } from 'next/server';

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`;

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
            generationConfig: { temperature: 0.4 },
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
        const { orders, products } = await req.json();

        if (!orders || orders.length === 0) {
            return NextResponse.json({ error: 'Tidak ada data order' }, { status: 400 });
        }

        // ── Pre-process data ────────────────────────────────────
        const validOrders = orders.filter((o: any) => o.status !== 'cancelled');
        const totalRevenue = validOrders.reduce((s: number, o: any) => s + o.total, 0);
        const totalOrders = validOrders.length;
        const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        // Top products by units sold
        const productSales: Record<string, { name: string; count: number; revenue: number }> = {};
        validOrders.forEach((order: any) => {
            order.items?.forEach((item: any) => {
                if (!productSales[item.id || item.name]) {
                    productSales[item.id || item.name] = { name: item.name, count: 0, revenue: 0 };
                }
                productSales[item.id || item.name].count += item.quantity || 1;
                productSales[item.id || item.name].revenue += (item.price || 0) * (item.quantity || 1);
            });
        });
        const topProducts = Object.values(productSales)
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        // Peak hour
        const hourly: Record<number, number> = {};
        validOrders.forEach((o: any) => {
            const hour = new Date(o.date).getHours();
            hourly[hour] = (hourly[hour] || 0) + 1;
        });
        const peakHour = Object.entries(hourly).sort((a, b) => Number(b[1]) - Number(a[1]))[0];

        // Peak day
        const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const daily: Record<number, number> = {};
        validOrders.forEach((o: any) => {
            const day = new Date(o.date).getDay();
            daily[day] = (daily[day] || 0) + 1;
        });
        const peakDay = Object.entries(daily).sort((a, b) => Number(b[1]) - Number(a[1]))[0];

        // Payment breakdown
        const paymentBreakdown: Record<string, number> = {};
        validOrders.forEach((o: any) => {
            const method = o.paymentMethod || 'cash';
            paymentBreakdown[method] = (paymentBreakdown[method] || 0) + 1;
        });

        // Low stock
        const lowStockProducts = (products || []).filter((p: any) => p.stock < 10);

        const prompt = `
Kamu adalah konsultan bisnis kuliner profesional dan analis data penjualan untuk kedai minuman teh bernama "Teh Raja". 
Tugasmu adalah menganalisis data penjualan berikut dan memberikan laporan komprehensif dalam Bahasa Indonesia yang profesional dan mudah dipahami oleh pemilik kedai.

DATA PENJUALAN:
- Total Transaksi Valid: ${totalOrders} order
- Total Pendapatan: Rp ${totalRevenue.toLocaleString('id-ID')}
- Rata-rata Nilai Order: Rp ${Math.round(avgOrderValue).toLocaleString('id-ID')}

PRODUK TERLARIS (Top 5):
${topProducts.length > 0
    ? topProducts.map((p, i) => `${i + 1}. ${p.name}: ${p.count} cup terjual (Rp ${p.revenue.toLocaleString('id-ID')})`).join('\n')
    : 'Data belum tersedia'}

WAKTU PENJUALAN:
- Jam paling ramai: Pukul ${peakHour ? `${peakHour[0]}:00 (${peakHour[1]} transaksi)` : 'Data belum tersedia'}
- Hari paling ramai: ${peakDay ? `${dayNames[parseInt(peakDay[0])]} (${peakDay[1]} transaksi)` : 'Data belum tersedia'}

METODE PEMBAYARAN:
${Object.entries(paymentBreakdown).length > 0
    ? Object.entries(paymentBreakdown).map(([k, v]) => `- ${k.toUpperCase()}: ${v} transaksi (${Math.round(Number(v) / totalOrders * 100)}%)`).join('\n')
    : 'Data belum tersedia'}

PERINGATAN STOK (Stok < 10 cup):
${lowStockProducts.length > 0
    ? lowStockProducts.map((p: any) => `- ${p.name}: sisa ${p.stock} cup`).join('\n')
    : 'Semua stok dalam kondisi aman.'}

Buatkan laporan analisis yang mencakup:
1. 📊 RINGKASAN PERFORMA — Evaluasi singkat kondisi bisnis saat ini berdasarkan data.
2. 🏆 ANALISIS PRODUK — Insight tentang produk terlaris dan produk yang mungkin kurang populer.
3. ⏰ POLA WAKTU PENJUALAN — Analisis kapan bisnis paling ramai dan implikasi operasionalnya.
4. 💳 ANALISIS PEMBAYARAN — Tren metode bayar dan apakah perlu promosi metode tertentu.
5. ⚠️ PERINGATAN STOK — Daftar produk yang perlu segera direstok beserta urgensitasnya.
6. 🚀 REKOMENDASI STRATEGIS — 3 hingga 5 tindakan konkret berbasis data untuk meningkatkan omzet dan efisiensi operasional.

Gunakan format yang rapi dengan emoji dan paragraf yang jelas. Berikan angka spesifik dan analisis yang tajam dan actionable.
`;

        const forecast = await callGemini(prompt);
        return NextResponse.json({ forecast });

    } catch (error: any) {
        console.error('Forecast AI Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
