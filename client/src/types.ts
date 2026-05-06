export interface DriveFolder {
  id: string;
  name: string;
  type: 'folder';
  createdTime: string;
  modifiedTime: string;
}

export interface Photo {
  id: string;
  name: string;
  type: 'photo';
  mimeType: string;
  size: number;
  sizeFormatted: string;
  thumbnailLink: string | null;
  createdTime: string;
  modifiedTime: string;
}

export interface Video {
  id: string;
  name: string;
  type: 'video';
  mimeType: string;
  size: number;
  sizeFormatted: string;
  thumbnailLink: string | null;
  createdTime: string;
  modifiedTime: string;
}

export type DriveItem = DriveFolder | Photo | Video;

export interface FolderContents {
  folderId: string;
  folders: DriveFolder[];
  photos: Photo[];
  videos: Video[];
}

export interface FolderInfo {
  id: string;
  name: string;
  parentId: string | null;
}

export interface Breadcrumb {
  id: string;
  name: string;
}

export interface TypeDistribution {
  type: string;
  count: number;
}

export interface Analytics {
  totalSize: number;
  totalSizeFormatted: string;
  fileCount: number;
  folderCount: number;
  imageCount: number;
  videoCount: number;
  otherCount: number;
  typeDistribution: TypeDistribution[];
  recentActivity: {
    newCount: number;
    newSize: number;
    newSizeFormatted: string;
    period: string;
  };
}
