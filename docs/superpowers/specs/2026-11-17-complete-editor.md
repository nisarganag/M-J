# Complete ceremony editing and Vercel

Extend the existing admin studio so the owner can edit all ceremony content and guest-facing copy, manage moments and chapters, and deploy the static frontend on Vercel. The original request already authorizes implementing and pushing the website; this follow-up supplies the expanded scope.

## Behavior

- Preserve existing published content and original source text. Legacy documents acquire default chapter and website-copy settings when read.
- Edit names, welcome/closing text, all moment text, titles, numbers, categories and congregation cues. Optional welcome/closing and decorative text may be cleared.
- Add, remove and reorder moments and chapters. Moving a moment across a chapter boundary changes its chapter. Structural changes renumber moments in guest reading order; the display number remains editable. Confirm removals, including the number of affected moments when deleting a chapter.
- Chapter titles, captions and display numerals are editable. Support up to 30 chapters and 120 moments, including an empty ceremony. Never strand a moment in a deleted chapter.
- Put navigation labels, decorative copy, quotes, reader headings, filter/category labels, sharing copy and footer text in a Website text panel. Functional admin/authentication/error messages remain application controls.
- Keep draft recovery, publication revision checks, mobile controls and plain-text rendering. Disable every mutation during publication.
- Use a backward-compatible document extension with `chapters` and `copy` while retaining schemaVersion 1. Upgrade the existing database validator without replacing stored content or credentials.
- Configure Vercel explicitly for a static Vite build at `/`, using the existing public Supabase configuration. Keep GitHub Pages available separately. Do not deploy a public site on the user's behalf; they intend to import it into Vercel.

## Verification

Test structural edits, legacy loading, invalid chapter references, empty content, draft recovery, publication across browser contexts, mobile accessibility and long text. Execute the database validator in PostgreSQL via PGlite. Run the same browser suite against built static files, plus verify the GitHub Pages build, before committing and pushing.
