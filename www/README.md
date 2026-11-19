# typenative.dev

The TypeNative marketing site: one page, plain PHP 8.4, no Composer, no build step, no third-party requests (no CDN, web fonts, analytics or cookies). This folder is the web root and maps 1:1 to the `www/` folder of the OVH hosting.

```
.ovhconfig         OVH runtime: PHP 8.4 on stable64
.htaccess          HTTPS + apex redirects, front-controller routing, security headers, caching
index.php          PHP version guard, then app/main.php
app/               the PHP app (denied to the web)
  content.php      every piece of copy and every number on the page
  config.php       site URL, version, repository links
  templates/       layout, sections, partials
assets/            css, js, images (cached for a year; URLs carry a content hash)
favicon.*, apple-touch-icon.png, robots.txt, sitemap.xml
```

## Editing

- **Copy and numbers** live in `app/content.php`. Its header lists where each number comes from (benchmarks: `examples/README.md`; probe count: `conformance/*.ts`). Keep them in sync with the repository.
- **Code samples** were compiled with TypeNative and their outputs are real. If you change one, recompile it (`node bin/cli.js --source x.ts --script`, `--emit-go <dir>` for the Go tab) and paste the new output.
- **Version**: bump `Site::VERSION` in `app/config.php` on each release, and `<lastmod>` in `sitemap.xml`.
- **Styles and scripts**: `assets/css/site.css` and `assets/js/site.js`. `asset()` appends a content hash, so browsers pick up changes after upload with no manual cache-busting.
- **Social image**: edit `assets/img/og-image.svg`, then re-render `assets/img/og-image.png` at 1200×630, for example `msedge --headless --window-size=1200,630 --screenshot=og-image.png og-image.svg` (render on Windows so the Segoe UI text matches).
- **Content Security Policy** is sent by `app/Page.php`. It allows no inline styles and only the one inline script in `Page::THEME_SCRIPT`, by hash. If you edit that script, the hash updates itself.

## Running locally

```sh
php -S 127.0.0.1:8080 -t www
```

Then open http://127.0.0.1:8080. The built-in server ignores `.htaccess`, so redirects, headers and access rules only apply on Apache (OVH).

## Deploying to OVH web hosting

1. **Domain and SSL** (OVH Control Panel → Web Cloud → Hosting plans → your plan):
   - Under *Multisite*, attach `typenative.dev` and `www.typenative.dev` with root folder `www`.
   - Enable the free SSL certificate for both. `.dev` is HTTPS-only in every browser, so the site is unreachable until this is done.
2. **PHP 8.4**: OVH only offers PHP 8.4 on the `stable64` runtime, and reads the runtime (`container.image`) only from the `.ovhconfig` at the **FTP root** (`/`, the folder above `www/`). Make sure that file contains:

   ```
   app.engine=php
   app.engine.version=8.4
   http.firewall=none
   environment=production
   container.image=stable64
   ```

   `www/.ovhconfig` carries the same settings for the document root. Changing the FTP-root file applies to every site on the plan. The site turns off PHP error display itself, because OVH shows errors on PHP 8.x even in production mode.
3. **Upload** the *contents* of this folder into `/www/` over FTP or SFTP, for example with FileZilla (turn on *Server → Force showing hidden files* so `.htaccess`, `.ovhconfig`, `app/.htaccess` and `assets/.htaccess` go up too). On plans with SSH:

   ```sh
   scp -r www/. LOGIN@ssh.clusterXXX.hosting.ovh.net:www/
   ```

4. **Check** the deployed site:

   ```sh
   curl -sI http://typenative.dev/               # 301 to https://typenative.dev/
   curl -sI https://www.typenative.dev/          # 301 to https://typenative.dev/
   curl -sI https://typenative.dev/              # 200 with Content-Security-Policy and Strict-Transport-Security
   curl -sI https://typenative.dev/nope          # 404
   curl -sI https://typenative.dev/app/config.php   # 404 (the app is never served)
   curl -sI https://typenative.dev/.ovhconfig       # 404
   ```

   If the HTTP-to-HTTPS redirect loops, swap its conditions for the `SERVER_PORT` variant noted in `.htaccess`. Then run PageSpeed Insights or Lighthouse on https://typenative.dev/.
