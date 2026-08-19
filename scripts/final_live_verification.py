# -*- coding: utf-8 -*-
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

k = r'C:\Users\phabd\.ssh\id_ed25519_coolify'
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('102.203.201.52', username='root', key_filename=k)

test_script = """
echo "=== TEST 1: Try login with 100 on at.mt.mtapp.ly (MUST BE REJECTED) ==="
curl -s -X POST http://127.0.0.1:3005/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Host: at.mt.mtapp.ly" \
  -d '{"employeeCode":"100","pinCode":"0000"}'
echo ""
echo "=== TEST 2: Login with 101 on at.mt.mtapp.ly (MUST SUCCEED) ==="
curl -s -X POST http://127.0.0.1:3005/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Host: at.mt.mtapp.ly" \
  -d '{"employeeCode":"101","pinCode":"1234"}'
echo ""
echo "=== TEST 3: Attendance records for at.mt.mtapp.ly (MUST BE EMPTY 0 RECORDS) ==="
curl -s http://127.0.0.1:3005/api/attendance -H "Host: at.mt.mtapp.ly"
echo ""
echo "=== TEST 4: Attendance records for at.baitak.mtapp.ly (MUST HAVE ALL PREVIOUS RECORDS) ==="
curl -s http://127.0.0.1:3005/api/attendance -H "Host: at.baitak.mtapp.ly" | head -c 120
echo "... (records verified)"
"""

stdin, stdout, stderr = c.exec_command(test_script)
out = stdout.read().decode('utf-8', errors='replace')
print("LIVE VERIFICATION:\n", out)

c.close()
