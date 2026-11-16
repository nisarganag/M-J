# Complete Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all ceremony content editable and prepare a tested Vercel deployment.

**Architecture:** Extend the existing JSON document with dynamic chapters and website copy, normalizing legacy documents at the read boundary. Pure structural operations keep reader order and editor order consistent. Preserve the current Supabase publication contract and replace only its validator.

**Tech Stack:** Existing React, TypeScript, Vite, Supabase, Vitest and Playwright; PGlite for local PostgreSQL validation.

**Spec:** `docs/superpowers/specs/2026-11-17-complete-editor.md`

## Global Constraints

- Preserve existing published content and original source text.
- Support up to 30 chapters and 120 moments, including an empty ceremony.
- Keep draft recovery, publication revision checks, mobile controls and plain-text rendering.
- Disable every mutation during publication.
- Keep schemaVersion 1 and legacy document support.
- Do not deploy a public site on the user's behalf; they intend to import it into Vercel.

## Review Focus

- A recovered draft references a removed selection: choose a valid editing panel.
- Reordering across chapter boundaries: editor and guest order must match, with no lost moments.
- Removing the final moment/chapter: retain a usable editor and an empty guest state.
- A stale save or background refresh: preserve structural edits and editable copy.
- Long edited headings on a phone: wrap without horizontal overflow or inaccessible controls.

### Task 1: Document, structural operations and database compatibility

**Files:** `src/lib/ceremony.ts`, `src/lib/site-copy.ts`, `src/lib/ceremony.test.ts`, `src/lib/database.test.ts`, `supabase/schema.sql`, `supabase/upgrade-editor.sql`, generated `supabase/setup.sql`.

**Interfaces:** `CeremonyDocument` gains `chapters: CeremonyChapter[]` and `copy: SiteCopy`. `addMoment(document, id, afterId?)`, `moveMoment(document, id, direction)`, `removeMoment(document, id)`, `changeMomentChapter(document, id, chapterId)`, `addChapter(document, id)`, `moveChapter(document, id, direction)`, `removeChapter(document, id)` return new documents. `renumberMoments(document)` numbers the chapter-ordered moments.

- [x] Add failing validation/structure tests for legacy data, custom chapters/copy, deletion to empty, boundary moves and stale IDs.
- [x] Implement validated copy fields, dynamic chapters and immutable structural operations. Run the whole unit suite.
- [x] Add PostgreSQL validation tests; update the database validator, generate the upgrade/setup files, and verify old and expanded documents plus rejection cases.
- [x] Give the user the tested upgrade file while continuing frontend work.

### Task 2: Complete admin and guest content rendering

**Files:** `src/components/Editor.tsx`, new `WebsiteTextEditor.tsx` and `ChapterEditor.tsx`, `src/components/CeremonyReader.tsx`, `src/App.tsx`, `src/styles.css`, `tests/wedding.spec.ts`.

**Interfaces:** Child editors receive `document: CeremonyDocument` and `onChange(document): void`; the existing publication contract remains unchanged.

- [x] Write failing browser tests that add/reorder/delete moments and chapters, edit headings/decorative copy, publish to a separate guest, and restore structural drafts.
- [x] Implement the panels, deletion confirmations, mobile selectors, field wrapping and dynamic guest text/chapter rendering.
- [x] Verify locked publication controls, empty ceremonies, fresh selection after deletion and accessibility; run the complete browser suite.

### Task 3: Vercel configuration and delivery

**Files:** `vercel.json`, `vite.config.ts`, `playwright.config.ts`, `package.json`, `.github/workflows/verify.yml`, `README.md`.

- [x] Configure Vercel's Vite build/output and uncached runtime configuration, and ensure its build uses `/`.
- [x] Add a production browser-test command and run the suite against built static files; also check the `/M-J/` build.
- [x] Document all admin controls, the database upgrade and exact Vercel import settings.
- [x] Check the live database upgrade without changing public content, independently review the complete change, resolve material findings with regression tests, and prepare the verified update for commit/push.

## Verification results

- 23 unit/PostgreSQL tests passed, including boundary checks for every website-text field.
- 15 browser tests passed against the Vercel production build, including shared publication, empty ceremonies, structural draft recovery, mobile accessibility, and long text.
- The independent review findings were reproduced and corrected: SQL/browser validation parity and overflowing sharing text on mobile.
- Live Supabase accepted the expanded schema, rejected malformed text and stale saves, and retained published revision 2 and all content.
- Both the root asset path for Vercel and `/M-J/` build for GitHub Pages were verified. Vercel deployment remains the user's next step.
