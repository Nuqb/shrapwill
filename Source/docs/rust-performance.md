# Rust computation measurements

Shrapwill uses a React/TypeScript interface, a local Rust/Tauri engine, and local
project files. No server, database, authentication, or remote service is involved.
These measurements cover generated projects and computation stages, not overall
application RAM, export acceleration, or guaranteed playback frame rates.

## Method

Measurements were taken on this computer (Intel Core i7-12700K, 20 logical
processors, Rust 1.98.1, Node 24.15.0). The native benchmark alternates five runs
of a preserved pre-change release executable and the current release executable
at each size. Each run applies 100 property edits. Values below are medians of
the five run medians; retained heap uses allocator-requested live Rust bytes
after the edits. It includes the core model/history, not Tauri, WebView2, GPU
allocations, or the desktop synchronization cache. Peak heap includes temporary
allocations during those core edits.

The original executable and its hash, current executable hash, raw samples, and
environment are preserved under `../QA/rust-conversion`. Ordinary media files
are not read by the native edit benchmark. The browser benchmark launches its
own headless Edge process. Measurements are machine/workload specific.

## Core editing and history

- **100 clips:** median edit 0.0889 ms before, 0.0452 ms after; retained heap
  13.51 MB before, 6.32 MB after.
- **1,000 clips:** median edit 0.6947 ms before, 0.4787 ms after (31% lower);
  p95 edit 1.0988 ms before, 0.6258 ms after. Retained heap 50.75 MB before,
  40.05 MB after (21% lower); peak heap 53.42 MB before, 40.78 MB after.
- **10,000 clips:** median edit 7.3040 ms before, 4.7144 ms after (35% lower);
  retained heap 46.82 MB before, 42.50 MB after.

Waveforms are immutable shared Rust buffers; undo/redo moves previous project
states instead of cloning them again. The existing 100-entry and approximate
64 MiB history limits remain. Counting a shared allocation once can retain more
undo states within that budget, so these are equal-workload comparisons, not
comparisons at an artificially identical history depth. Project JSON still uses
ordinary waveform arrays and project version 1.

## State-update transport

This benchmark reconstructs the old two-full-snapshot delivery using the same
generated state and compares it to production Rust delta generation,
serialization, and a compact acknowledgement. It excludes common render-plan
construction, actual operating-system IPC delivery, browser reconstruction,
and React rendering. It is not an end-to-end editor latency measurement.

- **100 clips:** median transport preparation 0.7033 ms before, 0.0753 ms after.
- **1,000 clips:** 7.7168 ms before, 0.5800 ms after. Serialized bytes across
  100 edits fall from 470,852,360 to 207,290 (99.96% fewer).
- **10,000 clips:** 35.4285 ms before, 5.6104 ms after. Serialized bytes across
  100 edits fall from 3,097,778,160 to 207,390.

Rust omits unchanged assets, waveforms, clip records, render entries, and order
lists. The interface sequence advances for saves and derived-media changes
independently of undo history. Ten actual Rust update records replay into the
browser service with exact expected state, including waveform replacement,
retiming, reordered/deleted tracks, saving, same-project reopening, and clearing
the render plan. Additional tests cover missing/duplicate/stale delivery and
resynchronization after a missing acknowledgement. Legacy command callers may
continue requesting full snapshots; the application opts into compact replies.

## Playback lookup

Rust prepares a balanced interval index in composition order for preview plans
with at least 32 clips. The browser queries that index using the clip times it
already owns; no per-frame desktop message is required. The compact index adds
two numeric arrays (approximately 16 native bytes per clip) and is omitted from
deltas when unchanged. It preserves half-open timing, preload ordering, rational
frame rates, seeking, and the eight-player limit.

For the generated 10,000-clip timeline, median lookup is approximately 0.0271 ms
with a scan versus 0.0004 ms with the index. This is a computation improvement,
not a corresponding multiplier on video frame rate. Five runs include warmup and
batched timings to exceed the browser clock's resolution.

An equivalent optimized TypeScript index builder takes approximately 0.464 ms.
Native construction takes approximately 0.239 ms, serialization 0.104 ms, and
browser parsing 0.078 ms (about 0.422 ms combined). At 1,000 clips, combined
native construction, serialization, and parsing takes 0.0287 ms versus 0.0460 ms
for the equivalent TypeScript builder (38% lower). The larger benefit is reducing
UI-thread preparation to parsing instead of sorting/building, and removing
repeated timeline scans. The added native index is a speed/responsiveness tradeoff,
not a claim of lower total memory for this component.

## Verification and limits

- The interface unit suite passes 97 tests, and native workspace tests pass
  56 core tests plus the kernel test. Clippy passes with warnings denied.
- Headless transition sampling passes 283 programs at 61 phases. These shaders
  and the native C# helper were not changed by this work.
- Independent headless WebGL/ANGLE reference checks pass 285 programs and
  1,995 frame comparisons.
- Generated ordinary exports complete with duration/audio checks: plain video,
  ten cuts, and graded video. No export speed improvement is claimed here.
- The isolated live-editor runner cannot establish a stable debugging connection
  in this environment: the previous application timed out, and the candidate
  connection was reset before the test could start. Therefore
  end-to-end edit latency, live dropped frames, and whole-application memory have
  not been verified. It never connects to or stops the user's running editor.
- The generated smoke workflow passes media preparation, original-transition
  export, and output probing (165 frames, 5.5 seconds). Its fixture directory now
  uses the same existing Windows path-cleaning helper as the other examples;
  extended canonical path prefixes previously prevented that example's .NET
  helper from opening the generated shader file.
- The legacy structural checker still reports existing debt and review triggers.
  Flat IPC argument lists preserve existing command names/arguments and optional
  compact compatibility; declarative fixtures and suite blocks were reviewed
  under the current exemptions. The debt inventory was not expanded.
  For reference, Git HEAD already has 79 physical-line findings and 38
  historical-inventory regressions. The current scanner reports 81 findings and
  42 inventory regressions: the render planner was split by responsibility;
  added triggers are declarative/test-suite blocks and the compatible flat IPC
  parameter lists. Those triggers are not a current-guideline compliance verdict.
- WebAssembly target installation and component download were unavailable within
  existing permissions/network access. No WebAssembly module or new runtime
  requirement was shipped. Color and opacity calculations remain unchanged;
  their proposed shared implementation needs a separate measured evaluation.

## Repeating measurements

From Source, build the current example with
`cargo build --release -p cutline-core --example engine_benchmark`.
Run `node scripts/measure-rust-engine.mjs "absolute/path/to/engine-before.exe"`
for the alternating native runs and paired transport comparison.
Run `npm run test:rust-performance` for native/browser state replay and playback
comparison. The results are written to the project's ignored QA directory.
The optional `npm run test:desktop -- rust-performance` uses an isolated native
session and requires an interactive Windows test environment.

New kernel, synchronization, benchmark, and test sources are included by the
existing source archive directory rules. Generated QA profiles, measurements,
and compiled executables remain outside the source package.

## Candidate delivery

The validated build steps produced `target/release/shrapwill.exe`; the desktop
publisher also staged `../App/shrapwill-0.9.0-06dda2093b5da367.exe`. The stable
launcher remains on the previous release while interactive native validation
is unavailable. The user's running editor and its unsaved work were not stopped
or replaced. The candidate contains the measured native changes; the proposed
WebAssembly/color conversion remains deferred.
