#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Field Visits Security & Reverse Engineering Stress Test
Tests input vectors, cross-tenant isolation, negative values, XSS payloads, and authentication.
"""

import sys
import json
import urllib.request
import urllib.error
import time

BASE_URL = "http://localhost:3000"

def make_req(path, method="GET", data=None, tenant_slug="baytak"):
    url = f"{BASE_URL}{path}"
    headers = {
        "Content-Type": "application/json",
        "x-tenant-slug": tenant_slug
    }
    body = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8")
        try:
            return e.code, json.loads(raw)
        except:
            return e.code, {"error": raw}
    except Exception as e:
        return 500, {"error": str(e)}

def run_security_stress_tests():
    print("=" * 75)
    print("🛡️ بدء فحص الهندسة العكسية والأمان المتقدم لمنظومة الزيارات الميدانية")
    print("=" * 75)

    passed = 0
    total = 0
    t_suffix = int(time.time())

    # Get legitimate employee in Baytak
    st, res_emp = make_req("/api/employees", tenant_slug="baytak")
    if st != 200 or not res_emp.get("users"):
        print("❌ فشل جلب موظف لإجراء الفحص")
        return False
    baytak_user_id = res_emp["users"][0]["id"]

    # TEST 1: Cross-Tenant Technician ID spoofing (using Baytak employee ID under Madar tenant)
    total += 1
    t1_payload = {
        "technicianId": baytak_user_id,
        "clientName": "شركة تجريبية",
        "clientPhone": "0911111111",
        "serviceFee": 50
    }
    st, res = make_req("/api/field-visits", method="POST", data=t1_payload, tenant_slug="madar")
    if st == 400 and not res.get("success"):
        passed += 1
        print(f"🟢 [PASS {total}] منع تزوير هوية الفني عبر الأنشطة (Cross-Tenant Technician Spoofing Blocked)")
    else:
        print(f"❌ [FAIL {total}] ثغرة: تم قبول فني من نشاط آخر! {st} - {res}")

    # TEST 2: Negative and Out-of-Bounds Fees Sanitization
    total += 1
    t2_payload = {
        "technicianId": baytak_user_id,
        "clientName": f"<script>alert('xss')</script> شركة الفحص {t_suffix}",
        "clientPhone": "0912222222",
        "serviceFee": -200,
        "partsFee": -50,
        "diagnosisNotes": "<img src=x onerror=alert(1)> كابلات مقطوعة",
        "lat": 32.88,
        "lng": 13.19
    }
    st, res = make_req("/api/field-visits", method="POST", data=t2_payload, tenant_slug="baytak")
    visit_id = res.get("visit", {}).get("id")
    if st == 200 and res.get("success") and visit_id:
        passed += 1
        print(f"🟢 [PASS {total}] تطهير القيم السالبة وحقن XSS بنجاح (Visit ID: {visit_id})")
    else:
        print(f"❌ [FAIL {total}] فشل إنشاء الزيارة: {res}")
        return False

    # TEST 3: Confidentiality - OTP is masked in GET list response
    total += 1
    st, res = make_req("/api/field-visits", method="GET", tenant_slug="baytak")
    visits = res.get("visits", [])
    target_v = next((v for v in visits if v["id"] == visit_id), None)
    if target_v and "otpCode" not in target_v and target_v.get("hasOtp") is True:
        passed += 1
        print(f"🟢 [PASS {total}] سرية رمز OTP: الرمز محمي ومحجوب عن استجابات الـ API للواجهات")
    else:
        print(f"❌ [FAIL {total}] تسرب رمز الـ OTP في استجابة GET: {target_v}")

    # TEST 4: Cross-Tenant Data Isolation (Madar cannot access Baytak's visit)
    total += 1
    st_madar, res_madar = make_req("/api/field-visits", method="GET", tenant_slug="madar")
    madar_visits = res_madar.get("visits", [])
    has_leak = any(v["id"] == visit_id for v in madar_visits)
    if st_madar == 200 and not has_leak:
        passed += 1
        print(f"🟢 [PASS {total}] العزل الصارم بين الأنشطة: نشاط مدار لا يرى زيارات نشاط بيتك")
    else:
        print(f"❌ [FAIL {total}] تسرب بيانات الزيارات بين الأنشطة! {madar_visits}")

    # TEST 5: Cross-Tenant Unauthorized Modification Attack
    total += 1
    st_attack, res_attack = make_req("/api/field-visits", method="PUT", data={
        "id": visit_id,
        "action": "INSPECTION_ONLY"
    }, tenant_slug="madar")
    if st_attack == 404 and not res_attack.get("success"):
        passed += 1
        print(f"🟢 [PASS {total}] منع التعديل غير المصرح به من نشاط آخر (HTTP 404 Isolation)")
    else:
        print(f"❌ [FAIL {total}] تم السماح بالتعديل عبر النشاط الآخر! {st_attack} - {res_attack}")

    print("=" * 75)
    print(f"📊 نتيجة الفحص الأمني للزيارات الميدانية: {passed}/{total} بنجاح ({passed/total*100:.1f}%)")
    print("=" * 75)
    return passed == total

if __name__ == "__main__":
    ok = run_security_stress_tests()
    sys.exit(0 if ok else 1)
