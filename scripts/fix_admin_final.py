#!/usr/bin/env python3
import os

BASE = r'd:\TEHRAJA\teh-raja'
admin_path = os.path.join(BASE, 'app', 'admin', 'page.tsx')

with open(admin_path, 'r', encoding='utf-8') as f:
    content = f.read()

# ── 1. Find the Multi Cabang code block ────────────────────
CABANG_START = "            {/* ============ TAB: MULTI CABANG ============ */}"
if CABANG_START in content:
    start_idx = content.find(CABANG_START)
    
    # It ends right before "    </div>\n    );\n}\n" at the end of the file
    END_PATTERN = "    </div>\n    );\n}"
    
    # Wait, let's just find the end of the cabang tab by counting braces
    # Actually, the simplest way is to split the content
    # The cabang code goes from CABANG_START to the line with "</div>" before "    );\n}"
    
    # Or I can just do a git checkout to restore the file, and apply the cabang tab properly?
    pass

