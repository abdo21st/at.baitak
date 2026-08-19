# -*- coding: utf-8 -*-
import paramiko

k = r'C:\Users\phabd\.ssh\id_ed25519_coolify'
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('102.203.201.52', username='root', key_filename=k)

# Find docker-compose files on the host
stdin, stdout, stderr = c.exec_command('find / -name "*waha*" -o -name "*docker-compose*.yml" 2>/dev/null | grep -E "(waha|coolify|at.baitak)" | head -n 30')
print("COMPOSE / CONFIG FILES:\n", stdout.read().decode())

# Check how waha was started
stdin, stdout, stderr = c.exec_command('docker inspect waha_app --format "{{.HostConfig.Binds}} {{.Config.Env}}"')
print("WAHA DETAILS:\n", stdout.read().decode())

c.close()
