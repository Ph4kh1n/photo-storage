import type { Video } from '../types';
import LazyImage from './LazyImage';
import { getDownloadUrl } from '../api';

interface VideoCardProps {
  video: Video;
  onPreview: (video: Video) => void;
}

export default function VideoCard({ video, onPreview }: VideoCardProps) {
  const thumbnailUrl = video.thumbnailLink || '';

  return (
    <div className="video-card">
      <div className="video-image-wrapper" onClick={() => onPreview(video)}>
        {thumbnailUrl ? (
          <LazyImage
            src={thumbnailUrl.replace('=s220', '=s600')}
            alt={video.name}
            className="video-thumb"
          />
        ) : (
          <div className="video-thumb-placeholder" />
        )}
        <div className="video-overlay">
          <div className="play-button">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </div>
        </div>
        {video.size > 0 && (
          <span className="video-duration-badge">{video.sizeFormatted}</span>
        )}
      </div>
      <div className="video-info">
        <p className="video-name" title={video.name}>{video.name}</p>
        <div className="video-meta">
          <span className="video-date">{new Date(video.createdTime).toLocaleDateString()}</span>
        </div>
        <div className="video-actions">
          <a
            href={getDownloadUrl(video.id)}
            className="btn-download"
            download={video.name}
            onClick={(e) => {
              e.preventDefault();
              window.open(getDownloadUrl(video.id), '_blank');
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
