/**
 * ============================================================================
 * FILE: app/api/payment/qris/route.ts
 * ============================================================================
 * FUNGSI UTAMA:
 * Endpoint API Server (`POST /api/payment/qris`) untuk membuat kode QRIS Dinamis
 * sesuai dengan nominal total tagihan pesanan (`total`) dan `orderId`.
 *
 * KETERKAITAN DENGAN FILE LAIN:
 * - Dipanggil oleh `app/pos/page.tsx` saat kasir memilih metode bayar QRIS.
 * - Dipanggil oleh `components/OrderStatusOverlay.tsx` saat pelanggan memilih bayar via QRIS.
 *
 * ALUR KERJA:
 * 1. Menerima `orderId` dan `total` dari request body.
 * 2. Menyusun payload string standar QRIS (EMVCo) dengan menyisipkan nominal transaksi.
 * 3. Mengembalikan URL gambar QR Code (`qrCodeUrl`) dan ID transaksi (`TRX-...`).
 * ============================================================================
 */
import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { orderId, total } = body;

        if (!orderId || total === undefined) {
            return NextResponse.json({ error: 'orderId dan total wajib diisi.' }, { status: 400 });
        }

        const safeTotal = Math.max(0, Number(total) || 0);
        const qrisDataString = `00020101021226540012ID.CO.GOPAY.WWW01189360091421013444400209142101344520441415303360540${safeTotal.toString().length}${safeTotal}5802ID5912Teh Raja POS6007Cirebon61054512362410103A010738ID2022021516082405903006304`;

        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrisDataString)}`;
        const transactionId = `TRX-${nanoid(10).toUpperCase()}`;

        return NextResponse.json({
            success: true,
            transactionId,
            qrCodeUrl,
            qrImageUrl: qrCodeUrl,
            qr_image_url: qrCodeUrl,
            amount: safeTotal,
            status: 'pending',
            message: 'QRIS berhasil dibuat. Silakan scan.'
        });
    } catch (error: any) {
        console.error('[QRIS API Error]', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
