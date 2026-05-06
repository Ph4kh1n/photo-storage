import type { FolderContents, FolderInfo, Analytics } from './types';

const API_BASE = import.meta.env.VITE_API_URL || '';

export async function fetchFolderContents(folderId?: string): Promise<FolderContents> {
  const params = folderId ? `?folderId=${folderId}` : '';
  const res = await fetch(`${API_BASE}/api/list${params}`);
  if (!res.ok) throw new Error('Failed to fetch folder contents');
  return res.json();
}

export async function fetchFolderInfo(folderId: string): Promise<FolderInfo> {
  const res = await fetch(`${API_BASE}/api/folder/${folderId}`);
  if (!res.ok) throw new Error('Failed to fetch folder info');
  return res.json();
}

export async function fetchAnalytics(): Promise<Analytics> {
  const res = await fetch(`${API_BASE}/api/analytics`);
  if (!res.ok) throw new Error('Failed to fetch analytics');
  return res.json();
}

export function getDownloadUrl(fileId: string): string {
  return `${API_BASE}/api/download/${fileId}`;
}

export function getFullImageUrl(fileId: string): string {
  return `${API_BASE}/api/download/${fileId}`;
}
