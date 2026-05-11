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
echo "Domain : $DOMAIN"
echo "App dir: $APP_DIR"
echo ""

# ── 1. System packages ──────────────────────────────────────────────────────
echo "[1/9] Installing system packages..."
apt-get update -qq
apt-get install -y -qq git curl nginx certbot python3-certbot-nginx postgresql postgresql-contrib

# ── 2. Node.js — ensure 20+ ─────────────────────────────────────────────────
echo "[2/9] Checking Node.js version..."
NODE_MAJOR=$(node -e "console.log(process.versions.node.split('.')[0])" 2>/dev/null || echo "0")
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "  Upgrading Node.js to 20.x..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
echo "  Node $(node -v) / npm $(npm -v)"

# ── 3. PM2 ───────────────────────────────────────────────────────────────────
echo "[3/9] Installing PM2..."
npm install -g pm2 --quiet
pm2 startup systemd -u root --hp /root | tail -1 | bash || true

# ── 4. PostgreSQL ────────────────────────────────────────────────────────────
echo "[4/9] Setting up PostgreSQL..."
systemctl enable postgresql --now

# Create role + database (idempotent)
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE ROLE $DB_USER WITH LOGIN PASSWORD '$DB_PASS';"

sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"

sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"

# Allow password auth from localhost
PG_HBA=$(sudo -u postgres psql -t -c "SHOW hba_file;" | xargs)
grep -q "md5" "$PG_HBA" || \
  echo "host    $DB_NAME    $DB_USER    127.0.0.1/32    md5" >> "$PG_HBA"
systemctl reload postgresql

# ── 5. Clone / pull repo ─────────────────────────────────────────────────────
echo "[5/9] Deploying code..."
if [ -d "$APP_DIR/.git" ]; then
  echo "  Pulling latest..."
  git -C "$APP_DIR" pull
else
  echo "  Cloning repo..."
  mkdir -p "$APP_DIR"
  git clone "$REPO" "$APP_DIR"
fi

# ── 6. Backend setup ─────────────────────────────────────────────────────────
echo "[6/9] Installing backend dependencies..."
cd "$APP_DIR/gev-icms-backend"
npm install --production --quiet

# Write .env if it doesn't exist yet
if [ ! -f .env ]; then
  echo "  Writing .env..."
  cat > .env <<ENV
DB_HOST=localhost
DB_PORT=5432
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASS

JWT_SECRET=$(openssl rand -hex 32)
JWT_EXPIRY=24h

PORT=$NODE_PORT
NODE_ENV=production
APP_BASE_URL=https://$DOMAIN

# Replace these with real keys before going live:
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
  echo "  .env written. Edit /var/www/gev-icms/gev-icms-backend/.env with real keys before go-live."
else
  echo "  .env already exists — skipping."
fi

# ── 7. Deploy database schema ─────────────────────────────────────────────────
echo "[7/9] Deploying database schema..."
PGPASSWORD=$DB_PASS psql -h 127.0.0.1 -U $DB_USER -d $DB_NAME \
  -f "$APP_DIR/Docs/GEV_Database_Schema_v3_Final.sql" > /dev/null 2>&1 || \
  echo "  Schema deploy had warnings (safe to ignore if re-deploying)"

# Run seed if persons table is empty
ROW_COUNT=$(PGPASSWORD=$DB_PASS psql -h 127.0.0.1 -U $DB_USER -d $DB_NAME -t \
  -c "SELECT COUNT(*) FROM system_users;" 2>/dev/null | xargs || echo "0")
if [ "$ROW_COUNT" -eq "0" ] 2>/dev/null; then
  echo "  Seeding initial data..."
  PGPASSWORD=$DB_PASS psql -h 127.0.0.1 -U $DB_USER -d $DB_NAME \
    -f "$APP_DIR/Docs/seed.sql" > /dev/null 2>&1 || true
  echo "  Setting test user passwords..."
  cd "$APP_DIR/gev-icms-backend"
  node set-passwords.js 2>/dev/null || true
else
  echo "  Database already seeded — skipping."
fi

# ── 8. Start / restart PM2 ───────────────────────────────────────────────────
echo "[8/9] Starting app with PM2..."
cd "$APP_DIR/gev-icms-backend"
pm2 delete gev-icms 2>/dev/null || true
pm2 start src/index.js \
  --name gev-icms \
  --log /var/log/gev-icms-out.log \
  --error /var/log/gev-icms-err.log \
  --restart-delay 3000 \
  --max-restarts 10
pm2 save

# Quick health check
sleep 2
curl -sf http://localhost:$NODE_PORT/api/health && echo "" || echo "  WARNING: API health check failed — check pm2 logs"

# ── 9. Nginx + SSL ───────────────────────────────────────────────────────────
echo "[9/9] Configuring Nginx..."
mkdir -p /var/log/gev-icms

# Serve frontend HTML files
mkdir -p /var/www/gev-icms/frontend
cp "$APP_DIR"/Docs/GEV_Gate_Tablet_App_v2.html         /var/www/gev-icms/frontend/gate.html
cp "$APP_DIR"/Docs/GEV_Annakshetra_Canteen_App.html     /var/www/gev-icms/frontend/canteen.html
cp "$APP_DIR"/Docs/GEV_Admin_Portal_v2.html             /var/www/gev-icms/frontend/admin.html
cp "$APP_DIR"/Docs/GEV_Dashboard_Reports.html           /var/www/gev-icms/frontend/dashboard.html
cp "$APP_DIR"/Docs/GEV_Smart_Registration_Page.html     /var/www/gev-icms/frontend/register.html
cat > /var/www/gev-icms/frontend/index.html <<'HTML'
<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<title>GEV ICMS</title>
<style>body{font-family:sans-serif;background:#0C0E14;color:#F0EDE8;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;flex-direction:column;gap:16px}a{color:#F5943A;text-decoration:none;padding:10px 20px;border:1px solid #F5943A;border-radius:8px}a:hover{background:#F5943A;color:#000}</style>
</head><body>
<h2>🕉️ GEV ICMS</h2>
<a href="/register.html">Smart Registration</a>
<a href="/gate.html">Gate Tablet</a>
<a href="/canteen.html">Canteen App</a>
<a href="/admin.html">Admin Portal</a>
<a href="/dashboard.html">Dashboard &amp; Reports</a>
</body></html>
HTML

# Nginx config — HTTP only first (certbot will upgrade to HTTPS)
cat > /etc/nginx/sites-available/gev-icms <<NGINX
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    location /api {
        proxy_pass         http://127.0.0.1:$NODE_PORT;
        proxy_http_version 1.1;
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_read_timeout 30s;
        client_max_body_size 10m;
    }

    location / {
        root  /var/www/gev-icms/frontend;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/gev-icms /etc/nginx/sites-enabled/gev-icms
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# SSL via certbot
echo "  Requesting SSL certificate..."
certbot --nginx -d $DOMAIN -d www.$DOMAIN \
  --non-interactive --agree-tos -m ram.t@iskcongev.com \
  --redirect || echo "  SSL failed — DNS may not be pointing here yet. Run certbot manually later."

echo ""
echo "════════════════════════════════════════"
echo " GEV ICMS deployed!"
echo " API health : https://$DOMAIN/api/health"
echo " Register   : https://$DOMAIN/register.html"
echo " Gate app   : https://$DOMAIN/gate.html"
echo " Admin      : https://$DOMAIN/admin.html"
echo " Dashboard  : https://$DOMAIN/dashboard.html"
echo ""
echo " NEXT: Edit /var/www/gev-icms/gev-icms-backend/.env"
echo "       Replace REPLACE_ME values with real keys"
echo "       Then: pm2 restart gev-icms"
echo "════════════════════════════════════════"
