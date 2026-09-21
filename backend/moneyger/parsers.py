"""Parsers de captura: texto livre, PIX EMV, boleto/código de barras e comprovantes."""
from __future__ import annotations

import re
from dataclasses import dataclass, asdict
from datetime import date, timedelta
from decimal import Decimal, InvalidOperation
from typing import Any


@dataclass
class ParseResult:
    amount: Decimal | None = None
    description: str = ''
    payment_method: str = 'other'
    external_ref: str = ''
    due_on: date | None = None
    occurred_on: date | None = None
    type: str = 'expense'
    confidence: float = 0.0
    hints: dict[str, Any] | None = None

    def to_dict(self) -> dict:
        data = asdict(self)
        if self.amount is not None:
            data['amount'] = str(self.amount)
        if self.due_on:
            data['due_on'] = self.due_on.isoformat()
        if self.occurred_on:
            data['occurred_on'] = self.occurred_on.isoformat()
        data['hints'] = self.hints or {}
        return data


BANK_CODES = {
    '001': 'Banco do Brasil',
    '033': 'Santander',
    '104': 'Caixa',
    '237': 'Bradesco',
    '341': 'Itaú',
    '260': 'Nubank',
    '077': 'Inter',
    '212': 'Original',
    '336': 'C6',
    '422': 'Safra',
    '745': 'Citibank',
    '041': 'Banrisul',
}


def _parse_decimal_br(raw: str) -> Decimal | None:
    s = raw.strip().replace('R$', '').replace(' ', '')
    if not s:
        return None
    if ',' in s and '.' in s:
        if s.rfind(',') > s.rfind('.'):
            s = s.replace('.', '').replace(',', '.')
        else:
            s = s.replace(',', '')
    elif ',' in s:
        s = s.replace(',', '.')
    try:
        value = Decimal(s)
        if value <= 0:
            return None
        return value.quantize(Decimal('0.01'))
    except (InvalidOperation, ValueError):
        return None


def _walk_tlv(text: str) -> dict[str, str]:
    out: dict[str, str] = {}
    i = 0
    while i + 4 <= len(text):
        tag = text[i:i + 2]
        try:
            length = int(text[i + 2:i + 4])
        except ValueError:
            break
        value = text[i + 4:i + 4 + length]
        i = i + 4 + length
        out[tag] = value
    return out


def parse_pix_emv(payload: str) -> ParseResult | None:
    """Extrai valor, recebedor, cidade, txid e chave de um BR Code PIX."""
    text = payload.strip()
    if not text.startswith('000201') and 'BR.GOV.BCB.PIX' not in text.upper():
        return None

    tags = _walk_tlv(text)
    amount = _parse_decimal_br(tags['54']) if '54' in tags else None
    merchant = (tags.get('59') or '').strip()
    city = (tags.get('60') or '').strip()
    txid = ''
    pix_key = ''

    # Merchant Account Information (26) — GUI + chave
    mai = tags.get('26') or ''
    if mai:
        sub = _walk_tlv(mai)
        for k, v in sub.items():
            if k == '01' and v and 'PIX' not in v.upper():
                pix_key = v
            if 'PIX' in (v or '').upper() and k == '00':
                pass
        # nested keys often 01 = chave
        if '01' in sub and sub['01'] and 'BR.GOV' not in sub['01'].upper():
            pix_key = sub['01']

    add = tags.get('62') or ''
    if add:
        sub = _walk_tlv(add)
        if sub.get('05') and sub['05'] != '***':
            txid = sub['05']

    parts = []
    if merchant:
        parts.append(merchant.title() if merchant.isupper() else merchant)
    if city:
        parts.append(city.title() if city.isupper() else city)
    if txid:
        parts.append(f'txid {txid}')
    description = ' · '.join(parts) if parts else (f'PIX {pix_key}' if pix_key else 'PIX')

    hints = {
        'kind': 'pix_emv',
        'merchant': merchant or None,
        'city': city or None,
        'txid': txid or None,
        'pix_key': pix_key or None,
    }
    hints = {k: v for k, v in hints.items() if v}

    return ParseResult(
        amount=amount,
        description=description[:255],
        payment_method='pix',
        external_ref=(txid or text)[:255],
        occurred_on=date.today(),
        type='expense',
        confidence=0.9 if amount and merchant else (0.85 if amount else 0.55),
        hints=hints,
    )


def _due_from_factor(factor: int) -> date | None:
    """Converte fator de vencimento FEBRABAN em data.

    Ciclo antigo: base 1997-10-07.
    Novo ciclo (a partir de 22/02/2025): fator 1000 = 22/02/2025.
    Preferimos a data do novo ciclo quando o ciclo antigo cai no passado distante.
    """
    if factor <= 0:
        return None
    old = date(1997, 10, 7) + timedelta(days=factor)
    # Novo fator: 1000 ≡ 2025-02-22
    new = date(2025, 2, 22) + timedelta(days=max(0, factor - 1000))
    today = date.today()
    # Se o ciclo antigo já passou há mais de 60 dias, usa o novo
    if old < today - timedelta(days=60):
        return new
    # Se ambos são futuros, o mais próximo (e razoável) ganha
    if old >= today and new >= today:
        return old if abs((old - today).days) <= abs((new - today).days) else new
    if new >= today - timedelta(days=30):
        return new
    return old


def parse_boleto(payload: str) -> ParseResult | None:
    """Linha digitável (47/48) ou código de barras (44)."""
    digits = re.sub(r'\D', '', payload)
    if len(digits) not in (44, 47, 48):
        return None

    barcode = digits
    if len(digits) == 47:
        bank = digits[0:3]
        currency = digits[3]
        field1_free = digits[4:9]
        field2 = digits[10:20]
        field3 = digits[21:31]
        dv = digits[32]
        factor_value = digits[33:47]
        barcode = bank + currency + dv + factor_value + field1_free + field2 + field3
    elif len(digits) == 48:
        # arrecadação / concessionária — valor em posições diferentes; tenta barcode direto se 44 no meio
        barcode = digits

    amount = None
    due_on = None
    bank_code = barcode[0:3] if len(barcode) >= 3 else ''
    bank_name = BANK_CODES.get(bank_code, '')

    if len(barcode) >= 44 and len(digits) != 48:
        factor = barcode[5:9]
        value_raw = barcode[9:19]
        try:
            amount = (Decimal(value_raw) / Decimal(100)).quantize(Decimal('0.01'))
            if amount == 0:
                amount = None
        except (InvalidOperation, ValueError):
            amount = None
        try:
            due_on = _due_from_factor(int(factor))
        except ValueError:
            due_on = None
    elif len(digits) == 48:
        # convênio: valor geralmente nos últimos 11 dígitos do produto
        try:
            amount = (Decimal(digits[4:15]) / Decimal(100)).quantize(Decimal('0.01'))
            if amount == 0:
                amount = None
        except (InvalidOperation, ValueError):
            amount = None

    desc_parts = ['Boleto']
    if bank_name:
        desc_parts.append(bank_name)
    description = ' · '.join(desc_parts)

    hints = {
        'kind': 'boleto',
        'barcode': barcode[:44] if barcode else '',
        'bank_code': bank_code or None,
        'bank_name': bank_name or None,
        'due_on': due_on.isoformat() if due_on else None,
        'linha_digitavel': digits[:48],
        'transaction_status': 'pending',
        'is_bill': True,
    }
    hints = {k: v for k, v in hints.items() if v}

    return ParseResult(
        amount=amount,
        description=description[:255],
        payment_method='boleto',
        external_ref=digits[:255],
        due_on=due_on,
        occurred_on=due_on or date.today(),
        type='expense',
        confidence=0.85 if amount else 0.5,
        hints=hints,
    )


# --- Boleto (a pagar) vs comprovante (já pago) ---------------------------------

_BILL_DOC_HINTS = re.compile(
    r'ficha\s+de\s+compensa[cç][aã]o|recibo\s+do\s+sacado|'
    r'linha\s+digit[aá]vel|nosso\s+n[uú]mero|valor\s+do\s+documento|'
    r'c[oó]digo\s+do\s+benefici[aá]rio|ag[eê]ncia\s*/\s*c[oó]digo|'
    r'ap[oó]s\s+a\s+data\s+de\s+vencimento\s+cobrar|'
    r'autentica[cç][aã]o\s+mec[aâ]nica',
    re.IGNORECASE,
)

_RECEIPT_HINTS = re.compile(
    r'comprovante\s+de\s+pagamento|comprovante\s+de\s+transfer|'
    r'pagamento\s+(realizado|efetuado|confirmado|enviado)|'
    r'transfer[eê]ncia\s+(conclu[ií]da|enviada|realizada)|'
    r'pix\s+(enviado|realizado|conclu[ií]do)|transa[cç][aã]o\s+aprovada|'
    r'id\s+da\s+transa[cç][aã]o|tipo\s+de\s+transfer[eê]ncia|'
    r'end\s*to\s*end|\be2e\b|opera[cç][aã]o\s+realizada',
    re.IGNORECASE,
)

_AMOUNT_PATTERNS = [
    re.compile(r'valor\s+do\s+documento[:\s]*(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2}|\d+[.,]\d{2})', re.I),
    re.compile(r'(?:R\$\s*)(\d{1,3}(?:\.\d{3})*,\d{2})'),
    re.compile(r'(?:R\$\s*)(\d+[.,]\d{2})'),
    re.compile(r'(?:valor(?:\s+original)?[:\s]+)(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2}|\d+[.,]\d{2})', re.I),
]

_DATE_RE = re.compile(
    r'(\d{2})[/-](\d{2})[/-](\d{2,4})(?:\s+(\d{2}):(\d{2}))?'
)

_MONTH_NAME_DATE_RE = re.compile(
    r'(\d{1,2})\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)[A-Z]*\s+(\d{2,4})',
    re.I,
)
_MONTH_MAP = {
    'JAN': 1, 'FEV': 2, 'MAR': 3, 'ABR': 4, 'MAI': 5, 'JUN': 6,
    'JUL': 7, 'AGO': 8, 'SET': 9, 'OUT': 10, 'NOV': 11, 'DEZ': 12,
}

_AUTH_RE = re.compile(
    r'(?:id(?:\s+da)?\s+transa[cç][aã]o|e2e|end\s*to\s*end|'
    r'autentica[cç][aã]o(?!\s+mec[aâ]nica)|controle)[:\s#]*([A-Z0-9-]{8,64})',
    re.I,
)

_NOSSO_NUMERO_RE = re.compile(
    r'nosso\s+n[uú]mero[:\s]*([0-9]{8,20})',
    re.I,
)

_LINHA_DIGITAVEL_FMT = re.compile(
    r'(\d{5}\.\d{5}\s+\d{5}\.\d{6}\s+\d{5}\.\d{6}\s+\d\s+\d{14})'
)

_PAYEE_LABEL_NOISE = {
    'instituição', 'instituicao', 'nome', 'destino', 'origem', 'cpf', 'cnpj',
    'tipo de conta', 'conta de pagamentos', 'banco',
}

_RECEIVER_LINE_RE = re.compile(
    r'nome\s+do\s+recebedor\s*\n\s*([^\n]{3,80})',
    re.I,
)
_DESC_PAGAMENTO_RE = re.compile(
    r'descri[cç][aã]o\s+do\s+pagamento\s+original\s*\n\s*([^\n]{3,120})',
    re.I,
)
_PAYEE_INLINE_RE = re.compile(
    r'(?:para|favorecido|recebedor)[:\s]+([A-Za-zÀ-ú0-9 .&\-/]{3,80})',
    re.I,
)
_CEDENTE_RE = re.compile(
    r'(?:cedente|benefici[aá]rio)[:\s]+([A-Za-zÀ-ú0-9 .&\-]{3,80})',
    re.I,
)
_PARCELA_RE = re.compile(r'parcela\s+(\d+)\s*/\s*(\d+)', re.I)
_ACORDO_RE = re.compile(r'acordo\s*n[^\d]{0,8}(\d{3,})', re.I)


def _extract_parcela(raw: str) -> tuple[int | None, int | None]:
    m = _PARCELA_RE.search(raw or '')
    if not m:
        return None, None
    current, total = int(m.group(1)), int(m.group(2))
    if total < 1 or current < 1:
        return None, None
    return current, total


def _extract_acordo_id(raw: str) -> str:
    m = _ACORDO_RE.search(raw or '')
    return m.group(1) if m else ''


def _attach_bill_structure(raw: str, hints: dict) -> dict:
    current, total = _extract_parcela(raw)
    if current and total:
        hints['current_installment'] = current
        hints['total_installments'] = total
    acordo = _extract_acordo_id(raw)
    if acordo:
        hints['agreement_id'] = acordo
    return hints


def installment_spec_from_payload(payload: dict | None) -> tuple[int, int] | None:
    """Retorna (parcela atual, total) quando o boleto é um acordo parcelado."""
    if not payload:
        return None
    hints = payload.get('hints') or {}
    try:
        current = int(hints.get('current_installment') or 0)
        total = int(hints.get('total_installments') or 0)
    except (TypeError, ValueError):
        return None
    if total >= 2 and 1 <= current <= total:
        return current, total
    return None


def is_bill_payload(payload: dict | None) -> bool:
    """True se o parse indica boleto/conta a pagar (deve virar despesa Pendente)."""
    if not payload:
        return False
    hints = payload.get('hints') or {}
    if hints.get('transaction_status') == 'pending' or hints.get('is_bill'):
        return True
    return hints.get('kind') in ('boleto', 'bill')


def _looks_like_bill_document(text: str) -> bool:
    raw = text or ''
    if not _BILL_DOC_HINTS.search(raw):
        return False
    # Comprovante real pode citar "vencimento" do boleto pago — prioriza sinais de pagamento feito
    if _RECEIPT_HINTS.search(raw) and re.search(
        r'comprovante\s+de\s+pagamento|id\s+da\s+transa[cç][aã]o|tipo\s+de\s+transfer',
        raw,
        re.I,
    ):
        return False
    return True


def _extract_linha_digitavel(text: str) -> str | None:
    m = _LINHA_DIGITAVEL_FMT.search(text)
    if m:
        digits = re.sub(r'\D', '', m.group(1))
        if len(digits) in (47, 48):
            return digits
    # Linha com espaços/pontos irregulares: agrupa blocos numéricos longos
    loose = re.search(
        r'(\d{5}[.\s]?\d{5}\s+\d{5}[.\s]?\d{6}\s+\d{5}[.\s]?\d{6}\s+\d\s+\d{10,14})',
        text,
    )
    if loose:
        digits = re.sub(r'\D', '', loose.group(1))
        if len(digits) in (47, 48):
            return digits
    return None


def _parse_date_token(d: int, mo: int, y: int) -> date | None:
    if y < 100:
        y += 2000
    try:
        return date(y, mo, d)
    except ValueError:
        return None


def _extract_amount(raw: str) -> Decimal | None:
    for pat in _AMOUNT_PATTERNS:
        m = pat.search(raw)
        if m:
            amount = _parse_decimal_br(m.group(1))
            if amount:
                return amount
    return None


def _clean_payee(raw: str) -> str:
    name = re.sub(r'\s+', ' ', (raw or '').strip())
    if not name:
        return ''
    lower = name.lower()
    if lower in _PAYEE_LABEL_NOISE or lower.startswith('nome '):
        return ''
    return name[:80]


def _extract_receipt_payee(raw: str) -> str:
    for pat in (_RECEIVER_LINE_RE, _DESC_PAGAMENTO_RE, _PAYEE_INLINE_RE):
        m = pat.search(raw)
        if m:
            payee = _clean_payee(m.group(1))
            if payee:
                # "Acordo Certo/Ativos - Pagamento..." → "Acordo Certo/Ativos"
                payee = re.split(r'\s+-\s+', payee, maxsplit=1)[0].strip()
                return payee[:80]
    # Destino block: skip label lines, take first real name
    dest = re.search(r'\bdestino\b\s*\n((?:[^\n]+\n?){1,4})', raw, re.I)
    if dest:
        for line in dest.group(1).splitlines():
            payee = _clean_payee(line)
            if payee and len(payee) > 3:
                return payee[:80]
    return ''


def parse_bill_document(text: str) -> ParseResult | None:
    """PDF/OCR de boleto (ficha de compensação) → despesa pendente."""
    raw = text.strip()
    if not raw or not _looks_like_bill_document(raw):
        return None

    # Preferir linha digitável embutida no OCR
    linha = _extract_linha_digitavel(raw)
    if linha:
        parsed = parse_boleto(linha)
        if parsed:
            hints = dict(parsed.hints or {})
            hints['kind'] = 'bill'
            hints['is_bill'] = True
            hints['transaction_status'] = 'pending'
            hints['source'] = 'bill_document'
            # Enriquecer descrição com cedente/acordo se houver
            extra = _bill_description_from_ocr(raw)
            if extra and 'Boleto' in (parsed.description or ''):
                parsed.description = extra[:255]
            elif extra:
                hints['merchant'] = hints.get('merchant') or extra
            nosso = _NOSSO_NUMERO_RE.search(raw)
            if nosso:
                hints['nosso_numero'] = nosso.group(1)
                if not parsed.external_ref or len(parsed.external_ref) > 40:
                    parsed.external_ref = nosso.group(1)
            due_ocr = _extract_due_on(raw)
            due = due_ocr or parsed.due_on
            parsed.due_on = due
            parsed.occurred_on = due or parsed.occurred_on or date.today()
            if due:
                hints['due_on'] = due.isoformat()
                if due_ocr:
                    hints['due_source'] = 'ocr'
                elif hints.get('due_on'):
                    hints['due_source'] = 'barcode_factor'
            hints = _attach_bill_structure(raw, hints)
            parsed.hints = {k: v for k, v in hints.items() if v}
            if parsed.amount is None:
                parsed.amount = _extract_amount(raw)
            return parsed

    amount = _extract_amount(raw)
    due_on = _extract_due_on(raw)
    nosso = ''
    nm = _NOSSO_NUMERO_RE.search(raw)
    if nm:
        nosso = nm.group(1)

    description = _bill_description_from_ocr(raw) or 'Boleto a pagar'
    bank_name = None
    for code, name in BANK_CODES.items():
        if re.search(rf'\b{re.escape(name)}\b', raw, re.I) or raw.startswith(code):
            bank_name = name
            break
    if not bank_name and re.search(r'banco\s+do\s+brasil', raw, re.I):
        bank_name = 'Banco do Brasil'

    hints = {
        'kind': 'bill',
        'is_bill': True,
        'transaction_status': 'pending',
        'source': 'bill_document',
        'bank_name': bank_name,
        'nosso_numero': nosso or None,
        'due_on': due_on.isoformat() if due_on else None,
        'merchant': description if description != 'Boleto a pagar' else None,
    }
    hints = _attach_bill_structure(raw, hints)
    hints = {k: v for k, v in hints.items() if v}

    return ParseResult(
        amount=amount,
        description=description[:255],
        payment_method='boleto',
        external_ref=nosso or '',
        due_on=due_on,
        occurred_on=due_on or date.today(),
        type='expense',
        confidence=0.82 if amount else 0.5,
        hints=hints,
    )


def _extract_due_on(raw: str) -> date | None:
    """Extrai vencimento impresso no boleto (mesma linha ou nas linhas seguintes)."""
    # "Vencimento: 22/09/2026" ou "Vencimento\n22/09/2026"
    m = re.search(
        r'vencimento\b[^\d\n]{0,40}(\d{2})[/-](\d{2})[/-](\d{2,4})',
        raw,
        re.I,
    )
    if m:
        return _parse_date_token(int(m.group(1)), int(m.group(2)), int(m.group(3)))

    # Cabeçalho "… Vencimento" seguido de data na próxima linha útil
    m2 = re.search(
        r'vencimento\b[^\n]*\n(?:[^\n]*\n){0,2}?[^\d]*(\d{2})[/-](\d{2})[/-](\d{2,4})',
        raw,
        re.I,
    )
    if m2:
        return _parse_date_token(int(m2.group(1)), int(m2.group(2)), int(m2.group(3)))

    # OCR comum: "Wencimento" / "Vencmento" + data próxima
    m3 = re.search(
        r'w?enciment[oa]\b[^\d\n]{0,40}(\d{2})[/-](\d{2})[/-](\d{2,4})',
        raw,
        re.I,
    )
    if m3:
        return _parse_date_token(int(m3.group(1)), int(m3.group(2)), int(m3.group(3)))
    return None


def _bill_description_from_ocr(raw: str) -> str:
    parts: list[str] = []
    # Empresa / cedente
    if re.search(r'acordocerto|acordo\s+certo|ativos\s+s\.?a', raw, re.I):
        parts.append('Acordo Certo')
    else:
        cm = _CEDENTE_RE.search(raw)
        if cm:
            ced = _clean_payee(cm.group(1))
            if ced:
                parts.append(ced)
        elif re.search(r'ativos\s+s\.?a', raw, re.I):
            parts.append('ATIVOS S.A.')
    current, total = _extract_parcela(raw)
    if current and total:
        parts.append(f'parcela {current}/{total}')
    acordo = _extract_acordo_id(raw)
    if acordo:
        parts.append(f'acordo {acordo}')
    if parts:
        return ' · '.join(parts)
    return ''


def parse_receipt(text: str) -> ParseResult | None:
    """Detecta comprovante de pagamento e extrai valor, data, favorecido e autenticação."""
    raw = text.strip()
    if not raw or not _RECEIPT_HINTS.search(raw):
        return None
    # Boleto OCR contém "Autenticação Mecânica" — não é comprovante
    if _looks_like_bill_document(raw):
        return None

    amount = _extract_amount(raw)

    occurred = date.today()
    # Preferir data do comprovante (ex.: "18 SET 2026"), não o vencimento do boleto pago
    mm = _MONTH_NAME_DATE_RE.search(raw)
    if mm:
        parsed = _parse_date_token(int(mm.group(1)), _MONTH_MAP[mm.group(2).upper()[:3]], int(mm.group(3)))
        if parsed:
            occurred = parsed
    else:
        # Evitar datas logo após "Vencimento"
        for dm in _DATE_RE.finditer(raw):
            start = max(0, dm.start() - 24)
            ctx = raw[start:dm.start()].lower()
            if 'vencimento' in ctx or 'expira' in ctx:
                continue
            parsed = _parse_date_token(int(dm.group(1)), int(dm.group(2)), int(dm.group(3)))
            if parsed:
                occurred = parsed
                break

    auth = ''
    am = _AUTH_RE.search(raw)
    if am:
        auth = am.group(1).strip()

    payee = _extract_receipt_payee(raw)

    method = 'pix' if re.search(r'\bpix\b', raw, re.I) else (
        'boleto' if re.search(r'\bboleto\b', raw, re.I) else 'other'
    )

    description = f'Comprovante · {payee}' if payee else 'Comprovante de pagamento'
    hints = {
        'kind': 'receipt',
        'merchant': payee or None,
        'auth_code': auth or None,
        'is_payment_receipt': True,
    }
    hints = {k: v for k, v in hints.items() if v}

    return ParseResult(
        amount=amount,
        description=description[:255],
        payment_method=method,
        external_ref=auth or raw[:120],
        occurred_on=occurred,
        type='expense',
        confidence=0.8 if amount else 0.45,
        hints=hints,
    )


_QUICK_RE = re.compile(
    r'^\s*(?P<amount>\d+(?:[.,]\d{1,2})?)\s+(?P<rest>.+?)\s*$',
    re.IGNORECASE,
)
_NL_EXPENSE_RE = re.compile(
    r'^\s*(?:(?P<ontem1>ontem)\s+)?'
    r'(?:gastei|paguei|comprei)\s+'
    r'(?:R\$\s*)?(?P<amount>\d+(?:[.,]\d{1,2})?)\s+'
    r'(?:(?:no|na|em|de|do|da)\s+)?'
    r'(?P<rest>.+?)\s*$',
    re.IGNORECASE,
)
_NL_INCOME_RE = re.compile(
    r'^\s*(?:(?P<ontem1>ontem)\s+)?'
    r'(?:recebi|entrou|ganhei)\s+'
    r'(?:R\$\s*)?(?P<amount>\d+(?:[.,]\d{1,2})?)\s*'
    r'(?P<rest>.*?)\s*$',
    re.IGNORECASE,
)
_CAT_HINT_RE = re.compile(r'\s+categoria\s+(?P<cat>.+)$', re.IGNORECASE)
_METHOD_MAP = {
    'pix': 'pix',
    'boleto': 'boleto',
    'crédito': 'credit',
    'credito': 'credit',
    'débito': 'debit',
    'debito': 'debit',
    'dinheiro': 'cash',
    'cash': 'cash',
}


def _strip_category_hint(text: str) -> tuple[str, str | None]:
    m = _CAT_HINT_RE.search(text or '')
    if not m:
        return (text or '').strip(), None
    hint = m.group('cat').strip()
    cleaned = (text[: m.start()] + text[m.end():]).strip()
    return cleaned, hint or None


def _finalize_quick(
    amount: Decimal | None,
    description: str,
    *,
    payment_method: str = 'other',
    tx_type: str = 'expense',
    occurred: date | None = None,
    category_hint: str | None = None,
    confidence: float = 0.75,
) -> ParseResult:
    occurred = occurred or date.today()
    hints: dict[str, Any] = {'kind': 'quick_text'}
    if category_hint:
        hints['category_hint'] = category_hint[:80]
    return ParseResult(
        amount=amount,
        description=(description or 'Lançamento')[:255],
        payment_method=payment_method,
        occurred_on=occurred,
        type=tx_type,
        confidence=confidence if amount else 0.3,
        hints=hints,
    )


def _parse_nl_phrase(raw: str) -> ParseResult | None:
    """Frases em português: gastei/paguei/comprei ou recebi/entrou/ganhei."""
    cleaned, cat_hint = _strip_category_hint(raw)
    lower = cleaned.lower()
    had_ontem = 'ontem' in lower

    m = _NL_EXPENSE_RE.match(cleaned)
    if m:
        amount = _parse_decimal_br(m.group('amount'))
        rest = (m.group('rest') or '').strip()
        tokens = rest.split()
        payment_method = 'other'
        if tokens and tokens[-1].lower() in _METHOD_MAP:
            payment_method = _METHOD_MAP[tokens[-1].lower()]
            tokens = tokens[:-1]
        # remove trailing/leading "ontem" from description tokens
        tokens = [t for t in tokens if t.lower() != 'ontem']
        description = ' '.join(tokens).strip() or 'Lançamento'
        occurred = date.today() - timedelta(days=1) if (m.group('ontem1') or had_ontem) else date.today()
        return _finalize_quick(
            amount, description,
            payment_method=payment_method,
            tx_type='expense',
            occurred=occurred,
            category_hint=cat_hint,
            confidence=0.8 if amount else 0.3,
        )

    m = _NL_INCOME_RE.match(cleaned)
    if m:
        amount = _parse_decimal_br(m.group('amount'))
        rest = (m.group('rest') or '').strip()
        tokens = [t for t in rest.split() if t.lower() != 'ontem']
        description = ' '.join(tokens).strip() or 'Receita'
        # strip leading articles / "de"
        description = re.sub(r'^(?:de|do|da|em)\s+', '', description, flags=re.I).strip() or 'Receita'
        occurred = date.today() - timedelta(days=1) if (m.group('ontem1') or had_ontem) else date.today()
        return _finalize_quick(
            amount, description,
            payment_method='other',
            tx_type='income',
            occurred=occurred,
            category_hint=cat_hint,
            confidence=0.8 if amount else 0.3,
        )

    return None


def parse_quick_text(text: str) -> ParseResult:
    """Roteia: PIX EMV → boleto (doc/OCR) → linha digitável → comprovante → NL → texto rápido."""
    raw = text.strip()
    if not raw:
        return ParseResult(confidence=0.0)

    pix = parse_pix_emv(raw)
    if pix:
        return pix

    bill = parse_bill_document(raw)
    if bill:
        return bill

    boleto = parse_boleto(raw)
    if boleto:
        return boleto

    # Linha digitável misturada em texto longo (sem layout de ficha)
    linha = _extract_linha_digitavel(raw)
    if linha:
        embedded = parse_boleto(linha)
        if embedded:
            return embedded

    receipt = parse_receipt(raw)
    if receipt:
        return receipt

    nl = _parse_nl_phrase(raw)
    if nl:
        return nl

    cleaned, cat_hint = _strip_category_hint(raw)
    m = _QUICK_RE.match(cleaned)
    if not m:
        return ParseResult(description=raw[:255], confidence=0.2)

    amount = _parse_decimal_br(m.group('amount'))
    rest = m.group('rest').strip()
    tokens = rest.split()
    payment_method = 'other'
    if tokens and tokens[-1].lower() in _METHOD_MAP:
        payment_method = _METHOD_MAP[tokens[-1].lower()]
        tokens = tokens[:-1]
    tokens = [t for t in tokens if t.lower() != 'ontem']
    description = ' '.join(tokens).strip() or 'Lançamento'

    occurred = date.today()
    if 'ontem' in rest.lower() or 'ontem' in cleaned.lower():
        occurred = date.today() - timedelta(days=1)

    return _finalize_quick(
        amount, description,
        payment_method=payment_method,
        tx_type='expense',
        occurred=occurred,
        category_hint=cat_hint,
        confidence=0.75 if amount else 0.3,
    )


def parse_capture(text: str) -> ParseResult:
    return parse_quick_text(text)
