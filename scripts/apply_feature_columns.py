# -*- coding: utf-8 -*-
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

k = r'C:\Users\phabd\.ssh\id_ed25519_coolify'
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('102.203.201.52', username='root', key_filename=k)

# First add the columns directly to Postgres if not exist
sql_cmd = """
docker exec hodoork_postgres psql -U postgres -d hodoork_db -c "
ALTER TABLE \\\"Tenant\\\" ADD COLUMN IF NOT EXISTS \\\"hasClinicalCapsule\\\" BOOLEAN DEFAULT TRUE;
ALTER TABLE \\\"Tenant\\\" ADD COLUMN IF NOT EXISTS \\\"hasInventory\\\" BOOLEAN DEFAULT TRUE;
ALTER TABLE \\\"Tenant\\\" ADD COLUMN IF NOT EXISTS \\\"hasPurchases\\\" BOOLEAN DEFAULT TRUE;
"
"""

stdin, stdout, stderr = c.exec_command(sql_cmd)
out = stdout.read().decode('utf-8', errors='replace')
err = stderr.read().decode('utf-8', errors='replace')
print("SQL ALTER RESULT:\n", out)
if err:
    print("SQL ERR:\n", err)

# Check the columns in Tenant table
check_cmd = """
docker exec hodoork_postgres psql -U postgres -d hodoork_db -c "
SELECT id, name, slug, \\\"hasClinicalCapsule\\\", \\\"hasInventory\\\", \\\"hasPurchases\\\" FROM \\\"Tenant\\\";
"
"""

stdin, stdout, stderr = c.exec_command(check_cmd)
out = stdout.read().decode('utf-8', errors='replace')
print("TENANTS TABLE:\n", out)

c.close()
