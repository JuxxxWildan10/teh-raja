#!/usr/bin/env python3
"""Fix corrupted template literals in store.ts and FirebaseSync.tsx"""
import os

BASE = r'd:\TEHRAJA\teh-raja'

# ── Fix store.ts line 782 ──────────────────────────────────
store_path = os.path.join(BASE, 'lib', 'store.ts')
with open(store_path, 'r', encoding='utf-8') as f:
    store = f.read()

# Fix the corrupted updateIngredient line
BAD_UPDATE = r"updateIngredient: (id, updated) => { set((s) => ({ ingredients: s.ingredients.map(i => i.id === id ? { ...i, ...updated } : i) })); firebaseUpdate(ref(rtdb, \ingredients/\), updated).catch(err => console.error(err)); },"
GOOD_UPDATE = "updateIngredient: (id, updated) => {\n                set((s) => ({ ingredients: s.ingredients.map(i => i.id === id ? { ...i, ...updated } : i) }));\n                firebaseUpdate(ref(rtdb, `ingredients/${id}`), updated).catch(err => console.error(err));\n            },"

if BAD_UPDATE in store:
    store = store.replace(BAD_UPDATE, GOOD_UPDATE, 1)
    print("  [OK] Fixed updateIngredient in store.ts")
else:
    # Try to find and replace the broken line
    lines = store.split('\n')
    for i, line in enumerate(lines):
        if 'updateIngredient' in line and r'\ingredients/' in line:
            lines[i] = "            updateIngredient: (id, updated) => {\n                set((s) => ({ ingredients: s.ingredients.map(i => i.id === id ? { ...i, ...updated } : i) }));\n                firebaseUpdate(ref(rtdb, `ingredients/${id}`), updated).catch(err => console.error(err));\n            },"
            print(f"  [OK] Fixed updateIngredient at line {i+1}")
            break
    store = '\n'.join(lines)

with open(store_path, 'w', encoding='utf-8') as f:
    f.write(store)

# ── Fix FirebaseSync.tsx line 120 ─────────────────────────
sync_path = os.path.join(BASE, 'components', 'FirebaseSync.tsx')
with open(sync_path, 'r', encoding='utf-8') as f:
    sync = f.read()

# Fix the corrupted firebaseSet line  
BAD_SYNC_LINE = r'firebaseSet(ref(rtdb, \ingredients/\), i).catch(console.error);'
GOOD_SYNC_LINE = 'firebaseSet(ref(rtdb, `ingredients/${i.id}`), i).catch(console.error);'

if BAD_SYNC_LINE in sync:
    sync = sync.replace(BAD_SYNC_LINE, GOOD_SYNC_LINE, 1)
    print("  [OK] Fixed FirebaseSync.tsx ingredients line")
else:
    # Try line-by-line
    lines = sync.split('\n')
    for i, line in enumerate(lines):
        if 'ingredients' in line and ('\\ingredients' in line or r'\ingredients' in line):
            lines[i] = '                        firebaseSet(ref(rtdb, `ingredients/${i.id}`), i).catch(console.error);'
            print(f"  [OK] Fixed FirebaseSync.tsx at line {i+1}")
            break
    sync = '\n'.join(lines)

with open(sync_path, 'w', encoding='utf-8') as f:
    f.write(sync)

print("\nTemplate literal fixes done!")
