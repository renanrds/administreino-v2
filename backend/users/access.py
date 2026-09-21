"""Acesso ao módulo Moneyger (allowlist + superuser)."""
from decouple import config


def moneyger_allowed_usernames() -> set[str]:
    raw = config('MONEYGER_ALLOWED_USERNAMES', default='renanrds')
    return {u.strip().lower() for u in raw.split(',') if u.strip()}


def user_has_moneyger_access(user) -> bool:
    if not user or not getattr(user, 'is_authenticated', False):
        return False
    if getattr(user, 'is_superuser', False):
        return True
    username = (getattr(user, 'username', '') or '').strip().lower()
    return username in moneyger_allowed_usernames()


def apps_payload_for_user(user) -> dict:
    return {
        'moneyger': user_has_moneyger_access(user),
    }
