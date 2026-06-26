# Cinergy Spotlight Production

A production-style Employee Spotlight / internal digital signage app with:

- React TV dashboard
- Express API server
- Socket.IO live updates
- CMS-style admin at `/admin`
- JWT cookie authentication
- Media uploads for photos, promo graphics, background images, and videos
- Render-ready deployment

## Render settings

Build Command:

```bash
npm install && npm run build
```

Start Command:

```bash
npm start
```

Environment variables:

```env
ADMIN_USER=admin
ADMIN_PASS=your-password-here
JWT_SECRET=make-this-a-long-random-string
DATA_DIR=./data
NODE_ENV=production
```

## Important for Render persistence

Uploads and saved content are stored in `DATA_DIR`. On Render, add a Persistent Disk if you want content/uploads to survive redeploys.

Recommended disk mount path:

```txt
/var/data
```

Then set:

```env
DATA_DIR=/var/data
```

## Login

Go to:

```txt
/admin
```

Use `ADMIN_USER` and `ADMIN_PASS` from Render.
