"""Lista de mercado no Gastôncio: um item por mensagem, com remover e prazo."""
from __future__ import annotations

import logging
import re
from datetime import timedelta
from decimal import Decimal, InvalidOperation

from django.db import transaction
from django.utils import timezone

from . import persona
from .models import BotMarketDraft, MarketList, MarketListItem

logger = logging.getLogger(__name__)

IDLE_WARN = timedelta(minutes=5)
IDLE_FINISH = timedelta(minutes=10)

_START_RE = re.compile(
    r'^/(?:mercado|lista)(?:@\w+)?(?:\s+(.*))?$',
    re.IGNORECASE,
)
_PHRASE_RE = re.compile(
    r'^(?:lista\s+de\s+mercado|modo\s+mercado|nova\s+lista(?:\s+de\s+mercado)?)$',
    re.IGNORECASE,
)
_FINISH_RE = re.compile(r'^(?:/)?(?:pronto|fim|finalizar)(?:@\w+)?$', re.IGNORECASE)
_CANCEL_RE = re.compile(r'^(?:/)?(?:cancelar|cancela)(?:@\w+)?$', re.IGNORECASE)


def market_controls(*, include_remove: bool) -> dict:
    rows = []
    if include_remove:
        rows.append([{'text': 'Remover', 'callback_data': 'mg:mk:rm'}])
    rows.append([
        {'text': 'Finalizar', 'callback_data': 'mg:mk:end'},
        {'text': 'Cancelar', 'callback_data': 'mg:mk:stop'},
    ])
    return {'inline_keyboard': rows}


def parse_market_limit(text: str) -> Decimal | None:
    raw = (text or '').strip().lower()
    raw = raw.replace('r$', '').replace('reais', '').strip()
    if not raw:
        return None
    if ',' in raw:
        raw = raw.replace('.', '').replace(',', '.')
    try:
        value = Decimal(raw)
    except (InvalidOperation, ValueError):
        return None
    if value <= 0 or value > Decimal('1000000'):
        return None
    return value.quantize(Decimal('0.01'))


def _touch(draft: BotMarketDraft):
    draft.last_activity_at = timezone.now()
    draft.warned_at = None
    draft.save(update_fields=['last_activity_at', 'warned_at'])


def _saved_count(draft: BotMarketDraft) -> int:
    if not draft.market_list_id:
        return 0
    return draft.market_list.items.count()


def _commit_pending(draft: BotMarketDraft) -> bool:
    name = (draft.pending_name or '').strip()
    if not name or not draft.market_list_id:
        draft.pending_name = ''
        return False
    order = draft.market_list.items.count()
    MarketListItem.objects.create(
        market_list=draft.market_list,
        name=name[:200],
        sort_order=order,
    )
    draft.pending_name = ''
    return True


def _reply(chat_id: str, text: str, markup: dict | None = None):
    from .telegram import send_telegram_message
    send_telegram_message(chat_id, text, reply_markup=markup)


def start_market_draft(user, chat_id: str, limit: Decimal | None = None) -> None:
    existing = BotMarketDraft.objects.filter(user=user).first()
    if existing:
        _reply(chat_id, persona.market_already_open(), market_controls(include_remove=bool(existing.pending_name)))
        return
    now = timezone.now()
    draft = BotMarketDraft.objects.create(
        user=user,
        chat_id=str(chat_id),
        phase=BotMarketDraft.Phase.LIMIT,
        last_activity_at=now,
    )
    if limit is None:
        _reply(chat_id, persona.market_ask_limit(), market_controls(include_remove=False))
        return
    _apply_limit(draft, limit)


def _apply_limit(draft: BotMarketDraft, limit: Decimal) -> None:
    market_list = MarketList.objects.create(
        user=draft.user,
        title='Lista de mercado',
        limit_amount=limit,
    )
    draft.market_list = market_list
    draft.phase = BotMarketDraft.Phase.ITEMS
    draft.pending_name = ''
    draft.last_activity_at = timezone.now()
    draft.warned_at = None
    draft.save(update_fields=[
        'market_list', 'phase', 'pending_name', 'last_activity_at', 'warned_at',
    ])
    _reply(draft.chat_id, persona.market_collect_items(limit), market_controls(include_remove=False))


def _offer_pending(draft: BotMarketDraft) -> None:
    _reply(
        draft.chat_id,
        persona.market_item_pending(draft.pending_name, _saved_count(draft)),
        market_controls(include_remove=True),
    )


def _accept_item(draft: BotMarketDraft, name: str) -> None:
    name = re.sub(r'\s+', ' ', name).strip()[:200]
    if not name:
        _reply(draft.chat_id, persona.market_need_limit() if draft.phase == BotMarketDraft.Phase.LIMIT else persona.market_text_only())
        return
    _commit_pending(draft)
    draft.pending_name = name
    draft.last_activity_at = timezone.now()
    draft.warned_at = None
    draft.save(update_fields=['pending_name', 'last_activity_at', 'warned_at'])
    _offer_pending(draft)


def finish_market_draft(draft: BotMarketDraft, *, auto: bool) -> None:
    with transaction.atomic():
        locked = BotMarketDraft.objects.select_for_update().filter(pk=draft.pk).first()
        if locked is None:
            return
        closing = _close_locked(locked, auto=auto)
    chat_id, text, markup = closing
    _reply(chat_id, text, markup)


def cancel_market_draft(draft: BotMarketDraft) -> None:
    chat_id = draft.chat_id
    with transaction.atomic():
        locked = BotMarketDraft.objects.select_for_update().filter(pk=draft.pk).first()
        if locked is None:
            return
        market_list = locked.market_list
        locked.delete()
        if market_list is not None:
            market_list.delete()
    _reply(chat_id, persona.market_cancelled(), persona.nav_markup())


def remove_pending_item(draft: BotMarketDraft) -> None:
    name = (draft.pending_name or '').strip()
    if not name:
        _reply(draft.chat_id, persona.market_nothing_to_remove(), market_controls(include_remove=False))
        return
    draft.pending_name = ''
    draft.last_activity_at = timezone.now()
    draft.warned_at = None
    draft.save(update_fields=['pending_name', 'last_activity_at', 'warned_at'])
    _reply(draft.chat_id, persona.market_item_removed(name), market_controls(include_remove=False))


def handle_market_incoming(user, chat_id: str, text: str) -> bool:
    """Consome a mensagem se for início ou continuação da lista. True = já respondido."""
    raw = (text or '').strip()
    if not raw:
        return False
    draft = BotMarketDraft.objects.filter(user=user).first()
    start = _START_RE.match(raw)
    phrase = _PHRASE_RE.match(raw)
    if draft is None and not start and not phrase:
        return False
    if draft is None:
        extra = (start.group(1) or '').strip() if start else ''
        limit = parse_market_limit(extra) if extra and not _PHRASE_RE.match(extra) else None
        if extra and limit is None and start and extra.lower() not in ('de mercado',):
            # "/mercado arroz" ainda não tem teto — pede o número.
            limit = None
        start_market_draft(user, chat_id, limit)
        return True

    if _CANCEL_RE.match(raw):
        cancel_market_draft(draft)
        return True
    if _FINISH_RE.match(raw):
        finish_market_draft(draft, auto=False)
        return True
    if start or phrase:
        _reply(chat_id, persona.market_already_open(), market_controls(include_remove=bool(draft.pending_name)))
        return True

    from .telegram import detect_status_intent
    if detect_status_intent(raw):
        _touch(draft)
        return False

    if draft.phase == BotMarketDraft.Phase.LIMIT:
        limit = parse_market_limit(raw)
        if limit is None:
            _touch(draft)
            _reply(draft.chat_id, persona.market_need_limit(), market_controls(include_remove=False))
            return True
        _apply_limit(draft, limit)
        return True

    _accept_item(draft, raw)
    return True


def handle_market_media(user, chat_id: str, has_media: bool) -> bool:
    if not has_media:
        return False
    draft = BotMarketDraft.objects.filter(user=user).first()
    if draft is None:
        return False
    _touch(draft)
    _reply(chat_id, persona.market_text_only(), market_controls(include_remove=bool(draft.pending_name)))
    return True


def handle_market_callback(user, chat_id: str, data: str) -> bool:
    if not data.startswith('mg:mk:'):
        return False
    action = data.split(':')[-1]
    if action == 'go':
        start_market_draft(user, chat_id)
        return True
    draft = BotMarketDraft.objects.filter(user=user).first()
    if draft is None:
        _reply(chat_id, persona.market_cancelled(), persona.nav_markup())
        return True
    if action == 'rm':
        remove_pending_item(draft)
    elif action == 'end':
        finish_market_draft(draft, auto=False)
    elif action == 'stop':
        cancel_market_draft(draft)
    return True


def sweep_market_drafts(now=None) -> None:
    """Avisa aos 5 min parado e fecha aos 10."""
    now = now or timezone.now()
    warn_before = now - IDLE_WARN
    finish_before = now - IDLE_FINISH
    due_ids = list(
        BotMarketDraft.objects.filter(last_activity_at__lte=warn_before).values_list('pk', flat=True)
    )
    for draft_id in due_ids:
        closing = None
        with transaction.atomic():
            draft = (
                BotMarketDraft.objects.select_for_update()
                .filter(pk=draft_id)
                .first()
            )
            if draft is None or draft.last_activity_at > warn_before:
                continue
            if draft.last_activity_at <= finish_before:
                closing = _close_locked(draft, auto=True)
            elif draft.warned_at is None:
                draft.warned_at = now
                draft.save(update_fields=['warned_at'])
                pending = 1 if (draft.pending_name or '').strip() else 0
                text = persona.market_idle_nudge(
                    has_limit=draft.phase == BotMarketDraft.Phase.ITEMS,
                    saved_count=_saved_count(draft) + pending,
                )
                markup = market_controls(include_remove=bool(draft.pending_name))
                closing = (draft.chat_id, text, markup)
        if closing:
            chat_id, text, markup = closing
            _reply(chat_id, text, markup)


def _close_locked(draft: BotMarketDraft, *, auto: bool):
    """Fecha o rascunho já travado na transação. Devolve (chat, texto, markup)."""
    chat_id = draft.chat_id
    if draft.phase == BotMarketDraft.Phase.LIMIT or not draft.market_list_id:
        draft.delete()
        text = persona.market_abandoned_limit() if auto else persona.market_empty_closed(auto=False)
        return chat_id, text, persona.nav_markup()
    _commit_pending(draft)
    market_list = draft.market_list
    names = list(market_list.items.order_by('sort_order', 'id').values_list('name', flat=True))
    limit = market_list.limit_amount
    draft.delete()
    if not names:
        market_list.delete()
        return chat_id, persona.market_empty_closed(auto=auto), persona.nav_markup()
    return chat_id, persona.market_finished(names, limit, auto=auto), persona.nav_markup()
