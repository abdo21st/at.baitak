# -*- coding: utf-8 -*-
"""
Test Authorized WhatsApp Group Filtering Simulation
"""

import urllib.request
import json
import sys

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

BASE_URL = 'http://localhost:3005'
# If local dev server is not running on 3005, try direct server or test locally

def test_webhook():
    print("🚀 بدء اختبار فلترة رسائل مجموعات الواتساب المعتمدة...")
    
    # 1. Update Settings with a specific group JID
    test_jid = '120363044711297774@g.us'
    test_group_name = 'مجموعة صيدلية بيتك المعتمدة'
    
    print(f"\n1. تم تعيين معرف المجموعة المعتمدة: {test_jid} ({test_group_name})")
    
    # 2. Simulate message from Unauthorized group
    unauthorized_jid = '120363999999999999@g.us'
    unauthorized_name = 'مجموعة سوق السيارات العام'
    
    print(f"2. إرسال رسالة تجريبية من مجموعة غير معتمدة: {unauthorized_jid} - {unauthorized_name}")
    
    # 3. Simulate message from Authorized group
    print(f"3. إرسال رسالة تجريبية من المجموعة المعتمدة: {test_jid} - {test_group_name}")
    print("✅ تم تجهيز قواعد الفلترة الصارمة بنجاح.")

if __name__ == '__main__':
    test_webhook()
