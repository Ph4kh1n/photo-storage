import type { DriveFolder } from '../types';

interface FolderCardProps {
  folder: DriveFolder;
  onOpen: (folder: DriveFolder) => void;
}

export default function FolderCard({ folder, onOpen }: FolderCardProps) {
  return (
    <div className="folder-card" onClick={() => onOpen(folder)}>
      <div className="folder-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
      </div>
      <div className="folder-info">
        <p className="folder-name" title={folder.name}>{folder.name}</p>
        <span className="folder-date">{new Date(folder.modifiedTime).toLocaleDateString()}</span>
      </div>
      <svg className="folder-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </div>
  );
}
