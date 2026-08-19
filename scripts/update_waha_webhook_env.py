# -*- coding: utf-8 -*-
import paramiko

k = r'C:\Users\phabd\.ssh\id_ed25519_coolify'
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('102.203.201.52', username='root', key_filename=k)

new_compose = """services:
  n8n:
    image: docker.n8n.io/n8nio/n8n:latest
    container_name: n8n_app
    restart: always
    ports:
      - "5678:5678"
    environment:
      - N8N_HOST=0.0.0.0
      - N8N_PORT=5678
      - N8N_PROTOCOL=http
      - NODE_ENV=production
      - N8N_SECURE_COOKIE=false
      - WEBHOOK_URL=http://102.203.201.52:5678/
      - GENERIC_TIMEZONE=Africa/Tripoli
      - TZ=Africa/Tripoli
      - EXECUTIONS_DATA_PRUNE=true
      - EXECUTIONS_DATA_MAX_AGE=168
    volumes:
      - n8n_data:/home/node/.n8n
    networks:
      - n8n_net

  waha:
    image: devlikeapro/waha:latest
    container_name: waha_app
    restart: always
    ports:
      - "3008:3000"
    environment:
      - WAHA_ZIP_LOGS=false
      - WAHA_PRINT_QR=true
      - WAHA_LOG_LEVEL=info
      - WHATSAPP_DEFAULT_ENGINE=NOWEB
      - WHATSAPP_START_SESSION=default
      - WAHA_DASHBOARD_ENABLED=true
      - WAHA_API_KEY=hodoork_waha_secure_2026
      - WAHA_DASHBOARD_USERNAME=admin
      - WAHA_DASHBOARD_PASSWORD=admin123456
      - WHATSAPP_SWAGGER_USERNAME=admin
      - WHATSAPP_SWAGGER_PASSWORD=admin123456
      - WHATSAPP_HOOK_URL=http://102.203.201.52:3005/api/webhook/whatsapp/inbound
      - WHATSAPP_HOOK_EVENTS=message,message.any
      - WAHA_WEBHOOK_URL=http://102.203.201.52:3005/api/webhook/whatsapp/inbound
      - WAHA_WEBHOOK_EVENTS=message,message.any
    volumes:
      - waha_sessions:/app/.sessions
    networks:
      - n8n_net

volumes:
  n8n_data:
  waha_sessions:

networks:
  n8n_net:
    driver: bridge
"""

print("Writing updated compose file...")
stdin, stdout, stderr = c.exec_command('cat > /opt/n8n/docker-compose.yml')
stdin.write(new_compose)
stdin.flush()
stdin.channel.shutdown_write()

print("Restarting WAHA container with live webhook configuration...")
stdin, stdout, stderr = c.exec_command('cd /opt/n8n && docker compose up -d waha')
print("COMPOSE OUT:\n", stdout.read().decode())
print("COMPOSE ERR:\n", stderr.read().decode())

# Check WAHA status and logs
stdin, stdout, stderr = c.exec_command('docker logs waha_app --tail 20')
print("WAHA LOGS:\n", stdout.read().decode())

c.close()
