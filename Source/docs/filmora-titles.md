# Local Filmora title import

This is a partial compatibility port. The refreshed local scan finds 24 installed text styles,
3,277 downloaded titles and 88 downloaded text animations. Two static styles are
selectable in the Titles browser under `Title Effects > WordArt`:
Text style 2 and Text style 14. The plain treatment is skipped because Simple title
already provides it. Existing title identifiers and saved projects are unchanged.

Run `node scripts/import-filmora-titles.mjs` to regenerate the catalog additions
and sanitized `filmora-title-inventory.json`. Optional
`SHRAPWILL_FILMORA_INSTALLATION` and `SHRAPWILL_FILMORA_DOWNLOADS` select source roots.
The importer reads originals without modifying them. Names and normalized paint
fingerprints prevent repeated imports; identifiers depend on paint content.
The inventory retains display names, categories and payload filenames only, never
raw resource metadata, credentials or absolute personal paths.

The new static SVG adapter preserves COLORREF channel order, fill opacity,
border color/opacity and centered blurred shadows. Border radii become doubled
SVG strokes; shadow blur uses half the stored radius as SVG standard deviation.
These are compatibility adaptations, not measured pixel parity with Filmora.
Fonts resolve through the existing system font database. Preview and export use
the same native rasterizer. Titles remain editable, undoable title clips.

The other 3,386 records remain pending, with reasons in the inventory. In particular,
nested JSON/XML timelines, multiple text runs, gradient directions, proprietary
text-effect identifiers and directional shadows need separate adapters and visual
reference validation. Missing local payloads cannot be reconstructed from preview
videos. None of those entries is offered as a working template or replaced with
an unrelated Shrapwill design. Their categories are recorded for a future complete
port. The browser now includes empty Filmora categories with an availability message.

## Title navigation

`catalog/title-categories.json` preserves the current local Filmora English category
tree, ordered by ascending `list_order`: Title Effects, then Title Templates, with
their text types and nested WordArt colors and Social Media types. The current
ProgramData category cache takes precedence over the older installation tree.
Regenerate it with `node scripts/import-filmora-title-categories.mjs`; override the
input with `SHRAPWILL_FILMORA_CATEGORIES` if needed. Runtime reads only the compiled
catalog and has no dependency on a Filmora installation.

`titleCategories.ts` maps existing Shrapwill designs into this hierarchy without
changing their saved styles or rendering. Both main groups collapse independently;
selecting a parent includes all its child types. All keeps every existing title
accessible once, and search uses the displayed category path. Categories with no
ported titles stay visible in the same order and show an empty state.

New scripts, documentation and catalog data are included by the existing source
packaging directory rules. Runtime stays entirely local and does not require Filmora.
