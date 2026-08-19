# -*- coding: utf-8 -*-
import urllib.request
import json
import sys

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

api_key = "hodoork_waha_secure_2026"
invite_code = "Lwwz6ZR8EtTJ2qxSfmxSsz"

# 1. Query invite info
url = f"http://102.203.201.52:3008/api/default/groups/invite-info?code={invite_code}"
req = urllib.request.Request(url, headers={"X-Api-Key": api_key})
try:
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        print("GROUP INVITE INFO:", json.dumps(data, indent=2, ensure_ascii=False))
except Exception as e:
    print("Invite info error:", e)

# 2. Query all groups / join group
url2 = "http://102.203.201.52:3008/api/default/groups/join"
req2 = urllib.request.Request(url2, data=json.dumps({"code": invite_code}).encode('utf-8'), headers={"X-Api-Key": api_key, "Content-Type": "application/json"})
try:
    with urllib.request.urlopen(req2) as resp:
        data2 = json.loads(resp.read().decode('utf-8'))
        print("JOIN RESULT / GROUP ID:", json.dumps(data2, indent=2, ensure_ascii=False))
except Exception as e:
    print("Join group error:", e)
