#!/usr/bin/env python3
import os

BASE = r'd:\TEHRAJA\teh-raja'
pos_path = os.path.join(BASE, 'app', 'pos', 'page.tsx')

with open(pos_path, 'r', encoding='utf-8') as f:
    content = f.read()

# ── 1. Find and insert upsell effect after customer lookup ──
OLD = "    const maxRedeemablePoints = customer ? Math.floor(customer.points / 100) * 100 : 0; //"
idx = content.find(OLD)
if idx != -1:
    line_end = content.find('\n', idx)
    upsell_effect = """

    // AI Smart Upsell: Triggered when a known customer + items in cart
    useEffect(() => {
        if (!customer || items.length === 0) { setUpsellHint(null); return; }
        const controller = new AbortController();
        const timer = setTimeout(async () => {
            setIsLoadingUpsell(true);
            try {
                const orderHistory = orders.filter(o => (o as any).customerPhone === customer.phone);
                const res = await fetch('/api/ai/crm-upsell', {
                    signal: controller.signal,
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        customer,
                        orderHistory: orderHistory.slice(-10),
                        currentCart: items,
                        availableProducts: products.filter(p => p.isAvailable).slice(0, 8)
                    })
                });
                if (!res.ok) return;
                const data = await res.json();
                if (data.suggestion) setUpsellHint(data.suggestion);
            } catch(e: any) {
                if (e.name !== 'AbortError') console.warn('[Upsell]', e.message);
            } finally {
                setIsLoadingUpsell(false);
            }
        }, 900);
        return () => { clearTimeout(timer); controller.abort(); };
    }, [customer?.phone, items.length]);"""
    content = content[:line_end+1] + upsell_effect + content[line_end+1:]
    print("  [OK] upsell useEffect inserted")
else:
    print("  [WARN] maxRedeemablePoints line not found")

# ── 2. Find customer info section and add upsell hint ──────
# Look for where customer poin is displayed in the right panel
OLD_CUST_BADGE = "customer && <span className="
idx2 = content.find(OLD_CUST_BADGE)
if idx2 != -1:
    # Get context before it (look for the enclosing div)
    line_start = content.rfind('\n', 0, idx2) + 1
    indent = len(line_start and content[line_start:idx2]) - len(content[line_start:idx2].lstrip())
    # Insert upsell hint before the customer badge
    upsell_ui = """                                {upsellHint && (
                                    <div className="flex items-start gap-1.5 p-2 mt-1 bg-violet-50 border border-violet-200 rounded-lg">
                                        <Sparkles size={11} className="text-violet-500 flex-shrink-0 mt-0.5" />
                                        <p className="text-[10px] text-violet-700 font-medium leading-tight">{upsellHint}</p>
                                    </div>
                                )}
                                {"""
    content = content[:idx2] + upsell_ui + content[idx2 + len("{"):]
    print("  [OK] upsell hint bubble inserted")
else:
    print("  [WARN] customer badge not found")

# ── 3. Add Print button in receipt modal ──────────────────
# Find receipt modal close button
OLD_RECEIPT = "className=\"flex items-center gap-1.5 w-full py-3 border border-gray-200"
if OLD_RECEIPT in content:
    idx3 = content.find(OLD_RECEIPT)
    # Look for enclosing button start
    btn_start = content.rfind("<button", 0, idx3)
    # Insert Bluetooth print button before the existing button
    PRINT_BTN = """<button
                                onClick={async () => {
                                    if (!lastOrder) return;
                                    setIsPrinting(true);
                                    try {
                                        const { printReceipt } = await import('@/lib/bluetoothPrint');
                                        await printReceipt({
                                            id: lastOrder.id,
                                            customerName: lastOrder.customerName,
                                            items: lastOrder.items.map(i => ({
                                                name: i.name, quantity: i.quantity, price: i.price, variants: i.variants
                                            })),
                                            total: lastOrder.total,
                                            paymentMethod: lastOrder.paymentMethod,
                                            cashReceived: lastOrder.cashReceived,
                                            changeAmount: lastOrder.changeAmount,
                                            discount: (lastOrder as any).discountAmount,
                                            date: lastOrder.date,
                                            tableNumber: lastOrder.tableNumber,
                                            orderType: lastOrder.orderType,
                                        });
                                        toast.success('Struk dicetak via Bluetooth!');
                                    } catch(e: any) {
                                        toast.error('Gagal cetak: ' + (e?.message || 'Error'));
                                    } finally { setIsPrinting(false); }
                                }}
                                disabled={isPrinting}
                                className="flex items-center justify-center gap-1.5 w-full py-3 bg-[#0D2B20] text-amber-400 rounded-xl font-bold text-sm hover:bg-[#1a4433] transition disabled:opacity-60 mb-2"
                            >
                                {isPrinting ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
                                Cetak Struk (Bluetooth)
                            </button>
                            """
    content = content[:btn_start] + PRINT_BTN + content[btn_start:]
    print("  [OK] bluetooth print button in receipt modal")
else:
    # Try a simpler approach - look for "Transaksi Baru" button in receipt
    OLD_RECEIPT2 = "Transaksi Baru"
    idx4 = content.find(OLD_RECEIPT2)
    if idx4 != -1:
        btn_start2 = content.rfind("<button", 0, idx4)
        PRINT_BTN2 = """<button
                                onClick={async () => {
                                    if (!lastOrder) return;
                                    setIsPrinting(true);
                                    try {
                                        const { printReceipt } = await import('@/lib/bluetoothPrint');
                                        await printReceipt({ id: lastOrder.id, customerName: lastOrder.customerName, items: lastOrder.items.map(i => ({ name: i.name, quantity: i.quantity, price: i.price, variants: i.variants })), total: lastOrder.total, paymentMethod: lastOrder.paymentMethod, cashReceived: lastOrder.cashReceived, changeAmount: lastOrder.changeAmount, discount: (lastOrder as any).discountAmount, date: lastOrder.date, tableNumber: lastOrder.tableNumber, orderType: lastOrder.orderType });
                                        toast.success('Struk dicetak!');
                                    } catch(e: any) { toast.error('Gagal cetak: ' + (e?.message || 'Error')); }
                                    finally { setIsPrinting(false); }
                                }}
                                disabled={isPrinting}
                                className="flex items-center justify-center gap-1.5 w-full py-3 bg-[#0D2B20] text-amber-400 rounded-xl font-bold text-sm hover:bg-[#1a4433] transition disabled:opacity-60 mb-2"
                            >
                                {isPrinting ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
                                Cetak Struk (Bluetooth)
                            </button>
                            """
        content = content[:btn_start2] + PRINT_BTN2 + content[btn_start2:]
        print("  [OK] bluetooth print button (fallback)")

# ── 4. Add orders to destructured useSalesStore if not there ──
with open(pos_path, 'r', encoding='utf-8') as f:
    temp = f.read()

with open(pos_path, 'w', encoding='utf-8') as f:
    f.write(content)

# Check if 'orders' is available in pos page
if 'const { orders,' not in content and 'orders,' not in content[:content.find('useEffect')]:
    # Need to add orders to useSalesStore destructure
    with open(pos_path, 'r', encoding='utf-8') as f:
        c = f.read()
    OLD_STORE = "const { addOrder, addLog, updateOrderStatus, closeStore, openStore, isStoreOpen"
    if OLD_STORE in c:
        c = c.replace(OLD_STORE, "const { orders, addOrder, addLog, updateOrderStatus, closeStore, openStore, isStoreOpen")
        with open(pos_path, 'w', encoding='utf-8') as f:
            f.write(c)
        print("  [OK] added 'orders' to useSalesStore destructure")
    else:
        print("  [WARN] useSalesStore destructure line not found")

print("\nPOS patch2 done!")
