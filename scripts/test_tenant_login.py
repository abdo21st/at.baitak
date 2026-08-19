# -*- coding: utf-8 -*-
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

k = r'C:\Users\phabd\.ssh\id_ed25519_coolify'
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('102.203.201.52', username='root', key_filename=k)

test_script = """
curl -s -X POST http://127.0.0.1:3005/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Host: alnaqaa.mtapp.ly" \
  -H "x-tenant-slug: alnaqaa" \
  -d '{"employeeCode":"101","pinCode":"1234"}'
"""

stdin, stdout, stderr = c.exec_command(test_script)
out = stdout.read().decode('utf-8', errors='replace')
print("TENANT LOGIN RESPONSE:\n", out)

c.close()
