# -*- coding: utf-8 -*-
import paramiko
import json

k = r'C:\Users\phabd\.ssh\id_ed25519_coolify'
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('102.203.201.52', username='root', key_filename=k)

# 1. Inspect waha_app container environment
stdin, stdout, stderr = c.exec_command('docker inspect waha_app --format "{{json .Config.Env}}"')
print("WAHA ENV VARS:\n", stdout.read().decode())

# 2. Check if WAHA container can be updated or restarted with webhook env
# In WAHA documentation:
# WHATSAPP_HOOK_URL=http://hodoork_app:3000/api/webhook/whatsapp/inbound (or host IP:3005)
# WHATSAPP_HOOK_EVENTS=message,message.any

target_webhook = "http://102.203.201.52:3005/api/webhook/whatsapp/inbound"

# Let's check docker compose or docker inspect for waha
stdin, stdout, stderr = c.exec_command('docker inspect waha_app --format "{{.HostConfig.NetworkMode}}"')
net_mode = stdout.read().decode().strip()
print("WAHA NET MODE:", net_mode)

c.close()
