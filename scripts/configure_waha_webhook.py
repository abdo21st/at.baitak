# -*- coding: utf-8 -*-
import paramiko
import json

k = r'C:\Users\phabd\.ssh\id_ed25519_coolify'
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('102.203.201.52', username='root', key_filename=k)

api_key = "hodoork_waha_secure_2026"

# 1. Check current session status and webhook config
check_session_cmd = f'curl -s -X GET http://localhost:3008/api/sessions/default -H "X-Api-Key: {api_key}"'
stdin, stdout, stderr = c.exec_command(check_session_cmd)
session_info = stdout.read().decode()
print("SESSION INFO:\n", session_info)

# 2. Check or set webhooks for the session
# Target webhook URL is our Next.js inbound endpoint
target_webhook = "http://102.203.201.52:3005/api/webhook/whatsapp/inbound"

# Let's inspect session webhooks
get_webhook_cmd = f'curl -s -X GET http://localhost:3008/api/default/webhooks -H "X-Api-Key: {api_key}"'
stdin, stdout, stderr = c.exec_command(get_webhook_cmd)
print("CURRENT WEBHOOKS:\n", stdout.read().decode())

# Configure webhook to listen to 'message' and 'message.any'
set_webhook_cmd = f'''curl -s -X POST http://localhost:3008/api/default/webhooks -H "Content-Type: application/json" -H "X-Api-Key: {api_key}" -d '{{"url":"{target_webhook}","events":["message","message.any"]}}' '''
stdin, stdout, stderr = c.exec_command(set_webhook_cmd)
print("SET WEBHOOK RESULT:\n", stdout.read().decode())

# 3. Check me / current user info on WAHA
me_cmd = f'curl -s -X GET http://localhost:3008/api/default/contacts/all -H "X-Api-Key: {api_key}"'
stdin, stdout, stderr = c.exec_command(me_cmd)
print("ME / CONTACTS (first 300 chars):", stdout.read().decode()[:300])

c.close()
