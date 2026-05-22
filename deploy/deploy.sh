#!/usr/bin/env bash
# GEV ICMS — Full deploy script for Ubuntu (DigitalOcean droplet)
# Run as root: bash deploy.sh
set -e

DOMAIN="ramthangaraj.com"
APP_DIR="/var/www/gev-icms"
REPO="https://github.com/ramt-gev/GSEVA.git"
DB_NAME="gev_icms"
DB_USER="gev_admin"
DB_PASS="gev_secure_2026"
NODE_PORT=3000

echo "=== GEV ICMS Deploy ==="

# 1. System packages
echo "[1/8] Installing system packages..."
apt-get update -qq
apt-get install -y -qq git curl nginx certbot python3-certbot-nginx postgresql postgresql-contrib

# 2. Node.js 20+
echo "[2/8] Checking Node.js..."
NODE_MAJOR=$(node -e "console.log(process.versions.node.split('.')[0])" 2>/dev/null || echo "0")
if [ "$NODE_MAJOR" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
echo "  Node $(node -v) / npm $(npm -v)"

# 3. PM2
echo "[3/8] Installing PM2..."
npm install -g pm2 --quiet
pm2 startup systemd -u root --hp /root | tail -1 | bash || true

# 4. PostgreSQL
echo "[4/8] Setting up PostgreSQL..."
systemctl enable postgresql --now

sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE ROLE $DB_USER WITH LOGIN PASSWORD '$DB_PASS';"

sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"

sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"

PG_HBA=$(sudo -u postgres psql -t -c "SHOW hba_file;" | xargs)
grep -q "$DB_USER" "$PG_HBA" || \
  echo "host    $DB_NAME    $DB_USER    127.0.0.1/32    md5" >> "$PG_HBA"
systemctl reload postgresql

# 5. Clone / pull
echo "[5/8] Deploying code..."
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" pull
else
  mkdir -p "$APP_DIR"
  git clone "$REPO" "$APP_DIR"
fi

# 6. Backend dependencies + .env
echo "[6/8] Installing dependencies..."
cd "$APP_DIR/gev-icms-backend"
npm install --production --quiet

if [ ! -f .env ]; then
  cat > .env <<ENV
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASS
JWT_SECRET=$(openssl rand -hex 32)
JWT_EXPIRY=24h
PORT=$NODE_PORT
NODE_ENV=production
APP_BASE_URL=https://$DOMAIN
RAZORPAY_KEY_ID=rzp_test_REPLACE_ME
RAZORPAY_KEY_SECRET=REPLACE_ME
RAZORPAY_WEBHOOK_SECRET=REPLACE_ME
INTERAKT_API_KEY=REPLACE_ME
INTERAKT_BASE_URL=https://api.interakt.ai/v1/public
EZEE_WEBHOOK_SECRET=REPLACE_ME
GREYTHR_API_KEY=REPLACE_ME
GREYTHR_BASE_URL=https://api.greythr.com/v1
ADMIN_MOBILE=REPLACE_ME
ENV
  echo "  .env written — update $APP_DIR/gev-icms-backend/.env with real keys"
fi

# 7. Schema + seed
echo "[7/8] Database schema..."
PGPASSWORD=$DB_PASS psql -h 127.0.0.1 -U $DB_USER -d $DB_NAME \
  -f "$APP_DIR/Docs/GEV_Database_Schema_v3_Final.sql" > /dev/null 2>&1 || true

ROW_COUNT=$(PGPASSWORD=$DB_PASS psql -h 127.0.0.1 -U $DB_USER -d $DB_NAME -t \
  -c "SELECT COUNT(*) FROM system_users;" 2>/dev/null | xargs || echo "0")
if [ "$ROW_COUNT" = "0" ]; then
  PGPASSWORD=$DB_PASS psql -h 127.0.0.1 -U $DB_USER -d $DB_NAME \
    -f "$APP_DIR/Docs/seed.sql" > /dev/null 2>&1 || true
  cd "$APP_DIR/gev-icms-backend" && node set-passwords.js 2>/dev/null || true
fi

# 8. PM2 + Nginx + SSL
echo "[8/8] Starting app + Nginx..."
cd "$APP_DIR/gev-icms-backend"
pm2 delete gev-icms 2>/dev/null || true
pm2 start src/index.js \
  --name gev-icms \
  --log /var/log/gev-icms-out.log \
  --error /var/log/gev-icms-err.log \
  --restart-delay 3000 \
  --max-restarts 10
pm2 save

sleep 2
curl -sf http://localhost:$NODE_PORT/api/health && echo "" || echo "  WARNING: check pm2 logs gev-icms"

# Nginx HTTP (temp, for certbot)
cat > /etc/nginx/sites-available/gev-icms <<NGINX
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    location / {
        proxy_pass http://127.0.0.1:$NODE_PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/gev-icms /etc/nginx/sites-enabled/gev-icms
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# SSL
certbot --nginx -d $DOMAIN -d www.$DOMAIN \
  --non-interactive --agree-tos -m ram.t@iskcongev.com \
  --redirect 2>&1 || echo "  SSL skipped — run manually: certbot --nginx -d $DOMAIN"

echo ""
echo "════════════════════════════════════"
echo " GEV ICMS live!"
echo " https://$DOMAIN          (home)"
echo " https://$DOMAIN/gate     (gate)"
echo " https://$DOMAIN/canteen  (canteen)"
echo " https://$DOMAIN/admin    (admin)"
echo " https://$DOMAIN/dashboard (reports)"
echo " https://$DOMAIN/register (visitor reg)"
echo ""
echo " Edit keys : nano $APP_DIR/gev-icms-backend/.env"
echo " Restart   : pm2 restart gev-icms"
echo " Logs      : pm2 logs gev-icms"
echo "════════════════════════════════════"
