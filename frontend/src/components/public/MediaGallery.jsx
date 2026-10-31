import { useEffect, useState } from 'react';
import { cn } from '../../lib/cn';
import { isValidUrl, mediaHost, mediaPreview, normalizeUrl, videoPlayback } from '../../lib/media';

function TileImage({ src, alt }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-br from-accent/35 via-[#2a1430] to-hum/25"
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
    />
  );
}

function PlayIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M8 5.5v13a1 1 0 0 0 1.53.85l10-6.5a1 1 0 0 0 0-1.7l-10-6.5A1 1 0 0 0 8 5.5Z" />
    </svg>
  );
}

function MediaTile({ item, compact, onClick }) {
  const preview = mediaPreview(item);
  const isVideo = item.type === 'video';
  const playback = isVideo ? videoPlayback(item.url) : null;
  const provider =
    playback?.provider === 'youtube'
      ? 'YouTube'
      : playback?.provider === 'vimeo'
        ? 'Vimeo'
        : isVideo
          ? 'Video'
          : 'Imagen';

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative overflow-hidden rounded-xl border border-white/10 bg-white/5 text-left outline-none transition-colors focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/50',
        compact ? 'h-16 w-20 shrink-0' : 'aspect-[4/3] w-full'
      )}
      aria-label={isVideo ? `Reproducir ${provider}` : `Ver imagen ampliada`}
    >
      <TileImage src={preview} alt="" />
      {isVideo && (
        <span className="absolute inset-0 grid place-items-center bg-black/20">
          <span className="grid h-9 w-9 place-items-center rounded-full border border-white/40 bg-black/45 text-white shadow-lg backdrop-blur-sm transition-transform duration-300 group-hover:scale-110">
            <PlayIcon className="ml-0.5 h-3.5 w-3.5" />
          </span>
        </span>
      )}
      {!compact && (
        <>
          <span className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/70 to-transparent" />
          <span className="absolute bottom-1.5 left-2 text-[0.6rem] font-medium uppercase tracking-[0.14em] text-white/75">
            {provider}
          </span>
        </>
      )}
    </button>
  );
}

function MediaViewer({ viewer, images, title, onClose, onNavigate }) {
  const image = viewer.kind === 'image' ? images[viewer.index] : null;
  const playback = viewer.kind === 'video' ? videoPlayback(viewer.item.url) : null;

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
      if (viewer.kind === 'image' && images.length > 1) {
        if (event.key === 'ArrowRight') onNavigate(1);
        if (event.key === 'ArrowLeft') onNavigate(-1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [images.length, onClose, onNavigate, viewer.kind]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Multimedia de ${title}`}
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar visor"
        className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-black/40 text-lg text-white/80 backdrop-blur transition-colors hover:bg-white/15 hover:text-white focus-visible:ring-2 focus-visible:ring-accent"
      >
        ✕
      </button>

      <div className="relative w-full max-w-4xl" onClick={(event) => event.stopPropagation()}>
        {viewer.kind === 'image' ? (
          <>
            <img
              src={normalizeUrl(image?.url || '')}
              alt={`${title} · imagen ${viewer.index + 1}`}
              className="mx-auto max-h-[82vh] w-auto max-w-full rounded-2xl border border-white/10 object-contain shadow-2xl"
            />
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => onNavigate(-1)}
                  aria-label="Imagen anterior"
                  className="absolute left-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/45 text-xl text-white/80 backdrop-blur transition-colors hover:bg-white/15 hover:text-white"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate(1)}
                  aria-label="Imagen siguiente"
                  className="absolute right-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/45 text-xl text-white/80 backdrop-blur transition-colors hover:bg-white/15 hover:text-white"
                >
                  →
                </button>
                <p className="mt-3 text-center text-xs text-white/50">
                  {viewer.index + 1} / {images.length}
                </p>
              </>
            )}
          </>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl">
            {playback?.embedUrl ? (
              <div className="aspect-video w-full">
                <iframe
                  src={playback.embedUrl}
                  title={`${title} · video`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="h-full w-full"
                />
              </div>
            ) : playback?.fileUrl ? (
              <video src={playback.fileUrl} controls autoPlay className="max-h-[82vh] w-full" />
            ) : (
              <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
                <p className="text-sm text-white/60">Este video no se puede reproducir incrustado.</p>
                <a
                  href={normalizeUrl(viewer.item.url)}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-accent/40 bg-accent/15 px-4 py-2 text-sm text-white transition-colors hover:bg-accent/25"
                >
                  Abrir video ↗
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MediaGallery({ media = [], title = 'Ejercicio', compact = false }) {
  const [viewer, setViewer] = useState(null);
  const items = (media || []).filter((item) => item && isValidUrl(item.url));
  const images = items.filter((item) => item.type === 'image');
  const videos = items.filter((item) => item.type === 'video');
  const links = items.filter((item) => item.type === 'link');

  if (!items.length) return null;

  const openImage = (index) => setViewer({ kind: 'image', index });
  const openVideo = (item) => setViewer({ kind: 'video', item });
  const moveImage = (direction) => {
    setViewer((current) => {
      if (!current || current.kind !== 'image') return current;
      const next = (current.index + direction + images.length) % images.length;
      return { kind: 'image', index: next };
    });
  };

  return (
    <div>
      {(images.length > 0 || videos.length > 0) && (
        <div
          className={cn(
            compact ? 'mt-2 flex gap-1.5 overflow-x-auto pb-1' : 'grid grid-cols-2 gap-2 sm:grid-cols-3'
          )}
        >
          {images.map((item, index) => (
            <MediaTile
              key={`image-${item.url}-${index}`}
              item={item}
              compact={compact}
              onClick={() => openImage(index)}
            />
          ))}
          {videos.map((item, index) => (
            <MediaTile
              key={`video-${item.url}-${index}`}
              item={item}
              compact={compact}
              onClick={() => openVideo(item)}
            />
          ))}
        </div>
      )}

      {links.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {links.map((item, index) => (
            <a
              key={`link-${item.url}-${index}`}
              href={normalizeUrl(item.url)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex max-w-full items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[0.68rem] text-white/55 transition-colors hover:border-white/25 hover:bg-white/10 hover:text-white"
            >
              <span className="max-w-[13rem] truncate">{mediaHost(item.url) || 'Enlace'}</span>
              <span aria-hidden="true">↗</span>
            </a>
          ))}
        </div>
      )}

      {viewer && (
        <MediaViewer
          viewer={viewer}
          images={images}
          title={title}
          onClose={() => setViewer(null)}
          onNavigate={moveImage}
        />
      )}
    </div>
  );
}
