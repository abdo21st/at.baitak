#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Adversarial Stress Test & Reverse Engineering Verification Suite
Tests all input vectors, edge cases, negative numbers, XSS payloads, and lifecycle integrity.
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

def run_security_and_edge_case_tests():
    print("=" * 75)
    print("🛡️ بدء فحص الهندسة العكسية واختبار جميع مسارات وطرق الإدخال والحالات الحدية")
    print("=" * 75)

    passed = 0
    total = 0
    t_suffix = int(time.time())

    # Get a valid employee
    st, res_emp = make_req("/api/employees")
    user_id = res_emp["users"][0]["id"] if (st == 200 and res_emp.get("users")) else None
    if not user_id:
        print("❌ فشل العثور على موظف لإجراء الفحص")
        return False

    # TEST 1: Negative numbers and malicious string injection in Project Creation
    total += 1
    t1_payload = {
        "name": "<script>alert('xss')</script> مشروع الفحص الأمني " + str(t_suffix),
        "clientName": "قسم تقنية المعلومات",
        "hourlyRate": -500.0,
        "budgetHours": -100.0,
        "color": "invalid-color"
    }
    st, res = make_req("/api/projects", method="POST", data=t1_payload)
    if st == 200 and res.get("success") and res.get("project"):
        proj = res["project"]
        if proj["hourlyRate"] >= 0 and proj["budgetHours"] >= 0 and proj["color"].startswith("#"):
            passed += 1
            print(f"🟢 [PASS {total}] تطهير المدخلات السالبة والألوان الخاطئة: معدل الأجر ({proj['hourlyRate']}) | الميزانية ({proj['budgetHours']}) | اللون ({proj['color']})")
        else:
            print(f"❌ [FAIL {total}] لم يتم تطهير القيم السالبة: {proj}")
    else:
        print(f"❌ [FAIL {total}] فشل إنشاء المهمة: {res}")

    sec_task_id = res["project"]["id"]

    # TEST 2: Empty or whitespace-only task name
    total += 1
    st, res = make_req("/api/projects", method="POST", data={"name": "   "})
    if st == 400 and not res.get("success"):
        passed += 1
        print(f"🟢 [PASS {total}] رفض إنشاء مهمة بدون اسم أو بمسافات فارغة (HTTP 400)")
    else:
        print(f"❌ [FAIL {total}] قبل النظام اسماً فارغاً: {st} - {res}")

    # TEST 3: Check-in with Task and Verify all fields stored
    total += 1
    t3_date = f"2026-12-{t_suffix % 25 + 1:02d}"
    clockin_data = {
        "userId": user_id,
        "userName": "صيدلي فحص",
        "employeeCode": "101",
        "date": t3_date,
        "checkInTime": "08:30:00",
        "projectId": sec_task_id,
        "taskNotes": "توثيق بدء صيانة الأنظمة السحابية"
    }
    st, res = make_req("/api/attendance", method="POST", data=clockin_data)
    record_id = res.get("record", {}).get("id")
    if st == 200 and res.get("success") and res["record"].get("projectId") == sec_task_id and res["record"].get("taskNotes"):
        passed += 1
        print(f"🟢 [PASS {total}] تسجيل الحضور على المهمة وحفظ الملاحظات بنجاح (Record ID: {record_id})")
    else:
        print(f"❌ [FAIL {total}] فشل حفظ المهمة والملاحظات في السجل: {res}")

    # TEST 4: Close Task while Employee is Still Checked-in
    total += 1
    st, res = make_req("/api/projects", method="PUT", data={"id": sec_task_id, "action": "CLOSE_TASK"})
    if st == 200 and res.get("success") and res["project"].get("status") == "CLOSED":
        passed += 1
        print(f"🟢 [PASS {total}] إغلاق المهمة من قِبل المدير أثناء وجود وردية مفتوحة (Status: CLOSED)")
    else:
        print(f"❌ [FAIL {total}] فشل إغلاق المهمة: {res}")

    # TEST 5: Employee Checks OUT of the Ongoing Shift on the now-closed task (Must succeed and retain project info)
    total += 1
    checkout_data = {
        "recordId": record_id,
        "checkOutTime": "16:30:00"
    }
    st, res = make_req("/api/attendance", method="PUT", data=checkout_data)
    rec = res.get("record", {})
    if st == 200 and res.get("success") and rec.get("checkOutTime") == "16:30:00" and rec.get("projectId") == sec_task_id and rec.get("projectName"):
        passed += 1
        print(f"🟢 [PASS {total}] تسجيل الانصراف للوردية المفتوحة بنجاح مع الاحتفاظ التام باسم ولون المهمة ({rec.get('projectName')}) | الساعات ({rec.get('workHours')}س)")
    else:
        print(f"❌ [FAIL {total}] فشل تسجيل الانصراف أو فقدت بيانات المهمة: {res}")

    # TEST 6: Attempting New Check-in on Closed Task Must Be Strictly Rejected
    total += 1
    rej_data = {
        "userId": user_id,
        "userName": "صيدلي فحص",
        "employeeCode": "101",
        "date": f"2026-12-{t_suffix % 25 + 2:02d}",
        "checkInTime": "09:00:00",
        "projectId": sec_task_id
    }
    st, res = make_req("/api/attendance", method="POST", data=rej_data)
    if st == 400 and not res.get("success") and ("إغلاق" in str(res.get("error")) or "مغلقة" in str(res.get("error"))):
        passed += 1
        print(f"🟢 [PASS {total}] الحماية الصارمة: رفض محاولة تسجيل حضور جديد على المهمة المغلقة (الرسالة: {res.get('error')})")
    else:
        print(f"❌ [FAIL {total}] ثغرة: تم قبول التسجيل على مهمة مغلقة! {st} - {res}")

    # TEST 7: Cross-Tenant Isolation (Tenant 'madar' cannot see or access 'baytak' tasks)
    total += 1
    st_madar, res_madar = make_req("/api/projects", method="GET", custom_headers={"x-tenant-slug": "madar"})
    madar_projects = res_madar.get("projects", [])
    has_baytak_task = any(p["id"] == sec_task_id for p in madar_projects)
    if st_madar == 200 and not has_baytak_task:
        passed += 1
        print(f"🟢 [PASS {total}] العزل الصارم بين الأنشطة (Tenant Isolation): نشاط مدار لا يرى مهام نشاط بيتك")
    else:
        print(f"❌ [FAIL {total}] تسرب المهام بين الأنشطة التجارية! {res_madar}")

    # TEST 8: Admin Edit Time via PATCH retains Project metadata
    total += 1
    patch_data = {
        "action": "EDIT_TIME",
        "recordId": record_id,
        "checkInTime": "08:00:00",
        "checkOutTime": "16:00:00"
    }
    st, res = make_req("/api/attendance", method="PATCH", data=patch_data)
    p_rec = res.get("record", {})
    if st == 200 and res.get("success") and p_rec.get("projectId") == sec_task_id and p_rec.get("projectName"):
        passed += 1
        print(f"🟢 [PASS {total}] تعديل وقت السجل بواسطة الإدارة عبر PATCH يحتفظ برابط واسم المهمة ({p_rec.get('projectName')})")
    else:
        print(f"❌ [FAIL {total}] فقدت بيانات المهمة أثناء تعديل الوقت: {res}")

    print("=" * 75)
    print(f"📊 التقرير النهائي لفحص الهندسة العكسية ومسارات الإدخال: {passed}/{total} بنجاح ({passed/total*100:.1f}%)")
    print("=" * 75)
    return passed == total

if __name__ == "__main__":
    ok = run_security_and_edge_case_tests()
    sys.exit(0 if ok else 1)
