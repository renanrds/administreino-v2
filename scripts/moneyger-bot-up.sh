#!/usr/bin/env bash
# Sobe túnel HTTPS (cloudflared em Docker) → host:8000, registra webhook e checa o bot.
# Uso: ./scripts/moneyger-bot-up.sh
#      make moneyger-bot-check
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/backend/.env}"
TUNNEL_DIR="${TUNNEL_DIR:-$ROOT/.moneyger-tunnel}"
URL_FILE="$TUNNEL_DIR/url"
CONTAINER="${MONEYGER_TUNNEL_CONTAINER:-moneyger_cf_tunnel}"
IMAGE="${MONEYGER_TUNNEL_IMAGE:-cloudflare/cloudflared:latest}"
LOCAL_PORT="${LOCAL_PORT:-8000}"
LOCAL_URL="http://127.0.0.1:${LOCAL_PORT}"

_B=$'\033[1m'; _G=$'\033[32m'; _Y=$'\033[33m'; _R=$'\033[31m'; _D=$'\033[2m'; _N=$'\033[0m'
die() { echo -e "${_R}✗ $*${_N}" >&2; exit 1; }
ok()  { echo -e "${_G}✓ $*${_N}"; }
warn(){ echo -e "${_Y}! $*${_N}"; }
info(){ echo -e "${_D}  $*${_N}"; }

command -v docker >/dev/null || die "docker não encontrado"
command -v curl >/dev/null || die "curl não encontrado"
[[ -f "$ENV_FILE" ]] || die "Arquivo de env não encontrado: $ENV_FILE"

mkdir -p "$TUNNEL_DIR"

echo ""
echo -e "${_B}Moneyger — túnel HTTPS + webhook do Gastôncio${_N}"
echo ""

set +e
LOCAL_CODE="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 5 "${LOCAL_URL}/api/docs/" 2>/dev/null)"
set -e
if [[ ! "${LOCAL_CODE:-000}" =~ ^(200|301|302|401|403)$ ]]; then
  set +e
  LOCAL_CODE="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 5 "${LOCAL_URL}/api/schema/" 2>/dev/null)"
  set -e
fi
if [[ "${LOCAL_CODE:-000}" =~ ^(200|301|302|401|403)$ ]]; then
  ok "Backend local em ${LOCAL_URL} (HTTP ${LOCAL_CODE})"
else
  die "Backend não responde em ${LOCAL_URL}. Suba com: make up"
fi

tunnel_running() {
  docker ps --format '{{.Names}}' 2>/dev/null | grep -qx "$CONTAINER"
}

extract_url_from_logs() {
  docker logs "$CONTAINER" 2>&1 | grep -Eo 'https://[a-zA-Z0-9.-]+\.trycloudflare\.com' | tail -1 || true
}

stop_tunnel() {
  if docker ps -a --format '{{.Names}}' 2>/dev/null | grep -qx "$CONTAINER"; then
    docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
    ok "Túnel anterior encerrado ($CONTAINER)"
  fi
  rm -f "$URL_FILE"
}

PUBLIC_BASE=""
if tunnel_running && [[ -f "$URL_FILE" ]]; then
  PUBLIC_BASE="$(tr -d '\r\n' < "$URL_FILE")"
  set +e
  PROBE="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 10 "${PUBLIC_BASE}/api/docs/" 2>/dev/null)"
  set -e
  if [[ "${PROBE:-000}" =~ ^(200|301|302|401|403)$ ]]; then
    ok "Reutilizando túnel ativo: $PUBLIC_BASE"
  else
    warn "Túnel antigo inacessível — reiniciando"
    stop_tunnel
    PUBLIC_BASE=""
  fi
elif tunnel_running; then
  PUBLIC_BASE="$(extract_url_from_logs)"
  if [[ -n "$PUBLIC_BASE" ]]; then
    echo "$PUBLIC_BASE" > "$URL_FILE"
    ok "Túnel ativo recuperado: $PUBLIC_BASE"
  else
    warn "Container sem URL — reiniciando"
    stop_tunnel
  fi
fi

if [[ -z "$PUBLIC_BASE" ]]; then
  echo -e "${_B}Subindo cloudflared (Docker) → host:${LOCAL_PORT}${_N}"
  docker pull -q "$IMAGE" >/dev/null || true
  docker run -d --name "$CONTAINER" \
    --add-host=host.docker.internal:host-gateway \
    --restart unless-stopped \
    "$IMAGE" tunnel --no-autoupdate --url "http://host.docker.internal:${LOCAL_PORT}" \
    >/dev/null
  info "container $CONTAINER"

  PUBLIC_BASE=""
  for i in $(seq 1 40); do
    PUBLIC_BASE="$(extract_url_from_logs)"
    if [[ -n "$PUBLIC_BASE" ]]; then
      break
    fi
    if ! tunnel_running; then
      docker logs "$CONTAINER" 2>&1 | tail -n 40 || true
      die "cloudflared morreu antes de publicar a URL"
    fi
    sleep 0.5
  done
  [[ -n "$PUBLIC_BASE" ]] || {
    docker logs "$CONTAINER" 2>&1 | tail -n 40 || true
    die "Timeout esperando URL *.trycloudflare.com"
  }
  echo "$PUBLIC_BASE" > "$URL_FILE"
  ok "Túnel público: $PUBLIC_BASE"

  echo -e "${_B}Aguardando DNS/HTTP do túnel${_N}"
  READY=0
  for i in $(seq 1 60); do
    set +e
    CODE="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 8 "${PUBLIC_BASE}/api/docs/" 2>/dev/null)"
    set -e
    if [[ "${CODE:-000}" =~ ^(200|301|302|401|403)$ ]]; then
      READY=1
      ok "Túnel alcançável (HTTP $CODE)"
      break
    fi
    sleep 1
  done
  [[ "$READY" -eq 1 ]] || die "Túnel publicou URL mas ainda não responde em ${PUBLIC_BASE}"
fi

WEBHOOK_URL="${PUBLIC_BASE%/}/api/moneyger/telegram/webhook/"
export ENV_FILE WEBHOOK_URL

echo ""
"$ROOT/scripts/moneyger-bot-set-webhook.sh"

echo ""
ok "Túnel permanece em background"
info "URL: $PUBLIC_BASE"
info "Parar: make moneyger-bot-tunnel-stop"
info "Logs: docker logs -f $CONTAINER"
echo ""
