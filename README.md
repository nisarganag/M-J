# Mohini & Jewel

A wedding order of service for Mohini and Jewel, with all 30 ceremony sections from the supplied **M&J.docx**, an invitation-inspired design, and a complete editor that publishes content and ceremony structure for every guest.

React, TypeScript, Vite, and CSS. The frontend deploys as static files. Supabase provides the shared database and checks editor credentials; there is no application server to run.

## Start locally

Use Node.js 22.12 or newer.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. The supplied Supabase project is configured in `public/config.json`.

## Edit the ceremony

1. Click **Admin**.
2. Sign in with username **admin** and password **admin**.
3. Select a moment to edit its title, category, congregation cue, text, chapter, or display number. **Preview section** shows how guests will read it.
4. Use **Add moment**, **Move up**, **Move down**, and **Remove** to arrange the service. Use **Chapters & order** to add, rename, reorder, or remove chapters and edit their captions and numerals. **Welcome & thanks** edits names and messages; **Website text** edits headings, decorative wording, quotations, navigation, filters, sharing labels, and the footer. Search within that panel to find a particular phrase.
5. Click **Publish changes**. Guests with the site open receive updates within about 10 seconds; returning to a tab also refreshes it.

On a phone, **Choose what to edit** provides the same panels and moments as the desktop sidebar. Removing a chapter asks for confirmation and explains how many moments it will remove. Move any moments you want to keep to another chapter first. Adding, moving, or removing moments renumbers them in chapter reading order; display numbers can also be set manually. The untouched original retains the numbering in the supplied document.

Up to 30 chapters and 120 moments are supported. An empty ceremony can be published and rebuilt with **Add moment**. Optional welcome, decorative, and closing text can be cleared. Moment/chapter headings, names, and action labels must remain readable. Application controls, login prompts, and error messages are kept consistent by the app.

Unpublished drafts stay separate from guest content and are recovered on this browser after a reload. The editor blocks stale publications when another editor has published first. A draft backup can be downloaded before loading a newer version. Credentials stay in memory and are cleared on reload or sign-out.

Recovery keeps the most recently saved draft for this site in a browser. Use one editing tab per browser so tabs do not replace each other's recovery copy. Published version checks protect saves across all devices and tabs.

The requested `admin` / `admin` login is intentionally simple. To change the password, run this in Supabase SQL Editor, replacing the quoted password:

```sql
update wedding_private.editors
set password_hash = extensions.crypt('your-new-password', extensions.gen_salt('bf', 10))
where username = 'admin';
```

Passwords must be at most 72 UTF-8 bytes because the database uses bcrypt. No secret or service-role API key belongs in this frontend.

## Shared storage setup

### Existing project: enable the complete editor

If the project was initialized before the complete editor update, run the current **`supabase/upgrade-editor.sql`** in the Supabase SQL Editor. It updates validation to accept editable chapters, new website text, and empty ceremonies, with matching browser/database field limits including Unicode text. It does not replace published content, reset the password, or change permissions. It is safe to run again; if you ran the initial development version, rerun this final version. New projects using the current `setup.sql` already include this update.

### New project

For a new Supabase project:

1. Create a project at [Supabase](https://supabase.com/dashboard).
2. Paste the entire `supabase/setup.sql` into **SQL Editor** and run it. It creates the private password hash, publicly readable ceremony, protected publish function, and default content. Running it again does not overwrite existing content or reset the password.
3. Copy the **Project URL** and **publishable key** from the project's **Connect** dialog into `public/config.json`:

```json
{
  "supabaseUrl": "https://your-project.supabase.co",
  "supabasePublishableKey": "sb_publishable_your-public-key"
}
```

Alternatively, copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Environment values take precedence over the runtime config and require rebuilding. The equivalent `NEXT_PUBLIC_*` names used by Next.js do not apply to this Vite project.

Public publishable keys are designed for browsers. Database permissions, not hiding this key, protect writes. See [Supabase's API key guide](https://supabase.com/docs/guides/getting-started/api-keys).

Public clients can only read the ceremony table. `wedding_login` checks the private bcrypt hash. `publish_wedding` validates the document, checks the credentials, locks the current row, compares revisions, and publishes atomically. Conflicts return HTTP 409 using `PT409`, avoiding PostgREST transaction retries.

For projects initialized using the earlier setup during development, `supabase/fix-conflict-response.sql` applies the conflict-response correction and stops hanging requests for the publish function. New projects only need the current `setup.sql`.

If both runtime config values are empty, the editor enters clearly labeled **Preview mode** with browser-only saves. A configured database outage never silently switches to preview publishing. Guests see the last confirmed cached content or the packaged default while the app reconnects. This fallback requires the app itself to have loaded; it is not an offline-installed PWA.

## Publish the frontend

### Vercel

1. In Vercel, choose **Add New → Project** and import `nisarganag/M-J` from GitHub.
2. Use **Vite** as the framework and the repository root as the Root Directory. The included `vercel.json` sets **Install Command: `npm ci`**, **Build Command: `npm run build:vercel`**, and **Output Directory: `dist`**.
3. Deploy. The existing Supabase Project URL and public publishable key are already in `public/config.json`, so no environment variables are required for this project.

The Vercel build explicitly uses `/` for asset paths, including custom domains. Runtime configuration is served with `Cache-Control: no-store`. Navigation uses section anchors, so refreshing a ceremony or chapter link loads the same static page. Content edits continue to publish directly to Supabase and need no redeployment.

If you prefer Vercel environment variables, set both `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`, then redeploy. Do not use `NEXT_PUBLIC_*` names for this Vite app. A secret/service-role key must never be used. See [Vercel's Vite deployment guide](https://vercel.com/docs/frameworks/frontend/vite).

To run the full browser suite against the same production build locally:

```sh
npm run test:production
```

This serves the generated `dist/` files and checks guest reading, admin login, all editing panels, shared updates, draft recovery, conflicts, and mobile accessibility. These checks prepare the site for Vercel; they do not create a Vercel deployment or URL.

### GitHub Pages

The repository includes a manual **Publish wedding website** workflow. It builds with the `/M-J/` base path.

1. In this repository, choose **Settings → Pages → Source → GitHub Actions**.
2. Open **Actions → Publish wedding website → Run workflow**, using `main`.
3. When the deployment succeeds, GitHub shows the website URL. For this repository the standard address is `https://nisarganag.github.io/M-J/`.

The separate **Verify website** workflow checks pushes and pull requests. It does not publish automatically. Later content edits made in the website go straight to Supabase and do not need another frontend deployment.

### Other static hosts

```sh
npm run build
```

Deploy the generated `dist/` directory with any static host. Use `/` as the base path for a site hosted at a domain root. Set `BASE_PATH` during the build only if hosting under a subdirectory. See [Vite's deployment guide](https://vite.dev/guide/static-deploy.html).

## Guest features

- Search the complete ceremony and combine the search with prayer, hymn, reading, or ritual filters.
- Jump between the five chapters; expand one moment or all moments.
- Read the original hymn verses with their line breaks and congregation responses highlighted.
- Adjust reading size, share the ceremony link, and print the visible service selection.
- Use the site on phones or with a keyboard, with reduced motion and accessible modal dialogs.
- Fonts and botanical artwork are bundled locally; no third-party image or font requests are required.

The source's numbering skips section 26. That gap is preserved; no missing prayer, audio recording, date, venue, or other ceremony detail has been invented.

## Verification

```sh
npm run typecheck
npm test
npm run test:e2e
npm run test:production
npm run build
```

Local browser checks use installed Google Chrome. On a machine without Chrome, install Playwright Chromium and use CI mode:

```sh
npx playwright install --with-deps chromium
CI=1 npm run test:e2e
```

Browser tests use an isolated, stateful Supabase HTTP fixture: they exercise the real frontend's requests, login, publication, cross-context guest updates, failure handling, conflicting edits, draft recovery, and mobile accessibility without modifying the live ceremony. Database tests execute the real SQL validator and upgrade in local PostgreSQL through PGlite. Live Supabase checks are performed separately before delivery.

## Content and project structure

- `src/data/default-ceremony.json`: original ceremony content and default welcome text.
- `src/data/source-manifest.json`: source SHA-256 and extraction audit.
- `src/components/`: ceremony reader, botanical illustration, login, and moment/chapter/website-text editors.
- `src/data/site-copy-fields.json`: editable guest-facing wording and field definitions; `src/lib/site-copy.ts`: the typed runtime interface. `npm run seed` generates matching database limits from the same definitions.
- `src/hooks/useCeremony.ts`: polling, published state, and publication.
- `src/lib/`: validation, Supabase REST adapter, runtime configuration, and browser storage.
- `supabase/schema.sql`: database schema and functions; `seed.sql`: generated original content; `setup.sql`: combined installation file; `upgrade-editor.sql`: update for an existing database.
- `vercel.json`: production hosting configuration; `playwright.production.config.ts`: checks against the built static site.
- `tests/wedding.spec.ts`: browser integration checks.

To repeat extraction from the same supplied document, using Python 3:

```sh
python3 scripts/extract_ceremony.py /path/to/source.docx
npm run seed
```

Extraction accounts for every non-empty source paragraph and preserves explicit Word line breaks. It normalizes surrounding whitespace and section-heading number formatting. The extractor is deliberately mapped to this particular source; a revised document with a different structure needs its heading map reviewed. Generating seed files does not change the live database.
