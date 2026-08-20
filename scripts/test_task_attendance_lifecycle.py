#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Verification Script for Task / Project-Based Attendance System Lifecycle
Tests:
1. Create Open Task via API
2. Fetch Open Tasks for Employee Dropdown
3. Clock In Employee on Task
4. Close Task by Admin
5. Prevent Check-In on Closed Task (Strict Enforcement)
6. Ensure Closed Task remains in Accounting & History
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

def make_request(path, method="GET", data=None):
    url = f"{BASE_URL}{path}"
    body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=body, headers=HEADERS, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            res_body = response.read().decode("utf-8")
            return response.status, json.loads(res_body)
    except urllib.error.HTTPError as e:
        res_body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(res_body)
        except:
            return e.code, {"error": res_body}
    except Exception as e:
        return 500, {"error": str(e)}

def run_tests():
    print("=" * 70)
    print("🚀 بدء فحص دورة حياة نظام الحضور والانصراف بحسب المهام والمشاريع")
    print("=" * 70)
    
    passed_tests = 0
    total_tests = 6
    unique_suffix = int(time.time())

    # 1. Create a New Task
    task_payload = {
        "name": f"مهمة تركيب السيرفر السحابي {unique_suffix}",
        "clientName": "الإدارة الفنية",
        "hourlyRate": 25.0,
        "budgetHours": 10.0,
        "description": "تهيئة واختبار قواعد البيانات السحابية لفرع طرابلس",
        "color": "#0284c7"
    }
    status, res = make_request("/api/projects", method="POST", data=task_payload)
    if status == 200 and res.get("success") and res.get("project"):
        task_id = res["project"]["id"]
        print(f"🟢 [PASS 1/6] إنشاء مهمة جديدة بنجاح: {res['project']['name']} (ID: {task_id})")
        passed_tests += 1
    else:
        print(f"❌ [FAIL 1/6] فشل إنشاء المهمة: {res}")
        return False

    # 2. Verify Open Tasks for Employee Dropdown
    status, res = make_request("/api/projects?status=OPEN", method="GET")
    open_tasks = res.get("projects", [])
    found_task = next((t for t in open_tasks if t["id"] == task_id), None)
    if status == 200 and found_task and found_task["status"] == "OPEN":
        print(f"🟢 [PASS 2/6] استعلام المهام المفتوحة للموظف: المهمة موجودة وحالتها OPEN بنجاح")
        passed_tests += 1
    else:
        print(f"❌ [FAIL 2/6] لم تظهر المهمة المفتوحة في استعلام الموظفين: {res}")

    # 3. Clock in an Employee on this Task
    # First get an employee ID
    status_emp, res_emp = make_request("/api/employees", method="GET")
    user_id = res_emp["users"][0]["id"] if (status_emp == 200 and res_emp.get("users")) else None
    
    if not user_id:
        print("❌ [FAIL 3/6] لا يوجد موظف للاختبار")
        return False

    test_date = f"2026-11-{unique_suffix % 28 + 1:02d}"
    clockin_payload = {
        "userId": user_id,
        "userName": "صيدلي تجريبي",
        "employeeCode": "101",
        "date": test_date,
        "checkInTime": "09:00:00",
        "checkOutTime": "13:00:00",
        "projectId": task_id,
        "taskNotes": "تم البدء في تثبيت إعدادات السيرفر وإتمام الشفت بنجاح"
    }
    status, res = make_request("/api/attendance", method="POST", data=clockin_payload)
    if status == 200 and res.get("success") and res["record"].get("projectId") == task_id:
        record_id = res["record"]["id"]
        print(f"🟢 [PASS 3/6] تسجيل حضور وانصراف الموظف على المهمة بنجاح: {res['record'].get('projectName')} | ساعات: {res['record'].get('workHours')}س")
        passed_tests += 1
    else:
        print(f"❌ [FAIL 3/6] فشل تسجيل الحضور على المهمة: {res}")

    # 4. Admin Closes the Task
    close_payload = {
        "id": task_id,
        "action": "CLOSE_TASK"
    }
    status, res = make_request("/api/projects", method="PUT", data=close_payload)
    if status == 200 and res.get("success") and res["project"].get("status") == "CLOSED":
        print(f"🟢 [PASS 4/6] إغلاق المهمة من قِبل المدير بنجاح (Status: CLOSED)")
        passed_tests += 1
    else:
        print(f"❌ [FAIL 4/6] فشل إغلاق المهمة: {res}")

    # 5. Verify Employee CANNOT Clock In on Closed Task
    closed_clockin_payload = {
        "userId": user_id,
        "userName": "صيدلي تجريبي",
        "employeeCode": "101",
        "date": test_date,
        "checkInTime": "15:00:00",
        "projectId": task_id,
        "taskNotes": "محاولة تسجيل على مهمة مغلقة"
    }
    status, res = make_request("/api/attendance", method="POST", data=closed_clockin_payload)
    err_text = str(res.get("error", ""))
    if status == 400 and not res.get("success") and ("إغلاق" in err_text or "مغلقة" in err_text):
        print(f"🟢 [PASS 5/6] المنع الصارم لتسجيل الحضور على المهمة المغلقة: تم رفض التسجيل بنجاح (الرسالة: {err_text})")
        passed_tests += 1
    else:
        print(f"❌ [FAIL 5/6] سمح النظام بتسجيل الحضور على مهمة مغلقة خلافاً للمطلوب: {status} - {res}")

    # 6. Verify Closed Task remains in Admin Records and History
    status, res = make_request("/api/projects", method="GET")
    all_projects = res.get("projects", [])
    closed_task_in_admin = next((t for t in all_projects if t["id"] == task_id), None)
    if status == 200 and closed_task_in_admin and closed_task_in_admin["status"] == "CLOSED":
        print(f"🟢 [PASS 6/6] بقاء المهمة المغلقة في سجلات وتقارير المدير: ساعات العمل ({closed_task_in_admin.get('totalHours', 0)}) | التكلفة ({closed_task_in_admin.get('totalCost', 0)} د.ل) | الحالة ({closed_task_in_admin['status']})")
        passed_tests += 1
    else:
        print(f"❌ [FAIL 6/6] لم تظهر المهمة المغلقة في تقارير الإدارة: {res}")

    print("=" * 70)
    print(f"📊 نتيجة الفحص النهائي لنظام المهام: {passed_tests}/{total_tests} بنجاح ({passed_tests/total_tests*100:.1f}%)")
    print("=" * 70)
    return passed_tests == total_tests

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
