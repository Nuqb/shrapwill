# Architecture

Shrapwill is a Windows desktop application. Editing runs locally: React presents the editor, Rust owns projects and undoable editing, and bundled FFmpeg processes media. Optional update checks contact public GitHub Releases; projects and media are never uploaded. There is no hosted application backend, account system, database, or telemetry. The Rust desktop engine is a local application layer, not a server.

## Application updates

`features/updates/useAppUpdates` coordinates startup checks and the existing
save/discard prompt. `services/desktop/appUpdates` owns the update UI state and
uses the existing desktop command boundary. Components only present that state.
The webview's network policy stays restricted; native `updates` commands alone
contact the configured GitHub repository.

The independent `crates/updater` library validates Ed25519-signed manifests,
strict version and repository constraints, bounded HTTPS downloads, SHA-256
digests, and allowlisted portable package paths. Its streaming readers and writers
use fixed buffers rather than loading application/media binaries into memory.
The public key is compiled from `config/updates.json`; private keys are excluded
from Git and source archives. Release automation signs exact manifest bytes and
publishes the feed after its artifacts.

Portable updates extract into a fresh immutable version directory and atomically
switch the stable launcher's reference. Earlier versions and running sessions
remain intact. Installed updates and explicit portable restarts use an embedded
Windows helper that waits for the owning editor to exit itself. Native handoff
rejects unsaved work without confirmation and active media jobs. No installer or
helper terminates the owning editor to force an update. See [updates.md](updates.md)
for publishing, key handling, recovery and validation limits.

## Interface

The main desktop window uses an integrated header instead of native title-bar
decorations. `app/layout/WindowControls` presents minimize, maximize/restore and
close through `services/desktop/window`. Empty header regions use Tauri's native
drag regions, including double-click maximize/restore. Close requests still pass
through the existing native close guard and unsaved-project prompt. The home
overlay leaves this header exposed so window controls remain available.

Custom dialogs, menus, tooltips and floating notices share `features/overlays/motion.ts`.
The React ref animates entrance and releases live controls immediately on close;
an inert, accessibility-hidden snapshot preserves the brief exit visual without
delaying focus restoration or retaining event handlers. Snapshot IDs are removed,
scroll positions are preserved, and reduced-motion preferences skip both animations.
Native Windows file dialogs retain their operating-system transitions.

The partial Filmora title import is described in `filmora-titles.md`.
Preset cards and empty-project sample playback share fourteen bundled, generated
photographic sources under `src/features/library/art/assets`. Cards wait for
image decoding before creating their textures; native playback extracts the same
1280×720 JPEGs into `preset-demo-photos-v3`. A stable preset-key selection keeps
card and player photos aligned; transitions use two different neighboring entries.
The optional native sample index defaults to zero for older callers and accepts
only embedded catalog entries. Actual selected footage still supplies
filter/effect previews when available. Generation prompts are in `preview-photos.md`.
Offline Filmora imports follow the configured local download folder in FilmoraSettings.xml
or the explicit SHRAPWILL_FILMORA_DOWNLOADS override. Incremental refreshes retain
existing compiled presets and saved identifiers. `refresh-filmora-transitions.mjs`
adds sanitized resource records; the transition porter retains prior programs and
imports new self-contained shaders. New media-only recipes remain pending.
The generated native asset lookup embeds only renderable program dependencies,
including retained saved presets; disabled payloads stay out of the executable.
Transition scene captures use mirrored-repeat sampling in both WebGL and the
native GPU helper, so motion outside the picture retains image detail instead
of stretching a single edge into stationary lines. Source filters/effects,
auxiliary masks/LUTs and intermediate render targets keep clamped sampling.
`npm run test:transitions` checks every selectable ported transition at 61 phases
for unintended horizontal/vertical line collapse; the two explicit midpoint
stretch equations remain allowed only at that phase.
`validate-filmora-compilation.mjs` checks all imported stages in WebGL; the original
port reference test can use an isolated browser and compare production ANGLE frames
with `--production-only`. Unadapted or failed programs stay unavailable.
`scripts/import-filmora-titles.mjs` records sanitized pending resources and appends
supported paint treatments to the shared title catalog. Optional title paint is
rendered by the existing native SVG pipeline for preview and export.
`TitleCollection` and `TitleCategoryNavigation` present the Filmora title hierarchy from
the sanitized `catalog/title-categories.json`; `titleCategories.ts` maps existing
designs to those groups. The offline category importer uses Filmora's current
local cache and numeric display order, including nested and empty categories.

`src/App.tsx` composes providers and the shell. `src/app/useEditorController.ts` coordinates focused state, session, action, command, model, and lifecycle modules. The controller is internal to the workspace; it is not a second authoritative editing model.

- `app/state`: local UI state and stable refs.
- `app/session`: snapshots, project operations, import coordination, playback commands, and unsaved-change handling.
- `app/actions`: user actions with editing guards and desktop-service calls.
- `app/commands`: shortcut dispatch tables grouped by purpose.
- `app/lifecycle`: desktop events, recovery intervals, keyboard listeners, and preferences.
- `app/layout`: shell, menus, notifications, and adapters for feature widgets.
- `features/library`, `projects`, and `export`: their respective views and forms.
- `features/settings`: category cards, appearance preferences, and shared dialog focus management. `services/themes.ts` owns the ten accent definitions and local preference storage; startup applies the saved theme (orange by default) before rendering. Themes affect interface accents only, with dark surfaces and media/project colors preserved.
- `features/timeline`: lane/clip views, toolbar, context menu, sizing/selection coordination, and pointer gesture sessions.
- `features/preview`: render loop, bounded WebGL/media-player compositor, color helpers, and player views.
- `styles`: ordered sections of the original stylesheet. `style.css` imports them in cascade order.

`services/desktop/client.ts` is the low-level IPC/dialog/asset boundary. `subscriptions.ts` owns event registration and late-unsubscribe cleanup. `bridge.ts` is a compatibility re-export for existing widgets; add new IPC implementations in the service layer. Hooks coordinate effects; view markup should not acquire new direct IPC calls or embedded business validation. Some older inspector/settings components still need extraction, as documented in the audit.

## Local desktop layer

The portable entry point `App/shrapwill.exe` is a small Windows launcher built from `scripts/launcher`. It resolves `current-release.txt`, forwards arguments, and starts the selected editor beside the bundled media tools. `scripts/tauri.mjs` publishes only successful release builds through `scripts/release/publish.mjs`: content-addressed executable names preserve running sessions, integrity checks precede publication, and an atomic reference switch makes each completed release current without editing shortcuts. This local build/publication mechanism does not update independently installed copies.

`src-tauri/src/main.rs` registers commands and starts Tauri. `runtime.rs` configures local paths, encoder capability probing, and native close events. `state.rs` defines session, snapshot, and event data. `session.rs` prepares render assets and publishes snapshots. `project_store.rs` handles portable references, recent projects, and atomic saves.

`commands/` groups IPC entry points into editing, projects, lifecycle, media, and rendering. Keep command names and serialized argument names compatible with TypeScript callers. They are local Tauri entry points, not HTTP routes. `jobs.rs` owns two bounded media-processing workers, a separate one-at-a-time metadata import lane, cancellation, and shared progress/completion event construction. Heavy conversion/export work cannot occupy the metadata lane.

## Rust core

Immutable waveform buffers use `Arc<[f32]>` internally while retaining ordinary
JSON arrays in project files. History moves previous states rather than cloning
them again and counts each shared waveform allocation once in its approximate
memory budget. Editing transactions and project version 1 are unchanged.

`crates/core/src/sync` owns typed snapshots and entity deltas. Every published
change has an interface sequence independent of the editing revision; opening,
creating, or recovering a project changes the session token. The desktop service
subscribes before startup, applies updates with structural sharing, rejects stale
messages, and requests full state after gaps or missing acknowledgements. New
UI calls opt into compact acknowledgements; existing command arguments and full
snapshot responses remain available to older local callers. Waveforms and
unchanged render entries are omitted from deltas.

`shrapwill-kernels` builds a compact playback interval index in native Rust for
preview plans with at least 32 clips. Only composition indices and subtree end
bounds cross the interface boundary; the player reads existing clip times and
performs a bounded tree lookup locally. Small browser-created source previews
retain the direct scan. The index preserves composition/preload ordering and
the existing player limit. There are no per-frame desktop calls. Color and
opacity calculations remain unchanged: the WebAssembly toolchain was unavailable
for this implementation, so no unbuilt browser module is required. Measurements
and validation limits are recorded in `rust-performance.md`.

`crates/core/src/model` contains the versioned project types, validation, editor history, clipboard, linked selection, magnetic rules, persistence primitives, and mutation groups. A command clones the current project, applies edits and magnetic normalization, validates, and commits once. Invalid or locked edits cannot partly update the project. Grouped tests cover these invariants.

`media/` separates child-process execution, metadata probing, preview preparation, settings, and disk-cache eviction. Commands launch binaries directly with argument arrays. Source files remain unchanged. Preview generation and export use cancellation tokens and bounded resources.

`render/` separates the normalized render plan, title rasterization, color/transition functions, and FFmpeg export. Titles and LUTs supply a shared representation for preview and export. Export uses an immutable project snapshot, renders from original media, and replaces the destination only after success.

The legacy title/filter/transition catalog lives in `features/library/presets.ts`; spatial/motion presets live separately in `features/library/videoEffects.ts`. Additions live in `features/library/catalog/*.json`. TypeScript imports them, and Rust compiles title/reveal definitions into `creative.rs` with a one-time parse cache; project files cannot provide catalog paths or rendering code. The catalog currently contains 84 titles, 186 filters, 156 transition cards and 137 video effects, with separate reset actions. The creative catalog is shared by the library and inspector. `PresetCollection` handles search and categories; thumbnail painting uses the preview color function. Title defaults live in `model/title_styles.rs`, with SVG design separate from rasterization/cache management in `render/title_svg.rs` and `render/titles.rs`. New color fields have neutral serialization defaults. Preview shader setup and color/mask uniforms are isolated in `features/preview/shader.ts` and `picture.ts`; normalized reveal masks mirror `render/transitions.rs`; `revealDesigns.ts` derives browser mask formulas from the shared definitions. `TransitionArt` renders seven-frame source thumbnails through the playback shader paths without allocating media players. Transition placement remains an atomic core edit and shifts linked audio together with the incoming video.

Color filters and video effects are independent property groups. Filters change the color LUT; video effects use source-normalized mosaic, RGB separation, mirror sampling, and deterministic clip-local shake/wave coordinates, normalized vignette shading, and scan-line modulation in `features/preview/effects.ts` and `render/spatial.rs`. `render/encoding.rs` owns bounded FFmpeg thread/codec arguments. Neutral color and no-op video operations are skipped; neutral video-only intervals use YUV compositing, while alpha-dependent treatments retain RGBA. See `docs/export-performance.md` for measured before/after results and the generated-media benchmark. `render/video.rs` owns the per-clip video chain and preserves effect → crop/scale → LUT → transition → rotation ordering. Both property groups have separate resets, remain core-validated/undoable, and serialize neutral defaults for old projects. Effect inspector state lives in its focused hook. No extra decoders, network service, or effect tracks are introduced.

Imports publish each new asset immediately after metadata probing via `imports.rs`; no thumbnail, waveform, or full-length conversion blocks its appearance or its editing metadata. Supported H.264/yuv420p MP4, 8-bit WebM, common images, and supported audio use the original path as their ready preview reference; originals remain immutable. `media/direct.rs` makes conservative codec/container/dimension decisions, and unsupported media still receive compatible previews in the background. `preview_jobs.rs` publishes only derived fields of an asset whose ID, source path, and project still match, so Undo/relink/project switches cannot resurrect or overwrite assets. Cancelling preparation leaves imported metadata usable. A per-cache-entry, cancellable lock prevents automatic and on-demand jobs from writing the same temporary files concurrently.

A decoder error requests `prepare_compatible_preview` explicitly, as does rebuilding/changing preview quality. The original remains intact. Source preview resolves the replacement file from the current asset and preserves playback position/pause state across that replacement. Import completion reports only file addition; preparation has its own background job.

## Editing and playback data flow

Timeline mode switches are independent: magnetic editing keeps the main video
sequence gapless, Auto Ripple shifts following unlocked content during insertion,
trim and deletion, and timeline snapping attracts clip edges and the playhead
within eight screen pixels. Auto Ripple is a default-off project setting and is
included in compact state updates. `model/timeline_rules` coordinates ripple edits
with magnetic normalization and rejects new same-track placement overlaps before
history commits. Existing project overlaps and explicit transitions remain readable.
`features/timeline/geometry` bounds zoom and scroll extents to project duration plus
a small tail. Filter source previews use a draggable, keyboard-accessible comparison
divider; the compositor draws filtered and bypassed color treatments from the same
media frame using scissoring, with shared media players and separate cached LUTs.

Workspace panels use `layout/panelSizing.ts` to fit saved widths/heights to the available content area, preserving a usable preview instead of imposing a fixed library-width cap. `PanelDivider` provides pointer capture, keyboard resizing, cancellation and unmount cleanup through `panelDrag.ts`; `usePanelBounds` tracks window/container changes. Preferences retain the requested sizes so temporarily smaller windows can recover their previous layout. The inspector and its divider appear only for a selected clip. Project information is a read-only, focus-contained dialog under View → Project info, with editing shortcuts suspended while it is open. Titles, Transitions, Filters and Effects use the same independently scrollable vertical category sidebar beside their results. Repeated click/double-click instruction banners and the Titles toolbar's Add title button are removed; title preview, double-click/drag insertion and the add-title shortcut retain their behavior. All preset cards omit implementation badges.

A user action sends a typed local command to Rust. Rust returns/emits a snapshot, and the session hook updates the interface. During pointer motion or slider dragging, local draft state provides immediate feedback. Release commits one undoable operation. A gesture session owns its pointer/key listeners and removes them on release, cancel, project change, or unmount.

`features/libraryDrag` coordinates internal media/title pointer gestures independently of WebView2's native Windows file-drop handling. Its session uses a movement threshold and pointer capture, shows a floating name and an in-lane placement outline, and resolves frames from the lane's current bounds and zoom. Locked/incompatible lanes and headers reject placement; release calls the existing actions for one core-validated edit. Escape, lost focus, pointer cancellation, and project changes dispose the gesture. A simple click retains source preview. HTML images cannot initiate a competing native image drag; external Windows imports still use the unchanged desktop subscription.

SDR 8-bit HEVC MP4 recordings now try the native decoder just like H.264 originals. The existing decoder-error path creates a compatibility preview on machines without HEVC support. HDR/10-bit media remain on the conservative conversion path. Background job labels distinguish thumbnails/waveforms from compatible playback preparation. A cold-cache check of the reported 101.46-second, 669 MB HEVC phone recording measured 73 ms to publish its asset and 982 ms to display its timeline picture with an actual mouse drop, without a full video conversion; these are measurements on this machine, not universal timing guarantees.

The player consumes the render description, maintains one playback clock, decodes only active/upcoming media within the player limit, and releases unused resources. Timeline views filter clips to the visible horizontal range. Recovery autosaves run every 30 seconds after changes. Closing goes through the custom save/discard/keep-editing dialog and then cancels background work.

Clicking a library title requests `preview_title`, which builds an isolated title-only project using the core's insertion defaults and the project's dimensions/frame rate. It prepares the same title raster and render plan used by timeline playback without touching the session or undo history. The source preview owns its frame/play state; transport controls and playback shortcuts operate on that source while timeline seeking or clip/track selection returns to the project. Pending preview results only replace their own still-selected source, so switching titles, inserting, or changing projects cannot reopen a stale preview. Double-click and drag retain normal insertion behavior.

Transitions, filters, and effects also use rendered source previews. Single-click never edits the project; double-click or the player's explicit Apply action uses the existing core-validated editing actions. `loadPresetPreview` coordinates all rendered source requests (including titles) with request IDs, so dismissed or superseded responses cannot reopen a preview. Filter/effect previews clone one prepared selected render clip, replace their property group, omit timeline transitions, honor the selected clip’s audio/mute and fade settings, and limit the playback window to five seconds. The clip retains its full duration so an artificial preview endpoint cannot move its audio fade. Without a prepared selection, `preview_preset` uses `render/demo.rs` to produce an isolated render plan from two bounded 1280×720 local PNG sample scenes; transitions use two overlapping shots. The sample cache contains only two reusable images, no fonts or external media. Source transport/shortcuts use `sourcePlayback.ts`, and the playback clock resets for every request while retaining the separate timeline playhead. Card views show artwork and names only.

## Extending the project

The optional Filmora download helper lives in `scripts/filmora-downloader` and builds
separately with `scripts/build-filmora-downloader.mjs`. It matches calibrated screen
icons and directly clicks arrows after a hover-state recheck, with a timeline pixel
watch that stops further input on changes. An optional slower mode selects only the
verified `Download Now` context-menu command using Windows accessibility data.
It sends bounded local mouse input to Filmora. It has
no project/editing IPC, network client, or account access. See `filmora-downloader.md`.

Video-effect browsing uses the sanitized `catalog/filmora-effect-order.json` snapshot,
generated by `scripts/import-filmora-effect-order.mjs` from Filmora's local category
tree and read-only cached resource pages. `presetOrdering.ts` preserves category and
per-category card order, including empty categories and membership in multiple
categories, while deduplicating All. Other collections retain their existing order.
Programs without cached placement appear under Other imported effects; local presets
appear under Shrapwill. Filmora is not consulted at application runtime.

Filmora effect import also inventories downloaded body-effect resources and retains
specific source categories in the library. Audio preset/parameter metadata is
inventoried separately by `scripts/inventory-filmora-special-effects.mjs`; it does
not register playable processors. See `docs/filmora-filters-effects.md` for source
availability and the remaining audio/body adapter requirements.

Put editing invariants and validation in the Rust core, desktop I/O in services/commands, stateful coordination in a focused hook, and visual sections in feature components. Preserve integer timeline frames, rational project rates, precise source timing, serialization compatibility, one-step undo, track locks, resource bounds, and existing file protection. Read the quality guideline before choosing a new boundary; update this document when those boundaries change.

Legacy motion transition parameters are shared through `features/library/catalog/motion-transitions.json`. Preview uses `motionTransitions.ts`; native export uses `render/motion_transitions.rs`. Verified original-code transitions bypass these approximations. Catalog sources and current port coverage are documented in `filmora-transitions.md` and `filmora-code-port.md`.

## Shared playback controls and audio

Library media now creates an isolated `media` preview plan in `features/preview/mediaSource.ts`, using the source dimensions, neutral clip properties, project frame rate, and asset audio metadata. Source frames/play state use the same transport and shortcuts as titles and preset previews, without editing the project or moving its playhead. Compatible-preview replacement swaps only the source path and preserves playback position and pause state. No visible HTML media element supplies browser controls, downloads, playback-rate menus, remote playback, or picture-in-picture.

`Compositor` persists for the lifetime of the player. `mediaElements.ts` creates bounded offscreen decoders, while `audio.ts` owns a single Web Audio context, per-clip gains/fades, monitor volume/mute, and a post-gain level analyser. `useAudioActivation` resumes audio from trusted pointer/keyboard input; project/source switches no longer discard that context. Null/empty preview plans pause or release old media. Monitor volume changes playback only; project/export gain and track mutes retain their existing semantics. Fullscreen includes the editor transport and has its own Escape handling before workspace shortcuts.

The playhead handle lives inside the sticky timeline ruler, above its background; the vertical line remains over clips. `usePlayheadSeek` owns pointer capture, coordinate-to-frame mapping, and cancellation/cleanup on release, Escape, blur, lost capture, project change, and unmount. Scrubbing changes only UI playhead state and does not create undo entries. The isolated `playback` desktop suite measures an actual decoded audio signal through the destination graph and checks mute/volume, source/history isolation, fullscreen, handle dragging/visibility, vertical scrolling, and both supported workspace sizes.

The expanded local-transition catalog is generated from the sanitized `docs/filmora-local-inventory.json` by `scripts/import-local-transitions.mjs`. It deduplicates names and aliases against existing identifiers. `scripts/port-filmora.mjs` separately imports original source, records hashes and compatibility adaptations, and generates the compiled shader manifest. Of 80 ready programs, one is an internal compositor and 79 are selectable transitions. Seventeen installed entries and six older web-derived entries lack complete original-code adapters and are disabled for new edits. Stored legacy projects remain readable. No Filmora installation or process is required at runtime.

`features/preview/ported/PortedPass.ts` executes original two-input programs over composed scenes for playback and covers, with bounded textures and a 32-program LRU. Rust `transition_sources.rs` owns availability; edit validation rejects unfinished originals. `render/ported_export.rs` prepares equivalent full-canvas inputs and invokes the embedded C# GPU helper through cancellation-aware `gpu_process.rs`. The helper uses bundled ANGLE for OpenGL ES 3 rendering; an independent desktop OpenGL mode supplies reference frames. Export slices cap transient lossless media use; child decoders and encoders belong to a kill-on-close Windows job. Original audio follows normal export mixing.

`test:desktop -- original-ports` compares all 102 transition records at seven phases against independent original-code reference frames. `original-export` exercises the 100 selectable transition ports through complete preview and native export with patterned media and non-neutral grading. Source hash tests preserve exact originals and runtime libraries. These checks do not claim compatibility with the unfinished closed plugin hosts. Existing local-transition suites filter unavailable originals.

## Rendered library covers and distinct video effects

`features/library/art` renders transition and effect covers through the same picture shader and uniform bindings as playback. Asymmetric A/B scenes expose actual translation, rotation, masks, blur and distortion. Visible cards paint lazily; hover or keyboard focus renders live at up to 30 frames per second, with half-second holds and a two-second transition by default. Imported texture loading pauses the hover clock instead of skipping pictures. Reduced-motion preferences keep a still frame. One shared offscreen WebGL context and a cache limited to 48 still pictures bound thumbnail GPU and bitmap use. Covers no longer use a universal direction arrow or guessed geometric masks.

The earlier Shrapwill Effects collection was curated to 20 choices instead of 73 small variations. The current tab adds verified original programs and removes duplicate menu names, while all ten older style controls remain available for saved projects. Ten Shrapwill algorithms are selected by the core-validated `effectStyle` and `effectAmount` properties: blur, glow, sharpen, outline, emboss, grain, halftone, fisheye, swirl and kaleidoscope. Browser `creativeEffects.ts` and native `render/creative_effects.rs` implement the same normalized equations. Native processing applies these styles before legacy spatial controls, matching browser texture sampling order. Applying a library effect resets all effect settings; color and geometry remain separate. Legacy projects default the new fields to zero and retain their stored older effect settings. Removed catalog variants do not remove or alter effects saved in existing projects.

The `covers` desktop suite checks opposite directions, real animation, reduced motion, distinct effect covers and both desktop sizes. The `effects` suite compares all curated effects against native exports using patterned media, and checks applying, resetting, undo, saving and inspector controls. New source files are included by the existing src/crates/scripts/docs packaging rules.

## Original filter and effect source processing

`effects-manifest.json` records original GLSL, LUT tables, hashes, defaults, texture requirements and compatibility adaptations. The generated public catalog exposes 81 original filters and 121 original effects after alias/name deduplication. `originalFilter` and `originalEffect` are separate core-validated property identifiers with neutral serialization defaults, independent resets and undo support. Older scalar presets remain readable. Known unavailable references remain readable, but cannot be newly selected.

Public filter/effect categories come from the curated functional groups in `features/library/catalog/preset-categories.json`, through `presetCategories.ts`. Every selectable imported preset has one explicit group; source-application categories remain internal provenance. UI cards omit all code/LUT source badges and their tooltips describe the treatment instead of its implementation. Category changes do not alter preset identifiers, settings, rendering, or saved projects.

`SourcePass` prepares original effect/filter textures before ordinary picture rendering and library artwork. `TextureInputs` bounds asynchronous image/LUT loading, preserves alpha and image values, and uses float32 atlases for original LUT data. `render/source_effects.rs` supplies equivalent lossless per-clip native inputs, while `original_resources.rs` owns compiled-in shader/asset/runtime extraction. Audio stays attached to original inputs. `ported_export.rs` accepts these inputs when composing original transitions and sizes interval limits using source dimensions. The generated `texture_assets.rs` lookup accepts only compiled-in asset names. See `filmora-filters-effects.md` for resource limits, pending types and validation.

`ported/RenderGraph.ts` and native `ShaderGraph.cs` own bounded multi-stage RGBA rendering. Offline `filmora-host.mjs` adapters compile recognized original script behavior into trusted manifest recipes; scripts and external plugin hosts are never loaded at runtime. Native resources embed each stage and all referenced textures. `filmora-random.mjs` precomputes fixed block-noise values to avoid host-dependent floating sine output.

The formerly unfinished transition follow-up adds original alpha-mask kernels, video layer recipes, HDR bloom pyramids, Flash Zoom host curves, perspective-plane geometry and a node-graph blend adapter. Graphs are limited to 32 stages and 256 MiB, with a separate 64 MiB imported-texture cache. Videos retain their original compressed source for export and use hashed lossless frame extracts for browser channel fidelity. `ported/SceneAnalysis.ts` coordinates bounded local face/person frame requests through `services/desktop/analysis.ts` and `commands/render.rs`; core `render/analysis.rs` owns validation, temporary frame cleanup and serialized helper requests. Bundled ONNX CPU inference supplies eye anchors and incoming-person alpha for the original Left Eye Zoom and Zoom Ghost shaders. Proprietary Filmora AI results are not claimed to match these replacement models exactly. No network calls or Filmora installation are used at runtime. Only Flip Up remains disabled because Turn.conf and its original implementation are absent. The unnumbered Warp Zoom ID remains readable as a hidden alias to Warp Zoom 1.

Library tuning defaults to two-second transitions and 60% filter/effect strength. Preview controls retime the two-scene sample or adjust the isolated clip locally, including changes made while a native sample request is pending. Apply and double-click use the current tuning; transitions shortened by clip limits report the actual duration. `filterStrength` and `effectStrength` default to 1 when absent in saved projects, preserving old appearance. Original programs mix their final output with their input; HDR graph intermediates remain unattenuated. Browser color LUTs and picture effects and native LUT/FFmpeg processing use the same independent strength values. The inspector can revise applied strength; undo and serialization retain it.

The incremental Filmora filter-library importer supplements the original resource inventory with bundled cinematic cube tables, deduplicating by normalized name and source hash. Filter presentation retains meaningful package categories and falls back to functional groups for uncategorized bundled resources.

### Clip speed and color grading

Speed editing runs in a blocking media worker through the desktop speed service.
It reads only the selected source range and creates a persistent master and browser
preview under the application's `retimed` data directory. Original assets remain
in the project. The Rust Retime edit replaces selected linked source ranges and
updates downstream timing atomically; undo restores the prior source and timing.
Processing checks project revision and session identity before committing. Reverse
processing uses bounded two-second source chunks. Ramps linearly interpolate the
imported source-position/speed points and sample at quarter-second source intervals.
Defaulted Properties.speed records the baseline asset/range, rendered duration and
options. Repeated adjustments re-render that baseline instead of compounding.
The baseline is used only while sourceIn is zero and duration matches the recorded
rendered duration; trimming establishes a new baseline. The Retime edit stores
metadata with linked source changes in one history entry. The inspector commits
at gesture boundaries and serializes work without an Apply button.
Generated masters are application data rather than evictable preview-cache entries.

Color grading is serialized in Properties with neutral defaults for older projects.
The browser and Rust LUT implementations share HSL range weights, exposure/light
adjustments, RGB wheels and piecewise-linear master/channel curves. Existing LUT
rendering carries these grades into preview and export. Delivery remains SDR.
The source-packaging rules include the grading modules, imported preset definitions,
import script, desktop speed service, and tests through their existing directories.

## Local audio adjustments

Clip properties contain a defaulted AudioSettings group, validated and committed by
Rust through the existing undoable properties edit. Version-one projects retain
neutral audio behavior. The focused audio inspector presents channels, balance,
pitch, ten-band EQ, loudness normalization, foreground ducking, denoise, and local
voice effects. Basic, Denoise, Voice Filters, and Voice Characters are independent, keyboard-navigable inspector tabs. AudioBasic, AudioDenoise, and AudioVoices own their respective presentation, with shared compact rows in AudioFields/AudioSlider and feature styles in styles/audio-inspector.css. Switching areas is local UI state and never commits an edit; fade controls display seconds while retaining frame-based project values. Settings live in features/audio; components do not call desktop IPC.

media/audio prepares a full trimmed clip into a lossless, 48 kHz stereo FLAC cache
entry, using bundled FFmpeg and cancellable per-entry locks. The cache identity
includes source modification time, clip trim/duration and the validated DSP chain.
prepare_audio runs through the bounded media-job queue, outside the session lock;
it grants access only to derived files for an existing project clip. Preview uses
ProcessedAudio with a serialized, debounced request queue, ignores stale results,
and releases inactive players. Preparing audio is shown as a status over the picture.
Export uses the same full-clip DSP before interval rendering so pitch, normalization,
and echo history do not restart at segment boundaries. Gain and fades remain
separate timeline envelopes. Foreground ducking lowers other audible, unlinked
clips with adjustable fade duration and start-time offset, shared by browser and export formulas. Defaults retain the previous 80 ms / 250 ms envelope. A defaulted internal attack/release split preserves legacy timing. Duck amount stays in dB in project files and displays as percentage reduction.

Normalization offers a validated -36 to -5 LUFS target (default -16), with -1.5 dBTP before manual gain and mixing. Defaulted noise-tool enable flags bypass DSP while preserving intensity. Wind
removal reduces low-frequency rumble; spectral noise/hiss reduction, harmonic
50/60 Hz hum notches, soft-gated quiet reverb tails, and de-essing are local DSP. The voice catalog in features/audio/presets.json is exercised by the real-media integration test for every filter/character combination. Voice characters use pitch and
modulation, and room/echo filters use delays. These are local effects rather than
voice conversion models. No AI enhancement, stem separation, cloned voices,
accounts, or network audio processing is introduced. Existing src/crates/scripts/docs
packaging includes the new modules and generated-fixture tests automatically.

## Inspector presentation

InspectorFields, InspectorSlider and InspectorTabs provide the shared compact
controls for Video, Speed and Color. VideoBasic groups transform, compositing
and crop; defaulted VideoSettings retains independent vertical scale, flips and bypass switches. Transition controls are in Animation and retain their editing command.
useSpeedControls coordinates materialized timing through the desktop speed
service; preset cards draw the actual ramp points. ColorBasic groups presets,
LUT, color, light, adjustments and vignette. ColorCurve edits existing fixed
control points; ColorWheel maps pointer positions to the existing RGB grading
triplets. Graph drags draft locally and commit once on release; cancellation
restores the initial values. Defaulted ColorGrade fields hold section bypass flags,
independent LUT strength, sharpening, vignette shape, six secondary curves and seven
SDR tone wheels. Effective settings are resolved without mutating stored properties
in the render plan and browser draft path. Color LUT generation resolves bypass once
per cube, rather than cloning settings for each of its 4,913 samples. HDR delivery
and masks remain unsupported.

VoicePresetIcon renders a distinct authored SVG path for every local filter and
character, defined in voiceIconPaths. All inspector selection, toggle, graph and
waveform accents follow the selected application theme. Hue swatches and color
wheels retain their semantic spectrum colors. The isolated inspector-ui fixture
and desktop inspector-style suite cover narrow/wide layouts, theme changes,
SVG uniqueness, editing gestures, Undo and locked controls. All new source,
styles and test fixtures are included by existing source-packaging directories.

### Clip-local animation

Properties.animation stores catalog identifiers for keyframe, entrance and exit
presets plus an entrance/exit frame duration. The model validates identifiers
against a compiled, fixed catalog, never project-supplied expressions or paths.
The browser evaluates its normalized piecewise-linear transform curves; native
export builds corresponding FFmpeg expressions from the same catalog. Animation
uses a fixed output-size canvas and inverse sampling, so zero scale and offscreen
motion do not allocate oversized frames. Static vertical scale and flips share
preview/export geometry. Animation does not change timeline placement or audio.

Animation inspector cards use `AnimationArt` to sample the same curves on hover
or keyboard focus. Only the active card schedules animation frames; reduced
motion keeps a static sample. `KeyframeArt` supplies SVG direction guides.
Selecting a preset drafts the properties into the timeline player immediately
at its existing playhead, then commits through the normal undoable edit path.
The inspector switches out of library source preview without seeking. Clip
transitions remain in the dedicated transition workflow, outside inspector tabs.

scripts/animation-catalog.mjs produces the portable catalog from the imported
animation-source.json. Compiled host animations and looping effects are omitted;
local left/down variants mirror right/up, and outgoing variants reverse entrance
curves relative to a neutral starting transform. Technical reference details and
remaining gaps are recorded in inspector-reference-audit.md.
