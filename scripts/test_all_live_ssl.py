# -*- coding: utf-8 -*-
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

k = r'C:\Users\phabd\.ssh\id_ed25519_coolify'
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('102.203.201.52', username='root', key_filename=k)

test_script = """
domains=("https://at.mt.mtapp.ly/login" "https://at.baitak.mtapp.ly/login" "https://at.mtapp.ly/dashboard/super-admin" "https://madar.mtapp.ly/login")

for d in "${domains[@]}"; do
  status=$(curl -s -o /dev/null -w "%{http_code}" "$d")
  echo "$d -> HTTP $status"
done
"""

stdin, stdout, stderr = c.exec_command(test_script)
out = stdout.read().decode('utf-8', errors='replace')
print("LIVE DOMAINS STATUS:\n", out)

c.close()
