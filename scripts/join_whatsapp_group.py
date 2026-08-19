# -*- coding: utf-8 -*-
import urllib.request
import urllib.parse
import json
import sys

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

WAHA_URL = 'http://102.203.201.52:3008'
INVITE_CODE = 'Lwwz6ZR8EtTJ2qxSfmxSsz'

def check_waha_sessions():
    print("🔍 1. فحص جلسات WAHA الحالية...")
    try:
        req = urllib.request.urlopen(f"{WAHA_URL}/api/sessions", timeout=10)
        data = json.loads(req.read().decode('utf-8'))
        print("🟢 الجلسات:", json.dumps(data, indent=2, ensure_ascii=False))
        return data
    except Exception as e:
        print(f"🔴 خطأ في جلب الجلسات: {e}")
        return []

def join_group_via_waha(session="default"):
    print(f"\n🚪 2. محاولة انضمام البوت للمجموعة عبر كود الدعوة [{INVITE_CODE}]...")
    endpoints = [
        f"{WAHA_URL}/api/{session}/groups/join",
        f"{WAHA_URL}/api/groups/join",
        f"{WAHA_URL}/api/joinGroup",
        f"{WAHA_URL}/api/{session}/joinGroup"
    ]

    payloads = [
        {"code": INVITE_CODE},
        {"inviteCode": INVITE_CODE},
        {"url": f"https://chat.whatsapp.com/{INVITE_CODE}"}
    ]

    for ep in endpoints:
        for p in payloads:
            try:
                req = urllib.request.Request(
                    ep,
                    data=json.dumps(p).encode('utf-8'),
                    headers={'Content-Type': 'application/json'}
                )
                with urllib.request.urlopen(req, timeout=10) as resp:
                    res = json.loads(resp.read().decode('utf-8'))
                    print(f"🟢 [نجاح الانضمام] عبر {ep}:", res)
                    return res
            except urllib.error.HTTPError as e:
                body = e.read().decode('utf-8', errors='replace')
                # print(f"HTTP {e.code} on {ep}: {body[:100]}")
            except Exception as e:
                pass
    print("⚠️ لم تنجح محاولات الانضمام التلقائية عبر النقاط العامة، سنقوم بفحص الـ Swagger أو إعداد الـ Webhook.")

if __name__ == '__main__':
    sessions = check_waha_sessions()
    join_group_via_waha()
