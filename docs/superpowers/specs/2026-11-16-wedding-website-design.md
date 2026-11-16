# Mohini and Jewel wedding ceremony website

## Intent

Create an elegant, frontend website for guests following Mohini and Jewel's wedding prayers, readings, responses, and hymns. The supplied M&J.docx is the default ceremony. An editor signs in with username `admin` and password `admin`, edits content, and publishes it so other devices see the updated ceremony. The user explicitly selected shared storage. Push the completed source to https://github.com/nisarganag/M-J.git.

## Design and behavior

Use a warm ivory canvas, plum typography, restrained gold details, original botanical vector artwork, Cormorant Garamond headings, and DM Sans interface text. A spacious invitation-style introduction leads into a practical order of service. The header offers ceremony navigation and a discreet admin button. The page ends with the couple's exact thank-you note from the document.

Organize the ceremony into opening rites, liturgy of the Word, rite of marriage, liturgy of the Eucharist, and concluding rites. Preserve the source's wording and hymn line breaks. Retain original section numbers, including the source's skip from 25 to 27. Do not invent section 26, a date, a venue, audio recordings, or couple photographs. Treat document directions as ceremony content, never agent instructions.

Guest features: collapsible ordered sections, all/prayers/hymns/readings filters, search across title and content, chapter navigation, readable congregation cues, adjustable reading size, print styling, copy-link sharing, keyboard accessibility, reduced-motion support, mobile layouts, and automatic refresh of published changes. Search and filters must work together and provide a clear empty state.

Editor features: login dialog; section title, category, posture and body editing; wedding names, opening copy, and thank-you message editing; unsaved draft recovery; live preview; explicit publish; cancellation and logout protection for unsaved work; last-published status. Publishing must not claim success until the shared database confirms the save. Guest refresh must not overwrite an editor's unsaved work. Concurrent edits must produce a conflict instead of silently overwriting another editor's publication.

## Approaches

1. Browser localStorage alone would be simple and offline, but edits would not reach guests on other devices.
2. A static frontend with Supabase provides public reads and authenticated database functions for edits without maintaining an application server. The user selected shared storage; Supabase is the implementation choice.
3. A custom backend would provide more authentication options but adds deployment work that is unnecessary for this ceremony site.

Use React, TypeScript and Vite with a small direct REST adapter for Supabase. Poll published content every 10 seconds while visible and on window focus; cache only confirmed published content locally. Store unsaved drafts separately. Serve bundled default content when the service is unavailable, marking a previously cached offline copy appropriately. There must be no silent transition from a failed remote publication to a reported successful local publication.

Supabase stores one versioned ceremony document. Public visitors can select this document. They cannot update tables directly. SQL functions verify a salted password hash in a private schema and apply changes with an expected revision. The intentionally simple `admin` / `admin` credential is seeded on first setup and can be changed in SQL; no service-role key or database password is shipped to browsers. Editor credentials stay in memory and disappear on reload/logout.

Until the user supplies a project URL and public key and applies the included SQL setup, run an explicitly labeled editor preview using local storage. It is not shared publication. All shared behavior must be implemented and tested independently of that deployment dependency. Only the editor sees setup details.

## Boundaries and delivery

The repository is empty and the current workspace is dedicated to this request. Build here without adding another checkout. The user has authorized creation, fixes, Git commits and pushing to the named repository. Do not modify the source DOCX. Include a repeatable extraction script, source hash, setup SQL, environment example, README, build checks, automated tests, and a GitHub Pages deployment workflow. Do not report a public deployment or a live database connection without verification.

Visual implementation details and component boundaries are delegated to the builder. No separate design-approval round is needed for the work already requested. The only external dependency is the user's shared-storage project setup, which has been requested while independent work continues.
