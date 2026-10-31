export function normalizeUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) return raw;
  return `https://${raw}`;
}

export function isValidUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return false;
  try {
    const url = new URL(normalizeUrl(raw));
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function mediaHost(value) {
  try {
    return new URL(normalizeUrl(value)).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function youtubeId(value) {
  try {
    const url = new URL(normalizeUrl(value));
    const host = url.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') return url.pathname.slice(1).split('/')[0] || '';
    if (!/(^|\.)youtube\.com$/.test(host) && host !== 'youtube-nocookie.com') return '';
    if (url.pathname === '/watch') return url.searchParams.get('v') || '';
    const match = url.pathname.match(/^\/(?:embed|shorts|live)\/([^/?#]+)/);
    return match ? match[1] : '';
  } catch {
    return '';
  }
}

export function vimeoId(value) {
  try {
    const url = new URL(normalizeUrl(value));
    const host = url.hostname.replace(/^www\./, '');
    if (host !== 'vimeo.com' && host !== 'player.vimeo.com') return '';
    const match = url.pathname.match(/\/(\d+)/);
    return match ? match[1] : '';
  } catch {
    return '';
  }
}

export function videoPlayback(value) {
  const youtube = youtubeId(value);
  if (youtube) {
    return {
      provider: 'youtube',
      id: youtube,
      embedUrl: `https://www.youtube-nocookie.com/embed/${youtube}?autoplay=1&rel=0`,
      fileUrl: '',
      thumbnail: `https://i.ytimg.com/vi/${youtube}/hqdefault.jpg`,
    };
  }

  const vimeo = vimeoId(value);
  if (vimeo) {
    return {
      provider: 'vimeo',
      id: vimeo,
      embedUrl: `https://player.vimeo.com/video/${vimeo}?autoplay=1`,
      fileUrl: '',
      thumbnail: '',
    };
  }

  if (/\.(mp4|webm|ogg)(\?|#|$)/i.test(String(value || ''))) {
    return {
      provider: 'file',
      id: '',
      embedUrl: '',
      fileUrl: normalizeUrl(value),
      thumbnail: '',
    };
  }

  return null;
}

export function mediaPreview(item) {
  if (!isValidUrl(item?.url)) return '';
  if (item.type === 'image') return normalizeUrl(item.url);
  if (item.type === 'video') return videoPlayback(item.url)?.thumbnail || '';
  return '';
}
