# Working on Shrapwill

Read the current [quality guidelines](docs/quality/software-quality.md) and [architecture](docs/architecture.md) before making changes. The guidelines apply to planning and additions as well as reviews. This is a local desktop application; context detection should identify React/TypeScript, Tauri, a local Rust engine, file storage, and no custom server backend. Skip backend-only checks and explain why; local data-access checks can still apply.

## Setup

Use Windows x64 with Node.js 22.12 or later, stable Rust, Visual Studio C++ Build Tools, the Windows SDK, and WebView2. This release was built with Node 24 and Rust 1.98. Run `npm ci`, then `npm run tauri -- dev`. Pinned media binaries and their notices live in `src-tauri/binaries` and `src-tauri/notices`.

## Before delivery

Run these checks from this source directory:

```powershell
npm run format:check
npm run quality:audit
npm run quality:check
npm run test:quality
npm run test:release
npm run test:updates
npm run test:updates-ui
npm test
node scripts/timeline-ui-test.mjs
npm run test:transitions
npm run build
cargo fmt --all -- --check
cargo test -p cutline-core
cargo test -p shrapwill-updater
cargo clippy --workspace --all-targets -- -D warnings
```

The replacement guideline supplied on November 8, 2026 is authoritative. Count code excluding blank lines/comments, treat thresholds as review triggers, exempt flat declarative code from size-only findings, and apply the stated test exemptions. The 250-line backend-entry threshold does not apply to local Tauri commands. Reviews are read-only unless changes are requested, and reports must start with detected context and skipped checks.

`quality:audit` and `quality:check` still use the previous physical-line heuristics and inventory in `docs/quality/structural-debt.json`. They are legacy regression checks, not an implementation of every rule in the replacement guideline. Review their candidates under the current counting rules and exemptions; the previous warning total is not a current quality assessment. Do not enlarge the inventory to silence a failure. Consult [the historical audit](docs/quality/audit.md) for earlier findings and recommendations.

The legacy scanner checks physical TypeScript function length, parameter count, and control-flow nesting; it checks Rust function length/arity and file sizes, including CSS, and retains its old desktop-command threshold. It does not subtract all blanks/comments or implement the new declarative/test exemptions. Rust literals/comments are masked by a lexical scanner, not a complete Rust parser. Rust nesting, mixed responsibilities, dependency direction, validation placement, repeated logic, and the 15-minute comprehension target still require human review. Clippy adds a separate compiler-aware check.

Never shorten names, collapse lines, remove useful comments, or split arbitrary chunks merely to pass a size check. Prefer a coherent component, hook, service, or input type. Format with `npm run format` and `cargo fmt --all`; the supplied guideline is deliberately excluded to preserve the user's original bytes.

## Native behavior checks

Generate disposable fixtures; these commands never use personal media:

```powershell
cargo run -p cutline-core --example smoke -- ../QA
cargo run -p cutline-core --example formats -- ../QA
cargo run -p cutline-core --example reference -- ../QA
cargo run -p cutline-core --example timing -- ../QA
npm run tauri -- build
npm run test:desktop
npm run test:desktop -- settings
npm run test:desktop -- render jobs
npm run test:desktop -- playback
npm run test:desktop -- creative
npm run test:desktop -- titles
npm run test:desktop -- effects
npm run test:desktop -- presets
npm run test:desktop -- importbench imports originals
npm run test:desktop -- librarydrag phone
npm run test:desktop -- close close-discard
```

After transition rendering changes, also run
`node scripts/original-ports-desktop-test.mjs --standalone --production-only`
after building the core helper. This uses its own headless browser and isolated
Vite cache; it never reuses a running editor. The sampling test above checks all
selectable programs at 61 phases, beyond cross-renderer agreement alone.

The desktop runner defaults to `../App/shrapwill.exe`. Set `SHRAPWILL_TEST_EXE` to your freshly built `target/release/shrapwill.exe` before testing a new build. `CARGO_TARGET_DIR` may change that path. Each suite launches its own editor and isolated recovery/WebView profile under QA. The runner terminates only the process it launched; it never finds or stops the user's editor. Generated profiles are retained for diagnosis. Debugging is enabled only for these test processes.

Override fixture and artifact paths with `SHRAPWILL_QA_DIR` and `SHRAPWILL_OUTPUT_DIR`. `SHRAPWILL_DEBUG_PORT` defaults to 9240 in the runner. Run suites sequentially; the runner rejects an occupied port. Direct scripts retain their historical default ports. Run from an interactive Windows user session with desktop access; restricted child-process tokens can prevent WebView2 from initializing. The runner's `close` suite sends the application's close event and tests its custom dialog; `close-discard` follows it using the generated project. Testing the actual native title-bar X separately requires the legacy save mode with its documented preopened dialog.

After timeline/preview changes, run track selection, shortcut customization, magnetic timeline, gesture, editing, render comparison, and media-job checks. Verify the custom close dialog in an isolated profile after lifecycle changes. Review the workspace at 1366×768 and 1920×1080. Performance budgets in the README remain measurement targets, not promises inferred from a successful build.

## Rust computation measurements

Run `npm run test:rust-performance` for the generated playback benchmark and exact
Rust/browser state-update replay. It builds the release `engine_benchmark`
example and uses an isolated headless Edge browser. Results go under
`../QA/rust-conversion`; it never connects to a running editor.

For matched history measurements, preserve the pre-change release example, then
run `node scripts/measure-rust-engine.mjs "absolute/path/to/engine-before.exe"`.
The runner alternates five baseline/current runs for each project size, then
compares full-snapshot and delta transport. See `docs/rust-performance.md` for
what each metric includes and the limits of these measurements. The optional
`npm run test:desktop -- rust-performance` suite measures an isolated live editor;
it requires the same interactive Windows access as the other desktop suites.
The existing `src`, `crates`, `scripts`, and `docs` source-packaging rules include
the new sources; `target` and QA profiles remain excluded.

## Pushing an update means publishing its release

By default, a request to push a Shrapwill update includes a new application
version, a pushed matching tag, and a published GitHub release with working
downloads and its signed update feed. A source push alone is incomplete. The
exception is an explicit source-only request from the user.

Check the latest release first. Use `npm run release:version -- v<version>` to
update `package.json`, `package-lock.json`, `src-tauri/Cargo.toml`, `Cargo.lock`,
and `src-tauri/tauri.conf.json` together. Commit those changes, build and validate
the new version, push the commit and matching tag, then complete the procedure in
[GitHub release updates](docs/updates.md). Prefer uploading all assets to a draft
before publishing it. Upload the signed manifest last. Never replace published
binaries under the same version to deliver new changes.

Before reporting success, verify the release points at the intended commit,
contains the installer, portable ZIP and signed update package, and serves a
valid `releases/latest/download/shrapwill-update.json` for the new version. Keep
the current editor running, preserve original media, and exclude private keys,
credentials and QA data from Git and release assets. If publishing is blocked,
report the remaining release step explicitly.

## Building and packaging

See [GitHub release updates](docs/updates.md) for signing-key setup, publishing
stable releases, portable/installed update behavior and recovery. Public update
configuration and the GitHub workflow are included in source packaging; private
signing keys are deliberately excluded.

`npm run tauri -- build` automatically publishes a successful Windows release to `../App`, including same-version rebuilds. `--no-bundle` also publishes the portable executable; debug builds, failed builds, and help commands do not change the current release. `scripts/tauri.mjs` forwards the CLI arguments, then calls the publisher only after success. For a release built outside that command, run `npm run publish:app -- "absolute/path/to/shrapwill.exe"` explicitly.

`App/shrapwill.exe` is a stable, windowless launcher, not the editor binary. It reads `App/current-release.txt` on every launch. The publisher verifies and stages a uniquely named editor executable, then atomically replaces that reference; previous builds remain in place so running sessions are never overwritten or terminated. Keep shortcuts pointing to `App/shrapwill.exe`. Do not manually copy an editor binary onto that path. The launcher is built from `scripts/launcher/ShrapwillLauncher.cs` using Windows' bundled .NET Framework compiler; no additional runtime download or build service is used. These sources are included automatically by the existing scripts-directory source-packaging rule.

Desktop tests must target the published editor from `current-release.txt`, not the short-lived launcher. The desktop runner resolves that reference automatically unless `SHRAPWILL_TEST_EXE` is supplied.

Build the NSIS installer with `npm run tauri -- build`. Run `npm run package:source` to create a source archive in `../Outputs`, including editor rules, documentation, formatting configuration, lockfiles, tests, icons, media binaries, and notices. Dependencies, generated schemas, build output, and personal QA profiles are excluded. Pass a custom destination with `npm run package:source -- "C:/chosen/location/source.zip"`. Packaging streams files through a pinned development dependency and requires only Node; it does not change PowerShell execution policy.

Keep `../App` and `../Outputs` as generated deliveries. Preserve previous releases in `../Backups`; never move or replace the canonical `Source` directory without checking paths and keeping a restorable copy. Update the version in `package.json`, `package-lock.json`, `src-tauri/Cargo.toml`, `Cargo.lock`, and `src-tauri/tauri.conf.json` together. Do not close a running user session to replace its executable.

The import benchmark uses a generated one-minute 1280×720 H.264/AAC clip and a fresh isolated cache. Set `SHRAPWILL_IMPORT_BENCH_LABEL` to distinguish measurements. `imports` also exercises metadata while both heavy workers are busy, compatible-preview fallback, duplicate/partial imports, Undo/project-switch cancellation, and original-byte preservation.

`librarydrag` uses real pointer movement from thumbnail images, names, audio cards, and titles. It checks placement feedback, one-step undo, locked/incompatible lanes, cancellation, insertion before proxy completion, and the native file-drop subscription. `phone` generates a 101-second rotated SDR HEVC fixture by default. An explicit `SHRAPWILL_PHONE_FILE` permits a read-only playback/import check of a recording in the isolated profile; paths are omitted from its result. It measures asset publication and first timeline picture, checks direct-original playback, portrait dimensions, seeking, and original file size/modification time. Frame-reading tests must request the same preserved WebGL drawing buffer as the compositor, including when polling starts before its first render.

Export speed can be measured without the UI using [the generated-media export benchmark](docs/export-performance.md). Compare runs without competing media jobs, and retain output timing/audio/picture checks when changing the render pipeline.
