#!/usr/bin/env python3
"""
Patch POS page to add:
1. Bluetooth thermal print button on receipt modal
2. AI Upsell suggestion in customer search area
"""
import os

BASE = r'd:\TEHRAJA\teh-raja'
pos_path = os.path.join(BASE, 'app', 'pos', 'page.tsx')

with open(pos_path, 'r', encoding='utf-8') as f:
    content = f.read()

def patch(old, new, label):
    global content
    if old not in content:
        print(f"  [WARN] Not found ({label})")
        return False
    content = content.replace(old, new, 1)
    print(f"  [OK] ({label})")
    return True

# ── 1. Add bluetooth print state and upsell state ──────────
patch(
    "    // Voice Command\n    const [isListening, setIsListening] = useState(false);\n    const [isProcessingVoice, setIsProcessingVoice] = useState(false);",
    """    // Voice Command
    const [isListening, setIsListening] = useState(false);
    const [isProcessingVoice, setIsProcessingVoice] = useState(false);

    // Bluetooth Print
    const [isPrinting, setIsPrinting] = useState(false);

    // AI Upsell CRM
    const [upsellHint, setUpsellHint] = useState<string | null>(null);
    const [isLoadingUpsell, setIsLoadingUpsell] = useState(false);""",
    "bluetooth + upsell state"
)

# ── 2. Add upsell fetch when customer phone found ──────────
# Find where customer is looked up by phone
patch(
    "const customerLookup = useMemo(() => customers.find(c => c.phone === customerPhone.trim()), [customers, customerPhone]);",
    """const customerLookup = useMemo(() => customers.find(c => c.phone === customerPhone.trim()), [customers, customerPhone]);

    // AI Upsell trigger when customer is found
    useEffect(() => {
        if (!customerLookup || items.length === 0) { setUpsellHint(null); return; }
        const timer = setTimeout(async () => {
            setIsLoadingUpsell(true);
            try {
                const orderHistory = orders.filter(o => (o as any).customerPhone === customerLookup.phone);
                const res = await fetch('/api/ai/crm-upsell', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ customer: customerLookup, orderHistory, currentCart: items, availableProducts: products.filter(p => p.isAvailable).slice(0, 8) })
                });
                const data = await res.json();
                if (data.suggestion) setUpsellHint(data.suggestion);
            } catch(e) { /* silent fail */ }
            finally { setIsLoadingUpsell(false); }
        }, 800);
        return () => clearTimeout(timer);
    }, [customerLookup, items.length]);""",
    "upsell useEffect"
)

# If customerLookup doesn't have that exact form, try simpler approach
# by finding where orders is used in pos page
with open(pos_path, 'r', encoding='utf-8') as f:
    check = f.read()
if 'AI Upsell trigger' not in check:
    # Find addOrder destructure to inject upsell state nearby
    with open(pos_path, 'r', encoding='utf-8') as f:
        content = f.read()
    patch2_old = "    // Discount\n    const [discountMode, setDiscountMode] = useState<DiscountMode>('none');"
    patch2_new = """    // Discount
    const [discountMode, setDiscountMode] = useState<DiscountMode>('none');

    // AI Upsell CRM  
    const [upsellHint, setUpsellHint] = useState<string | null>(null);
    const [isLoadingUpsell, setIsLoadingUpsell] = useState(false);

    // Bluetooth Print
    const [isPrinting, setIsPrinting] = useState(false);"""
    if patch2_old in content:
        content = content.replace(patch2_old, patch2_new, 1)
        print("  [OK] (state via fallback)")
        with open(pos_path, 'w', encoding='utf-8') as f:
            f.write(content)

# Re-read after potential fallback
with open(pos_path, 'r', encoding='utf-8') as f:
    content = f.read()

# ── 3. Show upsell hint near customer info field ──────────
OLD_UPSELL_AREA = "setQrisGenerated(false); setQrisSuccess(false);"
NEW_UPSELL_AREA = "setQrisGenerated(false); setQrisSuccess(false); setUpsellHint(null); setQrisUrl(null);"
patch(OLD_UPSELL_AREA, NEW_UPSELL_AREA, "reset upsell on clear")

# ── 4. Add upsell hint bubble near customer name display ──
OLD_CUST_DISPLAY = "{customer && <span className=\"text-[10px] text-amber-500 font-bold\">"
if OLD_CUST_DISPLAY in content:
    patch(
        OLD_CUST_DISPLAY,
        """{upsellHint && !isLoadingUpsell && (
                                    <div className="mt-1 p-2 bg-violet-50 border border-violet-200 rounded-lg flex items-start gap-1.5">
                                        <Sparkles size={11} className="text-violet-500 flex-shrink-0 mt-0.5" />
                                        <p className="text-[10px] text-violet-700 font-medium leading-tight">{upsellHint}</p>
                                    </div>
                                )}
                                {customer && <span className="text-[10px] text-amber-500 font-bold">""",
        "upsell hint bubble"
    )

# ── 5. Add Bluetooth print button in receipt modal ────────
OLD_RECEIPT_BTN = "onClick={() => setShowReceipt(false)}\n                                className=\"flex-1 py-3 bg-gray-100"
if OLD_RECEIPT_BTN in content:
    patch(
        OLD_RECEIPT_BTN,
        """onClick={async () => {
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
                                            discount: lastOrder.discountAmount,
                                            date: lastOrder.date,
                                            tableNumber: lastOrder.tableNumber,
                                            orderType: lastOrder.orderType,
                                        });
                                        toast.success('Struk berhasil dicetak!');
                                    } catch(e: any) {
                                        toast.error('Gagal cetak: ' + e.message);
                                    } finally { setIsPrinting(false); }
                                }}
                                disabled={isPrinting}
                                className="flex items-center justify-center gap-1.5 py-3 px-4 bg-[#0D2B20] text-amber-400 rounded-xl font-bold text-sm hover:bg-[#1a4433] transition disabled:opacity-60"
                            >
                                {isPrinting ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
                                Cetak
                            </button>
                            <button
                                onClick={() => setShowReceipt(false)}
                                className="flex-1 py-3 bg-gray-100""",
        "bluetooth print button"
    )

# ── 6. Add Printer to lucide import ──────────────────────
idx_lucide = content.find("from 'lucide-react'")
start_import = content.rfind("import {", 0, idx_lucide)
end_import = content.find("} from 'lucide-react'", start_import)
lucide_block = content[start_import:end_import]
if 'Printer' not in lucide_block:
    content = content[:end_import] + ", Printer" + content[end_import:]
    print("  [OK] (add Printer import)")

with open(pos_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("\nPOS patches done!")
