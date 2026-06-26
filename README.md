# Cinergy Team Spotlight Board

A dark/neon employee-of-the-month and announcements board with an admin editor.

## Local setup
1. Install Node.js 18+
2. In this folder, run: `npm install`
3. Copy `.env.example` to `.env` and change `ADMIN_PASS` and `JWT_SECRET`
4. Run: `npm start`
5. Open `http://localhost:3000`
6. Admin: `http://localhost:3000/admin.html`

## Deploy
Deploy to Render as a Web Service. Build command: `npm install`. Start command: `npm start`.
Set environment variables in Render: `ADMIN_USER`, `ADMIN_PASS`, `JWT_SECRET`.

Note: this version saves to `data.json` on the server. For permanent cloud storage across redeploys, add Render Disk or replace the JSON file with a database.
