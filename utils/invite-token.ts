/**
 * QR / ディープリンク文字列から招待 token を取り出す。
 * https / bereach:// / exp:// .../invite/{token} / 生 token に対応。
 */
export function extractInviteTokenFromPayload(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (/^[a-f0-9]{64}$/i.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  // まずパス形式を広く拾う（scheme 差を吸収）
  const pathMatch = trimmed.match(/(?:^|\/|--\/)invite\/([A-Za-z0-9_-]+)/i);
  if (pathMatch?.[1]) {
    return pathMatch[1];
  }

  // bereach://invite/{token}（hostname=invite）
  try {
    if (trimmed.includes('://')) {
      const parsed = new URL(trimmed);
      if (parsed.hostname === 'invite') {
        const hostToken = parsed.pathname.replace(/^\//, '');
        if (hostToken) return hostToken;
      }
    }
  } catch {
    // ignore
  }

  return null;
}
