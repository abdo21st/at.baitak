# -*- coding: utf-8 -*-
import paramiko
import json

k = r'C:\Users\phabd\.ssh\id_ed25519_coolify'
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('102.203.201.52', username='root', key_filename=k)

stdin, stdout, stderr = c.exec_command('docker inspect waha_app --format "{{json .Config.Env}}"')
raw_env = stdout.read().decode().strip()
print("WAHA ENV:", raw_env)

# Find WAHA_API_KEY if any
api_key = None
if raw_env:
    try:
        env_list = json.loads(raw_env)
        for e in env_list:
            if e.startswith('WAHA_API_KEY=') or e.startswith('WHATSAPP_API_KEY='):
                api_key = e.split('=', 1)[1]
    except Exception as ex:
        print("Parse err:", ex)

print(f"Detected API Key: {api_key}")

# Test joining group from inside server
invite_code = "Lwwz6ZR8EtTJ2qxSfmxSsz"
join_cmd = f'curl -s -X POST http://localhost:3008/api/default/groups/join -H "Content-Type: application/json" -d \'{{"code":"{invite_code}"}}\''
if api_key:
    join_cmd = f'curl -s -X POST http://localhost:3008/api/default/groups/join -H "Content-Type: application/json" -H "X-Api-Key: {api_key}" -d \'{{"code":"{invite_code}"}}\''

print("Running join command on server...")
stdin, stdout, stderr = c.exec_command(join_cmd)
print("JOIN RESULT:", stdout.read().decode())
print("JOIN ERR:", stderr.read().decode())

# Check list of chats / groups in WAHA
chats_cmd = f'curl -s -X GET http://localhost:3008/api/default/chats'
if api_key:
    chats_cmd = f'curl -s -X GET http://localhost:3008/api/default/chats -H "X-Api-Key: {api_key}"'

stdin, stdout, stderr = c.exec_command(chats_cmd)
chats_out = stdout.read().decode()
print("CHATS (first 500 chars):", chats_out[:500])

c.close()
