# Synapse Loom — landing page

Static landing page for [Synapse Loom](https://github.com/HarpeBlue/synapse-loom-dist/releases),
a local-first desktop app for note-taking and spaced repetition.

It's pure HTML/CSS/JS — no build step. The download button reads the **latest
release** of the public distribution repo `HarpeBlue/synapse-loom-dist` through
the GitHub REST API at page load, detects the visitor's OS, and links the right
installer. Nothing is hardcoded, so the page always offers the newest version.

```
synapse-loom-web/
├── index.html        # hero, download CTA, features, footer
├── assets/
│   ├── app.js             # fetch latest release, OS detection, per-OS links
│   ├── styles.css         # brand palette (teal on navy)
│   ├── favicon.svg        # app glyph
│   ├── og-image.png       # social preview (1200×630 — scrapers need raster + absolute URL)
│   └── screenshot-app.png # hero screenshot (app in the Liquid theme)
└── README.md
```

## Develop locally

It's static, so just open `index.html`, or serve the folder:

```bash
python3 -m http.server 8080   # then visit http://localhost:8080
```

If the public repo has no published release yet (or you hit GitHub's 60 req/h
unauthenticated rate limit), the button gracefully falls back to the
`/releases/latest` page.

## Deploy on Cloudflare Pages (free)

1. Push this folder to a new GitHub repo, e.g. `HarpeBlue/synapse-loom-web`.
2. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git** →
   pick `synapse-loom-web`.
3. Build settings:
   - **Framework preset:** None
   - **Build command:** *(leave empty)*
   - **Build output directory:** `/` (the repo root)
4. **Save and Deploy.** The site goes live at `https://<project>.pages.dev`.

### Alternative: GitHub Pages

Also free, one provider fewer. The repo must be **public** on the free plan
(fine — the app's source lives in a different, private repo):

1. Repo → **Settings → Pages** → Source: *Deploy from a branch* → `main`, `/ (root)`.
2. Live at `https://harpeblue.github.io/synapse-loom-web/`.
3. Custom domain: add `synapseloom.app` in the Pages settings (this commits a
   `CNAME` file) and point DNS `A` records at GitHub's IPs
   (`185.199.108.153` … `185.199.111.153`). Tick **Enforce HTTPS** once the
   certificate is issued — required, since `.app` is HSTS-preloaded.

Cloudflare Pages is still the smoother path if you buy the domain at
Cloudflare Registrar (instant DNS + TLS, plus redirect rules for the optional
updater endpoint below).

### Custom domain `synapseloom.app`

1. Buy `synapseloom.app` (Cloudflare Registrar sells `.app` at cost, ~$14/yr).
   `.app` is on the HSTS preload list, so HTTPS is mandatory — Cloudflare Pages
   provides the certificate automatically.
2. In the Pages project → **Custom domains → Set up a custom domain** →
   `synapseloom.app`. With the domain on Cloudflare, DNS + TLS are configured
   automatically.

### Optional later: stable updater endpoint

The desktop app's updater currently points at
`https://github.com/HarpeBlue/synapse-loom-dist/releases/latest/download/latest.json`.
If you want a URL you fully control, add a Cloudflare **redirect rule** from
`https://synapseloom.app/latest.json` → that GitHub URL, and switch the endpoint
in `tauri.conf.json`. Not required — the GitHub endpoint already works.
