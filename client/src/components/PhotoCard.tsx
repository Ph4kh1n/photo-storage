import type { Photo } from '../types';
import LazyImage from './LazyImage';
import { getDownloadUrl } from '../api';

interface PhotoCardProps {
  photo: Photo;
  onPreview: (photo: Photo) => void;
}

export default function PhotoCard({ photo, onPreview }: PhotoCardProps) {
  const thumbnailUrl = photo.thumbnailLink || '';
  const downloadUrl = getDownloadUrl(photo.id);

  return (
    <div className="photo-card">
      <div className="photo-image-wrapper" onClick={() => onPreview(photo)}>
        <LazyImage
          src={thumbnailUrl.replace('=s220', '=s600')}
          alt={photo.name}
          className="photo-img"
        />
        <div className="photo-overlay">
          <svg className="preview-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="11" y1="8" x2="11" y2="14" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
        </div>
      </div>
      <div className="photo-info">
        <p className="photo-name" title={photo.name}>{photo.name}</p>
        <div className="photo-meta">
          <span className="photo-size">{photo.sizeFormatted}</span>
          <span className="photo-date">{new Date(photo.createdTime).toLocaleDateString()}</span>
        </div>
        <div className="photo-actions">
          <a
            href={downloadUrl}
            className="btn-download"
            download={photo.name}
            onClick={(e) => {
              e.preventDefault();
              window.open(downloadUrl, '_blank');
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
