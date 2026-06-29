#!/usr/bin/env python3
import os, sys

BASE = r'd:\TEHRAJA\teh-raja'
pos_path = os.path.join(BASE, 'app', 'pos', 'page.tsx')

with open(pos_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find all setShowReceipt(false) occurrences
instances = []
start = 0
while True:
    idx = content.find('setShowReceipt(false)', start)
    if idx == -1:
        break
    instances.append(idx)
    start = idx + 1

print(f"Found setShowReceipt(false) at positions: {instances}")

for idx in instances:
    context = content[max(0,idx-200):idx+60]
    # Write context safely
    sys.stdout.buffer.write(("Context around " + str(idx) + ":\n").encode('utf-8'))
    sys.stdout.buffer.write(repr(context).encode('utf-8'))
    sys.stdout.buffer.write(b"\n===\n")
