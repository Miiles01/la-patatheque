#!/usr/bin/env bash
# Builds the real site (with the API) and uploads it to Hostinger over SSH.
#   scripts/deploy-hostinger.sh
# Needs the SSH key in hPanel and ~/patatheque-config.php on the server
# (see server/patatheque-config.example.php).
set -euo pipefail

SSH_HOST="u177100716@82.29.80.5"
SSH_PORT=65002
SSH_KEY="$HOME/.ssh/id_hostinger"
SITE="${SITE:-mediumaquamarine-stinkbug-445677.hostingersite.com}"
REMOTE="domains/$SITE/public_html"

cd "$(dirname "$0")/.."
ssh_() { ssh -i "$SSH_KEY" -p "$SSH_PORT" "$SSH_HOST" "$@"; }

VITE_API=/api/ npm run build
mkdir -p dist/api
cp server/api/index.php server/api/lib.php server/api/migrate.php server/api/.htaccess dist/api/
cp src/data/menu.json dist/api/menu-default.json

# Uploaded menu photos live in public_html/uploads: never delete them.
rsync -az --delete --exclude uploads/ --exclude .well-known/ \
  -e "ssh -i $SSH_KEY -p $SSH_PORT" dist/ "$SSH_HOST:$REMOTE/"

if ssh_ "grep -q \"'db_pass' => ''\" ~/patatheque-config.php 2>/dev/null || test ! -f ~/patatheque-config.php"; then
  echo "Database not configured yet: fill in ~/patatheque-config.php, then run: php $REMOTE/api/migrate.php"
else
  ssh_ "cd $REMOTE && php api/migrate.php"
fi
echo "Deployed to https://$SITE/"
