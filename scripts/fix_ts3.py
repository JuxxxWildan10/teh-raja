#!/usr/bin/env python3
import os

BASE = r'd:\TEHRAJA\teh-raja'

# 1. Admin Page
admin_path = os.path.join(BASE, 'app', 'admin', 'page.tsx')
with open(admin_path, 'r', encoding='utf-8') as f:
    admin = f.read()

if '} from "lucide-react";' in admin:
    admin = admin.replace('} from "lucide-react";', ', Building2 } from "lucide-react";')
with open(admin_path, 'w', encoding='utf-8') as f:
    f.write(admin)

# 2. POS Page
pos_path = os.path.join(BASE, 'app', 'pos', 'page.tsx')
with open(pos_path, 'r', encoding='utf-8') as f:
    pos = f.read()

if '{ustomer && (' in pos:
    pos = pos.replace('{ustomer && (', '{customer && (')
with open(pos_path, 'w', encoding='utf-8') as f:
    f.write(pos)

# 3. Firebase Sync
sync_path = os.path.join(BASE, 'components', 'FirebaseSync.tsx')
with open(sync_path, 'r', encoding='utf-8') as f:
    sync = f.read()

if 'useInventoryStore.setState({ ingredients: loadedIngredients });' in sync:
    sync = sync.replace('useInventoryStore.setState({ ingredients: loadedIngredients });', 'useInventoryStore.setState({ ingredients: loadedIngredients as any });')
with open(sync_path, 'w', encoding='utf-8') as f:
    f.write(sync)

# 4. store.ts SalesState error
store_path = os.path.join(BASE, 'lib', 'store.ts')
with open(store_path, 'r', encoding='utf-8') as f:
    store = f.read()

# I already added branchId to SalesState. Why does the error say it does not exist?
# "Property 'branchId' does not exist on type 'SalesState'"
# Let's check how many "interface SalesState" exist in store.ts. 
