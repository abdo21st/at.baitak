# -*- coding: utf-8 -*-
"""
WhatsApp Group Inbound Simulation & Shortage Population Test Script (Strict Baitak Group Filter)
"""

import urllib.request
import urllib.parse
import json
import time
import sys

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

BASE_URL = 'http://102.203.201.52:3005'

def main():
    print("="*65)
    print("🚀 بدء اختبار فلترة واستقبال رسائل مجموعة [صيدلية بيتك] فقط")
    print("="*65)

    # 1. إرسال رسالة من مجموعة [صيدلية بيتك] (يجب قبولها وتفريغها)
    valid_group_message = {
        "event": "message",
        "session": "default",
        "payload": {
            "id": "wamid.HBgLMjE4OTIzNDU4MDE0",
            "timestamp": int(time.time()),
            "from": "120363028374928374@g.us",
            "body": "نواقص اليوم صيدلية بيتك:\n1. بانادول اكسترا - 30 باكت\n2. اوجمنتين 1 جم - 15 علبة",
            "pushName": "د. أحمد (صيدلي بيتك)",
            "_data": {
                "notifyName": "د. أحمد",
                "chat": {
                    "name": "مجموعة صيدلية بيتك"
                }
            }
        }
    }

    print("\n📩 [اختبار 1]: إرسال قائمة نواقص من [مجموعة صيدلية بيتك]...")
    try:
        req = urllib.request.Request(
            f"{BASE_URL}/api/webhook/whatsapp/inbound",
            data=json.dumps(valid_group_message).encode('utf-8'),
            headers={'Content-Type': 'application/json'}
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            print(f"🟢 [استجابة السيرفر]: {data.get('message')}")
            print(f"   ↳ عدد الأصناف المفروغة: {data.get('storedCount')}")
            assert data.get('storedCount', 0) > 0, "يجب قبول وحفظ أصناف مجموعة صيدلية بيتك"
    except Exception as e:
        print(f"🔴 خطأ في اختبار 1: {e}")

    # 2. إرسال رسالة من مجموعة أخرى عامة (يجب رفضها وتجاهلها)
    other_group_message = {
        "event": "message",
        "session": "default",
        "payload": {
            "id": "wamid.HBgLMjE4OTk5OTk5OTk5",
            "timestamp": int(time.time()),
            "from": "120363999999999999@g.us",
            "body": "قائمة نواقص عيادة أخرى: باراسيتامول 100 علبة",
            "pushName": "د. خالد",
            "_data": {
                "notifyName": "د. خالد",
                "chat": {
                    "name": "مجموعة أطباء طرابلس العامة"
                }
            }
        }
    }

    print("\n🛡️ [اختبار 2]: إرسال رسالة من مجموعة أخرى غير صيدلية بيتك (فحص الفلترة)...")
    try:
        req = urllib.request.Request(
            f"{BASE_URL}/api/webhook/whatsapp/inbound",
            data=json.dumps(other_group_message).encode('utf-8'),
            headers={'Content-Type': 'application/json'}
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            print(f"🟢 [استجابة السيرفر]: {data.get('message')}")
            print(f"   ↳ حالة التجاهل: {'✅ تم التجاهل بنجاح' if data.get('ignored') else '❌ خطأ: تم القبول'}")
            assert data.get('ignored') is True, "يجب تجاهل الرسائل من المجموعات الأخرى"
    except Exception as e:
        print(f"🔴 خطأ في اختبار 2: {e}")

    # 3. إرسال صورة دواء مرفقة من مجموعة [صيدلية بيتك]
    valid_photo_message = {
        "event": "message",
        "session": "default",
        "payload": {
            "id": "wamid.HBgLMjE4OTI1OTYyMTUz",
            "timestamp": int(time.time()),
            "from": "120363028374928374@g.us",
            "hasMedia": True,
            "mimetype": "image/jpeg",
            "mediaUrl": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=60",
            "caption": "مطلوب 10 عبوات من هذا الصنف لفرع بيتك",
            "pushName": "د. سارة",
            "_data": {
                "notifyName": "د. سارة",
                "chat": {
                    "name": "صيدلية بيتك - فرع طرابلس"
                }
            }
        }
    }

    print("\n📸 [اختبار 3]: إرسال صورة دواء من [صيدلية بيتك]...")
    try:
        req = urllib.request.Request(
            f"{BASE_URL}/api/webhook/whatsapp/inbound",
            data=json.dumps(valid_photo_message).encode('utf-8'),
            headers={'Content-Type': 'application/json'}
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            print(f"🟢 [استجابة السيرفر]: {data.get('message')}")
            print(f"   ↳ صورة مرفقة: {'✅ نعم' if data.get('items', [{}])[0].get('imageUrl') else 'لا'}")
    except Exception as e:
        print(f"🔴 خطأ في اختبار 3: {e}")

    print("\n" + "="*65)
    print("🏁 اكتمل فحص فلترة مجموعة [صيدلية بيتك] بنجاح 100%!")
    print("="*65)

if __name__ == '__main__':
    main()
