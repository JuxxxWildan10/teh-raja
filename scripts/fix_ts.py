#!/usr/bin/env python3
import os

BASE = r'd:\TEHRAJA\teh-raja'

# --- 1. Admin Page: Add Building2 ---
admin_path = os.path.join(BASE, 'app', 'admin', 'page.tsx')
with open(admin_path, 'r', encoding='utf-8') as f:
    admin = f.read()
if "import { Building2" not in admin and "Building2," not in admin:
    # Just replace "import { " with "import { Building2, "
    admin = admin.replace("import { ", "import { Building2, ", 1)
    with open(admin_path, 'w', encoding='utf-8') as f:
        f.write(admin)

# --- 2. POS Page: Fix "ustomer" ---
pos_path = os.path.join(BASE, 'app', 'pos', 'page.tsx')
with open(pos_path, 'r', encoding='utf-8') as f:
    pos = f.read()
if "!ustomer || items.length" in pos:
    pos = pos.replace("!ustomer || items.length", "!customer || items.length")
    with open(pos_path, 'w', encoding='utf-8') as f:
        f.write(pos)

# --- 3. FirebaseSync: Fix useInventoryStore import & type ---
sync_path = os.path.join(BASE, 'components', 'FirebaseSync.tsx')
with open(sync_path, 'r', encoding='utf-8') as f:
    sync = f.read()
if "useInventoryStore" not in sync[:1000]:
    sync = sync.replace("import { useSalesStore } from '@/lib/store';", "import { useSalesStore, useInventoryStore } from '@/lib/store';")
# Fix implicit 'any' on i in forEach
if "localIngredients.forEach(i =>" in sync:
    sync = sync.replace("localIngredients.forEach(i =>", "localIngredients.forEach((i: any) =>")
with open(sync_path, 'w', encoding='utf-8') as f:
    f.write(sync)

# --- 4. bluetoothPrint.ts: Fix TS type ---
bt_path = os.path.join(BASE, 'lib', 'bluetoothPrint.ts')
if os.path.exists(bt_path):
    with open(bt_path, 'r', encoding='utf-8') as f:
        bt = f.read()
    if "BluetoothRemoteGATTCharacteristic" in bt:
        bt = bt.replace("BluetoothRemoteGATTCharacteristic", "any")
        with open(bt_path, 'w', encoding='utf-8') as f:
            f.write(bt)

# --- 5. store.ts: Add branchId to SalesState ---
store_path = os.path.join(BASE, 'lib', 'store.ts')
with open(store_path, 'r', encoding='utf-8') as f:
    store = f.read()
    
if "branchId?: string;" not in store and "branchId: string;" not in store:
    # We need to add it to SalesState interface
    SALES_INT = "export interface SalesState {"
    if SALES_INT in store:
        store = store.replace(SALES_INT, SALES_INT + "\n    branchId: string;\n    branchName: string;\n    setBranch: (id: string, name: string) => void;")
    
    # We also need to add it to the initial state inside create<SalesState>
    INIT_STATE = "isStoreOpen: false,"
    if INIT_STATE in store:
        store = store.replace(INIT_STATE, INIT_STATE + "\n            branchId: 'main',\n            branchName: 'Cabang Utama',")
    
    # We also need to add setBranch implementation
    SET_BRANCH_IMPL = "openStore: (cashierName: string, initialCash: number) =>"
    if SET_BRANCH_IMPL in store:
        store = store.replace(SET_BRANCH_IMPL, "setBranch: (id: string, name: string) => set({ branchId: id, branchName: name }),\n            " + SET_BRANCH_IMPL)

with open(store_path, 'w', encoding='utf-8') as f:
    f.write(store)

print("All TypeScript issues patched!")
