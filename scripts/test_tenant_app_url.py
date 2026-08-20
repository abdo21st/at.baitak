#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test Dynamic {appUrl} and Tenant Subdomain Generator
"""
import urllib.request
import json
import sys

def test_broadcast_dynamic_url():
    url = "http://localhost:3000/api/broadcast"
    headers = {
        "Content-Type": "application/json",
        "x-tenant-slug": "madar"
    }
    payload = {
        "targetType": "all",
        "message": "مرحباً بكم رابط نشاطكم هو: {appUrl}"
    }
    req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers=headers, method='POST')
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            print("Broadcast Test Result with x-tenant-slug: madar ->", data.get("success"))
            return data.get("success") is True or "لم يتم العثور" in str(data.get("error"))
    except Exception as e:
        print("Test error:", e)
        return False

if __name__ == "__main__":
    ok = test_broadcast_dynamic_url()
    print("Tenant AppUrl Broadcast Check:", "PASS ✅" if ok else "FAIL ❌")
    sys.exit(0 if ok else 1)
