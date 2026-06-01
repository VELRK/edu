#!/usr/bin/env bash
# =============================================================================
# deploy.sh  —  Build React & upload everything to cPanel / public_html/edu
#
# Usage:
#   chmod +x deploy.sh
#   ./deploy.sh
#
# Required env vars (set in your shell or a local .deploy.env file):
#   FTP_HOST   — e.g. ftp.yourdomain.com
#   FTP_USER   — your cPanel FTP username
#   FTP_PASS   — your cPanel FTP password
#   FTP_PATH   — remote path, typically /public_html/edu
#
# Optional (defaults shown):
#   REACT_DIR  — path to the react-app folder (default: ./react-app)
# =============================================================================

set -euo pipefail

# ── Load optional local deploy config ────────────────────────────────────────
[ -f .deploy.env ] && source .deploy.env

# ── Validate required vars ───────────────────────────────────────────────────
: "${FTP_HOST:?Set FTP_HOST}"
: "${FTP_USER:?Set FTP_USER}"
: "${FTP_PASS:?Set FTP_PASS}"
: "${FTP_PATH:=/public_html/edu}"

REACT_DIR="${REACT_DIR:-./react-app}"

echo "======================================================"
echo "  TNPSC Edu — Deployment Pipeline"
echo "  Target: ${FTP_USER}@${FTP_HOST}:${FTP_PATH}"
echo "======================================================"

# ── Step 1: Build React app ───────────────────────────────────────────────────
echo ""
echo "[1/4] Building React app..."
cd "$REACT_DIR"
npm ci --silent
npm run build          # uses .env.production → VITE_API_BASE=/edu
cd ..
echo "      ✓ Build complete → react-app/dist/"

# ── Step 2: Create exclusion list ────────────────────────────────────────────
echo ""
echo "[2/4] Preparing upload exclusions..."
EXCLUDE_FILE=$(mktemp)
cat > "$EXCLUDE_FILE" <<'EXCLUDES'
react-app/node_modules
react-app/src
react-app/.env
react-app/vite.config.js
react-app/package*.json
react-app/eslint.config.*
.git
.gitignore
.deploy.env
.env
deploy.sh
application/logs/*.php
application/cache/*
EXCLUDES
echo "      ✓ Exclusion list ready"

# ── Step 3: Upload via FTP (lftp) ─────────────────────────────────────────────
# Install lftp: sudo apt install lftp  (Ubuntu/WSL)
#               brew install lftp      (macOS)
echo ""
echo "[3/4] Uploading to server via FTP..."
lftp -c "
  set ftp:ssl-allow no;
  open -u '${FTP_USER}','${FTP_PASS}' '${FTP_HOST}';
  mirror --reverse --delete --verbose \
    --exclude-glob-from='${EXCLUDE_FILE}' \
    . '${FTP_PATH}';
  bye
"
rm -f "$EXCLUDE_FILE"
echo "      ✓ Upload complete"

# ── Step 4: Upload server .env (never in the mirror) ─────────────────────────
# Create a production .env from your local .env.server if it exists
echo ""
echo "[4/4] Uploading server .env..."
if [ -f ".env.server" ]; then
  lftp -c "
    set ftp:ssl-allow no;
    open -u '${FTP_USER}','${FTP_PASS}' '${FTP_HOST}';
    put -O '${FTP_PATH}' .env.server -o .env;
    bye
  "
  echo "      ✓ Server .env uploaded"
else
  echo "      ⚠ No .env.server found — skipping"
  echo "        Create .env.server from .env.example with real production values"
fi

echo ""
echo "======================================================"
echo "  Deploy finished!"
echo "  Site: https://yourdomain.com/edu/"
echo "  React app: https://yourdomain.com/edu/react-app/dist/"
echo "  API docs: https://yourdomain.com/edu/api-docs.html"
echo "======================================================"
