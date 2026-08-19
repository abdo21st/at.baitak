# -*- coding: utf-8 -*-
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

k = r'C:\Users\phabd\.ssh\id_ed25519_coolify'
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('102.203.201.52', username='root', key_filename=k)

sql = """
SET client_encoding TO 'UTF8';
DELETE FROM "WhatsAppShortageRequest" 
WHERE "productName" NOT LIKE '%Panadol%' 
  AND "productName" NOT LIKE '%Baby Rest%' 
  AND "productName" NOT LIKE '%بيبي ريست%'
  AND "productName" NOT LIKE '%بانادول%';
"""

stdin, stdout, stderr = c.exec_command('docker exec -i hodoork_postgres psql -U postgres -d hodoork_db')
stdin.write(sql.encode('utf-8'))
stdin.flush()
stdin.channel.shutdown_write()

print("CLEAN RESULT:\n", stdout.read().decode('utf-8', errors='replace'))

c.close()
