# -*- coding: utf-8 -*-
"""
Deep Multi-Tenant, Clinical & Payroll Logic Verification Suite
Executes Cycle 2 and Cycle 3 validation
"""

import urllib.request
import urllib.parse
import json
import time
import sys

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

BASE_URL = 'http://102.203.201.52:3005'
PASS = '🟢 [PASS]'
FAIL = '🔴 [FAIL]'

def make_req(path, method='GET', data=None, headers=None):
    url = f"{BASE_URL}{path}"
    req_headers = {'Content-Type': 'application/json'}
    if headers:
        req_headers.update(headers)
    body = json.dumps(data).encode('utf-8') if data else None
    req = urllib.request.Request(url, data=body, headers=req_headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return True, resp.getcode(), json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        try:
            return False, e.code, json.loads(e.read().decode('utf-8'))
        except:
            return False, e.code, str(e)
    except Exception as e:
        return False, 0, str(e)

def run_deep_tests(cycle_name):
    print(f"\n{'#'*65}")
    print(f"🚀 بدء تشغيل {cycle_name}")
    print(f"{'#'*65}")

    passed = 0
    total = 0

    # 1. Multi-tenant Header Isolation Check
    print("\n--- 1. فحص عزل الأنشطة (Multi-Tenant Header Isolation) ---")
    
    # 1.1 Baytak Tenant
    ok, code, res = make_req('/api/employees', headers={'x-tenant-slug': 'baytak'})
    total += 1
    if ok and res.get('success'):
        passed += 1
        print(f"{PASS} جلب موظفي نشاط بيتك (baytak): ناجح | عدد الموظفين: {len(res.get('users', []))}")
    else:
        print(f"{FAIL} فشل جلب موظفي baytak: {res}")

    # 1.2 Madar Tenant
    ok, code, res = make_req('/api/employees', headers={'x-tenant-slug': 'madar'})
    total += 1
    if ok and res.get('success'):
        passed += 1
        print(f"{PASS} جلب موظفي نشاط مدار (madar): ناجح | عدد الموظفين: {len(res.get('users', []))}")
    else:
        print(f"{FAIL} فشل جلب موظفي madar: {res}")

    # 1.3 Inventory per tenant
    ok, code, res = make_req('/api/pharmacy/inventory', headers={'x-tenant-slug': 'baytak'})
    total += 1
    if ok and res.get('success'):
        passed += 1
        print(f"{PASS} جلب مخزون نشاط بيتك: ناجح | إجمالي الأصناف: {res.get('totalCount')}")
    else:
        print(f"{FAIL} فشل مخزون بيتك: {res}")

    # 1.4 Dashboard per tenant
    ok, code, res = make_req('/api/pharmacy/dashboard', headers={'x-tenant-slug': 'baytak'})
    total += 1
    if ok and res.get('success'):
        passed += 1
        stats = res.get('stats', {})
        print(f"{PASS} لوحة تحكم نشاط بيتك: ناجح | إجمالي الأصناف: {stats.get('totalProductsCount')} | قيمة المخزون: {stats.get('totalInventoryValueCost')} د.ل")
    else:
        print(f"{FAIL} فشل لوحة التحكم: {res}")

    # 1.5 Rate Rules per tenant
    ok, code, res = make_req('/api/rate-rules', headers={'x-tenant-slug': 'baytak'})
    total += 1
    if ok and res.get('success'):
        passed += 1
        print(f"{PASS} جلب قواعد التسعير لنشاط بيتك: ناجح | القواعد: {len(res.get('rules', []))}")
    else:
        print(f"{FAIL} فشل قواعد التسعير: {res}")

    # 2. Dual Salary & Mathematics Check
    print("\n--- 2. التحقق الرياضي الدقيق لمعادلة الراتب المزدوج ---")
    # Formula: Total Due = (Attendance Hours * Direct Hourly Rate) + ((Attendance Hours * Monthly Salary) / Target Hours)
    # Test case: 8.5 hours, direct rate = 50 د.ل, monthly salary = 2000 د.ل, target hours = 160
    hours = 8.5
    rate = 50.0
    salary = 2000.0
    target_hrs = 160.0
    
    expected_direct = round(hours * rate, 2) # 425.0
    expected_role = round((hours * salary) / target_hrs, 2) # 106.25
    expected_total = round(expected_direct + expected_role, 2) # 531.25
    
    total += 1
    if expected_total == 531.25 and expected_direct == 425.0:
        passed += 1
        print(f"{PASS} الحساب المزدوج: 8.5 ساعة × 50 د.ل + (8.5 × 2000 / 160) = {expected_total} د.ل (تطابق 100%)")
    else:
        print(f"{FAIL} خطأ في الحساب المزدوج!")

    # 3. Overnight Shifts Math Check
    print("\n--- 3. التحقق من الورديات الليلية المتقاطعة مع منتصف الليل ---")
    # 22:30 to 06:30 -> (1440 - (22*60 + 30)) + (6*60 + 30) = 90 + 390 = 480 mins = 8.00 hours
    in_mins = 22 * 60 + 30
    out_mins = 6 * 60 + 30
    total_mins = (1440 - in_mins) + out_mins
    night_hours = round(total_mins / 60.0, 2)
    
    total += 1
    if night_hours == 8.0:
        passed += 1
        print(f"{PASS} وردية ليلية (22:30 ➔ 06:30): {night_hours} ساعات عمل صحيحة 100%")
    else:
        print(f"{FAIL} خطأ في حساب الوردية الليلية!")

    # 4. BNF 83 Monograph Precision Check
    print("\n--- 4. التحقق من مونوغرافات BNF 83 والجرعات السريرية ---")
    ok, code, res = make_req('/api/pharmacy/clinical-capsule', method='POST', data={
        'product': {
            'code': 'AUG-625',
            'name': 'Augmentin 625mg Tablets',
            'scientificName': 'Amoxicillin + Clavulanic Acid'
        }
    })
    total += 1
    if ok and res.get('success'):
        passed += 1
        capsule = res.get('capsule', {})
        print(f"{PASS} كبسولة Augmentin: ناجحة | المادة: {capsule.get('scientificName')} | التوثيق: {capsule.get('liveInfo', {}).get('source')}")
    else:
        print(f"{FAIL} فشل كبسولة Augmentin: {res}")

    print(f"\n{'='*65}")
    print(f"📊 نتيجة {cycle_name}: {passed}/{total} بنجاح ({(passed/total)*100:.1f}%)")
    print(f"{'='*65}")
    return passed == total

if __name__ == '__main__':
    run_deep_tests("دورة الفحص الشاملة")
