#!/usr/bin/env bash
# Build on the Mac, install on the Pi.
#   PI_HOST=raspberrypi.local PI_USER=pi ./scripts/deploy.sh
# Layout on the Pi:  $APP_DIR/releases/<stamp>/  $APP_DIR/current -> latest  $APP_DIR/data (SQLite; never touched by deploys)
set -euo pipefail

PI_HOST="${PI_HOST:-raspberrypi.local}"
PI_USER="${PI_USER:-pi}"
PI_PORT="${PI_PORT:-3080}"
APP_DIR="${APP_DIR:-/home/$PI_USER/writing-studio}"
KEEP="${KEEP_RELEASES:-5}"
SSH="ssh -o ConnectTimeout=10 $PI_USER@$PI_HOST"
cd "$(dirname "$0")/.."

echo "==> Building"
command -v node >/dev/null || { echo "node is required on the Mac (>= 22.13)"; exit 1; }
node -e 'const [a,b]=process.versions.node.split(".").map(Number); if(a<22||(a===22&&b<13)){console.error("Need Node >= 22.13 locally to run the smoke test");process.exit(1)}'
npm test
STAMP="$(date +%Y%m%d%H%M%S)"
rm -rf dist && mkdir -p dist/pkg
cp -R server public package.json dist/pkg/
find dist/pkg -name '.DS_Store' -delete
echo "$STAMP" > dist/pkg/VERSION
COPYFILE_DISABLE=1 tar -C dist/pkg -czf "dist/writing-studio-$STAMP.tgz" .   # COPYFILE_DISABLE: no macOS ._ files

echo "==> Checking the Pi ($PI_USER@$PI_HOST)"
# Node may not be on the non-interactive SSH PATH (e.g. unpacked to /opt/node22): override with NODE_BIN=/path/to/node
NODE_BIN="$($SSH "for n in '${NODE_BIN:-}' /opt/node22/bin/node /usr/local/bin/node \$(command -v node); do [ -n \"\$n\" ] && [ -x \"\$n\" ] && echo \"\$n\" && break; done" || true)"
[ -n "$NODE_BIN" ] || { echo "No Node found on the Pi. Install Node 22.13+ or set NODE_BIN=/path/to/node"; exit 1; }
$SSH "'$NODE_BIN' -e 'const [a,b]=process.versions.node.split(\".\").map(Number); if(a<22||(a===22&&b<13)){console.error(\"Need Node >= 22.13, found \"+process.version);process.exit(1)}'"
echo "Using $NODE_BIN"

echo "==> Uploading"
$SSH "mkdir -p '$APP_DIR/releases/$STAMP' '$APP_DIR/data'"
scp -q "dist/writing-studio-$STAMP.tgz" "$PI_USER@$PI_HOST:/tmp/writing-studio-$STAMP.tgz"
$SSH "tar -C '$APP_DIR/releases/$STAMP' -xzf /tmp/writing-studio-$STAMP.tgz && rm /tmp/writing-studio-$STAMP.tgz && ln -sfn '$APP_DIR/releases/$STAMP' '$APP_DIR/current'"

echo "==> Installing service"
sed -e "s#__USER__#$PI_USER#g" -e "s#__APP_DIR__#$APP_DIR#g" -e "s#__PORT__#$PI_PORT#g" -e "s#__NODE__#$NODE_BIN#g" scripts/writing-studio.service \
  | $SSH 'sudo tee /etc/systemd/system/writing-studio.service >/dev/null && sudo systemctl daemon-reload && sudo systemctl enable writing-studio >/dev/null 2>&1 && sudo systemctl restart writing-studio'

echo "==> Health check"
for i in 1 2 3 4 5 6 7 8; do
  if $SSH "curl -fs http://127.0.0.1:$PI_PORT/api/health" >/dev/null 2>&1; then OK=1; break; fi; sleep 1
done
[ "${OK:-}" = 1 ] || { echo "Service did not come up. Logs: $SSH 'journalctl -u writing-studio -n 50'"; exit 1; }

$SSH "ls -1dt '$APP_DIR'/releases/* | tail -n +$((KEEP+1)) | xargs -r rm -rf"
echo "Deployed $STAMP -> http://$PI_HOST:$PI_PORT"
echo "On iOS Safari: open that URL, Share > Add to Home Screen."
