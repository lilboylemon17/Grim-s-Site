# GRIM

Next.js / TypeScript public website and private content studio, backed by Supabase Postgres, Auth and object storage. A separate Cloudflare Worker serves executable games on a different origin. No uploads use Vercel's filesystem. This project is not deployed or connected to an account yet.

## Setup

1. Install Node 22 or newer. Run `npm ci` in this folder.
2. Create a Supabase project. Run `supabase/schema.sql` once in its SQL editor.
3. In Authentication, disable public signups. Create an email/password administrator. Copy its user UUID and run `insert into public.admin_users(user_id) values ('YOUR_USER_UUID');`. The manager login alone does not confer admin privileges: database and storage policies enforce the allowlist.
4. Copy `.env.example` to `.env.local` and fill in the project URL and public anon/publishable key. Never put a service-role key in browser configuration.
5. Configure `game-worker/wrangler.toml` with the Supabase URL and exact public website origin. Deploy from that directory using `npx wrangler deploy`. Add a custom games domain or use the returned workers.dev origin. Set `NEXT_PUBLIC_GAME_ORIGIN` to that HTTPS origin (no trailing slash). It must differ from the website origin. Configure an independent registrable domain for stronger game isolation.
6. Run `npm run dev`. Open http://localhost:3000 and /manager. For local game previews temporarily set worker `SITE_ORIGIN` to http://localhost:3000 and redeploy it.
7. Import this folder into a Git repository and Vercel as a Next.js project. Add the three environment variables, deploy, and set the worker's SITE_ORIGIN to the resulting Vercel/custom domain. No Vercel account or Supabase credentials were supplied, so these account actions remain yours to complete.

## Publishing

Sign in at /manager. Upload Content accepts a self-contained HTML file, ZIP with an HTML entry point, or a complete folder (folder picker preserves relative paths). Pick the HTML entry point. ZIP limits: 100 MB compressed, 200 MB expanded, 1,500 entries. Use package-relative paths, not root-relative URLs. Files are uploaded individually directly to persistent storage using signed URLs, bypassing Vercel request-body limits. Films accept MP4/WebM up to 1 GB, subject to the project's storage plan limits. Use H.264/AAC MP4 or VP9/Opus WebM for broad support; no transcoding is provided.

Enter metadata, choose an optional image and VTT subtitles, then save a draft to upload and preview. Film thumbnails are captured in-browser when decoding succeeds. Publish makes the database record public. Search, sorting, fullscreen and playback speed work on the public collection. Open public pages refresh data every 30 seconds; freshly opened pages query current records. Editing, replacing files, numerical custom ordering, unpublishing and deleting are available through Edit. The Media Library lists current titles and can permanently clean folders of deleted titles. Replaced file versions are retained until their title is deleted and its folder cleaned.

## Security and operational limits

- RLS enforces administrator authorization on every mutation, including direct API requests. Storage enforces authentication, a 1 GB per-object limit and a content-folder path prefix. Browser upload validation applies stricter per-type limits and ZIP path/size checks. An authorized administrator can bypass browser type checks with a custom API client; add a trusted ingestion/scanning service if administrators are not fully trusted. ZIP extraction occurs in the browser, never on the server filesystem.
- The media bucket is public. Draft metadata is private but uploaded assets are accessible to anyone who obtains their unguessable URL. Unpublishing removes a title from the public site, but does not revoke previously shared asset/game URLs. If confidential drafts or immediate asset revocation are required, change this architecture to private storage with authenticated/signed delivery before launch.
- Games run in a sandboxed iframe on a separate origin. The game worker has no administrator credentials or cookies. Its CSP limits network requests to game assets and blocks forms, plugins and framing by other origins. Games requiring third-party networking or cross-origin isolation need explicitly reviewed policy changes. All games share the games origin; do not put sensitive data there.
- Main-site CSP includes inline/eval script permissions for Next.js compatibility; a nonce-based production policy is a further hardening task. Set account-level storage quotas, backups, monitoring and rate limits before operating a public production service. Uploads currently use single-request transfers with retry by resaving, not resumable TUS uploads; a failed upload may leave orphaned objects. Cleanup removes deleted-title folders, not partially uploaded versions within active titles.
- The manager uses Supabase browser sessions and password auth; Supabase performs token verification/RLS on backend operations. No public signup UI exists. Configure MFA/account recovery in Supabase to match your operating requirements.
- The worker is an additional Cloudflare deployment. Public site and manager are one Vercel application, separated at /manager, as permitted by the brief. Native Windows packaging is not included.

## Checks

`npm run check` checks TypeScript. `npm run build` builds the production app. After configuring cloud services, manually verify: unauthorized writes fail; admin upload and draft preview; ZIP asset paths; publish/unpublish; film seek/volume/speed/subtitles; replacement; ordering; delete/cleanup; mobile layouts; reduced motion. Live account integration and browser visual verification were not performed in the authoring environment.

Reference: [Next.js route handlers](https://nextjs.org/docs/app/api-reference/file-conventions/route), [Supabase JavaScript authentication](https://supabase.com/docs/reference/javascript/auth).
