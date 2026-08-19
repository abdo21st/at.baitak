# -*- coding: utf-8 -*-
import urllib.request
import json
import sys

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

api_key = 'hodoork_waha_secure_2026'
req = urllib.request.Request('http://102.203.201.52:3008/api/default/groups', headers={'X-Api-Key': api_key})
try:
    with urllib.request.urlopen(req) as resp:
        groups = json.loads(resp.read().decode('utf-8'))
        print("TYPE:", type(groups))
        if isinstance(groups, list):
            for idx, g in enumerate(groups[:10]):
                print(f"[{idx+1}] {g}")
        elif isinstance(groups, dict):
            print("KEYS:", groups.keys())
            for k, v in list(groups.items())[:10]:
                print(f"• {k} -> {v}")
except Exception as e:
    print("Error querying groups:", e)
