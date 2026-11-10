# Structural quality review — 0.5.0

Historical review: this report and its 51-warning inventory used the previous guideline and physical-line heuristics. The replacement in `software-quality.md` now governs reviews, including context detection, code-line counting, declarative/test exemptions, and backend-only applicability. The replacement task did not re-audit application code; these historical counts are not a current assessment.

Reviewed against the user's original `software-quality.md`. Its backend/auth/database examples are conditional; they do not apply to this local desktop application. No such systems were added.

## Adjustments completed

- Added root `AGENTS.md` discovery and an always-applied editor rule. Both require reading the original guideline before planning, editing, adding, or reviewing code. The original document is preserved byte-for-byte and included in source packaging.
- Replaced the large application entry component with composition of state/session hooks, actions, shortcut dispatch tables, desktop subscriptions, and feature views. JSX no longer owns the extracted project/import/export IPC actions.
- Split timeline rendering into toolbar, ruler, lanes, clips, context menu, and footer. Pointer-session selection, snapping, live vertical movement, listener cleanup, and single-release commit are separate from view markup.
- Separated preview color/compositing/render-loop concerns from the player UI. Split the stylesheet into ordered feature sections without changing the CSS cascade.
- Split the Rust model into versioned types, validation, history, clipboard, linked selection, magnetic rules, mutation groups, storage, and focused test groups. Title-lane selection, free-slot placement, and title construction now have named helpers.
- Split the desktop entry point into command groups, state, project storage, session snapshots, background jobs, and runtime setup. Shared job event construction replaces repeated progress/completion payloads.
- Split media processing/probing/cache concerns and render planning/title/color/export modules while keeping their public API compatible.
- Added consistent formatting, strict unused-code checks, compiler-aware Rust linting, portable native-test paths, an isolated desktop-test runner, contributor instructions, and architecture documentation. Source archives now include these materials.

All runtime files are within the guideline's file-size limits after this restructuring. Function-level findings remain deliberately visible below; this is not a claim of zero structural debt.

## High: media preparation and render algorithms

`src/features/preview/Compositor.ts`, `crates/core/src/media/{preview,probe,process}.rs`, and `crates/core/src/render/{export,plan,titles}.rs` retain long imperative functions. The largest is the segmented export builder. Their files now have a single media responsibility, but understanding a whole function can still exceed the 15-minute goal. Extracting only by line count would obscure timing and resource ownership.

Ordered follow-up: introduce render/export input objects; extract validated settings, segment planning, individual layer filters, audio graph assembly, and final muxing; give preview/player synchronization and GPU upload separate helpers; extract title geometry/rasterization and probe metadata normalization. Preserve render-comparison and format/cancellation coverage during each extraction. These findings are **open work**, not permanent exceptions.

## Medium: stateful controls and editing coordination

`src/Inspector.tsx`, `src/ShortcutSettings.tsx`, `src/ShortcutUI.tsx`, `src/UnsavedChangesDialog.tsx`, `features/timeline/useTimeline.ts`, and `features/preview/usePreview.ts` still combine sizeable effect/controller blocks or form sections. Inspector slider/number helpers also exceed the parameter target. `shortcuts.ts` has nested profile validation. These are the next UI extraction targets: validators and recording/focus hooks, property-control input objects, then form sections. Avoid adding more responsibilities to these functions.

The remaining magnetic and timeline mutation helpers in `crates/core/src/model` exceed the function-length target. Extract source-bound calculations, destination validation, linked movement, and normalization steps together with their existing transactional tests. Keep mutation ordering and one-step history intact.

Desktop media commands and runtime startup still contain long worker/setup closures. Extract worker requests and startup capability checks next. IPC commands for clipboard, relinking, and new project exceed the arity guideline because Tauri exposes individually named serialized arguments. Keep the external command contract compatible; a future input-object migration must update TypeScript callers and native tests together.

## Low: declarative views, fixtures, and construction

Some focused JSX components exceed 40 lines despite having one visual responsibility, and test `describe` callbacks include multiple independent tests. `emptySnapshot` is a default-state construction. They are flagged rather than excluded. Prefer meaningful subcomponents when adding complexity; do not make one component per trivial button or split fixtures merely to shrink a counter. Review the exact scope of any exception when touching the function.

## Exact inventory and enforcement

`structural-debt.json` records every current file/function finding with location, measured value, and limit. `npm run quality:audit` recomputes the full list. `npm run quality:check` rejects new findings or growth; it does not certify the recorded findings as compliant. The inventory is reviewed debt, not permission to ignore the guideline. Resolve or explicitly review findings in code being changed, and remove resolved records. Never automatically refresh the inventory as part of a build.

The automated scan cannot judge mixed responsibilities or comprehension, and the Rust scan does not compute nesting. Those remain explicit review obligations. Formatting and Clippy run separately; passing tests also does not establish structural quality.

## Validation

See `validation-0.5.0.md` for the actual checks and native regressions run for this release. Previous release acceptance notes remain in the README. Performance budgets were not re-certified by this structural review.
