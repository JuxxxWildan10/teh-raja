#!/usr/bin/env python3
import os

BASE = r'd:\TEHRAJA\teh-raja'

# --- 1. Admin Page: Fix Building2 import ---
admin_path = os.path.join(BASE, 'app', 'admin', 'page.tsx')
with open(admin_path, 'r', encoding='utf-8') as f:
    admin = f.read()

# Remove Building2 from react import
if "import { Building2, useState" in admin:
    admin = admin.replace("import { Building2, useState", "import { useState")
# Add Building2 to lucide-react import
if "import { " in admin and "lucide-react" in admin:
    # Find the lucide-react import
    lines = admin.split('\n')
    for i, line in enumerate(lines):
        if "from \"lucide-react\"" in line or "from 'lucide-react'" in line:
            if "Building2" not in line:
                lines[i] = line.replace("import { ", "import { Building2, ")
            break
    admin = '\n'.join(lines)
with open(admin_path, 'w', encoding='utf-8') as f:
    f.write(admin)

# --- 2. POS Page: Fix "ustomer" typo at line 833 ---
pos_path = os.path.join(BASE, 'app', 'pos', 'page.tsx')
with open(pos_path, 'r', encoding='utf-8') as f:
    pos = f.read()
if "!ustomer" in pos:
    pos = pos.replace("!ustomer", "!customer")
with open(pos_path, 'w', encoding='utf-8') as f:
    f.write(pos)

# --- 3. FirebaseSync: Fix useInventoryStore import ---
sync_path = os.path.join(BASE, 'components', 'FirebaseSync.tsx')
with open(sync_path, 'r', encoding='utf-8') as f:
    sync = f.read()
if "useInventoryStore" not in sync[:1000]:
    if "import { useSalesStore } from" in sync:
        sync = sync.replace("import { useSalesStore }", "import { useSalesStore, useInventoryStore }")
    elif "import { useProductStore, useSalesStore" in sync:
        sync = sync.replace("import { useProductStore, useSalesStore", "import { useProductStore, useSalesStore, useInventoryStore")
    elif "useSalesStore" in sync:
        lines = sync.split('\n')
        for i, line in enumerate(lines):
            if "useSalesStore" in line and "@/lib/store" in line:
                lines[i] = line.replace("useSalesStore", "useSalesStore, useInventoryStore")
                break
        sync = '\n'.join(lines)
with open(sync_path, 'w', encoding='utf-8') as f:
    f.write(sync)

# --- 4. store.ts: Add branchId to SalesState ---
store_path = os.path.join(BASE, 'lib', 'store.ts')
with open(store_path, 'r', encoding='utf-8') as f:
    store = f.read()

SALES_INT = "export interface SalesState {"
if "branchId: string;" not in store:
    if SALES_INT in store:
        store = store.replace(SALES_INT, SALES_INT + "\n    branchId: string;\n    branchName: string;\n    setBranch: (id: string, name: string) => void;")

INIT_STATE = "isStoreOpen: false,"
if "branchId: 'main'" not in store:
    if INIT_STATE in store:
        store = store.replace(INIT_STATE, INIT_STATE + "\n    branchId: 'main',\n    branchName: 'Cabang Utama',")

SET_BRANCH = "openStore: (cashierName"
if "setBranch:" not in store:
    if SET_BRANCH in store:
        store = store.replace(SET_BRANCH, "setBranch: (id: string, name: string) => set({ branchId: id, branchName: name }),\n    " + SET_BRANCH)

with open(store_path, 'w', encoding='utf-8') as f:
    f.write(store)

print("TypeScript fixes applied!")
