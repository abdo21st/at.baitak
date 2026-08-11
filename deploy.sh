#!/bin/bash
# Server deployment script for Libyan Spider server (102.203.201.52)
echo "=========================================================="
echo " Deploying HodoorK System on Server 102.203.201.52"
echo "=========================================================="

# Check docker & docker compose
if command -v docker &> /dev/null
then
    echo "[+] Building and starting Docker containers..."
    docker compose down
    docker compose up -d --build
    echo "[+] HodoorK system successfully running on Docker!"
else
    echo "[!] Docker not found, falling back to npm start..."
    npm run build
    npm run start
fi
