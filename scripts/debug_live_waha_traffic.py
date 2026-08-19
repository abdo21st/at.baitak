# -*- coding: utf-8 -*-
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

k = r'C:\Users\phabd\.ssh\id_ed25519_coolify'
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('102.203.201.52', username='root', key_filename=k)

print("="*60)
print("🔍 1. فحص سجلات WAHA لاستقبال الرسائل والصور:")
print("="*60)
stdin, stdout, stderr = c.exec_command('docker logs waha_app --tail 60')
print(stdout.read().decode())

print("="*60)
print("🔍 2. فحص سجلات تطبيق النواقص (hodoork_app) ومسار Webhook:")
print("="*60)
stdin, stdout, stderr = c.exec_command('docker logs hodoork_app --tail 60')
print(stdout.read().decode())

c.close()
