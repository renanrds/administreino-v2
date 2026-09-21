#!/usr/bin/env bash
# Registra o webhook de produção. Não sobe túnel local.
# Uso: ./scripts/moneyger-bot-webhook-prod.sh
#      make moneyger-bot-webhook-prod
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/.env.prod}"

_R=$'\033[31m'; _N=$'\033[0m'
die() { echo -e "${_R}✗ $*${_N}" >&2; exit 1; }

[[ -f "$ENV_FILE" ]] || die "Arquivo de env não encontrado: $ENV_FILE"

set -a
# shellcheck source=/dev/null
source <(grep -E '^[A-Za-z_][A-Za-z0-9_]*=' "$ENV_FILE" | sed 's/\r$//')
set +a

BASE="${MONEYGER_PUBLIC_BASE_URL:-}"
BASE="${BASE%/}"
if [[ -z "$BASE" ]]; then
  IFS=',' read -ra hosts <<< "${ALLOWED_HOSTS:-}"
  for host in "${hosts[@]}"; do
    host="${host//[[:space:]]/}"
    case "$host" in
      ""|localhost|127.0.0.1|0.0.0.0|backend|testserver) continue ;;
      *) BASE="https://${host}"; break ;;
    esac
  done
fi
[[ -n "$BASE" ]] || die "Defina MONEYGER_PUBLIC_BASE_URL em .env.prod"
case "$BASE" in
  https://*) ;;
  *) die "MONEYGER_PUBLIC_BASE_URL deve começar com https:// (recebido: $BASE)" ;;
esac

export ENV_FILE
export CHECK_SCOPE=prod
export WEBHOOK_URL="${BASE}/api/moneyger/telegram/webhook/"
exec "$ROOT/scripts/moneyger-bot-set-webhook.sh"
