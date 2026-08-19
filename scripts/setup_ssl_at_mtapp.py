# -*- coding: utf-8 -*-
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

k = r'C:\Users\phabd\.ssh\id_ed25519_coolify'
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('102.203.201.52', username='root', key_filename=k)

nginx_conf = """
server {
    server_name at.mtapp.ly;

    location / {
        proxy_pass http://127.0.0.1:3005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen 80;
}
"""

cmd = f"""
cat << 'EOF' > /etc/nginx/sites-available/at.mtapp.ly
{nginx_conf}
EOF

ln -sf /etc/nginx/sites-available/at.mtapp.ly /etc/nginx/sites-enabled/at.mtapp.ly
nginx -t && systemctl reload nginx
certbot --nginx -d at.mtapp.ly --non-interactive --agree-tos -m phabdo21@gmail.com --redirect
nginx -t && systemctl reload nginx
"""

print("Executing Certbot & Nginx configuration...")
stdin, stdout, stderr = c.exec_command(cmd)
out = stdout.read().decode('utf-8', errors='replace')
err = stderr.read().decode('utf-8', errors='replace')

print("OUT:\n", out)
print("ERR:\n", err)

c.close()
