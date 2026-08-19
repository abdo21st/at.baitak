# -*- coding: utf-8 -*-
import paramiko
import sys
import bcrypt

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

k = r'C:\Users\phabd\.ssh\id_ed25519_coolify'
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('102.203.201.52', username='root', key_filename=k)

hashed = bcrypt.hashpw(b"1234", bcrypt.gensalt(10)).decode('utf-8')

cmd = f"""
docker exec hodoork_postgres psql -U postgres -d hodoork_db -c "
UPDATE \\\"User\\\" SET password = '{hashed}' WHERE id = 'usr-madar-101';
"
"""

stdin, stdout, stderr = c.exec_command(cmd)
out = stdout.read().decode('utf-8', errors='replace')
print("UPDATE PIN RESULT:\n", out)

c.close()
