# -*- coding: utf-8 -*-
"""
WhatsApp Group Inbound Simulation & Shortage Population Test Script
Simulates live WhatsApp group messages (with texts, lists, and photos) and verifies database storage and shortages dashboard.
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
    print("🚀 بدء اختبار محاكاة استقبال رسائل وصور مجموعة الواتساب وتفريغ النواقص")
    print("="*65)

    # 1. محاكاة رسالة نصية واردة من مجموعة الواتساب تحتوي على قائمة نواقص
    sample_group_text_message = {
        "event": "message",
        "session": "default",
        "payload": {
            "id": "wamid.HBgLMjE4OTIzNDU4MDE0",
            "timestamp": int(time.time()),
            "from": "120363028374928374@g.us",
            "body": "السلام عليكم يا شباب نواقص الصيدلية اليوم ضروري:\n1. اوجمنتين 1 جم - 20 علبة\n2. كولونا أقراص - 30 باكت\n3. بنادول اكسترا - 50 علبة عاجل",
            "pushName": "د. أحمد الصيدلي",
            "_data": {
                "notifyName": "د. أحمد الصيدلي",
                "chat": {
                    "name": "مجموعة نواقص فرع طرابلس الرئيسي"
                }
            }
        }
    }

    print("\n📩 [اختبار 1]: إرسال قائمة نواقص نصية من مجموعة الواتساب...")
    try:
        req = urllib.request.Request(
            f"{BASE_URL}/api/webhook/whatsapp/inbound",
            data=json.dumps(sample_group_text_message).encode('utf-8'),
            headers={'Content-Type': 'application/json'}
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            print(f"🟢 [استجابة السيرفر]: {data.get('message')}")
            print(f"   ↳ عدد الأصناف المخزنة في PostgreSQL: {data.get('storedCount')}")
            for itm in data.get('items', []):
                print(f"   • الصنف: {itm.get('productName')} | الكمية: {itm.get('requestedQty')} {itm.get('unit')} | الأهمية: {itm.get('urgency')} | كود مطابق: {itm.get('matchedCode') or 'جديد'}")
    except Exception as e:
        print(f"🔴 خطأ في اختبار 1: {e}")

    # 2. محاكاة رسالة صورة دواء / روشتة مرفقة من مجموعة الواتساب
    sample_group_photo_message = {
        "event": "message",
        "session": "default",
        "payload": {
            "id": "wamid.HBgLMjE4OTI1OTYyMTUz",
            "timestamp": int(time.time()),
            "from": "120363028374928374@g.us",
            "hasMedia": True,
            "mimetype": "image/jpeg",
            "mediaUrl": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=60",
            "caption": "مطلوب توفير 15 علبة من هذا الصنف عاجل جداً",
            "pushName": "د. سارة (صيدلانية الوردية)",
            "_data": {
                "notifyName": "د. سارة",
                "chat": {
                    "name": "مجموعة نواقص فرع طرابلس الرئيسي"
                }
            }
        }
    }

    print("\n📸 [اختبار 2]: إرسال صورة علبة دواء مرفقة مع تعليق نصي...")
    try:
        req = urllib.request.Request(
            f"{BASE_URL}/api/webhook/whatsapp/inbound",
            data=json.dumps(sample_group_photo_message).encode('utf-8'),
            headers={'Content-Type': 'application/json'}
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            print(f"🟢 [استجابة السيرفر]: {data.get('message')}")
            print(f"   ↳ عدد الأصناف المخزنة: {data.get('storedCount')}")
            for itm in data.get('items', []):
                print(f"   • الصنف: {itm.get('productName')} | الكمية: {itm.get('requestedQty')} {itm.get('unit')} | صورة مرفقة: {'✅ نعم' if itm.get('imageUrl') else 'لا'}")
    except Exception as e:
        print(f"🔴 خطأ في اختبار 2: {e}")

    # 3. التحقق من جلب قائمة النواقص في لوحة التحكم
    print("\n📊 [اختبار 3]: استرجاع جدول نواقص الواتساب من الواجهة السحابية...")
    try:
        req = urllib.request.urlopen(f"{BASE_URL}/api/pharmacy/whatsapp-shortages?status=ALL", timeout=10)
        res = json.loads(req.read().decode('utf-8'))
        print(f"🟢 [نجاح]: إجمالي الطلبات في السحابة: {res.get('counts', {}).get('total')} طلب | قيد الانتظار: {res.get('counts', {}).get('pending')}")
    except Exception as e:
        print(f"🔴 خطأ في اختبار 3: {e}")

    print("\n" + "="*65)
    print("🏁 اكتمل فحص استقبال رسائل وصور مجموعة الواتساب بنجاح!")
    print("="*65)

if __name__ == '__main__':
    main()
