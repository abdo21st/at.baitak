# -*- coding: utf-8 -*-
import urllib.request
import json
import base64
import sys

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

# 1. إرسال صورة بيبي ريست قطرات للرضع عبر الـ Webhook الحي
payload_1 = {
    "event": "message",
    "session": "default",
    "payload": {
        "id": "wamid.HBgLMjE4OTIzNDU4MDE0_BABYREST_1",
        "from": "120363422055627258@g.us",
        "hasMedia": True,
        "media": {
            "mimetype": "image/jpeg",
            "url": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=60"
        },
        "caption": "بيبي ريست قطرات للرضع 15 مل (Baby Rest Drops)",
        "body": "بيبي ريست قطرات للرضع 15 مل (Baby Rest Drops)",
        "pushName": "عبدالرحمن (صيدلية بيتك)",
        "_data": {
            "notifyName": "عبدالرحمن",
            "chat": {
                "name": "صيدلية بيتك"
            }
        }
    }
}

# 2. إرسال الصورة الثانية Baby Rest Oral Drops 15ml
payload_2 = {
    "event": "message",
    "session": "default",
    "payload": {
        "id": "wamid.HBgLMjE4OTIzNDU4MDE0_BABYREST_2",
        "from": "120363422055627258@g.us",
        "hasMedia": True,
        "media": {
            "mimetype": "image/jpeg",
            "url": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=60"
        },
        "caption": "BABY REST ORAL DROPS 15ml - مضاد للانتفاخ والغازات للرضع",
        "body": "BABY REST ORAL DROPS 15ml - مضاد للانتفاخ والغازات للرضع",
        "pushName": "عبدالرحمن (صيدلية بيتك)",
        "_data": {
            "notifyName": "عبدالرحمن",
            "chat": {
                "name": "صيدلية بيتك"
            }
        }
    }
}

for idx, p in enumerate([payload_1, payload_2], 1):
    req = urllib.request.Request(
        'http://102.203.201.52:3005/api/webhook/whatsapp/inbound',
        data=json.dumps(p, ensure_ascii=False).encode('utf-8'),
        headers={'Content-Type': 'application/json; charset=utf-8'}
    )
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        print(f"🟢 [استجابة إرسال صورة {idx}]:", res.get('message'))

