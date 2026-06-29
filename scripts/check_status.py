#!/usr/bin/env python3
import os

BASE = r'd:\TEHRAJA\teh-raja'

def check(label, condition):
    status = "[OK]" if condition else "[MISS]"
    print(f"  {status} {label}")

pos = open(os.path.join(BASE, 'app', 'pos', 'page.tsx'), 'r', encoding='utf-8').read()
admin = open(os.path.join(BASE, 'app', 'admin', 'page.tsx'), 'r', encoding='utf-8').read()
store = open(os.path.join(BASE, 'lib', 'store.ts'), 'r', encoding='utf-8').read()

print("=== POS PAGE ===")
check("Bluetooth print button", "Cetak Struk (Bluetooth)" in pos)
check("upsellHint state", "upsellHint" in pos)
check("isPrinting state", "isPrinting" in pos)
check("upsell useEffect (AI Smart Upsell)", "AI Smart Upsell" in pos)
check("Printer icon import", "Printer" in pos[:3000])
check("orders in useSalesStore", "orders," in pos[:5000])
check("decrementIngredientsForOrder called", "decrementIngredientsForOrder" in pos)

print()
print("=== ADMIN PAGE ===")
check("Multi Cabang tab", "Multi Cabang" in admin)
check("Building2 import", "Building2" in admin)
check("upsellSuggestion state", "upsellSuggestion" in admin)
check("handleUpsell function", "handleUpsell" in admin)
check("cabang in tab union type", "cabang" in admin[:5000])
check("ingredients in forecast call", "ingredients" in admin[admin.find("handleAIForecast"):admin.find("handleAIForecast")+600])

print()
print("=== STORE.TS ===")
check("setBranch action", "setBranch" in store)
check("branchId in state", "branchId:" in store)
check("BOM firebase sync", "Firebase BOM Update" in store)
check("ingredient firebase crud", "ingredients/${ingredient.id}" in store)

print()
print("=== FILES ===")
check("CRM Upsell API", os.path.exists(os.path.join(BASE, 'app', 'api', 'ai', 'crm-upsell', 'route.ts')))
check("QRIS Payment API", os.path.exists(os.path.join(BASE, 'app', 'api', 'payment', 'qris', 'route.ts')))
check("Bluetooth Print util", os.path.exists(os.path.join(BASE, 'lib', 'bluetoothPrint.ts')))
