import { useState, useRef, useEffect, useMemo } from 'react';
import type { DriveFolder, Breadcrumb, FolderContents } from '../types';
import { fetchFolderContents, fetchFolderInfo } from '../api';
import FolderCard from './FolderCard';
import PhotoCard from './PhotoCard';
import VideoCard from './VideoCard';
import MediaPreview from './MediaPreview';

type MediaType = 'photo' | 'video';
type SortMode = 'latest' | 'oldest' | 'name-asc' | 'name-desc';

const sortOptions: { value: SortMode; label: string }[] = [
  { value: 'latest', label: 'Latest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'name-asc', label: 'Name A-Z' },
  { value: 'name-desc', label: 'Name Z-A' },
];

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
  const [copied, setCopied] = useState(false);
  const [sortBy, setSortBy] = useState<SortMode>('latest');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
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

  const sortedContents = useMemo(() => {
    if (!contents) return null;
    const sorted = [...contents.folders].sort((a, b) => {
      switch (sortBy) {
        case 'latest': return new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime();
        case 'oldest': return new Date(a.createdTime).getTime() - new Date(b.createdTime).getTime();
        case 'name-asc': return a.name.localeCompare(b.name);
        case 'name-desc': return b.name.localeCompare(a.name);
      }
    });
    const sortItems = <T extends { createdTime: string; name: string }>(items: T[]) =>
      [...items].sort((a, b) => {
        switch (sortBy) {
          case 'latest': return new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime();
          case 'oldest': return new Date(a.createdTime).getTime() - new Date(b.createdTime).getTime();
          case 'name-asc': return a.name.localeCompare(b.name);
          case 'name-desc': return b.name.localeCompare(a.name);
        }
      });
    return {
      ...contents,
      folders: sorted,
      photos: sortItems(contents.photos),
      videos: sortItems(contents.videos),
    };
  }, [contents, sortBy]);

  async function loadFolderContents(folderId: string | null) {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFolderContents(folderId || undefined);
      setContents(data);
      setCurrentFolderId(data.folderId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (loadCount.current === 0) {
      loadCount.current++;
      const hash = window.location.hash.slice(1);
      if (hash) {
        (async () => {
          try {
            const info = await fetchFolderInfo(hash);
            setBreadcrumbs(prev => [...prev, { id: info.id, name: info.name }]);
            await loadFolderContents(hash);
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load');
            setLoading(false);
          }
        })();
      } else {
        loadFolderContents(null);
      }
    }
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setShowSortMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (currentFolderId) {
      history.replaceState(null, '', `#${currentFolderId}`);
    } else {
      history.replaceState(null, '', window.location.pathname);
    }
  }, [currentFolderId]);

  useEffect(() => {
    const folderName = breadcrumbs[breadcrumbs.length - 1].name;
    const isRoot = breadcrumbs.length === 1;
    const firstPhoto = contents?.photos?.[0];

    document.title = isRoot ? 'Matthayom Again' : `${folderName} - Matthayom Again`;

    setMeta('og:title', isRoot ? 'Matthayom Again' : folderName);
    setMeta('og:description', isRoot
      ? 'Browse and download photos'
      : `${contents?.photos.length || 0} photos, ${contents?.videos.length || 0} videos`
    );
    setMeta('twitter:card', 'summary_large_image');

    if (firstPhoto?.thumbnailLink) {
      setMeta('og:image', firstPhoto.thumbnailLink);
      setMeta('twitter:image', firstPhoto.thumbnailLink);
    }
  }, [contents, breadcrumbs]);

  function setMeta(property: string, content: string) {
    let el = document.querySelector(`meta[property="${property}"], meta[name="${property}"]`);
    if (!el) {
      el = document.createElement('meta');
      if (property.startsWith('og:')) {
        el.setAttribute('property', property);
      } else {
        el.setAttribute('name', property);
      }
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  }

  const navigateToFolder = (folder: DriveFolder) => {
    setBreadcrumbs(prev => [...prev, { id: folder.id, name: folder.name }]);
    loadFolderContents(folder.id);
  };

  const navigateBreadcrumb = (index: number) => {
    if (index === breadcrumbs.length - 1) return;
    const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
    setBreadcrumbs(newBreadcrumbs);
    const crumb = newBreadcrumbs[index];
    loadFolderContents(crumb.id === 'root' ? null : crumb.id);
  };

  const navigateHome = () => {
    setBreadcrumbs([{ id: 'root', name: 'All Photos' }]);
    loadFolderContents(null);
  };

  const handlePreview = (id: string) => {
    const index = mediaList.findIndex((m) => m.id === id);
    setPreviewIndex(index >= 0 ? index : null);
  };

  const handleClosePreview = () => setPreviewIndex(null);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement('input');
      input.value = window.location.href;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRetry = () => {
    const last = breadcrumbs[breadcrumbs.length - 1];
    loadFolderContents(last.id === 'root' ? null : last.id);
  };

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
          <button className="btn-retry" onClick={handleRetry}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!contents || (contents.folders.length === 0 && contents.photos.length === 0 && contents.videos.length === 0)) {
    return (
      <div className="gallery-container">
        <BreadcrumbNav breadcrumbs={breadcrumbs} onNavigate={navigateBreadcrumb} onHome={navigateHome} />
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
      <BreadcrumbNav breadcrumbs={breadcrumbs} onNavigate={navigateBreadcrumb} onHome={navigateHome} />

      <div className="gallery-header">
        <h2>
          {breadcrumbs[breadcrumbs.length - 1].name}
          {currentFolderId && (
            <button
              className={`btn-copy-link ${copied ? 'copied' : ''}`}
              onClick={handleCopyLink}
              title="Copy share link"
            >
              {copied ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
              )}
            </button>
          )}
        </h2>
        <div className="header-actions">
          <div className="sort-wrapper" ref={sortRef}>
            <button className="btn-sort" onClick={() => setShowSortMenu(prev => !prev)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 7h18M7 12h10M11 17h2" />
              </svg>
              {sortOptions.find(o => o.value === sortBy)?.label}
            </button>
            {showSortMenu && (
              <div className="sort-menu">
                {sortOptions.map(option => (
                  <button
                    key={option.value}
                    className={`sort-option ${option.value === sortBy ? 'active' : ''}`}
                    onClick={() => { setSortBy(option.value); setShowSortMenu(false); }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <span className="photo-count">
            {sortedContents!.folders.length > 0 && `${sortedContents!.folders.length} folder${sortedContents!.folders.length > 1 ? 's' : ''} `}
            {sortedContents!.photos.length} photo{sortedContents!.photos.length !== 1 ? 's' : ''}
            {sortedContents!.videos.length > 0 && `, ${sortedContents!.videos.length} video${sortedContents!.videos.length !== 1 ? 's' : ''}`}
          </span>
        </div>
      </div>

      {sortedContents!.folders.length > 0 && (
        <div className="folders-section">
          <h3 className="section-label">Folders</h3>
          <div className="folders-grid">
            {sortedContents!.folders.map((folder) => (
              <FolderCard
                key={folder.id}
                folder={folder}
                onOpen={navigateToFolder}
              />
            ))}
          </div>
        </div>
      )}

      {sortedContents!.photos.length > 0 && (
        <div className="photos-section">
          {(sortedContents!.folders.length > 0 || sortedContents!.videos.length > 0) && <h3 className="section-label">Photos</h3>}
          <div className="gallery-grid">
            {sortedContents!.photos.map((photo) => (
              <PhotoCard
                key={photo.id}
                photo={photo}
                onPreview={() => handlePreview(photo.id)}
              />
            ))}
          </div>
        </div>
      )}

      {sortedContents!.videos.length > 0 && (
        <div className="videos-section">
          {sortedContents!.folders.length > 0 || sortedContents!.photos.length > 0 ? (
            <h3 className="section-label">Videos</h3>
          ) : null}
          <div className="gallery-grid">
            {sortedContents!.videos.map((video) => (
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
  onHome: () => void;
}

function BreadcrumbNav({ breadcrumbs, onNavigate, onHome }: BreadcrumbNavProps) {
  return (
    <nav className="breadcrumb-nav">
      <button className="breadcrumb-home" onClick={onHome} title="Go to root">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      </button>
      {breadcrumbs.map((crumb, index) => (
        <span key={crumb.id} className="breadcrumb-item">
          <svg className="breadcrumb-sep" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
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
