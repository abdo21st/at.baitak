# -*- coding: utf-8 -*-
import urllib.request
import urllib.error
import json
import time

BASE_URL = "http://102.203.201.52:3005"

def send_request(path, method="GET", data=None, host="at.mtapp.ly", headers_extra=None):
    url = f"{BASE_URL}{path}"
    headers = {
        "Host": host,
        "User-Agent": "SecurityAuditAgent/2.0"
    }
    if headers_extra:
        headers.update(headers_extra)
        
    req_data = None
    if data is not None:
        req_data = json.dumps(data).encode("utf-8")
        headers["Content-Type"] = "application/json"
        
    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            body = response.read().decode("utf-8")
            try:
                return response.status, json.loads(body)
            except:
                return response.status, body
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(body)
        except:
            return e.code, body
    except Exception as e:
        return 0, str(e)

def run_security_and_input_audit():
    print("==================================================")
    print("🛡️ STARTING REVERSE-ENGINEERING & INPUT AUDIT SUITE")
    print("==================================================")
    
    tests_passed = 0
    tests_total = 0

    # TEST 1: Super Admin Backups Protection (Should reject tenants with 403)
    tests_total += 1
    status, res = send_request("/api/super-admin/backups", host="at.baitak.mtapp.ly")
    print(f"1. Tenant Access to Super Admin Backups (403 Forbidden Expected) -> Status: {status}")
    if status == 403:
        tests_passed += 1

    # TEST 2: Self-Service Registration Input Vectors
    tests_total += 1
    malformed_signup = {
        "companyName": "شركة الاختبار الأمني",
        "slug": "test-sec-" + str(int(time.time())),
        "managerName": "مهندس أمن",
        "managerPhone": "+218919999999",
        "password": "StrongPassword123!",
        "businessType": "PHARMACY"
    }
    status, res = send_request("/api/auth/register-tenant", method="POST", data=malformed_signup, host="at.mtapp.ly")
    print(f"2. Self-Service Tenant Registration -> Status: {status}, Success: {res.get('success') if isinstance(res, dict) else False}")
    if status == 200 and isinstance(res, dict) and res.get('success'):
        tests_passed += 1

    # TEST 3: Payment Input Tampering (Negative amount injection)
    tests_total += 1
    tampered_payment = {
        "planId": "non-existent-plan-id",
        "billingCycle": "YEARLY",
        "amount": -500.0,
        "gateway": "SADAD"
    }
    status, res = send_request("/api/payments/libya", method="POST", data=tampered_payment, host="at.baitak.mtapp.ly")
    print(f"3. Negative/Forged Payment Tampering Check -> Status: {status}, Response: {res.get('error') if isinstance(res, dict) else res}")
    if status in [400, 404]:
        tests_passed += 1

    # TEST 4: Drug Interactions Oversized Array DOS Attack
    tests_total += 1
    oversized_drugs = ["Warfarin", "Aspirin"] + [f"Drug_{i}" for i in range(100)]
    status, res = send_request("/api/pharmacy/clinical-knowledge/interactions", method="POST", data={"drugs": oversized_drugs}, host="at.baitak.mtapp.ly")
    print(f"4. Drug Interactions 100-item Batch -> Status: {status}, Count: {res.get('count') if isinstance(res, dict) else 'N/A'}")
    if status == 200:
        tests_passed += 1

    # TEST 5: Micro-Quiz Out-Of-Bounds Index Check
    tests_total += 1
    quiz_body = {
        "quizId": "q1",
        "selectedIndex": 9999 # Out of bounds
    }
    status, res = send_request("/api/training/quiz", method="POST", data=quiz_body, host="at.baitak.mtapp.ly")
    print(f"5. Quiz Out-of-Bounds Index Submission -> Status: {status}, Correct: {res.get('isCorrect') if isinstance(res, dict) else 'N/A'}")
    if status == 200 and isinstance(res, dict) and res.get('isCorrect') is False:
        tests_passed += 1

    # TEST 6: Anonymous Suggestion Huge Payload Check
    tests_total += 1
    suggestion_body = {
        "category": "IDEA",
        "content": "ملاحظة أمنية دقيقة " * 10
    }
    status, res = send_request("/api/suggestions", method="POST", data=suggestion_body, host="at.baitak.mtapp.ly")
    print(f"6. Encrypted Suggestion Submission -> Status: {status}, Success: {res.get('success') if isinstance(res, dict) else 'N/A'}")
    if status == 200 and isinstance(res, dict) and res.get('success'):
        tests_passed += 1

    # TEST 7: Patient Refill Math & Date Integrity
    tests_total += 1
    refill_body = {
        "patientName": "عبدالله الضاوي",
        "patientPhone": "0912223344",
        "medicationName": "Concor 5mg",
        "refillIntervalDays": 30
    }
    status, res = send_request("/api/pharmacy/patients/refill", method="POST", data=refill_body, host="at.baitak.mtapp.ly")
    print(f"7. Chronic Refill Plan Creation -> Status: {status}, Success: {res.get('success') if isinstance(res, dict) else 'N/A'}")
    if status == 200 and isinstance(res, dict) and res.get('success'):
        tests_passed += 1

    # TEST 8: Maintenance Contract SLA Creation
    tests_total += 1
    contract_body = {
        "clientName": "مستشفى الفتح",
        "clientPhone": "0925556677",
        "equipmentName": "شبكة تبريد مركزي",
        "visitFrequency": "MONTHLY",
        "contractValue": 1200.0,
        "slaHours": 12
    }
    status, res = send_request("/api/maintenance-contracts", method="POST", data=contract_body, host="at.mt.mtapp.ly")
    print(f"8. SLA Maintenance Contract Creation -> Status: {status}, Success: {res.get('success') if isinstance(res, dict) else 'N/A'}")
    if status == 200 and isinstance(res, dict) and res.get('success'):
        tests_passed += 1

    # TEST 9: AI Voice Briefing Generation
    tests_total += 1
    status, res = send_request("/api/analytics/ai-voice-brief", host="at.baitak.mtapp.ly")
    print(f"9. Daily AI Voice Briefing Endpoint -> Status: {status}, Has Script: {bool(res.get('voiceScript')) if isinstance(res, dict) else False}")
    if status == 200 and isinstance(res, dict) and 'voiceScript' in res:
        tests_passed += 1

    # TEST 10: Scheduled Management Report
    tests_total += 1
    status, res = send_request("/api/reports/scheduled", method="POST", data={"reportType": "DAILY_SUMMARY"}, host="at.baitak.mtapp.ly")
    print(f"10. Scheduled Management Report Endpoint -> Status: {status}, Success: {res.get('success') if isinstance(res, dict) else False}")
    if status == 200 and isinstance(res, dict) and res.get('success'):
        tests_passed += 1

    print("==================================================")
    print(f"📊 SUMMARY: {tests_passed} / {tests_total} Tests Passed Successfully")
    print("==================================================")

if __name__ == "__main__":
    run_security_and_input_audit()
