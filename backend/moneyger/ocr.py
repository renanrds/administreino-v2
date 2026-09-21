"""OCR local (Tesseract) para imagens e PDF de comprovantes."""
from __future__ import annotations

import logging
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path

logger = logging.getLogger(__name__)

MAX_PDF_PAGES = 3


@dataclass
class OcrResult:
    text: str
    page_count: int = 1
    engine: str = 'tesseract'
    status: str = 'ok'  # ok | failed | skipped
    error: str = ''


def extract_text_from_bytes(content: bytes, mime: str, file_name: str = '') -> OcrResult:
    mime = (mime or '').lower()
    try:
        if mime == 'application/pdf' or file_name.lower().endswith('.pdf'):
            return _ocr_pdf(content)
        if mime.startswith('image/') or mime in ('image/jpeg', 'image/png', 'image/webp', 'image/jpg'):
            return _ocr_image(content)
        return OcrResult(text='', status='skipped', error=f'mime não suportado: {mime}', page_count=0)
    except Exception as exc:
        logger.exception('OCR falhou: %s', exc)
        return OcrResult(text='', status='failed', error=str(exc)[:200], page_count=0)


def extract_text_from_path(path: str | Path, mime: str = '') -> OcrResult:
    p = Path(path)
    data = p.read_bytes()
    mime = mime or ''
    if not mime:
        if p.suffix.lower() == '.pdf':
            mime = 'application/pdf'
        else:
            mime = 'image/jpeg'
    return extract_text_from_bytes(data, mime, p.name)


def _ocr_image(content: bytes) -> OcrResult:
    from PIL import Image
    import pytesseract

    img = Image.open(BytesIO(content))
    if img.mode not in ('RGB', 'L'):
        img = img.convert('RGB')
    text = pytesseract.image_to_string(img, lang='por+eng')
    text = (text or '').strip()
    if not text:
        return OcrResult(text='', status='failed', error='OCR sem texto', page_count=1)
    return OcrResult(text=text, page_count=1, status='ok')


def _ocr_pdf(content: bytes) -> OcrResult:
    from pdf2image import convert_from_bytes
    import pytesseract

    images = convert_from_bytes(content, first_page=1, last_page=MAX_PDF_PAGES, dpi=200)
    if not images:
        return OcrResult(text='', status='failed', error='PDF sem páginas', page_count=0)

    parts = []
    for img in images:
        if img.mode not in ('RGB', 'L'):
            img = img.convert('RGB')
        parts.append(pytesseract.image_to_string(img, lang='por+eng') or '')

    text = '\n'.join(parts).strip()
    if not text:
        return OcrResult(text='', status='failed', error='OCR PDF sem texto', page_count=len(images))
    return OcrResult(text=text, page_count=len(images), status='ok')
