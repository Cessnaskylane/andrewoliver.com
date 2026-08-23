# Andrew Oliver — Portfolio

Static GitHub Pages portfolio for editor Andrew Oliver. No build step — plain HTML, CSS, and JS. Videos play on click via Squarespace HLS (hls.js 1.5.17 from jsDelivr), with optional YouTube / Vimeo / MP4 sources.

## Local preview

```bash
cd andrewoliver
python3 -m http.server 8765
```

Open http://127.0.0.1:8765

## Deploy to GitHub Pages

1. Create a GitHub repo (e.g. `andrewoliver` or `username.github.io`).
2. Push this folder to the `main` (or `gh-pages`) branch:

   ```bash
   git init
   git add .
   git commit -m "Initial portfolio site"
   git branch -M main
   git remote add origin git@github.com:YOUR_USER/YOUR_REPO.git
   git push -u origin main
   ```

3. In **Settings → Pages**, set source to **Deploy from a branch**, branch `main` / root (or `/docs` if you keep the site there).
4. Custom domain: this repo includes a `CNAME` for `www.andrewoliver.com`. Point DNS:
   - `www` → CNAME to `YOUR_USER.github.io`
   - Apex `andrewoliver.com` → GitHub Pages A records (or ALIAS/ANAME to `YOUR_USER.github.io`)
5. Wait for DNS + HTTPS provisioning in the Pages settings.

Do **not** commit large `.mp4` / `.mov` files — they are gitignored. Prefer hosted HLS, YouTube, or Vimeo.

## Project data

Edit [`data/projects.json`](data/projects.json):

- `site` — title, tagline, email, canonical URL
- `squarespaceLibraryId` — Squarespace video library id for HLS playlists
- `sections[].items[]` — each work item with `poster`, `duration` (seconds), and `source`

### Source types

**Squarespace HLS** (default):

```json
"source": { "type": "squarespace-hls", "id": "VIDEO_UUID" }
```

Builds:

`https://video.squarespace-cdn.com/content/v1/{libraryId}/{id}/playlist.m3u8`

**YouTube:**

```json
"source": { "type": "youtube", "id": "YOUTUBE_VIDEO_ID" }
```

**Vimeo:**

```json
"source": { "type": "vimeo", "id": "VIMEO_VIDEO_ID" }
```

**Local / hosted MP4** (keep files out of git if large):

```json
"source": { "type": "mp4", "src": "https://cdn.example.com/reel.mp4" }
```

Deep links: `#kind`, `#mark-cuban`, etc. open the lightbox for that item.

## Design

- Dark cinematic UI (`#0a0a0c` / `#f4f2ee`)
- Display: Anton · Body: Hanken Grotesk
- Click-to-play only (no autoplay gallery) for GitHub Pages performance
- Sticky header, filter chips, lightbox with Escape / backdrop close; HLS instances destroyed on close

## License

Portfolio content © Andrew Oliver. Site code provided for publishing this portfolio.
