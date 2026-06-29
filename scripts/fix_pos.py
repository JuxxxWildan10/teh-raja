#!/usr/bin/env python3
"""Fix remaining POS page issues:
1. Add Printer to lucide imports
2. Add orders to useSalesStore destructure
3. Add Bluetooth print button in receipt modal
"""
import os

BASE = r'd:\TEHRAJA\teh-raja'
pos_path = os.path.join(BASE, 'app', 'pos', 'page.tsx')

with open(pos_path, 'r', encoding='utf-8') as f:
    content = f.read()

# ── 1. Find lucide import block and add Printer ────────────────
lucide_idx = content.find("} from \"lucide-react\"")
if lucide_idx == -1:
    lucide_idx = content.find("} from 'lucide-react'")

if lucide_idx != -1:
    # Get the import block
    import_start = content.rfind("import {", 0, lucide_idx)
    import_block = content[import_start:lucide_idx]
    if "Printer" not in import_block:
        # Add Printer before closing }
        content = content[:lucide_idx] + ", Printer" + content[lucide_idx:]
        print("  [OK] Printer added to lucide import")
    else:
        print("  [OK] Printer already in import")
else:
    print("  [WARN] lucide import not found")

# ── 2. Add orders to useSalesStore destructure ─────────────────
# Find the useSalesStore() call and its destructure
sales_idx = content.find("= useSalesStore();")
if sales_idx != -1:
    dest_start = content.rfind("const {", 0, sales_idx)
    dest_block = content[dest_start:sales_idx + len("= useSalesStore();")]
    if "orders" not in dest_block:
        # Add 'orders' at the start of destructure
        new_dest = dest_block.replace("const {", "const { orders,", 1)
        content = content.replace(dest_block, new_dest, 1)
        print("  [OK] orders added to useSalesStore destructure")
    else:
        print("  [OK] orders already in useSalesStore destructure")
else:
    print("  [WARN] useSalesStore destructure not found")

# ── 3. Add Bluetooth print button in receipt modal ─────────────
# Find 'Transaksi Baru' text
transaksi_idx = content.find("Transaksi Baru")
if transaksi_idx != -1:
    # Find the opening of the button containing "Transaksi Baru"
    btn_open = content.rfind("<button", 0, transaksi_idx)
    if btn_open != -1:
        PRINT_BUTTON = """<button
                                onClick={async () => {
                                    if (!lastOrder) return;
                                    setIsPrinting(true);
                                    try {
                                        const { printReceipt } = await import('@/lib/bluetoothPrint');
                                        await printReceipt({
                                            id: lastOrder.id,
                                            customerName: lastOrder.customerName,
                                            items: lastOrder.items.map(i => ({ name: i.name, quantity: i.quantity, price: i.price, variants: i.variants })),
                                            total: lastOrder.total,
                                            paymentMethod: lastOrder.paymentMethod,
                                            cashReceived: lastOrder.cashReceived,
                                            changeAmount: lastOrder.changeAmount,
                                            discount: (lastOrder as any).discountAmount,
                                            date: lastOrder.date,
                                            tableNumber: lastOrder.tableNumber,
                                            orderType: lastOrder.orderType,
                                        });
                                        toast.success('Struk berhasil dicetak via Bluetooth!');
                                    } catch(e: any) {
                                        toast.error('Gagal cetak: ' + (e?.message || 'Pastikan printer terhubung'));
                                    } finally {
                                        setIsPrinting(false);
                                    }
                                }}
                                disabled={isPrinting}
                                className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#0D2B20] text-amber-400 rounded-xl font-bold text-sm hover:bg-[#1a4433] transition disabled:opacity-60 mb-2"
                            >
                                {isPrinting ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
                                Cetak Struk (Bluetooth)
                            </button>
                            """
        content = content[:btn_open] + PRINT_BUTTON + content[btn_open:]
        print("  [OK] Bluetooth print button added before 'Transaksi Baru'")
    else:
        print("  [WARN] Button open tag not found")
else:
    print("  [WARN] 'Transaksi Baru' not found in receipt modal")
    # Try alternative: look for a receipt close action
    close_receipt = content.find("setShowReceipt(false)")
    if close_receipt != -1:
        btn_open2 = content.rfind("<button", 0, close_receipt)
        print(f"  Alternative: button at {btn_open2}, close at {close_receipt}")
        print("  Context:", repr(content[btn_open2:btn_open2+100]))

with open(pos_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("\nFix POS done!")
