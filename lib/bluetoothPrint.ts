/**
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

async function writeChunked(char: any, data: Uint8Array) {
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
