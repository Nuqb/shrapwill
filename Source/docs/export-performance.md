# Export performance

Reviewed November 8, 2026. Shrapwill exports locally from original media through bounded FFmpeg jobs. The optimizations here retain the selected encoder, CRF/bitrate, quality preset, output dimensions, frame rate, audio pipeline, cancellation, and atomic destination replacement.

## What changed

- Neutral picture settings no longer create or apply an identity LUT.
- The video chain omits no-op crop, same-size scale, full-opacity adjustment, and zero rotation. Alpha-dependent operations explicitly retain RGBA.
- Intervals containing only neutral, untransformed, full-frame video with the output aspect ratio composite in the encoder's YUV format. Titles, images, grading, spatial effects, opacity changes, transforms, letterboxing, and transitions keep the RGBA path. This avoids subsampled overlay-position rounding for transformed clips. Overlay continues to respect source alpha.
- A completed incoming reveal no longer evaluates its per-pixel mask in later render intervals. Fade keeps its end-of-clip envelope.
- FFmpeg uses at most four filter threads, eight software-encoder threads, and two decoder threads per input. Filter/encoder limits also use half the available logical processors, with a minimum of one. The two-worker media queue remains unchanged.
- Encoder/input arguments live in `render/encoding.rs`. The export coordinator retains interval boundaries, linked timing, audio fades, immutable source snapshots, source-file protection, cancellation, and temporary-file cleanup.

## Repeatable benchmark

Run from Source:

```powershell
cargo run --release -p cutline-core --example export_benchmark -- ../QA/export-performance/run-name
```

The example generates its own 20-second 1280x720, 30 fps H.264/AAC test source. It measures three exports through the actual Rust renderer, using High quality, software H.264, CRF 17, and the medium preset. It probes each result for duration and audio and writes `results.json`. It never reads personal recordings. Use a new output directory for each run and avoid competing exports when comparing results.

Measured on this computer, an Intel Core i7-12700K with 20 logical processors, using one before/after run per scenario:

- One 20-second clip: **14.531 s before, 2.771 s after**, about **5.2x faster**.
- Ten consecutive cuts totaling 20 seconds: **18.595 s before, 5.057 s after**, about **3.7x faster**.
- One 20-second graded clip: **14.446 s before, 4.374 s after**, about **3.3x faster**.

All outputs contained 600 frames at 30 fps, 1280x720 video, and audio. FFmpeg's whole-video SSIM against the previous exports was 0.997491, 0.997494, and 0.998877 respectively. Encoder thread scheduling and avoiding a neutral RGB round trip can change compressed bytes; these are quality comparisons, not binary-equality claims.

These are generated 720p measurements on this machine, not a promise for every project. Higher-resolution sources, complex effects, many overlapping layers, hardware encoders, and storage can change export time. Spatial effects still process original source coordinates to preserve appearance rather than silently reducing source resolution or changing sampling quality.

## Regression verification

Run CONTRIBUTING.md's checks and the isolated `effects`, `creative`, `render`, `originals`, and `jobs` desktop suites against the final build. These cover preview/export pictures, transformed/alpha media, rational timing, original-media export, job cancellation, destination preservation, and audio. Standard track, shortcut, magnetic timeline, gesture, editing, title, and preset suites cover surrounding behavior.

The creative render test samples compact fixtures to cover the expanded catalog without producing unnecessarily long test movies. It corrects whole-pixel ruler rounding with actual frame-step shortcuts and allows a newly visible media decoder to publish its first texture before applying the same pixel tolerances. Reference comparisons first match the preview to the delivered H.264 4:2:0 color sampling, so thin color edges are compared in the same format. The numerical error limits are unchanged. It never retries an export to hide a rendering mismatch.

Structural review: React/TypeScript UI with a local Rust/Tauri media engine and file/IPC access; no server, database, or authentication checks apply. The export coordinator is smaller after extracting encoding arguments. Explicit FFmpeg option arrays are deliberately declarative; legacy physical-line warnings on those arrays and exempt test blocks are manually reviewed, without changing the quality inventory.
