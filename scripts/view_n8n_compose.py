# -*- coding: utf-8 -*-
import paramiko

k = r'C:\Users\phabd\.ssh\id_ed25519_coolify'
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('102.203.201.52', username='root', key_filename=k)

stdin, stdout, stderr = c.exec_command('cat /opt/n8n/docker-compose.yml')
print("COMPOSE CONTENT:\n", stdout.read().decode())

c.close()
