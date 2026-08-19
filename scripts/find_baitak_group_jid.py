# -*- coding: utf-8 -*-
import urllib.request
import json
import sys

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

api_key = 'hodoork_waha_secure_2026'
req = urllib.request.Request('http://102.203.201.52:3008/api/default/groups', headers={'X-Api-Key': api_key})
with urllib.request.urlopen(req) as resp:
    groups = json.loads(resp.read().decode('utf-8'))
    print(f"Total groups: {len(groups)}")
    for jid, info in groups.items():
        sub = info.get('subject', '')
        if 'بيتك' in sub or 'صيدل' in sub or 'baitak' in sub.lower():
            print(f"🎯 FOUND TARGET GROUP:")
            print(f"   JID: {jid}")
            print(f"   Subject: {sub}")
            print(f"   Creation: {info.get('creation')}")
            print(f"   Owner: {info.get('ownerPn')}")
