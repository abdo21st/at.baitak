# -*- coding: utf-8 -*-
import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8')

k = r'C:\Users\phabd\.ssh\id_ed25519_coolify'
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('102.203.201.52', username='root', key_filename=k)

# قراءة جميع tenants وميزاتهم
_, out, _ = c.exec_command(
    'docker exec hodoork_postgres psql -U postgres -d hodoork_db -c '
    '"SELECT id, name, slug, \\"hasClinicalCapsule\\", \\"hasInventory\\", \\"hasPurchases\\" FROM \\"Tenant\\";"'
)
print(out.read().decode('utf-8', errors='replace'))

c.close()
