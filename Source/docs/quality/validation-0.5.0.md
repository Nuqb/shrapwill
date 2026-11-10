# Validation — Shrapwill 0.5.0

Checked on Windows x64 on November 8, 2026. Tests used generated media and isolated application/recovery/WebView profiles. The user's running editor was left open.

## Build and static checks

- Production TypeScript/Vite build and Windows Tauri/NSIS build succeeded.
- Prettier and rustfmt checks passed. The original quality document's SHA-256 matches the supplied file: `15a8afd900c543f442e53104fe3584f675240b215a2e83b71875b8bdbf004ba6`.
- Strict TypeScript compilation rejects unused locals/parameters. Clippy passed across the workspace and all targets with warnings treated as errors.
- Development test/packaging dependencies were updated and pinned; npm's advisory audit reported zero known vulnerabilities. The production frontend output stayed identical after those development-only updates.
- Structural regression gate passed with **51 existing function-level findings**, zero new/growing findings, and zero oversized runtime files. The exact inventory and actionable review are alongside this report. This gate does not establish complete guideline compliance.

## Automated behavior

- 27 Rust tests passed: rational frame math, validation/source bounds, splitting/trimming, linked operations, locks, ripple/magnetic edits, clipboard, one-step undo, serialization/atomic saves, LUTs, and cache eviction.
- 25 interface-logic tests passed: keyboard mapping/profile behavior, timeline gesture constraints, color LUT/opacity semantics, and rational timing.
- 3 quality-scanner checks passed, including nested callbacks, stable function naming, and Rust strings/generic arguments.
- Media workflow example passed: mixed video/audio/still import, edits, save/reopen, and a 165-frame / 5.5-second MP4.
- Format example passed: portrait rotation, variable frame rate, portrait export, and fractional project rates.
- Timing example passed: 100 frames at 30000/1001 fps expected 3.3366667 seconds and measured 3.336 seconds, within one project frame.

## Native editor regressions

The isolated desktop suites passed for:

- Whole-lane and Ctrl multi-selection; track/clip context deletion; locks; undo; title preset browsing/addition/lane reuse; targeted drops; live vertical dragging before release and cancellation.
- Shortcut customization/conflicts, tooltips, razor mode, clipboard, and ordinary text entry.
- Magnetic main-track edits, linked audio, saved setting/reopen, and reassigned shortcut behavior.
- Pointer dragging/trimming, linked movement, keyboard delete/undo.
- Project state/desktop bridge, source preview, WebGL picture, property/title editing, save/reopen, export dialog, and playback clock advancement.
- Custom unsaved dialog: keep editing, Escape, focus containment, duplicate requests, project-change confirmation, failed-save protection, successful save and process exit, and discard without modifying the saved project. This release's automated suite injected the same application close event; the actual native X was verified in the earlier close-fix release, not re-certified here.
- Native import/export jobs, recovery, relinking, failed operations, and export cancellation.

The preview/export comparison passed five sample frames covering cuts, dissolves, titles, transforms, color, mute, and audio envelopes. Mean absolute channel error ranged from 1.0 to 3.047; at least 97.77% of sampled pixels were within 16 channel levels. Its audio timing assertion also passed. These measurements cover the generated reference cases, not every possible source codec or effect combination.

Workspace screenshots at 1920×1080 and 1366×768 were checked; the smaller viewport had no horizontal overflow. The CSS output remained identical after the ordered stylesheet split. Windows display-scaling combinations were not re-tested in this structural release. Whole-process performance/memory budgets and an installer test on a separate developer-tool-free machine were not re-certified.

## Delivery

The release, source archive, and checksum file are in the project root's `Outputs` directory. The canonical editable source is `Source`; the previous source was preserved under `Backups/Source-0.4.4-before-quality`. Contributor instructions document how to repeat the checks, regenerate fixtures, build the installer, and package all persistent quality guidance.

The source ZIP was opened independently to verify the instructions, always-applied rule, original guideline, architecture/audit/validation documents, packaging tool, and pinned FFmpeg binary. The archived guideline matched the original SHA-256. The delivered app matched the tested release executable byte-for-byte; the existing desktop shortcut still points to that app. Older source copies were organized under `Backups`.
