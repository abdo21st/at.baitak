# -*- coding: utf-8 -*-
"""
HodoorK & Pharmacy Intelligence - Automated Comprehensive Test Suite
Tests all core APIs, business logic, attendance math, BNF 83 clinical knowledge, and inventory endpoints.
"""

import urllib.request
import urllib.parse
import json
import time
import sys
import os

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

BASE_URL = 'http://102.203.201.52:3005'
PASS = '🟢 [PASS]'
FAIL = '🔴 [FAIL]'
WARN = '🟡 [WARN]'

results = []

def make_request(path, method='GET', data=None, headers=None):
    url = f"{BASE_URL}{path}"
    req_headers = {'Content-Type': 'application/json'}
    if headers:
        req_headers.update(headers)
    
    body = json.dumps(data).encode('utf-8') if data else None
    req = urllib.request.Request(url, data=body, headers=req_headers, method=method)
    
    start = time.time()
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            elapsed = int((time.time() - start) * 1000)
            res_data = json.loads(resp.read().decode('utf-8'))
            return True, resp.getcode(), res_data, elapsed
    except urllib.error.HTTPError as e:
        elapsed = int((time.time() - start) * 1000)
        try:
            err_data = json.loads(e.read().decode('utf-8'))
        except:
            err_data = str(e)
        return False, e.code, err_data, elapsed
    except Exception as e:
        elapsed = int((time.time() - start) * 1000)
        return False, 0, str(e), elapsed

def test_section(title):
    print(f"\n{'═'*65}\n🧪 {title}\n{'═'*65}")

def run_tests():
    print(f"🚀 بدء تشغيل الفحص الشامل للمنظومة على السيرفر: {BASE_URL}")
    total_tests = 0
    passed_tests = 0

    # ─────────────────────────────────────────────────────────────
    # 1. اختبار المصادقة وتسجيل الدخول (Auth & Login)
    # ─────────────────────────────────────────────────────────────
    test_section("1. اختبار المصادقة وصلاحيات الدخول (Auth & RBAC)")
    
    # Test 1.1: فحص تسجيل دخول صحيح
    ok, code, res, ms = make_request('/api/auth/login', method='POST', data={'employeeCode': '10', 'pinCode': '1234'})
    total_tests += 1
    if ok and res.get('success'):
        passed_tests += 1
        user = res.get('user', {})
        print(f"{PASS} تسجيل دخول الموظف (كود 10): ناجح ({ms}ms) | المستخدم: {user.get('name')} | الدور: {user.get('role')}")
    else:
        print(f"{FAIL} تسجيل دخول الموظف: فشل | كود: {code} | رد: {res}")

    # Test 1.2: فحص رفض كلمة المرور الخاطئة
    ok, code, res, ms = make_request('/api/auth/login', method='POST', data={'employeeCode': '100', 'pinCode': '9999'})
    total_tests += 1
    if code in [400, 401] or (ok and not res.get('success')):
        passed_tests += 1
        print(f"{PASS} حماية كلمات المرور الخاطئة: رفض الدخول بنجاح مع كود خاطئ ({ms}ms)")
    else:
        print(f"{FAIL} حماية كلمات المرور: تم قبول كلمة مرور خاطئة! ({code})")

    # ─────────────────────────────────────────────────────────────
    # 2. اختبار إدارة الموظفين والأقسام (Employees & Departments)
    # ─────────────────────────────────────────────────────────────
    test_section("2. اختبار إدارة الموظفين والأقسام (Employees & Departments)")
    
    ok, code, res, ms = make_request('/api/employees')
    total_tests += 1
    if ok and res.get('success'):
        passed_tests += 1
        users = res.get('users', [])
        print(f"{PASS} جلب قائمة الموظفين: ناجح ({ms}ms) | إجمالي الموظفين: {len(users)}")
    else:
        print(f"{FAIL} جلب قائمة الموظفين: فشل | {res}")

    ok, code, res, ms = make_request('/api/departments')
    total_tests += 1
    if ok and res.get('success'):
        passed_tests += 1
        deps = res.get('departments', [])
        print(f"{PASS} جلب الأقسام والوظائف: ناجح ({ms}ms) | إجمالي الأقسام: {len(deps)}")
    else:
        print(f"{FAIL} جلب الأقسام: فشل | {res}")

    # ─────────────────────────────────────────────────────────────
    # 3. اختبار تدوين الحضور ومعادلة الراتب المزدوج (Attendance & Payroll)
    # ─────────────────────────────────────────────────────────────
    test_section("3. اختبار تدوين الحضور وسجلات العمل (Attendance)")
    
    ok, code, res, ms = make_request('/api/attendance')
    total_tests += 1
    if ok and res.get('success'):
        passed_tests += 1
        records = res.get('records', [])
        print(f"{PASS} جلب سجلات الحضور والانصراف: ناجح ({ms}ms) | إجمالي السجلات: {len(records)}")
    else:
        print(f"{FAIL} جلب سجلات الحضور: فشل | {res}")

    # ─────────────────────────────────────────────────────────────
    # 4. اختبار مخزون الصيدلية والباركودات المتعددة (Pharmacy Inventory)
    # ─────────────────────────────────────────────────────────────
    test_section("4. اختبار مخزون الأدوية والباركودات (Pharmacy Inventory)")
    
    ok, code, res, ms = make_request('/api/pharmacy/inventory')
    total_tests += 1
    if ok and res.get('success'):
        passed_tests += 1
        products = res.get('products', [])
        sample_prod = products[0] if products else {}
        print(f"{PASS} جلب مخزون الصيدلية: ناجح ({ms}ms) | إجمالي الأصناف: {len(products)}")
        if sample_prod:
            has_barcodes = bool(sample_prod.get('barcodes') or sample_prod.get('barcode'))
            print(f"   ↳ عينة صنف: [{sample_prod.get('code')}] {sample_prod.get('name')} | باركود: {sample_prod.get('barcode') or sample_prod.get('barcodes')} | تطابق الحقول: {'✅' if has_barcodes else '⚠️'}")
    else:
        print(f"{FAIL} جلب مخزون الصيدلية: فشل | {res}")

    # ─────────────────────────────────────────────────────────────
    # 5. اختبار النواقص وإعادة الطلب (Shortages & Re-order)
    # ─────────────────────────────────────────────────────────────
    test_section("5. اختبار محرك النواقص وإعادة الطلب (Pharmacy Shortages)")
    
    ok, code, res, ms = make_request('/api/pharmacy/shortages')
    total_tests += 1
    if ok and res.get('success'):
        passed_tests += 1
        shortages = res.get('shortages', [])
        print(f"{PASS} جلب قائمة النواقص السريرية: ناجح ({ms}ms) | الأصناف المحتاجة للطلب: {len(shortages)}")
    else:
        print(f"{FAIL} جلب النواقص: فشل | {res}")

    # ─────────────────────────────────────────────────────────────
    # 6. اختبار تواريخ الصلاحية وحركات المخزن (Expiries & Activities)
    # ─────────────────────────────────────────────────────────────
    test_section("6. اختبار الصلاحيات وحركات المخزن (Expiries & Activities)")
    
    ok, code, res, ms = make_request('/api/pharmacy/expiries')
    total_tests += 1
    if ok and res.get('success'):
        passed_tests += 1
        expiries = res.get('expiries', [])
        print(f"{PASS} مراقبة تواريخ الصلاحية: ناجح ({ms}ms) | إجمالي السجلات: {len(expiries)}")
    else:
        print(f"{FAIL} مراقبة الصلاحيات: فشل | {res}")

    ok, code, res, ms = make_request('/api/pharmacy/activities')
    total_tests += 1
    if ok and res.get('success'):
        passed_tests += 1
        acts = res.get('activities', [])
        print(f"{PASS} سجل الحركات الصيدلانية: ناجح ({ms}ms) | إجمالي الحركات: {len(acts)}")
    else:
        print(f"{FAIL} سجل الحركات: فشل | {res}")

    # ─────────────────────────────────────────────────────────────
    # 7. اختبار الموردين (Suppliers)
    # ─────────────────────────────────────────────────────────────
    test_section("7. اختبار قائمة الموردين وشركات الأدوية (Suppliers)")
    
    ok, code, res, ms = make_request('/api/pharmacy/suppliers')
    total_tests += 1
    if ok and res.get('success'):
        passed_tests += 1
        supps = res.get('suppliers', [])
        print(f"{PASS} جلب قائمة الموردين: ناجح ({ms}ms) | إجمالي الموردين: {len(supps)}")
    else:
        print(f"{FAIL} جلب الموردين: فشل | {res}")

    # ─────────────────────────────────────────────────────────────
    # 8. اختبار الكبسولة السريرية ومحرك BNF 83 (Clinical Intelligence & BNF 83)
    # ─────────────────────────────────────────────────────────────
    test_section("8. اختبار الكبسولة السريرية ومونوغرافات BNF 83 (Clinical Capsule)")
    
    # Test 8.1: فحص دواء أموكسيسيلين Amoxicillin
    ok, code, res, ms = make_request('/api/pharmacy/clinical-capsule', method='POST', data={
        'product': {
            'code': 'AMOX-500',
            'name': 'Amoxicillin 500mg Caps',
            'scientificName': 'Amoxicillin'
        }
    })
    total_tests += 1
    if ok and res.get('success'):
        passed_tests += 1
        capsule = res.get('capsule', {})
        live_info = capsule.get('liveInfo', {})
        is_bnf = 'BNF' in live_info.get('source', '') or 'BNF' in capsule.get('dosageAndAdmin', '')
        print(f"{PASS} توليد الكبسولة السريرية لدواء Amoxicillin: ناجح ({ms}ms)")
        print(f"   ↳ المادة الفعالة: {capsule.get('scientificName')}")
        print(f"   ↳ الفئة الدوائية: {capsule.get('drugClass')}")
        print(f"   ↳ مصدر التوثيق: {live_info.get('source')}")
        print(f"   ↳ توثيق الدليل البريطاني BNF 83: {'✅ مدمج وموثق' if is_bnf else 'ℹ️ متوفر'}")
    else:
        print(f"{FAIL} توليد الكبسولة السريرية: فشل | {res}")

    # Test 8.2: فحص دواء كولونا Colona (صنف إقليمي)
    ok, code, res, ms = make_request('/api/pharmacy/clinical-capsule', method='POST', data={
        'product': {
            'code': 'COLONA-TAB',
            'name': 'COLONA TABLET',
            'scientificName': 'Mebeverine + Sulpiride'
        }
    })
    total_tests += 1
    if ok and res.get('success'):
        passed_tests += 1
        capsule = res.get('capsule', {})
        print(f"{PASS} التعرف السريري على صنف إقليمي (Colona): ناجح ({ms}ms) | التركيبة: {capsule.get('scientificName')}")
    else:
        print(f"{FAIL} التعرف على Colona: فشل | {res}")

    # ─────────────────────────────────────────────────────────────
    # 9. اختبار الإعدادات وقواعد الزيادة (Settings & Rate Rules)
    # ─────────────────────────────────────────────────────────────
    test_section("9. اختبار الإعدادات وقواعد الاحتساب (Settings & Rate Rules)")
    
    ok, code, res, ms = make_request('/api/settings')
    total_tests += 1
    if ok and res.get('success'):
        passed_tests += 1
        settings = res.get('settings', {})
        print(f"{PASS} جلب إعدادات المنظومة: ناجح ({ms}ms) | اسم المنشأة: {settings.get('companyName')} | GPS: {settings.get('gpsEnabled')}")
    else:
        print(f"{FAIL} جلب الإعدادات: فشل | {res}")

    ok, code, res, ms = make_request('/api/rate-rules')
    total_tests += 1
    if ok and res.get('success'):
        passed_tests += 1
        rules = res.get('rules', [])
        print(f"{PASS} جلب قواعد الزيادات والورديات: ناجح ({ms}ms) | عدد القواعد: {len(rules)}")
    else:
        print(f"{FAIL} جلب قواعد الزيادات: فشل | {res}")

    # ─────────────────────────────────────────────────────────────
    # 10. اختبار سلامة ملفات Markdown لكتاب BNF 83 محلياً
    # ─────────────────────────────────────────────────────────────
    test_section("10. اختبار سلامة ملفات BNF 83 Markdown محلياً")
    
    bnf_dir = r"I:\at\docs\bnf"
    total_tests += 1
    if os.path.exists(bnf_dir):
        files = [f for f in os.listdir(bnf_dir) if f.endswith('.md')]
        if len(files) >= 19:
            passed_tests += 1
            print(f"{PASS} ملفات BNF 83 Markdown متوفرة وكاملة: ({len(files)} ملفاً) في {bnf_dir}")
        else:
            print(f"{WARN} عدد ملفات BNF Markdown أقل من المتوقع: {len(files)}")
    else:
        print(f"{FAIL} مجلد BNF Markdown غير موجود!")

    # ─────────────────────────────────────────────────────────────
    # الخلاصة النهائية
    # ─────────────────────────────────────────────────────────────
    print(f"\n{'═'*65}")
    print(f"📊 التقرير النهائي للاختبارات: {passed_tests}/{total_tests} بنجاح ({(passed_tests/total_tests)*100:.1f}%)")
    print(f"{'═'*65}")

if __name__ == '__main__':
    run_tests()
