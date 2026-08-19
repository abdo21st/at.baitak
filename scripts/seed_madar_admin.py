# -*- coding: utf-8 -*-
import paramiko
import sys
import bcrypt

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

k = r'C:\Users\phabd\.ssh\id_ed25519_coolify'
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('102.203.201.52', username='root', key_filename=k)

hashed = bcrypt.hashpw(b"1234", bcrypt.gensalt()).decode('utf-8')

cmd = f"""
docker exec hodoork_postgres psql -U postgres -d hodoork_db -c "
INSERT INTO \\\"User\\\" (id, \\\"tenantId\\\", \\\"employeeCode\\\", name, email, password, role, \\\"jobTitle\\\", \\\"createdAt\\\", \\\"updatedAt\\\")
VALUES (
  'usr-madar-101',
  '2b0bac2a-3dd9-48c8-9e1d-1502c9878ce1',
  'at.mt-101',
  'مدير مدار التقنية',
  'admin@at.mt.mtapp.ly',
  '{hashed}',
  'ADMIN',
  'المدير العام',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;
"
"""

stdin, stdout, stderr = c.exec_command(cmd)
out = stdout.read().decode('utf-8', errors='replace')
err = stderr.read().decode('utf-8', errors='replace')
print("OUT:\n", out)
print("ERR:\n", err)

c.close()
