# -*- coding: utf-8 -*-
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

k = r'C:\Users\phabd\.ssh\id_ed25519_coolify'
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('102.203.201.52', username='root', key_filename=k)

cmd = """
openssl x509 -in /etc/letsencrypt/live/at.baitak.mtapp.ly/fullchain.pem -text -noout | grep -A 2 "Subject Alternative Name"
"""

stdin, stdout, stderr = c.exec_command(cmd)
out = stdout.read().decode('utf-8', errors='replace')
print("CERT SANs:\n", out)

c.close()
