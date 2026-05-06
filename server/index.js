require('dotenv').config();
const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Google Drive API Setup
const auth = new google.auth.GoogleAuth({
  keyFile: 'credentials.json',
  scopes: ['https://www.googleapis.com/auth/drive.readonly'],
});

const drive = google.drive({ version: 'v3', auth });

const ROOT_FOLDER_ID = process.env.DRIVE_FOLDER_ID;

// Cache system
const cache = {};
const CACHE_TTL = {
  list: 2 * 60 * 1000,
  analytics: 5 * 60 * 1000,
};

function getCacheKey(type, folderId) {
  return `${type}_${folderId || ROOT_FOLDER_ID}`;
}

function getCached(type, folderId) {
  const key = getCacheKey(type, folderId);
  const entry = cache[key];
  if (entry && Date.now() - entry.time < CACHE_TTL[type]) {
    return entry.data;
  }
  return null;
}

function setCache(type, folderId, data) {
  const key = getCacheKey(type, folderId);
  cache[key] = { data, time: Date.now() };
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// List folders and photos in a given folder
app.get('/api/list', async (req, res) => {
  try {
    const folderId = req.query.folderId || ROOT_FOLDER_ID;

    const cached = getCached('list', folderId);
    if (cached) {
      return res.json(cached);
    }

    // Fetch folders
    const foldersRes = await drive.files.list({
      q: `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name, createdTime, modifiedTime)',
      orderBy: 'name',
    });

    // Fetch photos
    const photosRes = await drive.files.list({
      q: `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
      fields: 'files(id, name, mimeType, size, thumbnailLink, createdTime, modifiedTime)',
      orderBy: 'createdTime desc',
    });

    // Fetch videos
    const videosRes = await drive.files.list({
      q: `'${folderId}' in parents and mimeType contains 'video/' and trashed = false`,
      fields: 'files(id, name, mimeType, size, thumbnailLink, createdTime, modifiedTime)',
      orderBy: 'createdTime desc',
    });

    const folders = foldersRes.data.files.map(file => ({
      id: file.id,
      name: file.name,
      type: 'folder',
      createdTime: file.createdTime,
      modifiedTime: file.modifiedTime,
    }));

    const photos = photosRes.data.files.map(file => ({
      id: file.id,
      name: file.name,
      type: 'photo',
      mimeType: file.mimeType,
      size: file.size ? parseInt(file.size) : 0,
      sizeFormatted: formatBytes(parseInt(file.size || 0)),
      thumbnailLink: file.thumbnailLink,
      createdTime: file.createdTime,
      modifiedTime: file.modifiedTime,
    }));

    const videos = videosRes.data.files.map(file => ({
      id: file.id,
      name: file.name,
      type: 'video',
      mimeType: file.mimeType,
      size: file.size ? parseInt(file.size) : 0,
      sizeFormatted: formatBytes(parseInt(file.size || 0)),
      thumbnailLink: file.thumbnailLink,
      createdTime: file.createdTime,
      modifiedTime: file.modifiedTime,
    }));

    const result = {
      folderId,
      folders,
      photos,
      videos,
    };

    setCache('list', folderId, result);
    res.json(result);
  } catch (error) {
    console.error('Error listing contents:', error);
    res.status(500).json({ error: 'Failed to list contents' });
  }
});

// Get folder info (name, parent)
app.get('/api/folder/:folderId', async (req, res) => {
  try {
    const file = await drive.files.get({
      fileId: req.params.folderId,
      fields: 'id, name, parents',
    });

    res.json({
      id: file.data.id,
      name: file.data.name,
      parentId: file.data.parents?.[0] || null,
    });
  } catch (error) {
    console.error('Error fetching folder:', error);
    res.status(500).json({ error: 'Failed to fetch folder' });
  }
});

// Proxy download/stream for photos and videos (supports range requests for video seeking)
app.get('/api/download/:fileId', async (req, res) => {
  try {
    const fileId = req.params.fileId;
    
    const fileMetadata = await drive.files.get({
      fileId: fileId,
      fields: 'name, mimeType, size',
    });

    const fileSize = parseInt(fileMetadata.data.size || 0);
    const mimeType = fileMetadata.data.mimeType;
    const range = req.headers.range;

    if (range && mimeType.startsWith('video/')) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': mimeType,
      });

      const response = await drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'stream', headers: { Range: `bytes=${start}-${end}` } }
      );

      response.data.pipe(res);
    } else {
      res.setHeader('Content-Disposition', `attachment; filename="${fileMetadata.data.name}"`);
      res.setHeader('Content-Type', mimeType);

      const response = await drive.files.get(
        { fileId: fileId, alt: 'media' },
        { responseType: 'stream' }
      );

      response.data.pipe(res);
    }
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

// Get storage analytics (recursively scans all subfolders)
app.get('/api/analytics', async (req, res) => {
  try {
    const cached = getCached('analytics', null);
    if (cached) {
      return res.json(cached);
    }

    async function getAllFiles(folderId) {
      const allFiles = [];
      
      // Get direct children
      const response = await drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: 'files(id, name, size, mimeType, createdTime)',
      });

      for (const file of response.data.files) {
        allFiles.push(file);
        
        // Recurse into subfolders
        if (file.mimeType === 'application/vnd.google-apps.folder') {
          const subFiles = await getAllFiles(file.id);
          allFiles.push(...subFiles);
        }
      }
      
      return allFiles;
    }

    const allFiles = await getAllFiles(ROOT_FOLDER_ID);
    
    let totalSize = 0;
    let imageCount = 0;
    let videoCount = 0;
    let folderCount = 0;
    let otherCount = 0;
    const typeDistribution = {};
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    let newSize = 0;
    let newCount = 0;

    allFiles.forEach(file => {
      const size = parseInt(file.size || 0);
      totalSize += size;
      
      if (file.mimeType === 'application/vnd.google-apps.folder') {
        folderCount++;
      } else if (file.mimeType.startsWith('image/')) {
        imageCount++;
      } else if (file.mimeType.startsWith('video/')) {
        videoCount++;
      } else {
        otherCount++;
      }
      
      if (file.mimeType !== 'application/vnd.google-apps.folder') {
        const type = file.mimeType.split('/')[1] || file.mimeType.split('/')[0];
        typeDistribution[type] = (typeDistribution[type] || 0) + 1;
      }

      const createdDate = new Date(file.createdTime);
      if (createdDate >= sevenDaysAgo) {
        newCount++;
        newSize += size;
      }
    });

    const sortedTypes = Object.entries(typeDistribution)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({ type, count }));

    const analytics = {
      totalSize,
      totalSizeFormatted: formatBytes(totalSize),
      fileCount: allFiles.length - folderCount,
      folderCount,
      imageCount,
      videoCount,
      otherCount,
      typeDistribution: sortedTypes,
      recentActivity: {
        newCount,
        newSize,
        newSizeFormatted: formatBytes(newSize),
        period: '7 days',
      },
    };

    setCache('analytics', null, analytics);
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
