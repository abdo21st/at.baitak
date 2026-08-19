# -*- coding: utf-8 -*-
import os
import glob
import sys

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

p = r'C:\Users\phabd\.gemini\antigravity-ide\brain\2e8ae5fe-b9b8-45ce-b925-00443456e3a4\.user_uploaded\*'
files = glob.glob(p)
files.sort(key=os.path.getmtime, reverse=True)

print(f"Total uploaded files: {len(files)}")
for f in files[:5]:
    print(f"• {f} (size: {os.path.getsize(f)}, mtime: {os.path.getmtime(f)})")
