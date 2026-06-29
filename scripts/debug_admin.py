#!/usr/bin/env python3
import os

BASE = r'd:\TEHRAJA\teh-raja'
admin_path = os.path.join(BASE, 'app', 'admin', 'page.tsx')

with open(admin_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the loyalty tab in nav to append cabang after it
idx = content.find("'loyalty' as const, label")
print("loyalty nav entry:", repr(content[idx-20:idx+200]))
print("---")

# Find close of file
last_bracket = content.rfind(");\n}")
print("end of file:", repr(content[last_bracket-100:last_bracket+10]))
print("---")

# Find imports around Building2 or Lucide
idx_import = content.find("from 'lucide-react'")
print("lucide import line:", repr(content[max(0,idx_import-300):idx_import+30]))
