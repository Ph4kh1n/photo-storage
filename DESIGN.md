# Design Document: DriveGallery

## 1. Overview
DriveGallery is a responsive web application that provides a beautiful, user-friendly interface for browsing and downloading photos directly from a Google Drive folder. It includes a storage analytics dashboard to monitor usage and file distribution.

## 2. Tech Stack
- **Frontend:** React (TypeScript)
- **Backend:** Node.js (Express)
- **Styling:** Vanilla CSS (Modern, Responsive)
- **API:** Google Drive API v3
- **Authentication:** OAuth2 / Service Account

## 3. Architecture
- **Backend (Node.js):**
    - Handles Google API authentication.
    - Fetches file lists and metadata from specific Drive folders.
    - Computes storage analytics (total size, file count, type breakdown).
    - Serves as a secure proxy for file data if needed.
- **Frontend (React):**
    - Responsive Gallery View (Grid/List).
    - Photo Previewer with Download capability.
    - Analytics Dashboard with charts (using CSS/SVG).
    - Optimized image loading (Lazy loading, Drive thumbnails).

## 4. UI/UX Strategy
- **Aesthetics:** "Glassmorphism" effect for cards, smooth CSS transitions, and a clean typography-focused layout.
- **Responsive Design:** Mobile-first approach using CSS Flexbox and Grid.
- **Optimization:** 
    - Use Google Drive's `thumbnailLink` for fast loading in gallery view.
    - Implement intersection observer for lazy loading.
    - Server-side caching for analytics data.

## 5. Storage Analytics Features
- **Total Storage Used:** Visual progress bar.
- **File Distribution:** breakdown of images vs. other files (if any).
- **Recent Activity:** Number of new photos added in the last 7 days.

## 6. Implementation Plan
1. **Setup:** Initialize React and Express projects.
2. **Drive Integration:** Configure Google Cloud project and implement backend API routes.
3. **Gallery:** Build the main photo grid with responsive layouts.
4. **Analytics:** Create the storage dashboard with CSS-based visualizations.
5. **Polish:** Add transitions, responsive tweaks, and final optimizations.
