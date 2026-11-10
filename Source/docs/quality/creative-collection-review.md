# Creative collection quality review

## Functional categories and badge removal

Context remains React/TypeScript presentation over the local Tauri/Rust engine, with no server/auth/database. The current scope is a declarative category map and library card metadata; no desktop I/O or editing invariants change. Severity: Low, no new structural findings. The flat catalog mapping is a deliberate declarative exemption. A small pure lookup separates functional presentation categories from source provenance without changing imported shader records or saved identifiers. Coverage checks account for all 81 selectable imported filters and 121 effects exactly once, prohibit source-application categories across every public catalog, and check representative monochrome, blur, glitch and text assignments. All code/LUT badges and implementation tooltips are removed from library components. Sidebar interaction checks cover absent source categories/badges and functional membership.

## Workspace navigation and panel update, November 9

Context: React/TypeScript presentation and local UI preferences; Tauri/Rust editing and file formats are unchanged. There is no server or database, so backend/auth/query checks do not apply. Project information reads the current editor context and does not perform file access or edits. Layout preferences continue through the existing persistence boundary.

Severity: Low for the current changes. Titles, Transitions, Filters and Effects share one category/results component with independently scrollable vertical navigation. Repeated instruction banners and the Titles toolbar button are removed without changing title preview, double-click/drag insertion or keyboard insertion. Source-code and LUT badges are omitted throughout the library. The inspector is mounted for clip selection; project information is available as a focus-contained View-menu dialog, with editing shortcuts suspended and focus returned on close.

Panel constraints are pure functions in `panelSizing.ts`, with container observation separate from input/session handling. Requested sizes persist independently of temporary viewport constraints. Resize sessions match pointer IDs, capture input, restore on Escape/cancel, and release listeners/capture on completion, blur, project change or unmount. Menu, divider and information-dialog length candidates are predominantly declarative JSX and are reviewed under that exemption. The 48-line pointer-capture function intentionally retains its matching cleanup and flat event-binding table in one lexical session; it has shallow control flow and no editing or data-access responsibility. The prior structural inventory is not enlarged. Existing preview/export orchestration findings remain separate debt.

Focused checks cover growth beyond 480 pixels, sidebar/category search, inspector auto-hide, both panel axes, keyboard resizing, Escape cancellation, project-switch cleanup, saved preferences, window shrink/restore, Project Info history isolation and dialog focus. Desktop interaction checks run one session at a time because native hover/focus are shared resources. Layout screenshots cover 1366×768 and 1920×1080. Normal title preview/insertion, drag/drop, selection/deletion, shortcut/tooltip, magnetic editing, gesture, picture/audio, jobs, save/recovery and cancellation checks accompany the workspace checks.

## Context detected

- **UI framework:** React and TypeScript.
- **Backend:** No custom server. Tauri commands call the local Rust editing/media engine.
- **Data access:** Local project files, title/LUT cache, bundled FFmpeg processes, and desktop IPC through the existing service boundary.
- **Skipped checks:** Server entry points, remote authentication, database queries, and server authorization do not apply. Local file protection, locked tracks, atomic history, and bounded rendering remain applicable.

## Scope and findings

Severity: Low for the new collection modules; no new structural regressions in the legacy scanner. The previous inventory was not enlarged. New modules separate catalog data, preset browsing, thumbnail painting, title typography, transition state, shader setup, render uniforms, title SVG design, rasterization/cache, and export masks. The timeline transition indicator now obtains its label from the catalog.

The catalog and SVG style mappings are flat declarative definitions, intentionally kept together for readability. Test suites and test functions are reviewed for clarity under the current guideline's exemptions, rather than treating their physical line counts as application complexity. Existing larger inspector, compositor draw, and export functions remain recorded structural debt; the additions reduce or preserve their existing size and keep new editing rules in the core. The scanner reports 49 historical candidates, zero new/growing findings, and two resolved findings. That count is not a compliance verdict under the replacement guideline.

Transition placement validates through the core's cloned-project transaction, shifts linked partners together, rejects locked moves, clamps duration to available predecessor/incoming length, and commits one undo step. New color values have neutral deserialization defaults and finite/range validation. Sources, project format version, and existing history semantics are preserved. Export masks evaluate clip-local time even when a bounded render interval starts during a transition.

## Validation record

- Formatting, TypeScript production build, frontend unit tests, quality-scanner tests/regression check, Rust formatting, core unit tests, and workspace Clippy.
- Native smoke workflow, supported-format/portrait/VFR checks, 100-clip reference project, and 100 consecutive one-frame cuts at 29.97 fps.
- Creative desktop suite: every title rasterizes; all 18 looks and 10 transitions compare playback and exported frames, including transformed reveals; search, categories, empty results, and two workspace sizes are exercised. Fixtures and result details are written under the disposable QA directory.
- Standard desktop editing, tracks, shortcuts, magnetic timeline, gestures, render comparison, and media-job suites use their own isolated editor processes.

See [the creative collection guide](../creative-presets.md) for usage, reference sources, and current feature limits. The source packager already includes the complete `src`, `crates`, `scripts`, and `docs` trees, including every new file.
