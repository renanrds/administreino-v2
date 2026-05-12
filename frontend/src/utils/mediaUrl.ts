const INTERNAL_MEDIA_HOSTS = new Set([
  'backend',
  'administreino_backend',
  'localhost',
  '127.0.0.1',
]);

export function normalizeMediaUrl(url?: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('blob:') || url.startsWith('data:')) return url;

  try {
    const parsed = new URL(url, window.location.origin);
    const isInternalHost = INTERNAL_MEDIA_HOSTS.has(parsed.hostname) || parsed.hostname.includes('backend');
    const isMediaPath = parsed.pathname.startsWith('/media/');

    if (isInternalHost && isMediaPath) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch {
    return url;
  }

  return url;
}
