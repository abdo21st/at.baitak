# -*- coding: utf-8 -*-
import urllib.request
import json
import sys

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

url = 'http://102.203.201.52:3005/api/pharmacy/whatsapp-shortages?status=ALL'
req = urllib.request.urlopen(url)
res = json.loads(req.read().decode('utf-8'))

print(f"🟢 إجمالي طلبات ونواقص الواتساب في السحابة: {res.get('counts', {}).get('total')}")
print(f"   قيد الانتظار: {res.get('counts', {}).get('pending')}")
print("-" * 50)
for r in res.get('requests', []):
    print(f"• الصنف: {r.get('productName')}")
    print(f"  الكمية: {r.get('requestedQty')} {r.get('unit')} | المجموعة: {r.get('groupName')}")
    print(f"  المرسل: {r.get('senderName')} | صورة مرفقة: {'✅ نعم' if r.get('imageUrl') else 'لا'}")
    print("-" * 50)
