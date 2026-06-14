/**
 * @file Thermal Printer Service (Web Bluetooth)
 * @description Modul utilitas untuk menghubungkan aplikasi browser dengan printer struk thermal (Bluetooth) dengan mencetak perintah ESC/POS.
 */
import { Order, formatVariantLabel } from './store';

// Default printer configs (80mm)
const CPL = 48; // Characters Per Line for 80mm ESC/POS printer default font

// Helper to pad strings
function padRight(str: string, len: number): string {
    return str.length >= len ? str.substring(0, len) : str + ' '.repeat(len - str.length);
}

function padLeft(str: string, len: number): string {
    return str.length >= len ? str.substring(0, len) : ' '.repeat(len - str.length) + str;
}

// Convert a number to Rupiah string
function formatRp(n: number) {
    return 'Rp' + n.toLocaleString('id-ID');
}

export class ThermalPrinter {
    private buffer: Uint8Array[] = [];

    // --- ESC/POS COMMANDS ---
    private readonly ESC = 0x1B;
    private readonly GS = 0x1D;

    init() {
        this.buffer.push(new Uint8Array([this.ESC, 0x40])); // Initialize
    }

    setAlign(align: 'L' | 'C' | 'R') {
        const n = align === 'L' ? 0 : align === 'C' ? 1 : 2;
        this.buffer.push(new Uint8Array([this.ESC, 0x61, n]));
    }

    setBold(bold: boolean) {
        this.buffer.push(new Uint8Array([this.ESC, 0x45, bold ? 1 : 0]));
    }

    setTextSize(width: number, height: number) {
        // width and height: 1-8
        const n = ((width - 1) << 4) | (height - 1);
        this.buffer.push(new Uint8Array([this.GS, 0x21, n]));
    }

    printLn(text: string) {
        const encoder = new TextEncoder(); // UTF-8, ESC/POS may need specific code pages, but basic ASCII is fine
        this.buffer.push(encoder.encode(text + '\n'));
    }

    emptyLines(n: number) {
        this.buffer.push(new Uint8Array([this.ESC, 0x64, n]));
    }

    cut() {
        this.buffer.push(new Uint8Array([this.GS, 0x56, 0x41, 0x00])); // Partial cut
    }

    getBuffer(): Uint8Array {
        const totalLength = this.buffer.reduce((acc, curr) => acc + curr.length, 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;
        for (const arr of this.buffer) {
            result.set(arr, offset);
            offset += arr.length;
        }
        return result;
    }

    // --- High Level API ---
    printDivider() {
        this.setAlign('C');
        this.setBold(false);
        this.printLn('-'.repeat(CPL));
    }

    printRow(left: string, right: string) {
        if (left.length + right.length + 1 > CPL) {
            // If it exceeds length, put right on next line aligned right
            this.setAlign('L');
            this.printLn(left);
            this.setAlign('R');
            this.printLn(right);
        } else {
            this.setAlign('L');
            const spaces = CPL - left.length - right.length;
            this.printLn(left + ' '.repeat(spaces) + right);
        }
    }
}

export function buildReceiptPayload(order: Order): Uint8Array {
    const p = new ThermalPrinter();
    p.init();

    // Header
    p.setAlign('C');
    p.setTextSize(2, 2);
    p.setBold(true);
    p.printLn('TEH RAJA');

    p.setTextSize(1, 1);
    p.setBold(false);
    p.printLn('Authentic Tea & Blends');
    p.printLn('Jl. Raja Tea No. 1, Indonesia');
    p.printLn('IG @tehraja.id');
    p.printDivider();

    // Order Info
    p.setAlign('L');
    p.printRow('Order  :', '#' + order.id.slice(0, 8).toUpperCase());
    p.printRow('Waktu  :', new Date(order.date).toLocaleString('id-ID'));
    p.printRow('Kasir  :', order.cashierName || 'Staff');
    p.printRow('Nama   :', order.customerName || 'Guest');
    if (order.tableNumber) p.printRow('Meja   :', order.tableNumber.toString());
    p.printDivider();

    // Items
    p.setAlign('L');
    p.setBold(true);
    p.printLn('PESANAN:');
    p.setBold(false);
    order.items.forEach(item => {
        const finalPrice = item.finalPrice ?? item.price;
        const total = finalPrice * item.quantity;
        const variant = formatVariantLabel(item.variants);

        p.printRow(`${item.quantity}x ${item.name}`, formatRp(total));
        
        const detailSuffix = variant ? ` · ${variant}` : '';
        p.printLn(`   @ ${formatRp(finalPrice)}${detailSuffix}`);
        
        if (item.note) {
            p.printLn(`   * ${item.note}`);
        }
    });

    p.printDivider();

    // Totals
    const subtotal = order.subtotal || (order.total + (order.discount || 0));
    if (order.discount && order.discount > 0) {
        p.printRow('Subtotal', formatRp(subtotal));
        const discLabel = order.discountType === 'percent' ? `(${order.discountValue}%)` : '';
        p.printRow(`Diskon ${discLabel}`, `-${formatRp(order.discount)}`);
    }

    p.setBold(true);
    p.setTextSize(1, 2);
    p.printRow('TOTAL', formatRp(order.total));
    p.setTextSize(1, 1);
    p.setBold(false);

    // Payments
    const payLabel = order.paymentMethod?.toUpperCase() || 'CASH';
    p.printRow('Metode', payLabel);

    if (order.paymentMethod === 'cash' && order.cashReceived != null) {
        p.printRow('Tunai', formatRp(order.cashReceived));
        p.printRow('Kembalian', formatRp(order.changeAmount || 0));
    }

    p.emptyLines(1);
    p.setAlign('C');
    p.printLn('Terima kasih telah berbelanja!');
    p.printLn('Simpan struk sebagai bukti pembayaran.');
    p.emptyLines(3);
    p.cut();

    return p.getBuffer();
}

/**
 * Request bluetooth device and send payload
 */
export async function printViaBluetooth(payload: Uint8Array): Promise<void> {
    const nav = navigator as any;
    if (!('bluetooth' in nav)) {
        throw new Error('Web Bluetooth API tidak didukung pada browser ini.');
    }

    try {
        // Filter for Generic ESC/POS printers usually exposing this UUID or serial port UUIDs
        // Usually, thermal printers use standard UUIDs, or we can look for any device and connect if it has services
        const device = await nav.bluetooth.requestDevice({
            filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }],
            optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
        });

        if (!device || !device.gatt) {
            throw new Error('Perangkat tidak tersedia.');
        }

        const server = await device.gatt.connect();
        const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
        const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');

        // Bluetooth LE limits payload size to ~20 bytes or 512 bytes depending on MTU.
        // We chunk it to 100 bytes just to be safe for most ESC/POS LE printers.
        const chunkSize = 100;
        for (let i = 0; i < payload.length; i += chunkSize) {
            const chunk = payload.slice(i, i + chunkSize);
            await characteristic.writeValue(chunk);
        }

        device.gatt.disconnect();
    } catch (error) {
        console.error('Bluetooth Print Error:', error);
        throw error;
    }
}
