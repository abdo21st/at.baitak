# -*- coding: utf-8 -*-
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

k = r'C:\Users\phabd\.ssh\id_ed25519_coolify'
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('102.203.201.52', username='root', key_filename=k)

nginx_unified_conf = """
# Unified Multi-Tenant Nginx Server Block for mtapp.ly Ecosystem
server {
    server_name at.mtapp.ly at.mt.mtapp.ly at.baitak.mtapp.ly *.mtapp.ly;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

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
        proxy_set_header X-Forwarded-Host $host;
    }

    listen 443 ssl http2;
    ssl_certificate /etc/letsencrypt/live/at.baitak.mtapp.ly/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/at.baitak.mtapp.ly/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

server {
    listen 80;
    server_name at.mtapp.ly at.mt.mtapp.ly at.baitak.mtapp.ly *.mtapp.ly;
    return 301 https://$host$request_uri;
}
"""

cmd = f"""
cat << 'EOF' > /etc/nginx/sites-available/at.mtapp.ly
{nginx_unified_conf}
EOF

# Ensure at.baitak.mtapp.ly is removed from sites-enabled to prevent conflict
rm -f /etc/nginx/sites-enabled/at.baitak.mtapp.ly
ln -sf /etc/nginx/sites-available/at.mtapp.ly /etc/nginx/sites-enabled/at.mtapp.ly

nginx -t && systemctl reload nginx
"""

stdin, stdout, stderr = c.exec_command(cmd)
out = stdout.read().decode('utf-8', errors='replace')
err = stderr.read().decode('utf-8', errors='replace')

print("OUT:\n", out)
print("ERR:\n", err)

c.close()
