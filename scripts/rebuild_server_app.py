# -*- coding: utf-8 -*-
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

k = r'C:\Users\phabd\.ssh\id_ed25519_coolify'
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('102.203.201.52', username='root', key_filename=k)

cmd = """
cd /opt/at.baitak
git pull origin main
docker compose build --no-cache app
docker compose up -d app
docker compose exec -T app npx prisma db push
docker compose exec -T app node scripts/seed_multi_tenant.js || true
"""

print("Updating, rebuilding and launching on server...")
stdin, stdout, stderr = c.exec_command(cmd)
out = stdout.read().decode('utf-8', errors='replace')
err = stderr.read().decode('utf-8', errors='replace')

print("OUT:\n", out)
print("ERR:\n", err)

c.close()
