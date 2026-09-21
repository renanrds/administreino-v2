import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ClipboardPaste, Copy, ExternalLink, Link2, Send, X } from 'lucide-react';
import {
  confirmInbox, dismissInbox, fetchAccounts, fetchInbox,
  fetchTelegramLinkCode, fetchTelegramStatus, formatApiError, quickCapture,
  type MoneyInbox,
} from '../lib/moneygerApi';
import InboxAttachmentPreview from '../components/InboxAttachmentPreview';
import { PageHeader, PageShell, SectionCard } from '../components/ui';
import { moneygerTheme as t } from '../theme';

function ocrBadge(hints: Record<string, unknown>) {
  const status = String(hints.ocr_status || '');
  if (status === 'ok') return { label: 'OCR ok', color: t.primary };
  if (status === 'failed') return { label: 'OCR falhou', color: t.danger };
  if (status === 'skipped') return { label: 'Sem OCR', color: t.muted };
  if (status === 'pending') return { label: 'OCR…', color: '#fbbf24' };
  return null;
}

function InboxCard({
  item,
  accountId,
  onConfirm,
  onDismiss,
  confirming,
}: {
  item: MoneyInbox;
  accountId: number | '';
  onConfirm: (id: number, overrides: { amount?: string; description?: string }) => void;
  onDismiss: (id: number) => void;
  confirming: boolean;
}) {
  const hints = (item.parsed_payload?.hints as Record<string, unknown>) || {};
  const matches = (hints.matches as { label: string }[] | undefined) || [];
  const badge = ocrBadge(hints);
  const [amount, setAmount] = useState(String(item.parsed_payload?.amount ?? ''));
  const [description, setDescription] = useState(
    String(item.parsed_payload?.description ?? item.raw_text ?? ''),
  );

  const inputStyle = {
    background: '#0f0f1a',
    border: `1px solid ${t.border}`,
  } as const;

  return (
    <div
      className="rounded-2xl p-3 space-y-2"
      style={{ background: t.surface, border: `1px solid ${t.border}` }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-white text-sm leading-snug">{description || 'Anexo'}</p>
        {badge && (
          <span
            className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg shrink-0"
            style={{ color: badge.color, background: `${badge.color}22` }}
          >
            {badge.label}
          </span>
        )}
      </div>

      <InboxAttachmentPreview item={item} />

      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Descrição"
        className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none"
        style={inputStyle}
      />
      <input
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Valor (ex.: 89.90)"
        className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none"
        style={inputStyle}
      />

      <p className="text-xs" style={{ color: t.muted }}>
        confiança {Math.round(item.confidence * 100)}% · {item.source}
        {hints.merchant ? ` · ${String(hints.merchant)}` : ''}
      </p>
      {matches.length > 0 && (
        <p className="text-xs" style={{ color: t.primary }}>
          Match possível: {matches.map((m) => m.label).join(', ')}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={confirming || !amount}
          onClick={() => onConfirm(item.id, {
            amount: amount.replace(',', '.'),
            description: description.trim(),
            ...(typeof accountId === 'number' ? {} : {}),
          })}
          className="flex-1 py-2 rounded-xl font-bold text-white flex items-center justify-center gap-1 disabled:opacity-40"
          style={{ background: t.gradient }}
        >
          <Check size={14} /> Confirmar
        </button>
        <button
          type="button"
          onClick={() => onDismiss(item.id)}
          className="flex-1 py-2 rounded-xl font-bold flex items-center justify-center gap-1"
          style={{ background: '#0f0f1a', color: t.muted, border: `1px solid ${t.border}` }}
        >
          <X size={14} /> Descartar
        </button>
      </div>
    </div>
  );
}

export default function MoneygerCapturePage() {
  const [text, setText] = useState('');
  const [accountId, setAccountId] = useState<number | ''>('');
  const [tgCode, setTgCode] = useState<string | null>(null);
  const [tgDeepLink, setTgDeepLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();

  const accountsQ = useQuery({ queryKey: ['moneyger', 'accounts'], queryFn: fetchAccounts });
  const inboxQ = useQuery({ queryKey: ['moneyger', 'inbox'], queryFn: fetchInbox });
  const tgStatusQ = useQuery({ queryKey: ['moneyger', 'tg-status'], queryFn: fetchTelegramStatus });

  useEffect(() => {
    if (accountsQ.data?.length && accountId === '') {
      setAccountId(accountsQ.data[0].id);
    }
  }, [accountsQ.data, accountId]);

  const capture = useMutation({
    mutationFn: () => quickCapture(text.trim(), {
      account_id: typeof accountId === 'number' ? accountId : undefined,
      create_transaction: true,
    }),
    onSuccess: () => {
      setText('');
      queryClient.invalidateQueries({ queryKey: ['moneyger'] });
    },
    onError: (e) => alert(formatApiError(e, 'Falha ao capturar.')),
  });

  const confirmMut = useMutation({
    mutationFn: ({
      id, amount, description,
    }: { id: number; amount?: string; description?: string }) => confirmInbox(id, {
      account_id: typeof accountId === 'number' ? accountId : undefined,
      ...(amount ? { amount } : {}),
      ...(description ? { description } : {}),
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['moneyger'] }),
    onError: (e) => alert(formatApiError(e, 'Erro ao confirmar.')),
  });

  const dismissMut = useMutation({
    mutationFn: dismissInbox,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['moneyger'] }),
  });

  const linkMut = useMutation({
    mutationFn: fetchTelegramLinkCode,
    onSuccess: (d) => {
      setTgCode(d.link_code);
      setTgDeepLink(d.deep_link ?? null);
      queryClient.invalidateQueries({ queryKey: ['moneyger', 'tg-status'] });
    },
  });

  const pasteClipboard = async () => {
    try {
      const clip = await navigator.clipboard.readText();
      if (clip) setText(clip);
    } catch {
      alert('Não foi possível ler a área de transferência.');
    }
  };

  const tg = tgStatusQ.data;
  const linked = Boolean(tg?.linked);
  const botName = tg?.bot_display_name || 'Gastôncio';
  const botUser = tg?.bot_username ? `@${tg.bot_username}` : null;
  const startCommand = tgCode ? `/start ${tgCode}` : '';
  const startLink = tg?.bot_username && tgCode
    ? `https://t.me/${tg.bot_username}?start=${encodeURIComponent(tgCode)}`
    : tgDeepLink;

  const copyStart = async () => {
    if (!startCommand) return;
    try {
      await navigator.clipboard.writeText(startCommand);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      alert(`Copie manualmente: ${startCommand}`);
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="Capturar"
        subtitle="Cole PIX, boleto ou digite 45 mercado pix"
      />

      {(accountsQ.data?.length ?? 0) === 0 && (
        <div className="rounded-2xl p-4 text-sm" style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid #f59e0b', color: '#fbbf24' }}>
          Crie uma conta em Mais → Contas antes de lançar.
        </div>
      )}

      <div className="space-y-3 rounded-2xl p-4" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
        <label className="block text-xs font-semibold uppercase" style={{ color: t.muted }}>Conta</label>
        <select
          value={accountId}
          onChange={(e) => setAccountId(e.target.value ? Number(e.target.value) : '')}
          className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
          style={{ background: '#0f0f1a', border: `1px solid ${t.border}` }}
        >
          {(accountsQ.data ?? []).map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder="Ex.: 89,90 mercado pix&#10;ou cole código PIX / linha digitável / comprovante"
          className="w-full px-3 py-3 rounded-xl text-sm text-white outline-none resize-none"
          style={{ background: '#0f0f1a', border: `1px solid ${t.border}` }}
        />

        <div className="flex gap-2">
          <button type="button" onClick={pasteClipboard}
            className="flex-1 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2"
            style={{ background: '#0f0f1a', border: `1px solid ${t.border}`, color: t.muted }}>
            <ClipboardPaste size={16} /> Colar
          </button>
          <button
            type="button"
            disabled={!text.trim() || capture.isPending}
            onClick={() => capture.mutate()}
            className="flex-[2] py-2.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-40"
            style={{ background: t.gradient }}
          >
            <Send size={16} /> Lançar agora
          </button>
        </div>
      </div>

      <SectionCard>
        <div className="flex items-center gap-2 mb-3">
          <Link2 size={18} style={{ color: t.primary }} />
          <h2 className="text-sm font-bold text-white">Telegram · {botName}</h2>
        </div>

        {tgStatusQ.isLoading ? (
          <p className="text-sm" style={{ color: t.muted }}>Verificando vínculo…</p>
        ) : linked ? (
          <div className="space-y-3">
            <div
              className="rounded-xl px-3 py-2.5 flex items-center gap-2"
              style={{ background: 'rgba(34,197,94,0.12)', border: `1px solid ${t.primary}` }}
            >
              <span className="w-2 h-2 rounded-full" style={{ background: t.primary }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white">Vinculado</p>
                <p className="text-xs" style={{ color: t.muted }}>
                  {botUser || 'Bot'} ativo
                  {tg?.linked_at ? ` · desde ${new Date(tg.linked_at).toLocaleDateString('pt-BR')}` : ''}
                </p>
              </div>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: t.muted }}>
              Envie fotos ou PDF de comprovantes — o {botName} tenta ler e manda pra Inbox com preview.
            </p>
            {tg?.deep_link && (
              <a
                href={tg.deep_link}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 text-white"
                style={{ background: t.gradient }}
              >
                <ExternalLink size={16} /> Abrir no Telegram
              </a>
            )}
            <button
              type="button"
              onClick={() => linkMut.mutate()}
              className="w-full py-2 rounded-xl text-xs font-bold"
              style={{ background: '#0f0f1a', border: `1px solid ${t.border}`, color: t.muted }}
            >
              Religar com novo código
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div
              className="rounded-xl px-3 py-2.5"
              style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid #f59e0b' }}
            >
              <p className="text-sm font-bold" style={{ color: '#fbbf24' }}>Ainda não vinculado</p>
              <p className="text-xs mt-1" style={{ color: t.muted }}>
                Sem vínculo o {botName} não sabe quem você é (e vai reclamar).
              </p>
            </div>
            <ol className="text-xs space-y-2 list-decimal pl-4" style={{ color: t.muted }}>
              <li>Toque em <span className="text-white font-semibold">Gerar código</span></li>
              <li>Abra o bot {botUser ? <span className="text-white font-semibold">{botUser}</span> : 'no Telegram'}</li>
              <li>Envie <code className="text-white">/start SEUCODIGO</code> (ou use o link automático)</li>
            </ol>
            <button
              type="button"
              onClick={() => linkMut.mutate()}
              disabled={linkMut.isPending}
              className="w-full py-2.5 rounded-xl font-bold text-white disabled:opacity-40"
              style={{ background: t.gradient }}
            >
              {linkMut.isPending ? 'Gerando…' : 'Gerar código de vínculo'}
            </button>
          </div>
        )}

        {tgCode && (
          <div className="mt-3 rounded-xl p-3 space-y-2" style={{ background: '#0f0f1a', border: `1px solid ${t.border}` }}>
            <p className="text-center text-sm text-white">
              Envie no Telegram:{' '}
              <code className="font-black" style={{ color: t.primary }}>{startCommand}</code>
            </p>
            <p className="text-[11px] text-center" style={{ color: t.muted }}>
              Se o Telegram abrir só com /start, cole o comando completo.
            </p>
            <button
              type="button"
              onClick={() => copyStart()}
              className="w-full py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2"
              style={{ background: t.gradient }}
            >
              <Copy size={14} /> {copied ? 'Comando copiado' : 'Copiar comando'}
            </button>
            {startLink && (
              <a
                href={startLink}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                style={{ color: t.primary }}
              >
                <ExternalLink size={14} /> Abrir bot com o código
              </a>
            )}
          </div>
        )}
      </SectionCard>

      <section className="space-y-3">
        <h2 className="text-sm font-bold text-white px-1">Inbox</h2>
        {(inboxQ.data ?? []).length === 0 ? (
          <p className="text-sm px-1" style={{ color: t.muted }}>Nada pendente.</p>
        ) : (
          (inboxQ.data ?? []).map((item) => (
            <InboxCard
              key={item.id}
              item={item}
              accountId={accountId}
              confirming={confirmMut.isPending}
              onConfirm={(id, overrides) => confirmMut.mutate({ id, ...overrides })}
              onDismiss={(id) => dismissMut.mutate(id)}
            />
          ))
        )}
      </section>
    </PageShell>
  );
}
