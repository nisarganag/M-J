# Wedding Website Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan in the current session. Steps use checkbox syntax for tracking.

**Goal:** Deliver and push a beautiful wedding order of service with editable shared content.

**Architecture:** A static React frontend renders versioned ceremony data. A Supabase REST adapter reads public content and calls protected SQL functions to authenticate and publish. Browser storage preserves offline content and drafts without confusing drafts with shared publications.

**Tech Stack:** React, TypeScript, Vite, CSS, Lucide icons, self-hosted fonts, Vitest, Playwright, Supabase PostgreSQL.

**Spec:** `docs/superpowers/specs/2026-11-16-wedding-website-design.md`

## Global Constraints

- Preserve source wording and explicit line breaks. Keep source section numbers; there is no section 26.
- Default login is `admin` / `admin`; verify remotely when configured, never fall back after remote authentication errors.
- Public reads, protected writes, version checks, and no private credentials bundled in the frontend.
- The unconfigured editor must say preview and never claim shared publication.
- Push to the user-authorized repository after checks. Preserve the original DOCX.

## Review Focus

- Corrupt or denied local storage must not prevent guests from reading or cause false save confirmation.
- Remote failure and version conflicts must preserve unsaved editor text.
- Background refresh must update guests without replacing a dirty editor draft.
- Long hymn lines, small mobile screens, keyboard-only use, and reduced-motion preferences must remain usable.
- Source instructions and user-entered HTML must be displayed as plain ceremony text.

### Task 1: Content and storage

**Files:** `scripts/extract_ceremony.py`, `src/data/default-ceremony.json`, `src/lib/ceremony.ts`, `src/lib/storage.ts`, `src/lib/api.ts`, `src/lib/*.test.ts`, `supabase/schema.sql`, `supabase/seed.sql`, project configuration.

**Interfaces:** `CeremonyDocument`, `CeremonySection`, `PublishedCeremony`; `validateDocument(unknown)`, `filterSections(sections, category, query)`; cache and draft read/write helpers; `CeremonyApi.read()`, `login(credentials)`, `publish(document, credentials, expectedRevision)`.

- [ ] Extract all source paragraphs with real Word line breaks and create the typed seed document and manifest.
- [ ] Write and run failing tests for content filtering, malformed input, storage errors, API authentication failure and optimistic concurrency failures.
- [ ] Implement domain functions, storage and REST adapter, then run those tests to green.
- [ ] Add SQL that verifies credentials, validates shape, protects direct writes, and locks/version-checks updates. Generate idempotent seed SQL from default content.

### Task 2: Reader and editor

**Files:** `src/App.tsx`, `src/components/*`, `src/hooks/*`, `src/styles.css`, `public/*`, `tests/wedding.spec.ts`.

**Interfaces:** Consume Task 1 document and service interfaces. Keep published data, dirty draft, credentials and UI state separate.

- [ ] Write browser tests for source content, combined search/filters, failed and successful login, edit/save/reload, two-client shared updates, conflict preservation and unsafe text display.
- [ ] Run a browser test before implementing to confirm the missing UI behavior.
- [ ] Build the responsive reader, botanical artwork, login and editor, and preview-mode status.
- [ ] Test shared updates with an isolated stateful API fixture. Test mobile layout, keyboard interactions and screenshot desktop/mobile. Inspect and correct visual defects.

### Task 3: Delivery

**Files:** `README.md`, `.env.example`, `.github/workflows/*`, optional runtime config when supplied.

- [ ] Document setup, login, offline/draft behavior, concurrency, credentials and deployment.
- [ ] Run typecheck, unit tests, browser tests and production build. Verify source hash and text fidelity.
- [ ] Obtain one independent review of the finished implementation; fix important findings and run relevant regression tests.
- [ ] Commit and push to the user-provided repository; verify remote commit matches local. Report connection/deployment status honestly.
