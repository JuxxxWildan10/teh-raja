#!/usr/bin/env python3
"""
Patch script for Teh Raja POS enterprise features:
1. AI CRM Smart Upsell endpoint
2. AI Forecast upgrade (ingredients-aware)
3. Bluetooth thermal printing helper
4. Multi-branch data model in store.ts
"""
import os, re, sys

BASE = r'd:\TEHRAJA\teh-raja'

def patch_file(path, old, new):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    if old not in content:
        print(f"  [WARN] Pattern not found in {path}: {old[:60]}...")
        return False
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.replace(old, new, 1))
    print(f"  [OK] Patched: {path}")
    return True

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"  [OK] Written: {path}")

# ═══════════════════════════════════════════════════════
# 1. AI CRM Smart Upsell — NEW API Route
# ═══════════════════════════════════════════════════════
crm_upsell_api = r"""import { NextResponse } from 'next/server';

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
"""
write_file(os.path.join(BASE, 'app', 'api', 'ai', 'crm-upsell', 'route.ts'), crm_upsell_api)

# ═══════════════════════════════════════════════════════
# 2. Upgrade AI Forecast route — include ingredients
# ═══════════════════════════════════════════════════════
forecast_path = os.path.join(BASE, 'app', 'api', 'ai', 'forecast', 'route.ts')
with open(forecast_path, 'r', encoding='utf-8') as f:
    forecast = f.read()

forecast = forecast.replace(
    "const { orders, products } = await req.json();",
    "const { orders, products, ingredients } = await req.json();"
)
forecast = forecast.replace(
    "        // Low stock\n        const lowStockProducts = (products || []).filter((p: any) => p.stock < 10);",
    "        // Low stock\n        const lowStockProducts = (products || []).filter((p: any) => p.stock < 10);\n        const lowStockIngredients = (ingredients || []).filter((i: any) => i.stock <= i.minStockThreshold);"
)
forecast = forecast.replace(
    "PERINGATAN STOK (Stok < 10 cup):\n${lowStockProducts.length > 0\n    ? lowStockProducts.map((p: any) => `- ${p.name}: sisa ${p.stock} cup`).join('\\n')\n    : 'Semua stok dalam kondisi aman.'}",
    "PERINGATAN STOK PRODUK (<10 cup):\n${lowStockProducts.length > 0\n    ? lowStockProducts.map((p: any) => `  * ${p.name}: sisa ${p.stock} cup`).join('\\n')\n    : '  Semua produk aman'}\n\nPERINGATAN BAHAN BAKU (BOM - di bawah minimum):\n${lowStockIngredients.length > 0\n    ? lowStockIngredients.map((i: any) => `  * ${i.name}: sisa ${i.stock} ${i.unit} (min: ${i.minStockThreshold} ${i.unit})`).join('\\n')\n    : '  Semua bahan baku aman'}"
)
with open(forecast_path, 'w', encoding='utf-8') as f:
    f.write(forecast)
print(f"  [OK] Upgraded: {forecast_path}")

# ═══════════════════════════════════════════════════════
# 3. Multi-Branch support in store.ts
# ═══════════════════════════════════════════════════════
store_path = os.path.join(BASE, 'lib', 'store.ts')
with open(store_path, 'r', encoding='utf-8') as f:
    store = f.read()

# Add branchId to Order type if not present
if 'branchId?' not in store:
    store = store.replace(
        "    tableNumber?: string;",
        "    tableNumber?: string;\n    branchId?: string; // [MULTI-BRANCH] Identifier cabang"
    )
    print("  [OK] Added branchId to Order type")

# Add branchId to StoreSession if not present
if 'branchId?' not in store or store.count('branchId?') < 2:
    store = store.replace(
        "    cashierName: string;",
        "    cashierName: string;\n    branchId?: string; // [MULTI-BRANCH]"
    )
    print("  [OK] Added branchId to StoreSession type")

# Add branchConfig state to useSalesStore if not present
if 'branchId: string' not in store:
    store = store.replace(
        "            orders: [],\n            offlineOrders: [], // [NEW]",
        "            branchId: 'main', // [MULTI-BRANCH] ID cabang aktif\n            branchName: 'Cabang Utama', // [MULTI-BRANCH]\n            orders: [],\n            offlineOrders: [], // [NEW]"
    )
    print("  [OK] Added branch state to useSalesStore")

# Add setBranch action if not present
if 'setBranch' not in store:
    store = store.replace(
        "            openStore: (cashierName, startingCash) => {",
        "            setBranch: (id: string, name: string) => set({ branchId: id, branchName: name }),\n            openStore: (cashierName, startingCash) => {"
    )
    print("  [OK] Added setBranch action to useSalesStore")

# Inject branchId into new session
store = store.replace(
    "            openStore: (cashierName, startingCash) => {\n                const newSession: StoreSession = {\n                    id: nanoid(),\n                    startTime: new Date().toISOString(),\n                    cashierName,",
    "            openStore: (cashierName, startingCash) => {\n                const newSession: StoreSession = {\n                    id: nanoid(),\n                    startTime: new Date().toISOString(),\n                    cashierName,\n                    branchId: get().branchId,"
)

# Inject branchId into new order
store = store.replace(
    "                const sanitizedOrder = JSON.parse(JSON.stringify(newOrder));",
    "                // Attach branchId\n                (newOrder as any).branchId = (get() as any).branchId || 'main';\n                const sanitizedOrder = JSON.parse(JSON.stringify(newOrder));"
)

with open(store_path, 'w', encoding='utf-8') as f:
    f.write(store)
print(f"  [OK] Multi-branch patched: {store_path}")

# ═══════════════════════════════════════════════════════
# 4. Bluetooth Thermal Print API utility
# ═══════════════════════════════════════════════════════
bluetooth_util = r"""/**
 * @file bluetoothPrint.ts
 * @description Utility untuk mencetak struk thermal via Web Bluetooth API (ESC/POS Protocol).
 * Compatible dengan printer thermal Bluetooth standar (Epson, Xprinter, POS-58, dsb).
 */

const ESC = 0x1B;
const GS  = 0x1D;

function encoder(text: string): Uint8Array {
    return new TextEncoder().encode(text);
}

function buildReceipt(order: {
    id: string;
    customerName: string;
    items: Array<{ name: string; quantity: number; price: number; variants?: Record<string, string> }>;
    total: number;
    paymentMethod: string;
    cashReceived?: number;
    changeAmount?: number;
    discount?: number;
    date: string;
    tableNumber?: string;
    orderType?: string;
}): Uint8Array {
    const lines: number[] = [];

    const push = (data: number[] | Uint8Array) => {
        for (const b of data) lines.push(b);
    };

    const pushText = (text: string) => push(encoder(text));

    const centerText = (text: string, width = 32) => {
        const pad = Math.max(0, Math.floor((width - text.length) / 2));
        return ' '.repeat(pad) + text;
    };

    const rightAlignRow = (left: string, right: string, width = 32) => {
        const space = Math.max(1, width - left.length - right.length);
        return left + ' '.repeat(space) + right;
    };

    const formatRp = (n: number) => `Rp${n.toLocaleString('id-ID')}`;

    // Init printer
    push([ESC, 0x40]);

    // Header — Center + Bold
    push([ESC, 0x61, 0x01]); // center
    push([ESC, 0x45, 0x01]); // bold on
    push([GS, 0x21, 0x11]);  // double width+height
    pushText('TEH RAJA\n');
    push([GS, 0x21, 0x00]);  // normal size
    pushText('Premium Tea Experience\n');
    push([ESC, 0x45, 0x00]); // bold off
    pushText('================================\n');
    push([ESC, 0x61, 0x00]); // left

    // Order info
    const dateStr = new Date(order.date).toLocaleString('id-ID', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
    pushText(`Order : #${order.id.slice(0, 8).toUpperCase()}\n`);
    pushText(`Waktu : ${dateStr}\n`);
    pushText(`Nama  : ${order.customerName}\n`);
    if (order.tableNumber) pushText(`Meja  : ${order.tableNumber}\n`);
    pushText(`Tipe  : ${order.orderType === 'dine-in' ? 'Dine In' : 'Take Away'}\n`);
    pushText('--------------------------------\n');

    // Items
    order.items.forEach(item => {
        const subtotal = item.price * item.quantity;
        const itemLine = `${item.quantity}x ${item.name}`;
        pushText(rightAlignRow(itemLine, formatRp(subtotal)) + '\n');
        if (item.variants && Object.keys(item.variants).length > 0) {
            const varStr = Object.values(item.variants).join(', ');
            pushText(`   [${varStr}]\n`);
        }
    });

    pushText('--------------------------------\n');

    // Totals
    if (order.discount && order.discount > 0) {
        pushText(rightAlignRow('Diskon', `-${formatRp(order.discount)}`) + '\n');
    }
    push([ESC, 0x45, 0x01]); // bold
    pushText(rightAlignRow('TOTAL', formatRp(order.total)) + '\n');
    push([ESC, 0x45, 0x00]); // bold off

    pushText(rightAlignRow('Bayar', order.paymentMethod.toUpperCase()) + '\n');
    if (order.cashReceived) pushText(rightAlignRow('Diterima', formatRp(order.cashReceived)) + '\n');
    if (order.changeAmount) pushText(rightAlignRow('Kembalian', formatRp(order.changeAmount)) + '\n');

    pushText('================================\n');

    // Footer — Center
    push([ESC, 0x61, 0x01]);
    pushText('Terima kasih sudah berkunjung!\n');
    pushText('Teh Raja - #TeaForTheSoul\n');
    pushText('\n\n\n');

    // Cut paper
    push([GS, 0x56, 0x42, 0x00]);

    return new Uint8Array(lines);
}

const BLUETOOTH_SERVICE = 0x18F0;
const BLUETOOTH_CHAR    = 0x2AF1;
const CHUNK_SIZE        = 100;

async function writeChunked(char: BluetoothRemoteGATTCharacteristic, data: Uint8Array) {
    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
        await char.writeValue(data.slice(i, i + CHUNK_SIZE));
        await new Promise(r => setTimeout(r, 30));
    }
}

export async function printReceipt(order: Parameters<typeof buildReceipt>[0]): Promise<void> {
    if (!('bluetooth' in navigator)) {
        throw new Error('Browser ini tidak mendukung Web Bluetooth API. Gunakan Chrome/Edge.');
    }

    const device = await (navigator as any).bluetooth.requestDevice({
        filters: [{ services: [BLUETOOTH_SERVICE] }],
        optionalServices: [BLUETOOTH_SERVICE],
    });

    const server    = await device.gatt!.connect();
    const service   = await server.getPrimaryService(BLUETOOTH_SERVICE);
    const char      = await service.getCharacteristic(BLUETOOTH_CHAR);
    const receiptBytes = buildReceipt(order);
    await writeChunked(char, receiptBytes);
    await device.gatt!.disconnect();
}
"""
write_file(os.path.join(BASE, 'lib', 'bluetoothPrint.ts'), bluetooth_util)

print("\n✅ All patches applied successfully!")
