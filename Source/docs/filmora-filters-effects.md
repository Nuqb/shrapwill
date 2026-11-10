# Original Filmora filters and effects

## Expanded download refresh

The November 9 refresh adds 381 selectable filters and 264 selectable effects,
while retaining every prior program identifier and source hash. It follows Filmora's
configured download directory rather than assuming the older AppData location.
Original-code and normalized-name duplicates stay hidden.

All 923 shader candidates received seven-phase WebGL/production-ANGLE comparisons.
Six new effects failed texture-budget or frame-agreement checks and remain
unavailable. Earlier compilation checks also excluded unsupported shader stages,
a video-as-image texture and Swing Up's native compiler failure.
The broad desktop export test still reports a frame mismatch for the previously
imported Ascii Art preset. Its existing identifier and availability are retained;
that full-pipeline discrepancy remains unresolved.
Inventoried resources requiring scripts, multi-pass definitions or proprietary processing
remain pending. This refresh does not claim Filmora host parity.

The local importer reads Filmora 15.6.4.20299's bundled resources and downloaded `filter`, `resFilterNew`, and `overlay` folders. It copies only shader/LUT source and required texture assets. The inventory retains display names, categories, relative resource locations and availability reasons; account fields and unrelated metadata are not imported.

## Coverage

For direct comparison, the Effects sidebar now follows all 38 Video Effects
categories in the local English Filmora category tree, sorted by its `list_order`.
`scripts/import-filmora-effect-order.mjs` reads Filmora's resource database in
read-only mode, imports only category names and matched public effect names, and
preserves cached page/card order. Currently 57 ported effects have cached placement;
65 internal/older programs have no matching cached Video Effects listing and remain
under Other imported effects. Shrapwill presets have their own final category.
Empty Filmora categories remain visible. Multiple category memberships do not
create duplicate cards in All. This is a local cache snapshot, not a claim to match
Filmora's changing online recommendations or uncached pages.

The November 9 follow-up also scans downloaded `videoeffects`, `arstickers`, and
`resMuscle` resources. The local `videoeffects` and `resMuscle` folders are empty.
The downloaded Beautify resource references a missing configuration and stays
unavailable. Bundled Human Glitch and Human Pixelate require human segmentation.
The refreshed import includes Text Progress 1. Display categories now retain
specific source categories, with the existing functional categories as fallback
for resources labelled only Filmora. Shader fingerprints and normalized names
continue to suppress duplicate cards; saved identifiers remain retained.

`node scripts/inventory-filmora-special-effects.mjs` inventories 62 local audio
resources in `docs/filmora-audio-inventory.json`: three downloaded presets and 59
bundled parameter descriptions. These are not playable ports. Echo, Lobby and
Old Radio supply preset settings, while the processing implementations reside
in compiled Filmora plugins. The bundled descriptions supply parameter ranges
without DSP source. Implementing and verifying independent audio adapters and
the missing body-processing host remains necessary; the importer deliberately
does not expose those records as working effects or copy preview media as effects.

The manifest bundles original filter/effect programs and LUTs, plus hidden aliases retained for saved identifiers. The public catalog exposes 95 original filters and 121 original effects after deduplication. Twenty-six filters use original `.cube` tables. Exact-name and normalized-name matches replace earlier Shrapwill presets in the menu while their saved numeric properties remain supported.

`scripts/import-filmora-effects.mjs` generates `effects-manifest.json` and `docs/filmora-effects-inventory.json`. Original bytes and SHA-256 hashes are retained. The importer accepts a referenced GLSL file or a uniquely matching named GLSL file bundled alongside an older OpenCL configuration. It checks active code rather than treating commented examples as missing parameters. Unavailable entries are inventoried without creating substitute effects.

## Rendering

`SourcePass` renders the original effect, then original filter, into two reusable RGBA targets before the existing Shrapwill treatments, crop, geometry and scalar color adjustments. It preserves the source orientation and alpha. The same pass renders filter/effect covers. The inspector identifies the applied original program; the existing group resets clear its identifier without clearing the other group.

`TextureInputs` decodes original image resources without compositing them over another color. Image textures use their original samples and edge-clamped linear filtering. Animated sequences select frames from normalized clip/transition progress. LUT tables retain float32 entries in a two-dimensional atlas, with explicit trilinear interpolation and original domain bounds. LUT storage uses nearest sampling and no image row flip; original images use the graphics host's bottom-left convention.

Native `source_effects.rs` decodes a bounded original-media interval, executes the same original programs in the embedded ANGLE helper, then supplies its lossless RGBA result to the existing per-clip export chain. Original source inputs remain present for normal audio mixing. Original effects/filters also feed the two-input transition export path. Float uniforms derive from exact clip-local frame time, not an extra rounded progress multiplication. Both graphics hosts calculate normalized pixel centers explicitly to avoid interpolation-rounding differences in original noise code.

The texture cache has at most 16 pending/complete sets and a 64 MiB uploaded-texture budget. Pending requests are not evicted repeatedly. Shader programs retain the existing 16-program LRU. Export interval limits account for original source dimensions and effect-bearing tracks as well as output dimensions; at least one frame is processed. Lossless media files are removed after each interval, and helper child processes are contained by the existing kill-on-close job. No Filmora process or installation is required at runtime.

## Independent render stages

Shrapwill's own render graph replaces the host scripting for 37 newly enabled filter/effect presets and Halo Blur/Rotary Zoom. It binds source images and bundled textures, executes ordered stages into RGBA8 framebuffers, preserves half-size or fixed portrait-aware intermediate dimensions, and restores the caller's output target. Both browser playback/covers and the native export helper execute the same compiled-in recipes. No Filmora application, plugin host, script interpreter, installation path, or downloaded resource directory is consulted at runtime.

The graph supports up to eight stages, references only earlier results, and caps total frame storage at 128 MiB. Targets are reused for the same layout and released on layout changes. Original scripts and dependency kernels are saved with hashes alongside each adapter. Simple input/texture-binding scripts are recognized conservatively; unknown script operations stay unfinished. The recreated dual-Kawase host uses the bundled original sampling kernel; closed-host pixel parity has not been established.

## Compatibility adaptations

- Host parameter macros use a separate namespace so an original local variable cannot collide with a parameter name.
- Desktop integer precision is retained in GLSL ES.
- Uniform-dependent global initializers run at the shader entry; their expressions and order remain intact.
- Vintage's desktop implicit integer-to-float divisions have explicit GLSL ES casts.
- Original equations, texture data and parameter defaults remain in the checked-in manifest; every original source file retains its recorded hash.

`originalFilter` and `originalEffect` default to empty strings in older projects. Only compiled-in identifiers and families are accepted. New edits reject unavailable originals; existing known references remain readable, renderable and removable. No project can supply a shader path or code.

## Remaining resources

Random Block now bundles a float32 lookup of its original fixed per-block random expression, avoiding GPU sine differences while preserving the animated block logic. Other unavailable records require additional script/plugin adapters, human segmentation, missing host-generated tables or parameters, video-overlay recipes, or unavailable rendering code. OpenCL files that require missing host buffers are not replaced with guessed formulas. The inventory records the reason for each resource.

The transition catalog now exposes 100 original-source/recipe transitions. A follow-up completed 21 formerly unfinished cards, retained the old unnumbered Warp Zoom ID as a hidden compatibility alias, and left only Flip Up unfinished because its referenced original implementation is absent. See [the transition port details](filmora-code-port.md) for recovered sources, script/geometry/video adapters, independent local subject analysis and the remaining limitation.

## Checks

- Source and texture SHA-256 checks, plus exact float32 LUT-value preservation checks.
- Standalone desktop OpenGL and production ANGLE reference frames compared with WebGL at seven phases per enabled program. Ordinary programs use a mean RGB limit of 5; original GPU random sampling uses 12. Unfinished mismatches stay unavailable.
- `original-media-export` compares every public original filter/effect through complete playback/native export using generated patterned media, including non-neutral grading and geometry.
- `original-export` covers all public original transitions through complete playback/native export.
- Core tests cover known identifiers, invalid paths, serialization, atomic edits and undo; isolated desktop suites cover previews, covers, controls, save/load, resets, layout and normal editing.

These checks establish source identity and agreement within Shrapwill's rendering hosts. They do not establish parity with unavailable parts of Filmora's closed plugin host.

## Bundled cinematic filter follow-up

The incremental `scripts/import-filmora-filter-library.mjs` imports 14 previously missing cinematic cube tables from the installed material library. Cool Film is skipped because it already exists. Normalized names and SHA-256 source hashes prevent duplicate imports; existing identifiers and legacy project references are preserved. The main importer runs this follow-up after regeneration. Meaningful downloaded filter categories are retained, while bundled entries without category metadata keep their functional groups. The cinematic tables use the existing shared playback/export LUT renderer. AI Color Enhance remains unavailable because its host script is not yet supported.

## Comparison ordering

`scripts/import-filmora-filter-order.mjs` reads the English category tree and cached filter pages read-only, saving only public category labels and filter names. `filterOrder.ts` sorts the library and inspector by category position, then cached card sequence. The reset stays first; filters absent from cached pages follow matched cards by name, and categories absent from Filmora follow its groups. This is a snapshot of locally available ordering, not a claim to include every online Filmora filter or its changing recommendations. Rendering and saved identifiers are unchanged.
