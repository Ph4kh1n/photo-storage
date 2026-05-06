import { useState, useEffect, useCallback, useRef } from 'react';
import { getDownloadUrl } from '../api';

interface MediaItem {
  id: string;
  name: string;
  mediaType: 'photo' | 'video';
  mimeType: string;
  size: number;
  sizeFormatted: string;
  thumbnailLink: string | null;
  createdTime: string;
}

interface MediaPreviewProps {
  media: MediaItem;
  mediaList: MediaItem[];
  currentIndex: number;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
}

function getPreviewUrl(fileId: string, size: number): string {
  return `https://lh3.googleusercontent.com/d/${fileId}=s${size}`;
}

const prefetchCache = new Set<string>();

function prefetchUrl(url: string) {
  if (prefetchCache.has(url)) return;
  prefetchCache.add(url);
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = url;
  link.as = 'image';
  document.head.appendChild(link);
}

function prefetchAdjacent(mediaList: MediaItem[], currentIndex: number) {
  const next = currentIndex + 1;
  const prev = currentIndex - 1;
  if (next < mediaList.length && mediaList[next].mediaType === 'photo') {
    const lowRes = getPreviewUrl(mediaList[next].id, 400);
    prefetchUrl(lowRes);
  }
  if (prev >= 0 && mediaList[prev].mediaType === 'photo') {
    const lowRes = getPreviewUrl(mediaList[prev].id, 400);
    prefetchUrl(lowRes);
  }
}

export default function MediaPreview({ media, mediaList, currentIndex, onClose, onNext, onPrev }: MediaPreviewProps) {
  const [lowResLoaded, setLowResLoaded] = useState(false);
  const [fullResLoaded, setFullResLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const isVideo = media.mediaType === 'video';
  const streamUrl = getDownloadUrl(media.id);
  const lowResUrl = !isVideo ? getPreviewUrl(media.id, 400) : '';
  const fullResUrl = !isVideo ? getDownloadUrl(media.id) : '';

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowRight') onNext();
    if (e.key === 'ArrowLeft') onPrev();
  }, [onClose, onNext, onPrev]);

  useEffect(() => {
    prefetchAdjacent(mediaList, currentIndex);

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown, mediaList, currentIndex]);

  useEffect(() => {
    if (!isVideo && lowResLoaded && !fullResLoaded) {
      const img = new Image();
      img.onload = () => setFullResLoaded(true);
      img.src = fullResUrl;
    }
  }, [isVideo, lowResLoaded, fullResLoaded, fullResUrl]);

  return (
    <div className="photo-preview-overlay" onClick={onClose}>
      <div className="photo-preview" onClick={(e) => e.stopPropagation()}>
        <button className="preview-close" onClick={onClose}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <button className="preview-nav prev" onClick={onPrev}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <button className="preview-nav next" onClick={onNext}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        <div className="preview-image-container">
          {isVideo ? (
            <video
              ref={videoRef}
              className="preview-video"
              src={streamUrl}
              controls
              autoPlay
              playsInline
            />
          ) : (
            <>
              <img
                className="preview-image preview-image-lowres"
                src={lowResUrl}
                alt={media.name}
                onLoad={() => setLowResLoaded(true)}
              />
              <img
                className={`preview-image preview-image-fullres ${fullResLoaded ? 'active' : ''}`}
                src={fullResUrl}
                alt={media.name}
              />
              {!fullResLoaded && lowResLoaded && (
                <div className="preview-loading-badge">Loading full resolution...</div>
              )}
            </>
          )}
        </div>

        <div className="preview-info">
          <h3 className="preview-name">{media.name}</h3>
          <div className="preview-meta">
            <span>{media.sizeFormatted}</span>
            <span>{new Date(media.createdTime).toLocaleDateString()}</span>
            <span>{media.mimeType}</span>
          </div>
          <a
            href={getDownloadUrl(media.id)}
            className="btn-download btn-large"
            download={media.name}
            onClick={(e) => {
              e.preventDefault();
              window.open(getDownloadUrl(media.id), '_blank');
            }}
          >
            <svg className="download-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download
          </a>
        </div>
      </div>
    </div>
  );
}
