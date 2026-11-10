# Creative collection

Shrapwill includes 84 title designs, 186 filters, 137 effect entries, and 157 transition cards. These combine Shrapwill presets with 79 original Filmora transitions, 81 original filters and 121 original effects. Original ports use their actual code, LUTs and required texture assets. Unfinished original transitions are disabled; saved legacy settings remain readable. See [the transition port](filmora-code-port.md) and [the filter/effect port](filmora-filters-effects.md) for exact coverage and pending resource types.

## Using the collection

Open Titles, Filters, Effects, or Transitions. Search by name/category; filter and effect descriptions are searchable too. Category buttons narrow the results. The count shows both visible entries and the total. Main-player previews never modify the timeline or undo history.

### Titles

Click a card to play a five-second preview. Playback, frame stepping, full screen, and shortcuts work in the preview; Back to timeline restores the project view and playhead. Double-click, drag onto a video lane, or choose Add title to insert it. Select the inserted title to edit its words, style, size, and color. Locked lanes reject insertion.

The 84 designs cover openers, lower thirds, subtitles, end cards, news, social, wedding, travel, and quotes. Examples include News desk, Guest speaker, Clean subtitle, Production credit, Breaking news, Story time, Golden vows, City guide, and Daily inspiration, alongside the original twelve.

Titles are static designs using installed Segoe UI and Georgia fonts. End credits are a closing card, not a scrolling animation. Subtitles/captions are text styles, not speech transcription. Up to eight explicit text lines are rendered. Added designs vary positioning, font weight, spacing, color, and accent. They conservatively shrink long lines to fit narrow canvases; original designs retain their previous sizing behavior. Thumbnail typography is illustrative; the main-player preview uses the actual title rasterizer.

### Filters

Click a card to preview on the selected prepared video/image/title clip, or on the built-in sample when no suitable clip is selected. Double-click or choose Apply to selected clip for one undoable edit. Original resets color while preserving video effects, transforms, crop, opacity, and sound. Filters replace color settings rather than stacking.

The 186 filters include 81 original-source filters, including twelve original 3D LUTs. Original choices appear first after the reset and are marked Original code or Original LUT. The remaining Shrapwill grades cover portrait, food, night, scenery, vintage, mono, cinema, social, experimental, travel, and essentials.

The Color inspector identifies an applied original filter and exposes the existing scalar color adjustments. Scalar adjustments use a 17-cubed LUT; original LUTs retain their own full-resolution float32 table and domain with trilinear interpolation. Reset color clears the original identifier and scalar settings while retaining video effects.

### Effects

Click to preview; double-click or choose Apply to selected clip to apply. None removes spatial effects and keeps color. Video > Video effects adjusts mosaic block size, RGB separation, shake, mirror split, wave distortion, vignette, and scan lines. Reset video effects leaves color intact. Presets replace these seven settings; the inspector can combine them. These are whole-clip effects, not tracked privacy regions or separate effect lanes.

The 137 effect entries include None and 121 original-source effects after alias/name deduplication. Original choices appear first after None. Covers and playback execute the actual shaders and texture data. Original programs currently use imported default parameters; the existing inspector adjustments can be applied after them. All ten older Shrapwill styles remain supported by saved projects and the inspector.

Spatial sampling runs before color grading, cropping, and clip transforms. Mosaic uses square blocks sized relative to source width. RGB separation offsets red and blue horizontally. Mirror folds the source horizontally. Shake uses deterministic clip-local frames and safe zoom. Wave adds horizontal sinusoidal displacement using clip-local frames. Vignette darkens corners using normalized distance. Scan lines modulate RGB with 90 cycles over source height; fine lines may alias when resized. The shader and FFmpeg export share these formulas and preserve sampled alpha. Legacy projects default all three added properties to zero.

### Transitions

Click to preview between two sample shots. Select the incoming clip and double-click or choose Apply to selected clip to apply. Reveals and dissolve overlap the preceding clip on the same lane; linked audio follows the incoming clip. Locked linked tracks reject the whole move. Default duration is half a second, bounded by clip lengths; the inspector accepts frames. Fade can start a clip from black; its original transition program runs at the beginning. Removing a transition preserves current placement; Undo restores placement and transition together.

The 157 transition cards include 79 verified original-source transitions, 55 Shrapwill transitions, and 23 disabled unfinished originals. Categories include Speed Blur, Zoom, Glitch, Fade&Dissolve, Slides, 3D, Brush and other locally supplied labels. Covers use the actual render paths with asymmetric A/B scenes; hovering animates a seven-frame sample. Unfinished originals have an availability message instead of guessed artwork.

Masks use normalized clip coordinates after crop/scale and before rotation. Iris reveals are elliptical on nonsquare pictures. Existing playback layer limits and export resource bounds remain in place.

## Catalog architecture and compatibility

New definitions live in `src/features/library/catalog/{titles,filters,effects,transitions}.json`; originals remain in `presets.ts` and `videoEffects.ts`. Catalogs are bundled into the app and included by the existing source-packaging directory rules. No runtime downloads or installed vendor products are needed.

`crates/core/src/creative.rs` reads compiled-in title/reveal JSON with a one-time cache. TypeScript imports the same definitions. Project files supply identifiers and bounded numeric properties, never executable expressions or catalog paths. Core validation recognizes legacy and bundled transition identifiers. Lock rules, one-step undo, linked audio, and the project format version remain intact. The added numeric properties use neutral serialization defaults and finite/range validation.

Titles remain static. Original time-driven effects and transitions animate. Subject tracking, background removal, AI effects and closed plugin hosting remain outside the implemented collection. This is not complete Filmora project or plugin-host compatibility.

## Reference research

Reviewed November 8, 2026. Vendor catalogs differ by version, platform, region, and subscription. References establish technique families and workflows, not exact equivalence of the Shrapwill variants.

The November 8 research originally used technique names from installed CapCut and Filmora resources. Subsequent source ports now import actual locally installed Filmora shader code, LUTs and required textures. Original files retain SHA-256 identities. Personal projects and account metadata are not imported.

- [Filmora title categories](https://filmora.wondershare.com/tutorial/add-customize-title.html): openers, lower thirds, subtitles, titles, and end cards.
- [Filmora advanced text](https://filmora.wondershare.com/guide/advanced-text-edit.html): fill, outline, shadow, and background treatments.
- [Filmora creative assets](https://filmora.wondershare.com/guide/filmora-creative-assets.html): categorized searchable collections.
- [Filmora transitions](https://filmora.wondershare.com/tutorial/add-transition.html): preview, application, and duration.
- [Filmora effects](https://filmora.wondershare.com/get-creative/add-effects-to-video.html): distortion, overlays, and utilities.
- [Filmora camera shake](https://filmora.wondershare.com/get-creative/add-camera-shake-to-video.html): animated camera treatment.
- [CapCut filters](https://www.capcut.com/resource/capcut-filter): Movie, Food, Retro, and Mono families.
- [CapCut vintage filters](https://www.capcut.com/resource/vintage-camera-filter): nostalgic analog grading.
- [CapCut vignette](https://www.capcut.com/resource/vignette-effects): corner shading.
- [CapCut text styling](https://www.capcut.com/resource/text-writing): glow and background styling.
- [CapCut filters and effects](https://www.capcut.com/tools/video-effect-and-filter): color mood versus spatial treatment.

## Verification

Run the standard checks in CONTRIBUTING.md, build, then use isolated desktop suites:

- `npm run test:desktop -- titles`: all 84 actual title previews in an empty portrait project at 29.97 fps, transport, frame stepping, history isolation, insertion/undo, and both 1366 and 1920 layouts.
- `npm run test:desktop -- presets`: all 239 filter/effect/transition previews, selected-clip previews, explicit application/undo, locked-clip previews, latest selection, playback, and both layouts.
- `npm run test:desktop -- effects`: independent resets, inspector controls, undo/save, shortcuts, and 225 preview/export samples over every effect plus combined transform/alpha scenarios.
- `npm run test:desktop -- creative`: 366 preview/export samples across all titles, filters, and transitions, plus search/categories, inspector actions, locks, and layouts.

Unit tests verify the total excluding resets, unique names/settings, distinct sampled color output, unique reveal masks, bounded properties, legacy defaults, invalid-edit atomicity, linked-track locks, undo, and round-trip persistence. Desktop fixtures use generated media and isolated recovery/WebView profiles; the runner only terminates the editor process it launched.

Structural review context: React/TypeScript UI, local Tauri/Rust processing, project files and IPC. There is no server or database; server/auth/ORM checks do not apply. Flat catalog data and formula maps are deliberately declarative. Markup-heavy cards and test suite blocks follow the repository's exemptions. The pre-existing themes-test scanner finding is outside this change; the quality inventory remains unchanged.

Selected-clip filter/effect previews honor that clip's audio, gain, fades, and track mute. The built-in sample pictures and title previews remain silent. All source previews use the editor transport, source-position slider, monitor volume/mute, and level meter; monitor volume does not alter exported sound.
