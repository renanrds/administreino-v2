import { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import { fetchInboxAttachmentBlob, type MoneyInbox } from '../lib/moneygerApi';
import { moneygerTheme as t } from '../theme';

export default function InboxAttachmentPreview({ item }: { item: MoneyInbox }) {
  const [url, setUrl] = useState<string | null>(null);
  const [mime, setMime] = useState(item.attachment_mime || '');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!item.has_attachment && !item.attachment_url) return;
    let objectUrl: string | null = null;
    let cancelled = false;
    fetchInboxAttachmentBlob(item.id)
      .then(({ objectUrl: u, mime: m }) => {
        if (cancelled) {
          URL.revokeObjectURL(u);
          return;
        }
        objectUrl = u;
        setUrl(u);
        setMime(m || item.attachment_mime || '');
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [item.id, item.has_attachment, item.attachment_url, item.attachment_mime]);

  if (!item.has_attachment && !item.attachment_url) return null;

  const isImage = mime.startsWith('image/');
  const isPdf = mime === 'application/pdf' || mime.includes('pdf');
  const hints = (item.parsed_payload?.hints as Record<string, unknown>) || {};
  const fileName = String(hints.file_name || 'anexo');

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#0f0f1a', border: `1px solid ${t.border}` }}>
      {error && (
        <p className="text-xs p-3" style={{ color: t.danger }}>Não foi possível carregar o preview.</p>
      )}
      {!error && !url && (
        <p className="text-xs p-3" style={{ color: t.muted }}>Carregando anexo…</p>
      )}
      {url && isImage && (
        <img src={url} alt={fileName} className="w-full max-h-56 object-contain bg-black/40" />
      )}
      {url && isPdf && (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 p-3 text-sm font-semibold"
          style={{ color: t.primary }}
        >
          <FileText size={18} />
          Abrir PDF · {fileName}
        </a>
      )}
      {url && !isImage && !isPdf && (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 p-3 text-sm"
          style={{ color: t.primary }}
        >
          <FileText size={16} /> {fileName}
        </a>
      )}
    </div>
  );
}
