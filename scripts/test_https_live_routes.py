# -*- coding: utf-8 -*-
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

k = r'C:\Users\phabd\.ssh\id_ed25519_coolify'
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('102.203.201.52', username='root', key_filename=k)

test_script = """
curl -s -k -I https://at.mtapp.ly/dashboard/super-admin
curl -s -k -I https://at.mt.mtapp.ly/login
curl -s -k -I https://at.baitak.mtapp.ly/login
"""

stdin, stdout, stderr = c.exec_command(test_script)
out = stdout.read().decode('utf-8', errors='replace')
print("HTTP RESPONSES:\n", out)

c.close()
