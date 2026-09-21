"""Download de anexos do Telegram e gravação em InboxItem.attachment."""
from __future__ import annotations

import json
import logging
import mimetypes
import urllib.parse
import urllib.request
from dataclasses import dataclass

from django.core.files.base import ContentFile
from decouple import config

logger = logging.getLogger(__name__)

MAX_BYTES = 10 * 1024 * 1024  # 10 MB


@dataclass
class DownloadedFile:
    content: bytes
    file_name: str
    mime: str
    telegram_file_id: str
    telegram_file_path: str


def telegram_bot_token() -> str:
    return config('MONEYGER_TELEGRAM_BOT_TOKEN', default='')


def _guess_mime(file_name: str, fallback: str = 'application/octet-stream') -> str:
    mime, _ = mimetypes.guess_type(file_name)
    return mime or fallback


def download_telegram_file(file_id: str, preferred_name: str = '') -> DownloadedFile:
    """Baixa o arquivo do Telegram (getFile + file path)."""
    token = telegram_bot_token()
    if not token:
        raise RuntimeError('Bot token não configurado')

    meta_url = f'https://api.telegram.org/bot{token}/getFile?file_id={urllib.parse.quote(file_id)}'
    req = urllib.request.Request(meta_url, method='GET')
    with urllib.request.urlopen(req, timeout=20) as resp:
        data = json.loads(resp.read().decode('utf-8'))
    if not data.get('ok'):
        raise RuntimeError(f'getFile falhou: {data}')

    result = data['result']
    file_path = result.get('file_path') or ''
    file_size = int(result.get('file_size') or 0)
    if file_size and file_size > MAX_BYTES:
        raise ValueError(f'Arquivo muito grande ({file_size} bytes)')

    if not file_path:
        raise RuntimeError('file_path vazio')

    dl_url = f'https://api.telegram.org/file/bot{token}/{file_path}'
    req2 = urllib.request.Request(dl_url, method='GET')
    with urllib.request.urlopen(req2, timeout=60) as resp:
        content = resp.read()
        if len(content) > MAX_BYTES:
            raise ValueError('Arquivo muito grande após download')

    base_name = preferred_name or file_path.rsplit('/', 1)[-1] or f'tg_{file_id[:12]}'
    mime = _guess_mime(base_name)
    lower = file_path.lower()
    if mime == 'application/octet-stream' or not preferred_name:
        if lower.endswith(('.jpg', '.jpeg')):
            mime = 'image/jpeg'
            if not base_name.lower().endswith(('.jpg', '.jpeg')):
                base_name = f'{base_name}.jpg'
        elif lower.endswith('.png'):
            mime = 'image/png'
            if not base_name.lower().endswith('.png'):
                base_name = f'{base_name}.png'
        elif lower.endswith('.webp'):
            mime = 'image/webp'
        elif lower.endswith('.pdf'):
            mime = 'application/pdf'
            if not base_name.lower().endswith('.pdf'):
                base_name = f'{base_name}.pdf'

    return DownloadedFile(
        content=content,
        file_name=base_name[:120],
        mime=mime,
        telegram_file_id=file_id,
        telegram_file_path=file_path,
    )


def is_allowed_mime(mime: str) -> bool:
    m = (mime or '').lower()
    return m in (
        'image/jpg', 'image/jpeg', 'image/png', 'image/webp', 'application/pdf',
    ) or m.startswith('image/')


def attach_to_inbox(inbox_item, downloaded: DownloadedFile) -> None:
    """Salva ContentFile no FileField do InboxItem."""
    inbox_item.attachment.save(downloaded.file_name, ContentFile(downloaded.content), save=True)


def pick_telegram_file_id(message: dict) -> tuple[str, str]:
    """Retorna (file_id, preferred_name) a partir de photo[] ou document."""
    photos = message.get('photo') or []
    document = message.get('document')
    if photos:
        best = photos[-1]
        return str(best.get('file_id') or ''), f"photo_{best.get('file_unique_id') or 'tg'}.jpg"
    if document:
        name = document.get('file_name') or f"doc_{document.get('file_unique_id') or 'tg'}"
        return str(document.get('file_id') or ''), str(name)
    return '', ''
