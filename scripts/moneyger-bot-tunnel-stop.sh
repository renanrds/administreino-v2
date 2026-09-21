#!/usr/bin/env bash
# Encerra o túnel HTTPS do Moneyger (container cloudflared).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TUNNEL_DIR="${TUNNEL_DIR:-$ROOT/.moneyger-tunnel}"
URL_FILE="$TUNNEL_DIR/url"
CONTAINER="${MONEYGER_TUNNEL_CONTAINER:-moneyger_cf_tunnel}"

_G=$'\033[32m'; _Y=$'\033[33m'; _D=$'\033[2m'; _N=$'\033[0m'

if docker ps -a --format '{{.Names}}' 2>/dev/null | grep -qx "$CONTAINER"; then
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  echo -e "${_G}✓ Túnel encerrado ($CONTAINER)${_N}"
else
  echo -e "${_Y}! Nenhum container $CONTAINER${_N}"
fi
rm -f "$URL_FILE"
echo -e "${_D}  (webhook do Telegram permanece apontando para a URL antiga até o próximo make moneyger-bot-check)${_N}"
