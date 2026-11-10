# GitHub release updates

Shrapwill checks the latest stable public release in `Nuqb/shrapwill` once on
startup. Settings → Updates can disable startup checks or check manually.
An available update shows a notification. Download, installation and restart
each require the user's action. An unavailable connection never prevents editing.
Projects, original media and account credentials are not sent to GitHub.

Install an updater-enabled build once using the Windows installer or portable
archive. Earlier builds cannot acquire an updater they do not contain. Starting
the raw developer executable supports checks but asks for a normal installation
before in-app installation. Only stable versions newer than the running version
are offered; draft, prerelease and same-version rebuilds are excluded.

## One-time repository setup

The repository needs public release assets. No GitHub token is bundled in the app.
The public verification key is in `config/updates.json`. This checkout's matching
private signing key was generated at `.release-keys/updater-private.pem` and is
ignored by Git. Keep a protected backup outside source archives. Do not commit,
paste into issues, or include this file in a release.

In GitHub repository Settings → Secrets and variables → Actions, create a secret
named `SHRAPWILL_UPDATE_PRIVATE_KEY` containing the PEM private key. Commit the
public configuration, application changes and `.github/workflows/release.yml`.
Changing the public key breaks updates for installed copies that trust the old
key; do not regenerate it for each release. `npm run setup:update-signing`
initializes a new project only and refuses to replace an existing public key
when its private key is missing.

## Publish subsequent releases

1. Push the source changes and a stable version tag such as `v0.10.0`.
2. Publish a normal GitHub release for that tag. The Windows workflow sets all
   application version files from the tag, tests the application and updater,
   builds the installer, and signs and uploads update artifacts.
3. Confirm the workflow succeeded and the release contains an installer,
   portable ZIP, `.shrapwill.gz` package and `shrapwill-update.json`.

The manifest is uploaded last so clients cannot see a feed whose downloads have
not finished uploading. The workflow can also be run manually for an existing
stable tag. GitHub release immutability must allow these workflow uploads; when
using immutable releases, prepare/upload assets while the release is a draft
before publishing it, instead of using the post-publication workflow.

For a local build (run from `Source`):

```powershell
npm run release:version -- v0.10.0
npm run tauri -- build
npm run release:prepare -- v0.10.0
```

These commands create assets under `Outputs/releases/v0.10.0`. Upload the named
artifacts listed in `upload-files.json`, preserving the manifest-last order.
The signing tool verifies that the private key matches the compiled public key.
Never replace assets under an existing published version after users can install
it; publish a higher version for fixes.

## Installation and recovery

Portable updates include the editor, launcher, bundled FFmpeg/FFprobe and notices.
They stream into `releases/shrapwill-<version>-<unique-id>` beside the stable
launcher. Only after verification/extraction succeeds does `current-release.txt`
change. Keep shortcuts pointing to the top-level `shrapwill.exe`. Running editors
and previous version directories are preserved; the user can keep editing before
restarting. Downloads and extraction are bounded and cancellable.

Installed copies download a signed/hash-verified NSIS installer. Install and
restart first uses the existing save/discard/keep-editing prompt. Active media
jobs block restart. A small helper waits up to one minute for this editor to exit
itself, rechecks the installer hash, then runs the installer with update flags.
It never kills the editor. The installer also refuses to replace an executable
held by another editor session; it never force-closes that session. An error is shown if installation cannot start. Saved
projects and media are independent of the application installation directory.

For a portable rollback, close the affected new editor normally and restore
`current-release.txt` to the previous retained release path. A Windows installer
failure may require running the downloaded installer manually. This is application
package signature verification; Windows Authenticode signing is separate and is
not configured by these changes.

## Validation

`npm run test:updates` tests signing, package allowlists, a Node-to-Rust verified
package round trip, tampering, portable ZIP references and the Windows wait/launch
helper and refusal to overwrite a running executable with generated fixtures.
Run this after a Windows build so the locally cached NSIS compiler is available.
`npm run test:updates-ui` checks both installation modes, window sizes, cancel
and save-before-restart using mocked desktop commands in an isolated browser.
`cargo test -p shrapwill-updater` additionally
checks wrong keys, downgrades, bounded downloads, cancellation, extraction attacks
and preservation of previous files. `npm test` covers startup coalescing, retry
and install/restart state handling. `npm run test:release` checks the stable
launcher while an earlier generated editor session remains running.

A real published signed release and an interactive Windows installation are
still required for a live GitHub-to-installed-app upgrade check. Tests do not
claim that a local fixture proves GitHub permissions, release visibility or
Windows installer completion on another machine.

Local validation on November 10, 2026 passed 102 frontend tests, 62 Rust workspace
tests, eight updater packaging/Windows fixture tests, four launcher/publication
tests, and the isolated update-screen checks at 1366×768 and 1920×1080. Formatting
and workspace Clippy checks passed. The actual signed 0.9.0 portable release was
also verified and fully extracted by Rust into an isolated QA directory; its
installer matched the signed SHA-256 digest. The generated installer and portable
ZIP are under `Outputs/releases/v0.9.0`, and the stable local launcher opens the
updater-enabled build. No GitHub assets were published from this session.
Live editor automation could not connect to
its isolated WebView debugging endpoint (`ECONNRESET`), so a real installed-app
upgrade from GitHub remains unverified.

Structural review detected React presentation, native desktop services, HTTPS
release/file access, and no server backend or database; server/auth/database
checks do not apply. The update components' declarative JSX and test-suite size
triggers were reviewed under the project exemptions. Procedural update logic is
split between validation, transfer, extraction, staging and handoff. The legacy
structural regression check still fails against its historical inventory; the
inventory was not expanded to silence it.
