#!/usr/bin/env bash
# Verifica conexão do Gastôncio (Telegram) com a API e o webhook.
# Uso: ./scripts/moneyger-bot-check.sh
#      ENV_FILE=backend/.env ./scripts/moneyger-bot-check.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/backend/.env}"

_B=$'\033[1m'; _G=$'\033[32m'; _Y=$'\033[33m'; _R=$'\033[31m'; _D=$'\033[2m'; _N=$'\033[0m'

die() { echo -e "${_R}✗ $*${_N}" >&2; exit 1; }
ok()  { echo -e "${_G}✓ $*${_N}"; }
warn(){ echo -e "${_Y}! $*${_N}"; }
info(){ echo -e "${_D}  $*${_N}"; }

[[ -f "$ENV_FILE" ]] || die "Arquivo de env não encontrado: $ENV_FILE"

# shellcheck disable=SC1090
set -a
# shellcheck source=/dev/null
source <(grep -E '^[A-Za-z_][A-Za-z0-9_]*=' "$ENV_FILE" | sed 's/\r$//')
set +a

TOKEN="${MONEYGER_TELEGRAM_BOT_TOKEN:-}"
SECRET="${MONEYGER_TELEGRAM_WEBHOOK_SECRET:-}"
USERNAME="${MONEYGER_TELEGRAM_BOT_USERNAME:-}"
CHECK_SCOPE="${CHECK_SCOPE:-}"

# URL pública esperada em produção (MONEYGER_PUBLIC_BASE_URL ou o primeiro ALLOWED_HOSTS real).
public_base() {
  local base="${MONEYGER_PUBLIC_BASE_URL:-}"
  base="${base%/}"
  if [[ -n "$base" ]]; then
    printf '%s' "$base"
    return
  fi
  [[ "$CHECK_SCOPE" == "prod" ]] || return 0
  local host
  local IFS=','
  read -ra hosts <<< "${ALLOWED_HOSTS:-}"
  for host in "${hosts[@]}"; do
    host="${host//[[:space:]]/}"
    case "$host" in
      ""|localhost|127.0.0.1|0.0.0.0|backend|testserver) continue ;;
      *) printf 'https://%s' "$host"; return ;;
    esac
  done
}

echo ""
echo -e "${_B}Moneyger — checagem do bot Telegram (Gastôncio)${_N}"
echo -e "${_D}env: $ENV_FILE${_N}"
echo ""

[[ -n "$TOKEN" ]] || die "MONEYGER_TELEGRAM_BOT_TOKEN vazio"
ok "Token configurado (${#TOKEN} chars)"
if [[ -n "$SECRET" ]]; then
  ok "Webhook secret configurado (${#SECRET} chars)"
else
  warn "MONEYGER_TELEGRAM_WEBHOOK_SECRET vazio (webhook sem secret_token)"
fi
if [[ -n "$USERNAME" ]]; then
  info "username no .env: @$USERNAME"
fi

tg() {
  local method="$1"
  local url="https://api.telegram.org/bot${TOKEN}/${method}"
  curl -sS --fail --max-time 20 "$url"
}

echo ""
echo -e "${_B}1) getMe${_N}"
ME_JSON="$(tg getMe)" || die "Falha ao chamar getMe (rede/token)"
python3 - "$ME_JSON" <<'PY'
import json, sys
data = json.loads(sys.argv[1])
if not data.get("ok"):
    print("API respondeu ok=false:", data)
    sys.exit(1)
r = data.get("result") or {}
print(f"bot: @{r.get('username')}  id={r.get('id')}  nome={r.get('first_name')}")
if not r.get("username"):
    sys.exit(2)
PY
ok "API Telegram respondeu (bot autenticado)"

echo ""
echo -e "${_B}2) getWebhookInfo${_N}"
WH_JSON="$(tg getWebhookInfo)" || die "Falha ao chamar getWebhookInfo"
set +e
python3 - "$WH_JSON" <<'PY'
import json, sys, time
data = json.loads(sys.argv[1])
if not data.get("ok"):
    print("API respondeu ok=false:", data)
    sys.exit(1)
info = data.get("result") or {}
url = (info.get("url") or "").strip()
pending = info.get("pending_update_count")
err = info.get("last_error_message") or ""
err_ts = info.get("last_error_date")
ip = info.get("ip_address") or ""
print(f"url: {url or '(nenhuma)'}")
print(f"pending_updates: {pending}")
if ip:
    print(f"ip: {ip}")
if err:
    when = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(err_ts)) if err_ts else "?"
    print(f"last_error ({when}): {err}")
    sys.exit(3)
if not url:
    print("webhook não registrado")
    sys.exit(4)
sys.exit(0)
PY
WH_RC=$?
set -e

case "$WH_RC" in
  0) ok "Webhook registrado e sem erro recente" ;;
  3) warn "Webhook registrado, mas Telegram reporta erro recente" ;;
  4) warn "Nenhum webhook registrado" ;;
  *) die "getWebhookInfo falhou (código $WH_RC)" ;;
esac

WEBHOOK_URL="$(python3 -c 'import json,sys; print((json.loads(sys.argv[1]).get("result") or {}).get("url") or "")' "$WH_JSON")"
EXPECTED_WH=""
MISMATCH=0
if [[ "$CHECK_SCOPE" == "prod" ]]; then
  BASE="$(public_base)"
  [[ -n "$BASE" ]] || die "Defina MONEYGER_PUBLIC_BASE_URL (https://seu-dominio) em .env.prod"
  case "$BASE" in
    https://*) ;;
    *) die "MONEYGER_PUBLIC_BASE_URL deve começar com https:// (recebido: $BASE)" ;;
  esac
  EXPECTED_WH="${BASE%/}/api/moneyger/telegram/webhook/"
  CURRENT_WH="${WEBHOOK_URL%/}/"
  [[ -n "$WEBHOOK_URL" ]] || CURRENT_WH=""
  if [[ "$CURRENT_WH" == "$EXPECTED_WH" ]]; then
    ok "Webhook aponta para produção ($EXPECTED_WH)"
  else
    MISMATCH=1
    warn "Webhook não aponta para produção"
    info "esperado: $EXPECTED_WH"
    info "atual:    ${WEBHOOK_URL:-"(nenhum)"}"
  fi
fi

probe_webhook() {
  local url="$1"
  local label="$2"
  echo ""
  echo -e "${_B}${label}${_N}"
  set +e
  HTTP_CODE="$(curl -sS -o /tmp/moneyger-wh-probe.body -w '%{http_code}' --max-time 20 \
    -X POST "$url" \
    -H 'Content-Type: application/json' \
    ${SECRET:+-H "X-Telegram-Bot-Api-Secret-Token: $SECRET"} \
    -d '{}')"
  CURL_RC=$?
  set -e
  BODY_SNIP="$(head -c 160 /tmp/moneyger-wh-probe.body 2>/dev/null | tr '\n' ' ' || true)"
  info "POST $url → HTTP ${HTTP_CODE:-000} (curl=$CURL_RC)"
  [[ -n "$BODY_SNIP" ]] && info "body: $BODY_SNIP"
  case "${HTTP_CODE:-000}" in
    200) ok "Endpoint do webhook alcançável" ;;
    403) warn "Endpoint respondeu 403 (secret diferente do configurado no servidor)" ;;
    404) warn "Endpoint respondeu 404 (rota Moneyger ainda não está nesse servidor)" ;;
    000|"") warn "Endpoint inacessível (DNS/SSL/túnel)" ;;
    5*) warn "Endpoint com erro de servidor ($HTTP_CODE)" ;;
    *) warn "HTTP inesperado no webhook: $HTTP_CODE" ;;
  esac
}

if [[ "$CHECK_SCOPE" == "prod" && -n "$EXPECTED_WH" ]]; then
  probe_webhook "$EXPECTED_WH" "3) Probe do webhook de produção"
elif [[ -n "$WEBHOOK_URL" ]]; then
  probe_webhook "$WEBHOOK_URL" "3) Probe do endpoint do webhook"
fi

echo ""
if [[ "$CHECK_SCOPE" == "prod" && "$MISMATCH" -ne 0 ]]; then
  warn "Bot autenticado, mas o webhook ativo não é o de produção"
  echo -e "${_D}  Dica: make moneyger-bot-webhook-prod${_N}"
  exit 1
fi
if [[ "$WH_RC" -eq 0 && "${HTTP_CODE:-200}" == "200" ]]; then
  ok "Conexão do bot OK"
  exit 0
fi
warn "Bot autenticado, mas webhook precisa de atenção"
if [[ "$CHECK_SCOPE" == "prod" ]]; then
  echo -e "${_D}  Dica: make moneyger-bot-webhook-prod${_N}"
else
  echo -e "${_D}  Dica: make moneyger-bot-check (sobe túnel HTTPS na :8000 e registra o webhook)${_N}"
fi
exit 1
