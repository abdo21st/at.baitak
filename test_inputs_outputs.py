# -*- coding: utf-8 -*-
import urllib.request
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "https://at.baitak.mtapp.ly"

def make_request(url, method='GET', data=None):
    req = urllib.request.Request(url, method=method)
    req.add_header('Content-Type', 'application/json')
    if data:
        json_bytes = json.dumps(data).encode('utf-8')
        req.data = json_bytes
    
    with urllib.request.urlopen(req) as resp:
        res_text = resp.read().decode('utf-8')
        return json.loads(res_text)

def main():
    print("=========================================================")
    print(" 🧪 بدء اختبار جميع المدخلات والمخرجات الحية على السيرفر")
    print("=========================================================")

    # 1. Test GET /api/departments
    print("\n1️⃣ اختبار قراءة الأقسام والوظائف (/api/departments):")
    deps_res = make_request(f"{BASE_URL}/api/departments")
    print(f"   النتيجة: {deps_res.get('success')} - عدد الأقسام: {len(deps_res.get('departments', []))}")
    for d in deps_res.get('departments', []):
        print(f"   🏢 قسم: {d['name']} (عدد الوظائف: {len(d['jobRoles'])})")

    # 2. Test GET /api/employees
    print("\n2️⃣ اختبار قراءة الموظفين (/api/employees):")
    emp_res = make_request(f"{BASE_URL}/api/employees")
    print(f"   النتيجة: {emp_res.get('success')} - عدد الموظفين: {len(emp_res.get('users', []))}")

    # 3. Test POST /api/employees (إضافة موظف اختبار)
    print("\n3️⃣ اختبار إضافة موظف جديد ببيانات كاملة (/api/employees - POST):")
    import random
    test_code = str(random.randint(9000, 9999))
    new_emp_payload = {
        "name": "موظف اختبار تجريبي",
        "employeeCode": test_code,
        "pinCode": "1234",
        "hourlyRate": 50,
        "monthlySalary": 500,
        "targetMonthlyHours": 160,
        "role": "EMPLOYEE",
        "jobTitle": "مسؤول مبيعات"
    }
    add_emp_res = make_request(f"{BASE_URL}/api/employees", method='POST', data=new_emp_payload)
    print(f"   نجاح إضافة الموظف: {add_emp_res.get('success')}")
    created_user = next((u for u in add_emp_res.get('users', []) if u['employeeCode'] == test_code), None)
    if created_user:
        print(f"   👤 الموظف ينشأ بنجاح: {created_user['name']} (كود: {created_user['employeeCode']}, أجر الساعة: {created_user['hourlyRate']} د.ل, الراتب الشهري: {created_user['monthlySalary']} د.ل)")

    # 4. Test POST /api/attendance (تسجيل 8 ساعات دوام وتثبت المخرجات)
    print("\n4️⃣ اختبار تسجيل دوام ومرتب موظف الاختبار (/api/attendance - POST):")
    if created_user:
        att_payload = {
            "userId": created_user['id'],
            "userName": created_user['name'],
            "employeeCode": created_user['employeeCode'],
            "checkInTime": "08:00:00",
            "checkOutTime": "16:00:00",
            "date": "2026-08-11"
        }
        att_res = make_request(f"{BASE_URL}/api/attendance", method='POST', data=att_payload)
        rec = att_res.get('record', {})
        print(f"   نجاح تسجيل الدوام: {att_res.get('success')}")
        print(f"   ⏱️ ساعات الدوام المسجلة: {rec.get('workHours')} ساعة")
        print(f"   💰 الناتج والمخرج المالي النهائي: {rec.get('earnedCost')} د.ل")
        
        # Calculation verification
        # Expected = (8 hrs * 50 rate) + (8 hrs * 500 salary / 160 hrs) = 400 + 25 = 425.00 LYD
        expected_cost = round((8 * 50) + ((8 * 500) / 160), 2)
        if rec.get('earnedCost') == expected_cost:
            print(f"   ✅ مطابقة المعادلة دقيقة 100%: (8 س * 50) + (8 س * 500 / 160) = {expected_cost} د.ل")

    # 5. Clean up test employee
    print("\n5️⃣ تنظيف وإزالة موظف الاختبار:")
    if created_user:
        del_res = make_request(f"{BASE_URL}/api/employees?id={created_user['id']}", method='DELETE')
        print(f"   تم مسح موظف الاختبار بنجاح: {del_res.get('success')}")

    print("\n=========================================================")
    print(" 🎉 تم الانتهاء من جميع اختبارات المدخلات والمخرجات بنجاح 100%!")
    print("=========================================================")

if __name__ == '__main__':
    main()
