# Cinergy Ops Platform

A no-build Render-ready digital operations dashboard for employee spotlight, LTO announcements, smart PDF import, resources, themes, media backgrounds, TV display mode, and live updates.

## Render Settings

Build Command:

```txt
npm install
```

Start Command:

```txt
npm start
```

## Environment Variables

```env
ADMIN_USER=admin
ADMIN_PASS=your-password
JWT_SECRET=make-this-long-random-and-private
DATA_DIR=/var/data
```

## Important Render Persistent Disk Setup

To keep uploads, PDFs, videos, images, and board content after redeploys:

1. In Render, add a Persistent Disk.
2. Mount path: `/var/data`
3. Add env variable: `DATA_DIR=/var/data`

Without a disk, Render can lose uploads/content after redeploys.

## URLs

TV display:

```txt
/
```

Admin CMS:

```txt
/admin
```

## Features

- Employee spotlight hero
- LTO / announcements / What's New cards
- Smart PDF import with extracted text and draft announcements
- PDF resource library
- Image/video upload support
- Background image/video settings with opacity and blur
- Seasonal themes including Auto, Fourth of July, Halloween, Christmas, Summer, Fall, Spring, Cinergy Green
- Top priority ticker
- Today's Shift Focus
- Recognition wall
- Events
- Safety Corner
- KPI snapshot
- MAGICAL values rotation
- Live Socket.IO updates
- Backup/export JSON
- Audit log
- Demo reset

## PDF Smart Import

Upload a PDF from the Media / PDFs tab. The app extracts text, creates a draft announcement, and keeps the original PDF as a resource. Review the draft, mark it active, and click Save & Push Live.
