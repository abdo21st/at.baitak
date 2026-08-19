# -*- coding: utf-8 -*-
import paramiko
import json

k = r'C:\Users\phabd\.ssh\id_ed25519_coolify'
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('102.203.201.52', username='root', key_filename=k)

api_key = "hodoork_waha_secure_2026"
target_webhook = "http://102.203.201.52:3005/api/webhook/whatsapp/inbound"

# In WAHA, session configuration for webhooks:
# PATCH /api/sessions/default
# Body: { "config": { "webhooks": [ { "url": "...", "events": ["message", "message.any"] } ] } }

patch_data = json.dumps({
    "config": {
        "webhooks": [
            {
                "url": target_webhook,
                "events": ["message", "message.any"]
            }
        ]
    }
})

patch_cmd = f'''curl -s -X PATCH http://localhost:3008/api/sessions/default -H "Content-Type: application/json" -H "X-Api-Key: {api_key}" -d '{patch_data}' '''
stdin, stdout, stderr = c.exec_command(patch_cmd)
res = stdout.read().decode()
print("PATCH SESSION RESULT:\n", res)

# Also check GET /api/sessions/default again
check_cmd = f'curl -s -X GET http://localhost:3008/api/sessions/default -H "X-Api-Key: {api_key}"'
stdin, stdout, stderr = c.exec_command(check_cmd)
print("UPDATED SESSION:\n", stdout.read().decode())

# Check swagger / openapi specs on WAHA
swagger_cmd = f'curl -s -X GET http://localhost:3008/api/docs-json -H "X-Api-Key: {api_key}"'
stdin, stdout, stderr = c.exec_command(swagger_cmd)
swagger = stdout.read().decode()
print("SWAGGER AVAILABLE:", "paths" in swagger)

c.close()
