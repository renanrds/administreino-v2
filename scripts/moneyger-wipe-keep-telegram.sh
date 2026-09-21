#!/usr/bin/env bash
# TEMPORÁRIO — zera dados Moneyger preservando vínculo Telegram.
# Uso: make moneyger-wipe-keep-telegram
#      USERNAME=renanrds make moneyger-wipe-keep-telegram
set -euo pipefail

USERNAME="${USERNAME:-renanrds}"

echo "Moneyger wipe (mantém TelegramLink) — user=${USERNAME}"

docker compose -f "$(cd "$(dirname "$0")/.." && pwd)/docker-compose.yml" exec -T backend python manage.py shell <<PY
from django.contrib.auth import get_user_model
from moneyger.models import (
    Account, Budget, Category, InboxItem, InstallmentPlan,
    RecurringRule, TelegramLink, Transaction,
)
from moneyger.services import ensure_default_categories

User = get_user_model()
username = "${USERNAME}"
user = User.objects.filter(username=username).first()
if not user:
    raise SystemExit(f"Usuário não encontrado: {username}")

tg = list(TelegramLink.objects.filter(user=user).values("id", "chat_id", "link_code"))
print(f"TelegramLink preservado: {len(tg)} → {tg}")

counts = {
    "transactions": Transaction.objects.filter(user=user).count(),
    "inbox": InboxItem.objects.filter(user=user).count(),
    "budgets": Budget.objects.filter(user=user).count(),
    "installments": InstallmentPlan.objects.filter(user=user).count(),
    "recurring": RecurringRule.objects.filter(user=user).count(),
    "accounts": Account.objects.filter(user=user).count(),
    "categories": Category.objects.filter(user=user).count(),
}
print("Antes:", counts)

# Ordem por FKs
Transaction.objects.filter(user=user).delete()
InboxItem.objects.filter(user=user).delete()
Budget.objects.filter(user=user).delete()
InstallmentPlan.objects.filter(user=user).delete()
RecurringRule.objects.filter(user=user).delete()
Account.objects.filter(user=user).delete()
Category.objects.filter(user=user).delete()

ensure_default_categories(user)

print("Depois:", {
    "transactions": Transaction.objects.filter(user=user).count(),
    "inbox": InboxItem.objects.filter(user=user).count(),
    "budgets": Budget.objects.filter(user=user).count(),
    "installments": InstallmentPlan.objects.filter(user=user).count(),
    "recurring": RecurringRule.objects.filter(user=user).count(),
    "accounts": Account.objects.filter(user=user).count(),
    "categories": Category.objects.filter(user=user).count(),
    "telegram_links": TelegramLink.objects.filter(user=user).count(),
})
print("OK — dados zerados; Telegram intacto.")
PY
