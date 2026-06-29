import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';

// Konfigurasi Mockup Midtrans (Karena ini lingkungan dev)
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { orderId, total, items } = body;

        if (!orderId || !total) {
            return NextResponse.json({ error: 'orderId dan total wajib diisi.' }, { status: 400 });
        }

        // 1. (Opsional) Validasi ke Midtrans API sesungguhnya
        // Karena ini PWA Lokal / POC, kita mockup response QRIS 
        // Menggunakan public API qrcode untuk generate gambar QRIS dummy
        
        // Mockup payload QRIS statis atau dinamis
        const qrisDataString = `00020101021226540012ID.CO.GOPAY.WWW01189360091421013444400209142101344520441415303360540${total.toString().length}${total}5802ID5912Teh Raja POS6007Cirebon61054512362410103A010738ID2022021516082405903006304`; // Mock string
        
        // Buat URL QR Code Dinamis
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrisDataString)}`;
        
        // Mockup Transaction ID dari gateway
        const transactionId = `TRX-${nanoid(10).toUpperCase()}`;

        return NextResponse.json({
            success: true,
            transactionId,
            qrCodeUrl,
            amount: total,
            status: 'pending',
            message: 'QRIS berhasil dibuat. Silakan scan.'
        });

    } catch (error: any) {
        console.error('[QRIS API Error]', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
