#!/usr/bin/env bash
# Registra (ou atualiza) o webhook do Gastôncio.
# Uso: WEBHOOK_URL=https://host/api/moneyger/telegram/webhook/ ./scripts/moneyger-bot-set-webhook.sh
#      make moneyger-bot-webhook WEBHOOK_URL=https://host/api/moneyger/telegram/webhook/
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/backend/.env}"

_B=$'\033[1m'; _G=$'\033[32m'; _Y=$'\033[33m'; _R=$'\033[31m'; _N=$'\033[0m'
die() { echo -e "${_R}✗ $*${_N}" >&2; exit 1; }
ok()  { echo -e "${_G}✓ $*${_N}"; }

[[ -f "$ENV_FILE" ]] || die "Arquivo de env não encontrado: $ENV_FILE"
[[ -n "${WEBHOOK_URL:-}" ]] || die "Informe WEBHOOK_URL=https://seu-host/api/moneyger/telegram/webhook/"

# Normaliza barra final
WEBHOOK_URL="${WEBHOOK_URL%/}/"
case "$WEBHOOK_URL" in
  */api/moneyger/telegram/webhook/) ;;
  *) die "WEBHOOK_URL deve terminar em /api/moneyger/telegram/webhook/ (recebido: $WEBHOOK_URL)" ;;
esac

set -a
# shellcheck source=/dev/null
source <(grep -E '^[A-Za-z_][A-Za-z0-9_]*=' "$ENV_FILE" | sed 's/\r$//')
set +a

TOKEN="${MONEYGER_TELEGRAM_BOT_TOKEN:-}"
SECRET="${MONEYGER_TELEGRAM_WEBHOOK_SECRET:-}"
[[ -n "$TOKEN" ]] || die "MONEYGER_TELEGRAM_BOT_TOKEN vazio"

echo -e "${_B}Registrando webhook${_N}"
echo "  url: $WEBHOOK_URL"

PAYLOAD="$(python3 - <<PY
import json
print(json.dumps({
    "url": "${WEBHOOK_URL}",
    "secret_token": """${SECRET}""",
    "drop_pending_updates": True,
    "allowed_updates": ["message", "edited_message", "callback_query"],
}))
PY
)"

RESP="$(curl -sS --max-time 20 \
  -X POST "https://api.telegram.org/bot${TOKEN}/setWebhook" \
  -H 'Content-Type: application/json' \
  -d "$PAYLOAD")"

python3 - "$RESP" <<'PY'
import json, sys
data = json.loads(sys.argv[1])
if not data.get("ok"):
    print(data)
    sys.exit(1)
print(data.get("description") or "ok")
PY

ok "Webhook atualizado"
echo ""
echo "Rodando checagem..."
export ENV_FILE
export CHECK_SCOPE="${CHECK_SCOPE:-}"
"$ROOT/scripts/moneyger-bot-check.sh"
