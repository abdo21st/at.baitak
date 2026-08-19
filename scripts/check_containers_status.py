# -*- coding: utf-8 -*-
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

k = r'C:\Users\phabd\.ssh\id_ed25519_coolify'
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('102.203.201.52', username='root', key_filename=k)

stdin, stdout, stderr = c.exec_command('docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"')
print("CONTAINERS STATUS:\n", stdout.read().decode('utf-8', errors='replace'))

c.close()
