# -*- coding: utf-8 -*-
import paramiko

k = r'C:\Users\phabd\.ssh\id_ed25519_coolify'
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('102.203.201.52', username='root', key_filename=k)

paths = [
    "/root/n8n/docker-compose.yml",
    "/root/docker-compose.yml",
    "/opt/n8n/docker-compose.yml",
    "/opt/waha/docker-compose.yml",
    "/data/coolify/services"
]

for p in paths:
    stdin, stdout, stderr = c.exec_command(f'test -f {p} && echo "EXISTS: {p}" || ls -d {p} 2>/dev/null')
    out = stdout.read().decode().strip()
    if out:
        print(out)

# Check docker inspect on waha_app to see working dir
stdin, stdout, stderr = c.exec_command('docker inspect waha_app --format "{{json .Config.Labels}}"')
print("WAHA LABELS:\n", stdout.read().decode())

c.close()
