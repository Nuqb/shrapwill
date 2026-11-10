# Shrapwill

A local Windows video editor built with a Rust editing core, Tauri 2, React, TypeScript, WebGL 2, Web Audio, and bundled FFmpeg 8.1.2. The workspace uses a familiar panel arrangement, with original Shrapwill branding. No accounts, telemetry, or cloud processing. This guide also preserves historical development notes; see the project README for the current release overview.

For development, start with [CONTRIBUTING.md](../CONTRIBUTING.md) and [architecture](architecture.md). The supplied [software quality guideline](quality/software-quality.md) is a standing project standard, surfaced by `AGENTS.md` and an always-applied editor rule. Version 0.5.0 separates the application into focused modules and adds formatting, linting, structural regression checks, and an explicit [remaining-debt audit](quality/audit.md). Its server-related examples do not introduce a network backend into Shrapwill.

## App icon

Version 0.4.4 uses an orange rounded-square face-and-mask icon with edge-to-edge framing for a fuller taskbar appearance. The human face is entirely blank; its outline and hairstyle preserve the supplied likeness, while the held mask carries the smile. The master artwork is `src-tauri/icons/shrapwill-master.png`; `node scripts/icon.mjs` rebuilds Windows icon sizes and the interface logo. The original reference photograph is not bundled.

## Using the editor

1. Open `App/shrapwill.exe` in the supplied folder, or install Shrapwill with the Windows installer. The folder, desktop, and Start menu shortcuts use this stable launcher, which opens the latest successfully published local build. New portable builds become current automatically; an editor already open keeps running safely. Installed copies are updated by their installer separately.
2. Choose **New project**, a project name, aspect ratio, and frame rate.
3. Click **Import**, or drop video, audio, and images onto the window. The background job prepares preview copies, thumbnails, and audio waveforms. You can cancel it from the progress card.
4. Drag imported media onto a compatible track, or use the small **+** on a media card. A placement outline shows where releasing will put the clip; Escape cancels. Click its thumbnail to preview the source. Clips can be placed while background artwork or compatible playback is still being prepared.
5. Drag clips to arrange them. Drag an edge to trim. Select a clip and use the properties panel to adjust its picture, color, sound, and fades. Use the timeline **+** menu to add tracks.
6. Titles reuse an unlocked title lane, or create the first overlay lane when needed. Edit the wording, size, and color in the Video properties panel. Choose a transition for the incoming clip to overlap it with the previous clip.
7. Save your `.cutline` project. Choose **Export** for an MP4 from your original media, independent of preview resolution.

The eye button controls picture visibility. The speaker button controls track audio. A locked track and its linked clips cannot be edited. Detaching audio creates linked audio and video clips: moving, trimming, splitting, and deleting either selects the linked edit. Gain and fade adjustments affect the selected clip.

## Closing and unsaved changes

The Windows X button closes a saved project directly. If the project has unsaved changes, Shrapwill shows its own dark-themed confirmation with **Save changes**, **Discard changes**, and **Keep editing**. Save changes saves first and closes only after success. Cancelling the file picker or a save failure keeps the editor open. Escape and the dialog X mean Keep editing. Focus remains inside the dialog, and repeated close requests do not open extra copies. The same confirmation is used before opening, creating, or recovering another project.

Version 0.4.1 fixes the original close failure caused by a missing message-dialog permission and replaces the standard discard message with the custom interface. Shutdown cancels media jobs and blocks additional recovery autosaves.

## Track selection, titles, and dragging

Click a track name, unused header space, or empty space anywhere across a lane to select the whole track. Ctrl+click toggles additional tracks. Clicking clips and existing buttons keeps their individual actions. The ruler still moves the playhead; selecting a lane does not seek or edit the project. Right-click a selected header to keep the group and choose **Delete selected tracks**; Delete also acts on selected tracks. Right-clicking an unselected header selects only that lane. Track deletion includes its clips, respects locks, leaves other lanes' clips intact, and is one undo step. Deleting a linked audio lane does not delete its video. Ctrl+A selects all unlocked tracks when track selection is active; clicking a clip returns to clip selection.

Ctrl+click selects multiple clips. Right-click any selected clip to delete the group or ripple delete it. Context menus preserve the selected group and support Escape to dismiss.

A single click previews a title without adding it to the timeline. Use **Add title**, double-click, Ctrl+T, or drag to add. Automatic additions reuse an unlocked title lane and find free space from the playhead; only the first addition needs a new title lane. Selecting a video-track header targets that lane. Dragging a preset honors the specific video lane under the pointer. Locked lanes reject direct drops.

Clips visibly move into the destination lane while the pointer is held down. Linked audio follows the timing on its own lane. Escape cancels a drag; release commits one undoable edit. The local preview does not rewrite project history during the drag.

## Keyboard shortcuts and tool modes

Open the settings gear, **View → Keyboard shortcuts**, or **Ctrl+,**. There are 50 configurable commands, with up to eight alternate bindings per command. Click an existing shortcut to replace it, or **+** to record another. Ctrl, Alt, Shift, their combinations, function keys, punctuation, and numpad keys are supported; for example **Ctrl+Alt+W** or **Ctrl+Alt+Shift+W**. Conflicting assignments require an explicit Reassign choice. Save commits the changes; Cancel discards them. Individual commands and the entire profile can be reset to defaults. Escape cancels a recording before it closes settings.

The default tools are **V** for Selection and **C** for Razor. Razor clicks cut at the pointer; Shift+click cuts all unlocked tracks at that point. **Ctrl+B** separately splits selected clips at the playhead, or clips under the playhead when nothing is selected. Tool buttons show their name and live shortcut on hover or keyboard focus, including after reassignment.

Common defaults:

- File: Ctrl+N new, Ctrl+O open, Ctrl+I import, Ctrl+S save, Ctrl+Shift+S save as, Ctrl+E export.
- Editing: Ctrl+Z undo; Ctrl+Shift+Z or Ctrl+Y redo; Ctrl+C/X/V copy/cut/paste clips; Ctrl+D duplicate; Ctrl+A select all unlocked clips; Delete remove; Shift+Delete ripple delete.
- Playback: Space play/pause, K stop, Left/Right step a frame, Shift+Left/Right step one second, Home/End move to start/end, Up/Down move between edit points.
- Timeline: S snapping, =/− zoom, backslash fit, Ctrl+Alt+V add video track, Ctrl+Alt+A add audio track, Ctrl+Alt+D detach audio, Ctrl+T add a title.

Shortcuts are active only inside Shrapwill and do not intercept typing, text selection, or clipboard operations in text-entry controls. IME composition and AltGr typing are ignored. Windows-reserved combinations are not assignable. Shortcut preferences are saved locally for your Windows/WebView profile and are not embedded in project files. The clip clipboard belongs to the current project; opening or creating another project clears it. Existing `.cutline` projects remain compatible.

## Magnetic timeline

Click **Magnetic** above the timeline, use **View → Magnetic timeline**, or press **Shift+M**. The bottom video track carries the **MAIN** badge. Enabling the setting closes its existing gaps, including any gap at the start. Ordinary delete, cut, trims, drag moves, adding media, and paste then keep that track gap-free. Main-track inserts and reordering make room for the inserted clips; extending a trim pushes following clips right. A split by itself keeps all content, so it creates no gap until you delete or trim a piece.

Linked audio moves with its video. Unlinked audio, titles, and other video tracks keep their timing; use explicit ripple delete if you intend to ripple all unlocked tracks. Existing intentional overlaps are retained. Locked linked tracks block an edit that would move them, and the whole operation is cancelled. Each edit and its automatic shifts form one undo step. Enabling or disabling the setting is undoable too.

The setting is saved in each project and recovery file. It starts **off** in new and older projects, so opening a previous edit does not rearrange it. Turn it off for intentional gaps. Magnetic timeline and regular **Snapping (S)** are independent: snapping aligns clip edges while dragging; magnetic timeline closes empty space after edits. Its shortcut can be changed in Keyboard shortcuts.

## First-release boundaries

The creative library includes titles, filters, video effects, and transitions. Unfinished presets remain unavailable for new use. Covers use the actual render paths. Single-click previews without editing; double-click or the player’s Apply button applies a preset. See the creative collection and source-coverage documentation for technical details.

- Windows 10/11 x64; 1080p SDR workflows with 720p preview by default. MP4 H.264/AAC export at 720p or 1080p, including portrait and square layouts.
- This is a preview release. Advanced keyframes, masks, tracking, nested sequences, multicamera editing, recording, HDR finishing, plugin hosting, and compatibility with other editors' project files are not implemented.
- Live preview allows up to eight simultaneous media/title layers, with at most two upcoming clips preloaded within that budget. Above this, the viewer asks you to hide or mute layers; export includes all enabled layers. The project can contain more than eight tracks or clips overall.
- Generated compatibility previews use 30 fps. Compatible originals can play directly at their native cadence. Projects and exports support the selected frame rate, including 29.97 and 59.94.
- The preview cache has a 10 GB budget and evicts older entries when needed. Evicted media is regenerated on demand as you seek or play. In-progress jobs are protected; if the budget cannot be met, the job reports that the cache is full. Export uses temporary disk space beside the cache and cleans it after completion/cancellation. Source files are never modified.
- Preview uses a bounded media-player pool and GPU textures; undo history is limited to 100 steps and approximately 64 MB. Browser/decoder/GPU memory is measured separately from these application-managed limits.
- Text is rasterized with installed system fonts. Rebuilding titles on a different computer can change typography if fonts differ.
- Hardware encoders appear only after a successful encoding probe. Software encoding is the default. Unsupported or corrupt files report a readable error.
- This installer is unsigned. No code-signing certificate was provided.

## Development

Requirements: Windows x64, Node.js 22.12+ (Node 24 was used), stable Rust, Visual Studio C++ Build Tools with the Windows SDK, and Microsoft Edge WebView2. FFmpeg/FFprobe binaries and notices are included in the source package. Rust/npm dependencies are pinned by the lockfiles.

```powershell
npm ci
npm run tauri -- dev
```

Build the installer:

```powershell
npm run tauri -- build
```

The NSIS installer is written under `target/release/bundle/nsis` unless `CARGO_TARGET_DIR` is set. `npm run build` builds the frontend alone; opening that frontend in a browser is a read-only interface preview. Local editing requires the desktop executable.

Run the core and preview tests:

```powershell
cargo test -p cutline-core
npm test
cargo run -p cutline-core --example smoke -- ../qa
cargo run -p cutline-core --example formats -- ../qa
cargo run -p cutline-core --example reference -- ../qa
cargo run -p cutline-core --example timing -- ../qa
```

Native UI test scripts in `scripts/` connect to an explicitly enabled WebView2 debugging endpoint on localhost port 9223; `shortcuts-desktop-test.mjs` uses port 9226 and `magnetic-desktop-test.mjs` uses port 9228, and `tracks-desktop-test.mjs` uses port 9230. `close-desktop-test.mjs` uses port 9233; its save mode expects the native title-bar X to have opened the custom dialog, and its discard mode runs in a fresh isolated profile. This endpoint is not enabled by the shipped app. Set `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9223` (or 9226 / 9228 / 9230 for shortcut / magnetic / track checks) only for your own development session. The scripts expect the QA media generated by the examples above. Run shortcut checks in a fresh isolated profile, since the test intentionally changes bindings and edits its test project.

Set `CUTLINE_HOME` to a chosen directory to keep project history, recovery data, and caches in a separate profile. Otherwise, Shrapwill uses Windows' per-user application data/cache locations. Preview quality, layout, and interface preferences are local. Recovery files are written every 30 seconds after edits; choose **Recover** on the launcher after an unexpected exit. A deliberate discard removes the recovery file.

## Structure

- `crates/core`: editing commands, validation, undo, media probing/proxies, title rasterization, shared render descriptions and color LUTs, segmented FFmpeg export, and tests.
- `src-tauri`: local desktop commands, file permissions, background jobs, progress/cancellation, save/recovery, and packaging.
- `src`: thin application composition, state/session hooks, actions/shortcut commands, desktop services, feature views, and ordered feature styles. See `docs/architecture.md` for boundaries and data flow.

The Rust project is authoritative. A drag or slider movement previews locally, then commits one editing command. The normalized render description feeds both preview and export; titles and color lookup tables share the same generated representation. Export works from a project snapshot and replaces the destination only after success. Media tools accept local file protocols only and are launched without a shell.

Third-party notices and the verified FFmpeg build checksum are in `src-tauri/notices`. Shrapwill's original source is offered under the MIT license; independent bundled tools retain their own licenses.

## Validation notes

Version 0.4.4 native checks pass for full-lane selection, Ctrl lane selection, header padding, unchanged playhead/history during selection, controls retaining their actions, and the empty-project drop hint, alongside the existing track/clip deletion, titles, and live-drag checks. The exported icon fills 24×24 and 32×32 pixels at those sizes, compared with 22×23 and 30×30 before.

Version 0.4.1 was checked using the actual Windows title-bar X in an isolated profile. The original permission failure was reproduced before the fix. The custom dialog passed Keep editing, Escape, focus containment, duplicate-request handling, new-project cancellation, failed-save protection, Save changes with full process exit, and Discard changes without altering the saved test project. A clean saved-project X also exited the process. Discard removed its recovery file.

Version 0.4.0 was tested from the bundled F: drive copy. Native checks cover Ctrl track selection, track and clip context deletion, one-step undo, locked track protection, title browsing without insertion, explicit and double-click additions, title lane reuse, live vertical dragging before commit, a single commit on release, Escape cancellation, and preset drops into the chosen lane. Shortcut and magnetic timeline native checks also pass on this build.

The 0.3.0 magnetic timeline checks cover immediate gap removal, ordinary delete, linked audio, untouched overlay timing, one-step undo/redo, pointer trimming, razor cuts, insertion without overwriting neighbors, disabling/re-enabling, save/reopen, custom shortcuts, and the 1366×768 layout in the installed Windows app.

Version 0.4.0 passes 27 Rust unit tests and 25 frontend tests (14 shortcut tests, seven live-gesture tests, and four preview math tests). Native checks against the installed application cover tool selection, razor cuts with linked audio, tooltip updates, multi-modifier assignments, conflict handling, alternative bindings, reset, persistence, text-entry protection, clip clipboard operations, undo/redo, and the settings layout at 1366×768.

The underlying media workflow was previously checked with real media and automated interactions against the installed Windows app. Checks cover timeline dragging/trimming, linked edits, save/recovery, missing-media relinking, cancellation, cache regeneration, rotated portrait footage, VFR input, and fractional frame rates. A stress test preserves 100 consecutive one-frame cuts at 29.97 fps. Sampled preview/export comparisons averaged roughly 1–3 RGB levels of difference, and the audio timing check passed.

On this host, the ten-minute, 100-clip reference project peaked near 584 MB of summed app/WebView working sets, and browser input-to-paint p95 was 72 ms. Cold idle was about 383 MB, above the initial 350 MB engineering target. The working-set sum can count shared pages more than once. These are short local measurements, not guarantees on other hardware or a long-session leak certification. The installer was tested in an isolated profile with the app's PATH limited to Windows directories; a separate clean Windows VM was not available.

Imports add files after a quick metadata check; thumbnails, waveforms, and any necessary compatibility copies prepare in the background. Common supported originals can be used immediately without a full-length conversion. Rebuilding/changing preview quality can still generate a resized compatibility copy.
