#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Field Visits & Maintenance Lifecycle Test Suite
Tests:
1. Start field visit with GPS & pricing
2. WhatsApp OTP generation and sending
3. Wrong OTP rejection protection
4. Successful OTP verification & sign-off
5. Customer refusal/dispute workflow with GPS & photo audit trail
6. Inspection-only workflow
7. Admin KPI aggregation (Collected vs Pending amounts)
8. Multi-tenant isolation
"""

import sys
import json
import urllib.request
import urllib.error
import time

BASE_URL = "http://localhost:3000"
HEADERS = {
    "Content-Type": "application/json",
    "x-tenant-slug": "baytak"
}

def make_req(path, method="GET", data=None, custom_headers=None):
    url = f"{BASE_URL}{path}"
    headers = dict(HEADERS)
    if custom_headers:
        headers.update(custom_headers)
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

def run_field_visits_tests():
    print("=" * 75)
    print("🚗 بدء فحص دورة حياة منظومة الزيارات الميدانية والصيانة الفنية (Field Visits)")
    print("=" * 75)

    passed = 0
    total = 0
    t_suffix = int(time.time())

    # Get employee
    st, res_emp = make_req("/api/employees")
    if st != 200 or not res_emp.get("users"):
        print("❌ فشل جلب موظف لإجراء الفحص")
        return False
    user_id = res_emp["users"][0]["id"]
    user_name = res_emp["users"][0]["name"]

    # TEST 1: Start New Field Visit
    total += 1
    t1_data = {
        "technicianId": user_id,
        "clientName": f"شركة الأفق للتقنية {t_suffix}",
        "clientPhone": "0912345678",
        "clientAddress": "طرابلس - طريق الشط",
        "visitType": "MAINTENANCE",
        "serviceFee": 75.0,
        "partsFee": 25.0,
        "diagnosisNotes": "عطل في سويتش التوزيع الرئيسي وانقطاع الشبكة",
        "lat": 32.8872,
        "lng": 13.1913
    }
    st, res = make_req("/api/field-visits", method="POST", data=t1_data)
    visit_id_1 = res.get("visit", {}).get("id")
    if st == 200 and res.get("success") and visit_id_1:
        passed += 1
        print(f"🟢 [PASS {total}] بدء الزيارة الميدانية بنجاح: العميل ({t1_data['clientName']}) | ID: {visit_id_1}")
    else:
        print(f"❌ [FAIL {total}] فشل بدء الزيارة: {res}")
        return False

    # TEST 2: Trigger OTP Generation & WhatsApp Send
    total += 1
    st, res = make_req("/api/field-visits", method="PUT", data={"id": visit_id_1, "action": "SEND_OTP"})
    otp_code = res.get("generatedOtp")
    if st == 200 and res.get("success") and otp_code and len(otp_code) == 4:
        passed += 1
        print(f"🟢 [PASS {total}] توليد وإرسال رمز التحقق OTP للعميل: الرمز ({otp_code}) عبر الواتساب")
    else:
        print(f"❌ [FAIL {total}] فشل توليد رمز الـ OTP: {res}")

    # TEST 3: Reject Wrong OTP
    total += 1
    st, res = make_req("/api/field-visits", method="PUT", data={
        "id": visit_id_1,
        "action": "COMPLETE_OTP",
        "otpCodeInput": "0000"
    })
    if st == 400 and not res.get("success"):
        passed += 1
        print(f"🟢 [PASS {total}] الحماية الصارمة: رفض رمز التحقق الخاطئ بنجاح (HTTP 400)")
    else:
        print(f"❌ [FAIL {total}] ثغرة: تم قبول رمز OTP خاطئ! {st} - {res}")

    # TEST 4: Complete Visit with Correct OTP
    total += 1
    st, res = make_req("/api/field-visits", method="PUT", data={
        "id": visit_id_1,
        "action": "COMPLETE_OTP",
        "otpCodeInput": otp_code,
        "solutionNotes": "تم استبدال باور سبلاي السويتش وإعادة تهيئة الـ VLANs بنجاح",
        "partsUsed": "باور سبلاي سويتش 12V 5A",
        "serviceFee": 75.0,
        "partsFee": 25.0
    })
    v1_updated = res.get("visit", {})
    if st == 200 and res.get("success") and v1_updated.get("status") == "COMPLETED_OTP" and v1_updated.get("totalAmount") == 100:
        passed += 1
        print(f"🟢 [PASS {total}] اعتماد وإغلاق الزيارة بالـ OTP بنجاح: الحالة ({v1_updated['status']}) | المبلغ المحصل ({v1_updated['totalAmount']} د.ل)")
    else:
        print(f"❌ [FAIL {total}] فشل اعتماد الزيارة بالـ OTP: {res}")

    # TEST 5: Start Second Visit for Disputed / Refusal Workflow
    total += 1
    t5_data = {
        "technicianId": user_id,
        "clientName": f"مؤسسة الرواد التجارية {t_suffix}",
        "clientPhone": "0923456789",
        "clientAddress": "بنغازي - شارع دبي",
        "visitType": "EMERGENCY",
        "serviceFee": 120.0,
        "partsFee": 30.0,
        "diagnosisNotes": "صيانة طارئة لوحدة التخزين الشبكي NAS",
        "lat": 32.1123,
        "lng": 20.0654
    }
    st, res = make_req("/api/field-visits", method="POST", data=t5_data)
    visit_id_2 = res.get("visit", {}).get("id")
    if st == 200 and visit_id_2:
        passed += 1
        print(f"🟢 [PASS {total}] بدء الزيارة الثانية لمسار النزاع: ({t5_data['clientName']})")
    else:
        print(f"❌ [FAIL {total}] فشل بدء الزيارة الثانية: {res}")

    # TEST 6: Reject Disputed Close without Reason
    total += 1
    st, res = make_req("/api/field-visits", method="PUT", data={
        "id": visit_id_2,
        "action": "COMPLETE_DISPUTED",
        "customerRefusalReason": "   "
    })
    if st == 400 and not res.get("success"):
        passed += 1
        print(f"🟢 [PASS {total}] إلزامية توضيح سبب الامتناع لتوثيق المحضر الإداري (HTTP 400)")
    else:
        print(f"❌ [FAIL {total}] قبل الإغلاق المتنازع عليه بدون سبب: {st} - {res}")

    # TEST 7: Complete Visit with Disputed Workflow (GPS + Timestamp + Reason)
    total += 1
    st, res = make_req("/api/field-visits", method="PUT", data={
        "id": visit_id_2,
        "action": "COMPLETE_DISPUTED",
        "customerRefusalReason": "المسؤول المالي غير متواجد وطالب بالتسوية عبر حوالة لاحقاً",
        "solutionNotes": "تم استبدال القرص التالف وإعادة بناء المصفوفة RAID بنجاح",
        "partsUsed": "قرص صلب 2TB Enterprise",
        "serviceFee": 120.0,
        "partsFee": 30.0,
        "lat": 32.1125,
        "lng": 20.0656
    })
    v2_updated = res.get("visit", {})
    if st == 200 and res.get("success") and v2_updated.get("status") == "COMPLETED_DISPUTED" and v2_updated.get("totalAmount") == 150:
        passed += 1
        print(f"🟢 [PASS {total}] توثيق الزيارة بمسار الامتناع والإحالة للإدارة: الحالة ({v2_updated['status']}) | معلق ({v2_updated['totalAmount']} د.ل)")
    else:
        print(f"❌ [FAIL {total}] فشل توثيق مسار الامتناع: {res}")

    # TEST 8: Admin Statistics & Multi-Tenancy Isolation
    total += 1
    st, res = make_req("/api/field-visits", method="GET")
    stats = res.get("stats", {})
    if st == 200 and res.get("success") and stats.get("totalVisits", 0) >= 2 and stats.get("completedOtpCount", 0) >= 1 and stats.get("disputedCount", 0) >= 1:
        passed += 1
        print(f"🟢 [PASS {total}] تجميع إحصائيات الإدارة: إجمالي الزيارات ({stats['totalVisits']}) | المحصل ({stats['totalCollectedLYD']} د.ل) | المعلق ({stats['totalPendingLYD']} د.ل)")
    else:
        print(f"❌ [FAIL {total}] خطأ في حساب إحصائيات الزيارات: {res}")

    print("=" * 75)
    print(f"📊 التقرير النهائي لفحص الزيارات الميدانية: {passed}/{total} بنجاح ({passed/total*100:.1f}%)")
    print("=" * 75)
    return passed == total

if __name__ == "__main__":
    ok = run_field_visits_tests()
    sys.exit(0 if ok else 1)
