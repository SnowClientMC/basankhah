# SnowClient Partners (admin website + API)

A tiny Cloudflare Pages project. It lets you add/remove the **partnered servers** shown in the
SnowClient launcher's right-hand panel — no launcher rebuild needed.

* `index.html`                     – the admin page (password protected): add / edit / remove servers
* `functions/api/partners.js`      – public list the launcher reads (adds live status: online + players)
* `functions/api/admin/partners.js`– protected add / edit / delete
* `functions/api/image/[id].js`    – serves each server's landscape image

## Deploy (about 5 minutes, free)

1. Put this folder (`partners-admin`) in a GitHub repo, e.g. `SnowClientMC/SnowClient-partners`
   (it can be private).
2. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git** → pick the repo.
   * Framework preset: **None**
   * Build command: *(leave empty)*   Build output directory: `/`  (the folder root)
3. Create the storage: **Storage & Databases → KV → Create namespace** (name it `snowclient-partners`).
4. In your Pages project → **Settings → Bindings (Functions) → Add → KV namespace**
   * Variable name: **`PARTNERS`**   KV namespace: the one you just created
5. Same page → **Variables and Secrets → Add** a secret named **`ADMIN_PASSWORD`**
   with a long, strong password (this is your admin login).
6. **Redeploy** (Deployments → ⋯ → Retry) so the binding and secret take effect.
7. Open `https://<your-project>.pages.dev` → log in → add your first server.

## Point the launcher at it

In the launcher project edit `apps/app-frontend/src/helpers/partners.js`:

    export const PARTNERS_API_URL = 'https://<your-project>.pages.dev/api/partners'

(The launcher is already allowed to contact any `*.pages.dev` address.) Then rebuild the launcher once.
After that, every change you make on the admin site appears in the launcher within about a minute.

## Notes
* Images are cropped to 16:9 and compressed in your browser before upload (max 2 MB, up to 30 servers).
* Live status (online / players) comes from the free mcsrvstat.us API and is cached for 60 seconds.
* The admin page is `noindex`; keep the password secret. Anyone with it can edit the list.
