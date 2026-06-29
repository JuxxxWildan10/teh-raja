#!/usr/bin/env python3
import os

BASE = r'd:\TEHRAJA\teh-raja'
pos_path = os.path.join(BASE, 'app', 'pos', 'page.tsx')

with open(pos_path, 'r', encoding='utf-8') as f:
    content = f.read()

# ── 1. Add upsell hint in customer section ────────────────
OLD_CUST = "customer && (\n                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1,"
if OLD_CUST in content:
    idx = content.find(OLD_CUST)
    # Insert upsell UI before customer badge motion.div
    UPSELL_UI = """upsellHint && (
                                    <div className="flex items-start gap-1.5 p-2 bg-violet-50 border border-violet-200 rounded-lg mb-1 animate-fade-in">
                                        <Sparkles size={11} className="text-violet-500 flex-shrink-0 mt-0.5" />
                                        <p className="text-[10px] text-violet-700 font-medium leading-tight">{upsellHint}</p>
                                    </div>
                                )}
                                {"""
    content = content[:idx] + UPSELL_UI + content[idx + len("{"):]
    print("  [OK] upsell hint UI")

# ── 2. Find useSalesStore destructure ────────────────────
idx2 = content.find("useSalesStore()")
if idx2 != -1:
    # Find the destructure pattern  
    line_start = content.rfind('\n', 0, idx2) + 1
    line = content[line_start:content.find('\n', idx2)]
    print("useSalesStore line:", repr(line[:120]))
    
# ── 3. Add orders from useSalesStore ─────────────────────
OLD_STORE_DEST = "} = useSalesStore();"
if OLD_STORE_DEST in content:
    # Find the full destructure
    idx3 = content.find(OLD_STORE_DEST)
    start3 = content.rfind("const {", 0, idx3)
    destructure_block = content[start3:idx3 + len(OLD_STORE_DEST)]
    if 'orders' not in destructure_block:
        content = content.replace(destructure_block, 
            destructure_block.replace("const {", "const { orders,"),
            1)
        print("  [OK] added orders to useSalesStore destructure")
    else:
        print("  [OK] orders already in useSalesStore destructure")

# ── 4. Find "Transaksi Baru" in receipt and add print button above ─
idx4 = content.find("Transaksi Baru")
if idx4 != -1:
    btn_start = content.rfind("<button", 0, idx4)
    btn_content = content[btn_start:idx4+50]
    print("Receipt btn context:", repr(btn_content[:200]))
    
    PRINT_BTN = """<button
                                onClick={async () => {
                                    if (!lastOrder) return;
                                    setIsPrinting(true);
                                    try {
                                        const { printReceipt } = await import('@/lib/bluetoothPrint');
                                        await printReceipt({
                                            id: lastOrder.id, customerName: lastOrder.customerName,
                                            items: lastOrder.items.map(i => ({ name: i.name, quantity: i.quantity, price: i.price, variants: i.variants })),
                                            total: lastOrder.total, paymentMethod: lastOrder.paymentMethod,
                                            cashReceived: lastOrder.cashReceived, changeAmount: lastOrder.changeAmount,
                                            discount: (lastOrder as any).discountAmount, date: lastOrder.date,
                                            tableNumber: lastOrder.tableNumber, orderType: lastOrder.orderType,
                                        });
                                        toast.success('Struk dicetak!');
                                    } catch(e: any) { toast.error('Gagal cetak Bluetooth: ' + (e?.message || '')); }
                                    finally { setIsPrinting(false); }
                                }}
                                disabled={isPrinting}
                                className="flex items-center justify-center gap-1.5 w-full py-2.5 bg-[#0D2B20] text-amber-400 rounded-xl font-bold text-sm hover:bg-[#1a4433] transition disabled:opacity-60 mb-2"
                            >
                                {isPrinting ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
                                Cetak Struk (Bluetooth)
                            </button>
                            """
    content = content[:btn_start] + PRINT_BTN + content[btn_start:]
    print("  [OK] print button before Transaksi Baru")

with open(pos_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("\nDone!")
