#!/usr/bin/env bash
# =============================================================================
# YFJ Matrimony - AWS EC2 Automated Server Setup Script
# Target OS: Ubuntu 22.04 / 24.04 LTS
# Usage: sudo bash ec2-setup.sh
# =============================================================================

set -e

echo ">>> [1/7] Updating system packages..."
sudo apt-get update -y && sudo apt-get upgrade -y

echo ">>> [2/7] Installing essential utilities..."
sudo apt-get install -y curl git ufw nginx certbot python3-certbot-nginx build-essential postgresql-client

echo ">>> [3/7] Installing Node.js 20 LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

echo ">>> Node version: $(node -v)"
echo ">>> NPM version: $(npm -v)"

echo ">>> [4/7] Installing PM2 globally..."
sudo npm install -g pm2

echo ">>> [5/7] Configuring UFW Firewall..."
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

echo ">>> [6/7] Configuring PM2 to startup automatically on boot..."
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp /home/$USER

echo ">>> [7/7] Setup complete!"
echo "Next steps:"
echo "1. Clone your repo: git clone <your-repo-url>"
echo "2. cd into backend: cd matrimony/backend"
echo "3. Copy and edit .env: cp .env.example .env && nano .env"
echo "4. Install dependencies and build: npm install && npm run build"
echo "5. Start with PM2: pm2 start ecosystem.config.cjs"
echo "6. Save PM2 list: pm2 save"
echo "7. Link Nginx config: sudo cp deploy/nginx.conf /etc/nginx/sites-available/yfj && sudo ln -s /etc/nginx/sites-available/yfj /etc/nginx/sites-enabled/ && sudo nginx -t && sudo systemctl restart nginx"
echo "8. Get SSL certificate: sudo certbot --nginx -d your-domain.com"
