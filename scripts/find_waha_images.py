# -*- coding: utf-8 -*-
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

k = r'C:\Users\phabd\.ssh\id_ed25519_coolify'
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('102.203.201.52', username='root', key_filename=k)

# List files in waha container media directory
stdin, stdout, stderr = c.exec_command('docker exec waha_app ls -la /app/.sessions/default/ 2>&1')
print("WAHA SESSIONS DIR:\n", stdout.read().decode('utf-8', errors='replace'))

stdin, stdout, stderr = c.exec_command('docker exec waha_app find /tmp /app -name "*.jpg" -o -name "*.jpeg" -o -name "*.png" 2>&1')
print("WAHA IMAGES:\n", stdout.read().decode('utf-8', errors='replace'))

c.close()
