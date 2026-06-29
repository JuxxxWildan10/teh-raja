#!/usr/bin/env python3
"""Fix admin page.tsx JSX errors:
1. loyalty tab must have a single root element wrapping upsell panel + original content
2. Fix unclosed parentheses at line 1670
"""
import os

BASE = r'd:\TEHRAJA\teh-raja'
admin_path = os.path.join(BASE, 'app', 'admin', 'page.tsx')

with open(admin_path, 'r', encoding='utf-8') as f:
    content = f.read()

# ── 1. The problem: loyalty tab opens with ( then immediately has <div> without wrapper ──
# Lines 1253-1254: the condition check has the upsell div directly without a <>...</> wrapper
# We need to wrap with <> ... </> fragment

# Find the loyalty tab expression start
LOYALTY_COND = "{activeTab === 'loyalty' && user.role === 'admin' && (\n                "

# The current bad structure:
BAD_LOYALTY_START = """{activeTab === 'loyalty' && user.role === 'admin' && (
                <div className="bg-gradient-to-br from-violet-900 to-purple-900 rounded-2xl p-6 text-white shadow-xl mb-6">"""

# Good structure wrapping with fragment:
GOOD_LOYALTY_START = """{activeTab === 'loyalty' && user.role === 'admin' && (
                <div className="animate-fade-in space-y-6">
                <div className="bg-gradient-to-br from-violet-900 to-purple-900 rounded-2xl p-6 text-white shadow-xl mb-6">"""

if BAD_LOYALTY_START in content:
    content = content.replace(BAD_LOYALTY_START, GOOD_LOYALTY_START, 1)
    print("  [OK] Fixed loyalty tab: wrapped with outer div")
    
    # Now find where the upsell panel ends and the original loyalty div starts
    # The upsell panel ends at </div> and then the original content div starts
    # We need to find the closing of the original loyalty content and add closing outer div
    
    # Find the closing )} of the loyalty tab
    # The structure should be: </div> <- upsell end, </div> <- loyalty content end, </div> <- outer div, )}
    # After loyalty content's closing </div>, add </div> for outer wrapper
    
    # Look for the original loyalty closing pattern
    # The original content ends with </div>\n                )}\n
    LOYALTY_CLOSE_OLD = "                    </div>\n                )}\n"
    
    # Count occurrences after loyalty section
    loyalty_idx = content.find("Loyalty Pelanggan")
    if loyalty_idx != -1:
        # Find the closing )} after this point
        close_idx = content.find("\n                )}", loyalty_idx)
        if close_idx != -1:
            # Insert </div> for outer wrapper before the )}
            content = content[:close_idx] + "\n                </div>" + content[close_idx:]
            print("  [OK] Added closing </div> for loyalty outer wrapper")
else:
    print("  [WARN] Bad loyalty start pattern not found - trying alternate fix")
    
    # Check what's actually there
    loyalty_start = content.find("{activeTab === 'loyalty'")
    if loyalty_start != -1:
        print("  Context:", repr(content[loyalty_start:loyalty_start+200]))

with open(admin_path, 'w', encoding='utf-8') as f:
    f.write(content)

# ── 2. Check the pos page error at line 1252 ──────────────────
pos_path = os.path.join(BASE, 'app', 'pos', 'page.tsx')
with open(pos_path, 'r', encoding='utf-8') as f:
    pos = f.read()

pos_lines = pos.split('\n')
# Show context around line 1252
ctx_start = max(0, 1250)
ctx_end = min(len(pos_lines), 1258)
print(f"\nPOS line 1250-1258:")
for i, line in enumerate(pos_lines[ctx_start:ctx_end], start=ctx_start+1):
    print(f"  {i}: {line}")

print("\nDone!")
