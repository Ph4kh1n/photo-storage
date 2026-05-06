import { useState, useRef, useEffect, useMemo } from 'react';
import type { DriveFolder, Breadcrumb, FolderContents } from '../types';
import { fetchFolderContents } from '../api';
import FolderCard from './FolderCard';
import PhotoCard from './PhotoCard';
import VideoCard from './VideoCard';
import MediaPreview from './MediaPreview';

type MediaType = 'photo' | 'video';

interface MediaItem {
  id: string;
  name: string;
  mediaType: MediaType;
  mimeType: string;
  size: number;
  sizeFormatted: string;
  thumbnailLink: string | null;
  createdTime: string;
}

export default function Gallery() {
  const [contents, setContents] = useState<FolderContents | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([{ id: 'root', name: 'All Photos' }]);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const loadCount = useRef(0);

  const mediaList: MediaItem[] = useMemo(() => {
    if (!contents) return [];
    return [
      ...contents.photos.map(p => ({
        id: p.id,
        name: p.name,
        mediaType: 'photo' as MediaType,
        mimeType: p.mimeType,
        size: p.size,
        sizeFormatted: p.sizeFormatted,
        thumbnailLink: p.thumbnailLink,
        createdTime: p.createdTime,
      })),
      ...contents.videos.map(v => ({
        id: v.id,
        name: v.name,
        mediaType: 'video' as MediaType,
        mimeType: v.mimeType,
        size: v.size,
        sizeFormatted: v.sizeFormatted,
        thumbnailLink: v.thumbnailLink,
        createdTime: v.createdTime,
      })),
    ];
  }, [contents]);

  async function loadFolder(folderId: string | null, folderName?: string) {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFolderContents(folderId || undefined);
      setContents(data);
      setCurrentFolderId(data.folderId);

      if (folderName) {
        setBreadcrumbs(prev => [...prev, { id: data.folderId, name: folderName }]);
      } else {
        setBreadcrumbs([{ id: 'root', name: 'All Photos' }]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (loadCount.current === 0) {
      loadCount.current++;
      loadFolder(null);
    }
  }, []);

  const navigateToFolder = (folder: DriveFolder) => {
    loadFolder(folder.id, folder.name);
  };

  const navigateBreadcrumb = (index: number) => {
    const crumb = breadcrumbs[index];
    if (index === 0) {
      loadFolder(null);
    } else {
      loadFolder(crumb.id, crumb.name);
    }
  };

  const handlePreview = (id: string) => {
    const index = mediaList.findIndex((m) => m.id === id);
    setPreviewIndex(index >= 0 ? index : null);
  };

  const handleClosePreview = () => setPreviewIndex(null);

  const handleNext = () => {
    if (previewIndex !== null && previewIndex < mediaList.length - 1) {
      setPreviewIndex(previewIndex + 1);
    }
  };

  const handlePrev = () => {
    if (previewIndex !== null && previewIndex > 0) {
      setPreviewIndex(previewIndex - 1);
    }
  };

  if (loading) {
    return (
      <div className="gallery-container">
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="gallery-container">
        <div className="error-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p>{error}</p>
          <button className="btn-retry" onClick={() => loadFolder(currentFolderId)}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!contents || (contents.folders.length === 0 && contents.photos.length === 0 && contents.videos.length === 0)) {
    return (
      <div className="gallery-container">
        <BreadcrumbNav breadcrumbs={breadcrumbs} onNavigate={navigateBreadcrumb} />
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          <p>This folder is empty</p>
        </div>
      </div>
    );
  }

  return (
    <div className="gallery-container">
      <BreadcrumbNav breadcrumbs={breadcrumbs} onNavigate={navigateBreadcrumb} />

      <div className="gallery-header">
        <h2>{breadcrumbs[breadcrumbs.length - 1].name}</h2>
        <span className="photo-count">
          {contents.folders.length > 0 && `${contents.folders.length} folder${contents.folders.length > 1 ? 's' : ''} `}
          {contents.photos.length} photo{contents.photos.length !== 1 ? 's' : ''}
          {contents.videos.length > 0 && `, ${contents.videos.length} video${contents.videos.length !== 1 ? 's' : ''}`}
        </span>
      </div>

      {contents.folders.length > 0 && (
        <div className="folders-section">
          <h3 className="section-label">Folders</h3>
          <div className="folders-grid">
            {contents.folders.map((folder) => (
              <FolderCard
                key={folder.id}
                folder={folder}
                onOpen={navigateToFolder}
              />
            ))}
          </div>
        </div>
      )}

      {contents.photos.length > 0 && (
        <div className="photos-section">
          {(contents.folders.length > 0 || contents.videos.length > 0) && <h3 className="section-label">Photos</h3>}
          <div className="gallery-grid">
            {contents.photos.map((photo) => (
              <PhotoCard
                key={photo.id}
                photo={photo}
                onPreview={() => handlePreview(photo.id)}
              />
            ))}
          </div>
        </div>
      )}

      {contents.videos.length > 0 && (
        <div className="videos-section">
          {contents.folders.length > 0 || contents.photos.length > 0 ? (
            <h3 className="section-label">Videos</h3>
          ) : null}
          <div className="gallery-grid">
            {contents.videos.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                onPreview={() => handlePreview(video.id)}
              />
            ))}
          </div>
        </div>
      )}

      {previewIndex !== null && (
        <MediaPreview
          key={mediaList[previewIndex].id}
          media={mediaList[previewIndex]}
          mediaList={mediaList}
          currentIndex={previewIndex}
          onClose={handleClosePreview}
          onNext={handleNext}
          onPrev={handlePrev}
        />
      )}
    </div>
  );
}

interface BreadcrumbNavProps {
  breadcrumbs: Breadcrumb[];
  onNavigate: (index: number) => void;
}

function BreadcrumbNav({ breadcrumbs, onNavigate }: BreadcrumbNavProps) {
  return (
    <nav className="breadcrumb-nav">
      {breadcrumbs.map((crumb, index) => (
        <span key={crumb.id} className="breadcrumb-item">
          {index > 0 && (
            <svg className="breadcrumb-sep" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          )}
          <button
            className={`breadcrumb-link ${index === breadcrumbs.length - 1 ? 'active' : ''}`}
            onClick={() => onNavigate(index)}
            disabled={index === breadcrumbs.length - 1}
          >
            {crumb.name}
          </button>
        </span>
      ))}
    </nav>
  );
}
