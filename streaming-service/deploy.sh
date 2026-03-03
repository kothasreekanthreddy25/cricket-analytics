#!/bin/bash
# Run this on the Hetzner VPS to deploy the streaming service

set -e
cd /opt/crickettips-stream

echo "=== Installing dependencies ==="
npm install

echo "=== Installing DejaVu fonts (for FFmpeg text overlay) ==="
apt install -y fonts-dejavu-core fonts-dejavu 2>/dev/null || true
fc-cache -f -v 2>/dev/null || true

echo "=== Starting service with PM2 ==="
pm2 delete crickettips-stream 2>/dev/null || true
pm2 start index.js --name crickettips-stream --env production
pm2 save

echo ""
echo "✅ Streaming service deployed!"
echo "Status: $(pm2 status crickettips-stream | grep crickettips)"
