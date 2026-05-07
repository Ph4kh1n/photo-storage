const path = require('path');
const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');

const app = express();

app.use(cors({
  origin: [
    'https://matthayom-again.phakhinnongthong.workers.dev',
    'https://matthayom-again.phakhinnongthong.workers.dev/',
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Google Drive API Setup — works both locally (credentials.json) and on Vercel (GOOGLE_CREDENTIALS env)
let drive;
async function getDrive() {
  if (drive) return drive;
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    ...(process.env.GOOGLE_CREDENTIALS
      ? { credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS) }
      : { keyFile: path.join(__dirname, 'credentials.json') }),
  });
  drive = google.drive({ version: 'v3', auth });
  return drive;
}

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
    if (cached) return res.json(cached);

    const d = await getDrive();

    const [foldersRes, photosRes, videosRes] = await Promise.all([
      d.files.list({
        q: `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id, name, createdTime, modifiedTime)',
        orderBy: 'name',
      }),
      d.files.list({
        q: `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
        fields: 'files(id, name, mimeType, size, thumbnailLink, createdTime, modifiedTime)',
        orderBy: 'createdTime desc',
      }),
      d.files.list({
        q: `'${folderId}' in parents and mimeType contains 'video/' and trashed = false`,
        fields: 'files(id, name, mimeType, size, thumbnailLink, createdTime, modifiedTime)',
        orderBy: 'createdTime desc',
      }),
    ]);

    const folders = foldersRes.data.files.map(file => ({
      id: file.id, name: file.name, type: 'folder',
      createdTime: file.createdTime, modifiedTime: file.modifiedTime,
    }));

    const photos = photosRes.data.files.map(file => ({
      id: file.id, name: file.name, type: 'photo',
      mimeType: file.mimeType, size: parseInt(file.size || 0),
      sizeFormatted: formatBytes(parseInt(file.size || 0)),
      thumbnailLink: file.thumbnailLink,
      createdTime: file.createdTime, modifiedTime: file.modifiedTime,
    }));

    const videos = videosRes.data.files.map(file => ({
      id: file.id, name: file.name, type: 'video',
      mimeType: file.mimeType, size: parseInt(file.size || 0),
      sizeFormatted: formatBytes(parseInt(file.size || 0)),
      thumbnailLink: file.thumbnailLink,
      createdTime: file.createdTime, modifiedTime: file.modifiedTime,
    }));

    const result = { folderId, folders, photos, videos };
    setCache('list', folderId, result);
    res.json(result);
  } catch (error) {
    console.error('Error listing contents:', error);
    res.status(500).json({ error: 'Failed to list contents' });
  }
});

// Open Graph meta tags for folder link previews
app.get('/api/og/:folderId', async (req, res) => {
  try {
    const folderId = req.params.folderId;
    const d = await getDrive();

    const [folderInfo, photosRes] = await Promise.all([
      d.files.get({ fileId: folderId, fields: 'id, name' }),
      d.files.list({
        q: `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
        fields: 'files(id, name, thumbnailLink)',
        pageSize: 1, orderBy: 'createdTime desc',
      }),
    ]);

    const folderName = folderInfo.data.name;
    const firstPhoto = photosRes.data.files[0];
    const imageUrl = firstPhoto
      ? (firstPhoto.thumbnailLink || `https://lh3.googleusercontent.com/d/${firstPhoto.id}=s600`) : '';

    const title = escapeHtml(folderName);
    const description = escapeHtml(`View photos in ${folderName} - Matthayom Again`);
    const imageTag = imageUrl
      ? `<meta property="og:image" content="${escapeHtml(imageUrl)}" />\n    <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />` : '';

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${title} - Matthayom Again</title>
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${description}" />
${imageTag}
<meta property="og:type" content="website" />
<meta name="twitter:card" content="summary_large_image" />
<meta http-equiv="refresh" content="0;url=/#${folderId}" />
<script>window.location.hash = '${folderId}';</script>
</head>
<body></body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('Error generating OG:', error);
    res.redirect('/');
  }
});

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Get folder info
app.get('/api/folder/:folderId', async (req, res) => {
  try {
    const d = await getDrive();
    const file = await d.files.get({
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

// Proxy download/stream for photos and videos
app.get('/api/download/:fileId', async (req, res) => {
  try {
    const fileId = req.params.fileId;
    const d = await getDrive();

    const fileMetadata = await d.files.get({
      fileId, fields: 'name, mimeType, size',
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

      const response = await d.files.get(
        { fileId, alt: 'media' },
        { responseType: 'stream', headers: { Range: `bytes=${start}-${end}` } }
      );
      response.data.pipe(res);
    } else {
      res.setHeader('Content-Disposition', `attachment; filename="${fileMetadata.data.name}"`);
      res.setHeader('Content-Type', mimeType);

      const response = await d.files.get(
        { fileId, alt: 'media' },
        { responseType: 'stream' }
      );
      response.data.pipe(res);
    }
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

// Storage analytics
app.get('/api/analytics', async (req, res) => {
  try {
    const cached = getCached('analytics', null);
    if (cached) return res.json(cached);

    const d = await getDrive();

    async function getAllFiles(folderId) {
      const allFiles = [];
      const response = await d.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: 'files(id, name, size, mimeType, createdTime)',
      });

      for (const file of response.data.files) {
        allFiles.push(file);
        if (file.mimeType === 'application/vnd.google-apps.folder') {
          const subFiles = await getAllFiles(file.id);
          allFiles.push(...subFiles);
        }
      }
      return allFiles;
    }

    const allFiles = await getAllFiles(ROOT_FOLDER_ID);

    let totalSize = 0, imageCount = 0, videoCount = 0, folderCount = 0, otherCount = 0;
    const typeDistribution = {};
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    let newSize = 0, newCount = 0;

    allFiles.forEach(file => {
      const size = parseInt(file.size || 0);
      totalSize += size;
      if (file.mimeType === 'application/vnd.google-apps.folder') folderCount++;
      else if (file.mimeType.startsWith('image/')) imageCount++;
      else if (file.mimeType.startsWith('video/')) videoCount++;
      else otherCount++;

      if (file.mimeType !== 'application/vnd.google-apps.folder') {
        const type = file.mimeType.split('/')[1] || file.mimeType.split('/')[0];
        typeDistribution[type] = (typeDistribution[type] || 0) + 1;
      }
      if (new Date(file.createdTime) >= sevenDaysAgo) { newCount++; newSize += size; }
    });

    const sortedTypes = Object.entries(typeDistribution)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({ type, count }));

    const analytics = {
      totalSize,
      totalSizeFormatted: formatBytes(totalSize),
      fileCount: allFiles.length - folderCount,
      folderCount, imageCount, videoCount, otherCount,
      typeDistribution: sortedTypes,
      recentActivity: { newCount, newSize, newSizeFormatted: formatBytes(newSize), period: '7 days' },
    };

    setCache('analytics', null, analytics);
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

module.exports = app;
