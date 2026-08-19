# -*- coding: utf-8 -*-
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

k = r'C:\Users\phabd\.ssh\id_ed25519_coolify'
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('102.203.201.52', username='root', key_filename=k)

sql = """
SELECT id, "productName", "activeIngredient", "groupName", "senderName", "createdAt" 
FROM "WhatsAppShortageRequest" 
ORDER BY "createdAt" DESC;
"""

stdin, stdout, stderr = c.exec_command(f'docker exec -i hodoork_postgres psql -U postgres -d hodoork_db -c \'{sql}\'')
print("CURRENT DB SHORTAGES:\n", stdout.read().decode('utf-8', errors='replace'))

c.close()
