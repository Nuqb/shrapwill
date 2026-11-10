# Local Filmora transition catalog

The November 8, 2026 inventory covers the installed Filmora 15.6.4.20299 resources and downloaded transition folders. Filmora files were read only; no application, project or media files were modified.

## Coverage and duplicate handling

- 84 downloaded folders (83 distinct display names; Glitch Blocks appears twice).
- 20 bundled effect folders, plus three named default presets.
- 107 source entries resolve to 97 distinct effects after matching names and aliases.
- The tab contains 157 entries after excluding the internal Mask Blend compositor.
- 79 transitions execute original source code. Seventeen other locally discovered entries and six older web-derived entries remain disabled for new edits because their original rendering requirements are not implemented.
- Default `trans_default` is a placeholder, not an additional visual effect.

`filmora-local-inventory.json` contains only names, relative resource paths, resource IDs, category labels and the corresponding Shrapwill identifier. It excludes license material, account information and unrelated settings. Resource names and category labels come from local metadata. Folder-only engine effects use readable folder names. Generic/internal categories such as Test-trans, Trending and Basic are omitted in favor of specific effect categories where available.

`node scripts/import-local-transitions.mjs` rebuilds the local additions from this checked-in inventory. It preserves previous preset IDs, reuses Fade, Cross dissolve, Wipe right and matching motion presets, and combines duplicate normalized names. Running it again produces the same catalog. The existing source-packaging rules include the script, catalog and inventory.

## Original source rendering

See [Filmora code port](filmora-code-port.md) for the imported sources, compatibility changes, playback/cover/export pipeline, integrity checks and unfinished resource types. Original shader equations replace the earlier generic implementations for supported entries. Unfinished entries cannot silently use an approximation in a new edit. No Filmora installation is required at runtime.

The inventory preserves all discovered names and categories, but inventory coverage does not mean every original has been ported. Existing projects remain readable with their stored legacy settings. Current cards identify verified original-code ports and visibly disable unfinished originals.

Existing serialized transition identifiers, timing, project edits, undo, track locks and original media handling remain intact. Categories include Speed Blur, Zoom, Glitch, Fade&Dissolve, Slides, 3D, Brush, Smoke, MG, Light, Warp and Gold&Luxury where the local resource metadata identifies them.
