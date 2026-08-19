# -*- coding: utf-8 -*-
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

k = r'C:\Users\phabd\.ssh\id_ed25519_coolify'
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('102.203.201.52', username='root', key_filename=k)

cmd = """
certbot --nginx -d mtapp.ly -d www.mtapp.ly -d at.mtapp.ly -d at.mt.mtapp.ly -d at.baitak.mtapp.ly --non-interactive --agree-tos --email admin@ordermt.ly --expand
"""

stdin, stdout, stderr = c.exec_command(cmd)
out = stdout.read().decode('utf-8', errors='replace')
err = stderr.read().decode('utf-8', errors='replace')

print("CERTBOT OUT:\n", out)
print("CERTBOT ERR:\n", err)

c.close()
