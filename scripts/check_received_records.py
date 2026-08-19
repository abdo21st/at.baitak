# -*- coding: utf-8 -*-
import paramiko
import json

k = r'C:\Users\phabd\.ssh\id_ed25519_coolify'
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('102.203.201.52', username='root', key_filename=k)

sql = 'SELECT id, "productName", "groupName", "senderName", "rawMessage", "imageUrl", "createdAt" FROM "WhatsAppShortageRequest" ORDER BY "createdAt" DESC LIMIT 10;'
stdin, stdout, stderr = c.exec_command(f'docker exec -i hodoork_postgres psql -U postgres -d hodoork_db -c \'{sql}\'')
print("DB RECORDS:\n", stdout.read().decode())
print("ERR:\n", stderr.read().decode())

c.close()
