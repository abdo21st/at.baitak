# -*- coding: utf-8 -*-
import paramiko
import json

k = r'C:\Users\phabd\.ssh\id_ed25519_coolify'
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('102.203.201.52', username='root', key_filename=k)

api_key = "hodoork_waha_secure_2026"

# Check recent messages from WAHA
stdin, stdout, stderr = c.exec_command(f'curl -s -X GET "http://localhost:3008/api/default/chats" -H "X-Api-Key: {api_key}"')
print("CHATS:", stdout.read().decode()[:300])

# Check files saved in waha_app
stdin, stdout, stderr = c.exec_command('docker exec waha_app ls -la /tmp /app 2>/dev/null')
print("FILES IN WAHA:\n", stdout.read().decode())

c.close()
