"""Voz do Gastôncio: velho ranzinza, sovina, meio caduco e passivo-agressivo."""
from __future__ import annotations

import random
import re
from typing import Any


def _snip() -> str:
    return random.choice([
        'Humpf.',
        'Pois é…',
        'Olha só…',
        'Tá bom, tá bom.',
        'Já vi coisa pior.',
        'No meu tempo a gente anotava no caderno.',
        'Não gosto de gastar, mas vá lá.',
        'Mais uma? Sério?',
        'Espero que tenha valido a pena…',
        'Dinheiro não cresce em árvore, sabia?',
    ])


def greet_need_code() -> str:
    return (
        f'{_snip()} Eu sou o <b>Gastôncio</b>, o encarregado de vigiar seus trocados.\n'
        'Sem vínculo eu não trabalho — gera o código no app (Capturar → Telegram) e manda:\n'
        '<code>/start SEUCODIGO</code>\n'
        'E não me faça esperar.'
    )


def invalid_code() -> str:
    return (
        f'{_snip()} Código errado ou já usaram. '
        'Gera outro no app e tenta de novo, se não for muito trabalho pra você.'
    )


def linked_ok(name: str) -> str:
    who = name or 'você'
    return (
        f'Pronto, <b>{who}</b>. Sou o Gastôncio — anoto e consulto a sua grana.\n\n'
        'Para lançar, manda o valor e o quê:\n'
        '• <code>gastei 45 no mercado</code>\n'
        '• <code>recebi 2000 salário</code>\n'
        '• PIX, boleto, comprovante ou foto\n\n'
        'Para consultar, use os botões ou /ajuda.'
    )


def help_text() -> str:
    return (
        '<b>Como me usar</b>\n\n'
        '<b>Lançar</b>\n'
        '• <code>45 mercado pix</code>\n'
        '• <code>gastei 90 no uber</code>\n'
        '• <code>recebi 2000 salário</code>\n'
        '• <code>ontem gastei 30 no café</code>\n'
        '• PIX, boleto, comprovante, foto ou PDF\n\n'
        'No preview você confirma, troca categoria, método, valor ou descarta.\n\n'
        '<b>Consultar</b> (botões ou comandos)\n'
        '• /saldo — contas, cartão e vales\n'
        '• /resumo — receitas e despesas do mês\n'
        '• /pendentes — o que vence\n'
        '• /orcamento — limites do mês\n'
        '• /inbox — o que ainda falta confirmar'
    )


def nav_markup() -> dict:
    return {
        'inline_keyboard': [
            [
                {'text': 'Saldo', 'callback_data': 'mg:nav:saldo'},
                {'text': 'Resumo', 'callback_data': 'mg:nav:resumo'},
            ],
            [
                {'text': 'Pendentes', 'callback_data': 'mg:nav:pendentes'},
                {'text': 'Orçamento', 'callback_data': 'mg:nav:orcamento'},
            ],
            [
                {'text': 'Inbox', 'callback_data': 'mg:nav:inbox'},
                {'text': 'Ajuda', 'callback_data': 'mg:nav:help'},
            ],
        ],
    }


def didnt_understand() -> str:
    return (
        'Não entendi como lançamento.\n'
        'Manda o valor na frente, por exemplo:\n'
        '• <code>gastei 45 no mercado</code>\n'
        '• <code>recebi 200 salário</code>\n\n'
        'Ou toque num botão para consultar.'
    )


def status_saldo(snapshot: dict) -> str:
    lines = ['<b>Saldos</b>']
    accounts = snapshot.get('accounts') or []
    if not accounts:
        lines.append('Nenhuma conta ativa. Crie uma no app (Contas).')
    else:
        for a in accounts:
            name = a.get('name') or 'Conta'
            bal = format_money(a.get('balance'))
            kind = a.get('account_type') or ''
            if a.get('role') == 'liability' or kind == 'credit':
                extra = ''
                if a.get('available') is not None:
                    extra = f' · disponível R$ {format_money(a.get("available"))}'
                if a.get('limit_amount'):
                    extra += f' (limite R$ {format_money(a.get("limit_amount"))})'
                lines.append(f'• <b>{name}</b> — em aberto R$ {bal}{extra}')
            elif kind in ('meal_voucher', 'fuel_voucher'):
                lines.append(f'• <b>{name}</b> — pré-pago R$ {bal}')
            else:
                lines.append(f'• <b>{name}</b> — saldo R$ {bal}')
        lines.append(f'Dinheiro disponível: <b>R$ {format_money(snapshot.get("available_balance"))}</b>')
    return '\n'.join(lines)


def status_resumo(snapshot: dict) -> str:
    month = snapshot.get('month')
    year = snapshot.get('year')
    title = f'<b>Resumo {month:02d}/{year}</b>' if month and year else '<b>Resumo do mês</b>'
    lines = [
        title,
        f'Receitas: R$ {format_money(snapshot.get("month_income"))}',
        f'Despesas: R$ {format_money(snapshot.get("month_expense"))}',
        f'Resultado: <b>R$ {format_money(snapshot.get("month_net"))}</b>',
    ]
    cats = snapshot.get('by_category') or []
    if cats:
        lines.append('Onde foi:')
        for c in cats[:4]:
            lines.append(f'• {c.get("name")}: R$ {format_money(c.get("total"))}')
    return '\n'.join(lines)


def status_pendentes(snapshot: dict) -> str:
    upcoming = snapshot.get('upcoming') or []
    if not upcoming:
        return 'Nada vencendo por enquanto.'
    lines = ['<b>Próximos vencimentos</b>']
    for u in upcoming[:6]:
        due = format_date_br(u.get('next_due_on'))
        lines.append(f'• {due} — {u.get("description")} · R$ {format_money(u.get("amount"))}')
    return '\n'.join(lines)


def status_orcamento(snapshot: dict) -> str:
    budgets = snapshot.get('budget_progress') or []
    if not budgets:
        return 'Nenhum limite neste mês. No app: Orçamentos → Limites.'
    lines = ['<b>Limites do mês</b>']
    for b in budgets:
        pct = int(float(b.get('pct') or 0))
        flag = ' ⚠️' if pct >= 100 else ''
        lines.append(
            f'• <b>{b.get("category")}</b>: R$ {format_money(b.get("spent"))} / '
            f'{format_money(b.get("limit"))} ({pct}%){flag}'
        )
    return '\n'.join(lines)


def status_inbox(snapshot: dict, pending: list | None = None) -> str:
    n = int(snapshot.get('inbox_count') or 0)
    if n <= 0:
        return 'Nada esperando confirmação.'
    lines = [f'<b>{n}</b> item(ns) na inbox.']
    for item in (pending or [])[:4]:
        payload = item.parsed_payload or {}
        desc = payload.get('description') or (item.raw_text or '')[:40]
        amt = payload.get('amount')
        bit = f'• {desc}'
        if amt:
            bit += f' — R$ {format_money(amt)}'
        lines.append(bit)
    lines.append('Confirme no app (Capturar) ou me mande de novo.')
    return '\n'.join(lines)


def account_set(name: str) -> str:
    return f'Sai de: <b>{name}</b>.'


def category_set(name: str | None) -> str:
    if name:
        return f'{_snip()} Categoria: <b>{name}</b>. Confere aí.'
    return f'{_snip()} Sem categoria. Como você quiser…'


def need_link() -> str:
    return (
        f'{_snip()} Você ainda não está vinculado. '
        'App → Capturar → Telegram → gera o código → <code>/start CODIGO</code>. '
        'Eu não leio pensamento… embora às vezes ache que leio.'
    )


def format_money(amount: Any) -> str:
    if amount in (None, '', '?'):
        return '?'
    try:
        return f'{float(str(amount).replace(",", ".")):.2f}'.replace('.', ',')
    except (TypeError, ValueError):
        return str(amount)


def format_date_br(value: Any) -> str:
    """ISO ou date → DD/MM/AAAA para exibição."""
    if value in (None, ''):
        return ''
    s = str(value).strip()
    m = re.match(r'^(\d{4})-(\d{2})-(\d{2})', s)
    if m:
        return f'{m.group(3)}/{m.group(2)}/{m.group(1)}'
    return s


def format_payment_method(value: Any) -> str:
    labels = {
        'pix': 'PIX',
        'boleto': 'Boleto',
        'credit': 'Crédito',
        'debit': 'Débito',
        'cash': 'Dinheiro',
        'meal_voucher': 'VA / VR',
        'fuel_voucher': 'Vale combustível',
        'other': 'Outro',
    }
    key = str(value or 'other').lower()
    return labels.get(key, key)


def capture_preview(payload: dict) -> str:
    amount = format_money(payload.get('amount'))
    desc = payload.get('description') or 'sem descrição'
    method = format_payment_method(payload.get('payment_method') or 'other')
    conf = float(payload.get('confidence') or 0)
    hints = payload.get('hints') or {}
    tx_type = payload.get('type') or 'expense'
    type_label = 'Receita' if tx_type == 'income' else 'Despesa'
    lines = [f'<b>R$ {amount}</b> · {desc}', f'{type_label} · {method}']
    cat_name = hints.get('category_name')
    if cat_name:
        lines.append(f'Categoria: <b>{cat_name}</b>')
    else:
        lines.append('Categoria: nenhuma (toque numa abaixo)')
    account_name = hints.get('account_name')
    if account_name:
        lines.append(f'Sai de: <b>{account_name}</b>')
    if hints.get('merchant'):
        lines.append(f'Recebedor: {hints["merchant"]}')
    due_raw = hints.get('due_on') or payload.get('due_on')
    if due_raw:
        lines.append(f'Vencimento: <b>{format_date_br(due_raw)}</b>')
    kind = hints.get('kind')
    if kind in ('bill', 'boleto') or hints.get('is_bill') or hints.get('transaction_status') == 'pending':
        lines.append('Vou registrar como <b>pendente</b> (conta a pagar).')
        cur, tot = hints.get('current_installment'), hints.get('total_installments')
        try:
            if int(tot or 0) >= 2:
                lines.append(f'Parcela <b>{int(cur)}/{int(tot)}</b> — abro o parcelamento.')
        except (TypeError, ValueError):
            pass
    elif kind == 'receipt' or hints.get('is_payment_receipt'):
        lines.append('Comprovante. Se achar a conta, use Abater.')
    if conf and conf < 0.55:
        lines.append('Não tenho muita certeza — confira o valor.')
    lines.append('Confirme ou ajuste nos botões.')
    return '\n'.join(lines)


def receipt_matches_preview(matches: list[dict]) -> str:
    if not matches:
        return 'Não achei pendência parecida. Vai virar lançamento novo, se você confirmar.'
    parts = [f'{_snip()} Achei {len(matches)} coisa(s) que cheiram a match:']
    for i, m in enumerate(matches[:3], 1):
        parts.append(
            f'{i}. [{m.get("kind")}] {m.get("label")} — R$ {format_money(m.get("amount"))}'
        )
    parts.append('Confirma o abatimento no botão, se não for invenção da minha cabeça.')
    return '\n'.join(parts)


def media_received(item_id: int) -> str:
    return (
        f'{_snip()} Mídia #{item_id} recebida. Eu não sou OCR de primeira… '
        'revisa no app (Inbox). E da próxima vez manda o texto também, facilita a vida deste ancião.'
    )


def media_ocr_ok(item_id: int, payload: dict) -> str:
    return f'Li o anexo.\n{capture_preview(payload)}'


def media_ocr_failed(item_id: int) -> str:
    return (
        f'{_snip()} Anexo #{item_id} salvo, mas não consegui ler direito. '
        'Abre a Inbox no app, confere o preview e confirma na mão. Não é culpa minha… quase nunca.'
    )


def media_unsupported(item_id: int) -> str:
    return (
        f'{_snip()} Anexo #{item_id} recebido, mas esse tipo eu não leio. '
        'Manda foto ou PDF de comprovante, se não for pedir demais.'
    )


def confirmed_expense(amount: Any, desc: str = '') -> str:
    return (
        f'{_snip()} Lançado: <b>R$ {format_money(amount)}</b>'
        + (f' ({desc})' if desc else '')
        + '. Mais um furinho no bolso. Felicidades.'
    )


def confirmed_pending(amount: Any, desc: str = '', current=None, total=None, created_plan: bool = False) -> str:
    base = (
        f'{_snip()} Pendência anotada: <b>R$ {format_money(amount)}</b>'
        + (f' ({desc})' if desc else '')
        + '.'
    )
    try:
        if created_plan and int(total or 0) >= 2:
            return (
                base
                + f' Abri parcelamento <b>{int(current)}/{int(total)}</b> no planejamento.'
                + ' Quando pagar, manda o comprovante que eu abato.'
            )
    except (TypeError, ValueError):
        pass
    return base + ' Quando pagar, manda o comprovante que eu abato.'


def confirmed_abatement(label: str, amount: Any) -> str:
    return (
        f'{_snip()} Abatido: <b>{label}</b> · R$ {format_money(amount)}. '
        'Uma a menos. Não gaste o que economizou, viu?'
    )


def dismissed() -> str:
    return f'{_snip()} Descartei. Menos trabalho pra mim.'


def already_done() -> str:
    return f'{_snip()} Isso já foi processado. Presta atenção.'


def duplicate_found(dup: dict | None = None) -> str:
    label = (dup or {}).get('label') or 'lançamento anterior'
    kind = (dup or {}).get('kind') or ''
    where = {
        'transaction': 'nos lançamentos',
        'inbox': 'na inbox',
        'installment': 'no parcelamento',
    }.get(kind, 'por aí')
    return (
        f'{_snip()} Isso já existe {where}: <b>{label}</b>. '
        'Não vou cadastrar de novo — odeio retrabalho.'
    )


def cannot_confirm() -> str:
    return (
        f'{_snip()} Não deu pra confirmar sozinho (conta/valor). '
        'Usa o app, se não for pedir demais.'
    )


def ask_edit_due() -> str:
    return (
        f'{_snip()} Manda o vencimento certo no formato <code>DD/MM/AAAA</code>. '
        'Ex.: <code>22/09/2026</code>. Sem novela.'
    )


def ask_edit_amount() -> str:
    return (
        f'{_snip()} Manda o valor certo. Ex.: <code>137,07</code> ou <code>R$ 137,07</code>.'
    )


def ask_edit_description() -> str:
    return (
        f'{_snip()} Manda a descrição nova, numa linha só. Eu substituo o que anotei.'
    )


def ask_edit_method() -> str:
    return (
        f'{_snip()} Escolhe o método aí embaixo. Sem digitar — eu já canso fácil.'
    )


def method_set(label: str) -> str:
    return f'{_snip()} Método: <b>{label}</b>. Confere de novo.'


def edit_applied(field: str, value: str) -> str:
    labels = {
        'due_on': 'Vencimento',
        'amount': 'Valor',
        'description': 'Descrição',
    }
    label = labels.get(field, field)
    return f'{_snip()} Atualizei <b>{label}</b> → {value}. Confere de novo aí.'


def edit_invalid(field: str) -> str:
    if field == 'due_on':
        return f'{_snip()} Não entendi a data. Usa <code>DD/MM/AAAA</code>.'
    if field == 'amount':
        return f'{_snip()} Valor inválido. Ex.: <code>137,07</code>.'
    return f'{_snip()} Não deu pra aplicar. Tenta de novo.'

