# -*- coding: utf-8 -*-
"""
WhatsApp and n8n Messaging Gateway Test Script
"""

import urllib.request
import urllib.parse
import json
import time
import sys

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

def test_endpoint(name, url, payload):
    print(f"\nTesting: {name}")
    print(f"URL: {url}")
    try:
        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'}, method='POST')
        start = time.time()
        with urllib.request.urlopen(req, timeout=6) as resp:
            ms = int((time.time() - start) * 1000)
            res_str = resp.read().decode('utf-8')
            print(f"🟢 [SUCCESS] HTTP {resp.getcode()} ({ms}ms)")
            print(f"Response: {res_str[:300]}")
            return True
    except urllib.error.HTTPError as e:
        err_str = e.read().decode('utf-8', errors='ignore')
        print(f"🟡 [HTTP {e.code}]: {err_str[:300]}")
        return False
    except Exception as e:
        print(f"🔴 [CONNECTION ERROR]: {e}")
        return False

def main():
    print("="*60)
    print("🧪 فحص واختبار قنوات إرسال رسائل الواتساب و Webhook")
    print("="*60)

    # 1. فحص بوابة WAHA المباشرة
    test_endpoint(
        "1. بوابة WAHA المباشرة (WhatsApp HTTP API)",
        "http://102.203.201.52:3008/api/sendText",
        {
            "session": "default",
            "chatId": "218910000000@c.us",
            "text": "تجربة اتصال بنظام واتساب"
        }
    )

    # 2. فحص webhook الخاص بـ n8n
    test_endpoint(
        "2. مسار n8n Webhook التلقائي",
        "http://102.203.201.52:5678/webhook/attendance-alert",
        {
            "event": "test_alert",
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "message": "رسالة تجريبية من نظام حضورك"
        }
    )

    # 3. فحص API البث والرسائل الجماعية في التطبيق
    test_endpoint(
        "3. نقطة نهاية البث والإشعار الجماعي (/api/broadcast)",
        "http://102.203.201.52:3005/api/broadcast",
        {
            "targetType": "all",
            "message": "مرحباً بكم، هذه رسالة تجريبية لاختبار منظومة الإشعارات والواتساب."
        }
    )

    print("\n" + "="*60)
    print("🏁 انتهى فحص بوابات الواتساب")
    print("="*60)

if __name__ == '__main__':
    main()
