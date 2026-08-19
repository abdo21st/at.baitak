# -*- coding: utf-8 -*-
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

k = r'C:\Users\phabd\.ssh\id_ed25519_coolify'
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('102.203.201.52', username='root', key_filename=k)

# Check last 100 lines of hodoork_app logs
stdin, stdout, stderr = c.exec_command('docker logs --tail 100 hodoork_app 2>&1')
print(stdout.read().decode('utf-8', errors='replace'))

c.close()
