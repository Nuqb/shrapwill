# Filmora code port

The expanded November 9 download refresh adds 183 selectable original shader
transitions. Previously imported program records and source hashes are retained.
Of 286 shader candidates compared at seven phases in WebGL and production ANGLE,
Old Film 02 exceeded the existing 64 MiB texture budget and remains unavailable.
Other new unadapted shaders and media-only recipes stay pending. The sanitized
inventory now records 1,826 resources; it is not a count of working transitions.

This implementation imports executable transition source rather than matching names to generic settings.

## Implemented

- 100 selectable transitions use recovered Filmora shaders, original media/mask recipes and compiled host render graphs for playback, covers and export.
- The manifest additionally retains the internal Mask Blend utility and the old unnumbered Warp Zoom project ID. Both are omitted from the public menu; the latter aliases the already ported Warp Zoom 1 instead of creating a duplicate card.
- Original files are preserved byte for byte under `src/features/preview/ported/originals`. The manifest records SHA-256 hashes, defaults, host requirements, and each compatibility adaptation.

`scripts/port-filmora.mjs` reads only the installed local resource files. Base64-wrapped source is decoded without changing the saved originals. Shader expressions, time curves, branch points, loop counts, and sampling paths are retained. Host compatibility changes normalize line endings, expand Filmora parameter macros, bind input textures and timing uniforms, use desktop-equivalent float precision in WebGL, move two nonconstant global initializers into the entry function, and remove a duplicate local declaration in Cross Zoom. The two OpenCL ports change vector syntax and image I/O while preserving the kernel equations and constants.

## Rendering path

`PortedPass` captures the composed outgoing frame and the composed incoming frame, then executes the original two-input program. It uses two bounded scene textures and an LRU of 32 compiled programs per renderer. The existing thumbnail renderer uses the same pass. Render graphs allow at most 32 stages and 256 MiB of intermediate textures, including half-float HDR bloom pyramids. Original texture sets share a 64 MiB cache budget. These limits accommodate the original six-level bloom graph at 4K while rejecting unbounded allocations.

Native export prepares the same two full-canvas inputs with the existing crop, scale, effect, LUT, opacity, position and rotation pipeline. It renders original shaders in an offscreen OpenGL ES 3 framebuffer through the embedded `transition-gpu.exe` helper and ANGLE runtime, and passes lossless FFV1 frames back into normal final encoding. ANGLE provides the same graphics API family as WebView2; the independent reference test retains a separate desktop OpenGL backend. The helper is compiled from C# by the installed Windows Framework compiler during the core build; no shader SDK, network service or Filmora process is invoked. Helper media processes belong to a kill-on-close Windows job so cancellation cannot leave decoders or encoders running.

The two ANGLE libraries are copied from the installed Filmora runtime. `src-tauri/binaries/ported-angle/origin.json` records their original byte counts and SHA-256 hashes; `src-tauri/notices/ANGLE.txt` retains the upstream license. The libraries and helper are embedded in the application and extracted only into its private export workspace. A Filmora installation is not required at runtime.

Both hosts use bottom-left shader UV and an opaque RGB scene target. CPU frame rows are flipped only at the native upload/readback boundary. Original parameter names are bound to clip-local seconds; legacy length/position aliases preserve their normalized ratios. Export slices are capped at half a second and an estimated 256 MiB lossless-intermediate budget. Intermediate source/result files are removed as each slice finishes. Original media and running user sessions are never replaced.

## Resources that are not converted

Only **Flip Up** (`local_flip_up`, original GUID `1B033EDA-6869-4957-AF60-323B09FB49FC`, internal name `Turn`) remains unfinished. Its installed resource references `Turn.conf`, but neither that configuration nor the executable transition source is present. Its rendered preview is available, but is not treated as executable source. The unrelated static FlipUp image filter is deliberately not substituted for this perspective transition. Existing projects remain readable; new selection stays disabled with an explicit missing-source explanation.

The other 21 formerly unfinished cards are now implemented:

- Downloaded original shaders: Blurry Roll 2 (Filmora display name Blurry Roll Left), Cross Roll 3, Cross Roll 4, Simple Roll (Simple Roll 1 / internal Simple Roll 0), and Round Zoom In.
- Original image masks and the recovered `AlphaTransition.frag` kernel: Evaporate 1 and Evaporate 2.
- Original video/layer recipes: Cinematic Digital Slideshow Transition 07, Glitch Intro Transition 07, Brush and Ink Transition 34, Floral Transition 1, Metropolis Transition 01, Shape Transition 60, and Signal Error Transition 03.
- Original script/graph adapters: 3D Slideshow Style 2, Fast Motion Blur Right, Flash Zoom Out, Left Eye Zoom, Lightning Zoom, Metallic Silver Grace 09, and Zoom Ghost.

Metallic Silver uses its original Box Turn 1 dependency, packed color/green-alpha video, and Allpurpose BlendMode shader with the original defaults. Its sequence retains the script's integer frame-rate calculation. Lightning retains its delayed frame sequence, source frame rate and two-level bloom. Flash Zoom's original curve segments and bisection tolerance run on the CPU in both hosts; only the resulting parameter values are passed to its shaders. This avoids a D3D compiler stack overflow from nested script helpers without replacing the animation curves. The slideshow adapter evaluates the original model/view/projection plane through an inverse homography and retains its beam, bevel, dual blur and composite passes.

Original compressed videos remain bundled for native export. Playback decodes lossless WebP frame extracts on demand because Windows video decoding changed full-range channel masks. All original and derived assets have content hashes; tests compare decoded original and browser-frame bytes. Playback retains one decoded video frame per stream; cover generation samples seven small frames.

Left Eye Zoom and Zoom Ghost keep their original fragment programs and host timing, while their proprietary analysis calls are replaced by bundled CPU-only ONNX Runtime 1.20.1, YuNet eye landmarks and PP-HumanSeg person masks. The shaders receive the same kinds of inputs (an eye point or incoming-subject alpha). These replacement models are independent implementations, so their detections are not claimed to be bit-identical to Filmora's closed models. No face identity recognition is performed. Models, runtime, exact hashes, upstream locations and licenses are included under `src-tauri/binaries/vision` and `src-tauri/notices/Subject-analysis.txt`.

Desktop frame analysis is behind the existing service/IPC boundary, validates frame dimensions and mode, caps requests at 512 pixels per side, serializes workers and times out after 15 seconds. Playback reads at most a 384-pixel frame, allows one request in flight and caches 16 results. It redraws paused frames on completion and uses the last completed analysis during playback. Temporary frame/result files are removed after each request. Export evaluates the current original frame with the same local models. Filmora files, installed DLLs, user accounts, downloads and processes are not consulted at runtime.

The application shows preset artwork and names without implementation badges, and visibly disables unfinished originals. New edits reject an unfinished original rather than silently running a name-only approximation. The internal Mask Blend utility is not exposed as a transition. Source provenance remains internal to the manifests and documentation rather than appearing as a library category or badge.

## Verification

- `node --test scripts/transition-gpu/ports.test.mjs` verifies every saved original against its recorded source hash.
- `npm run test:desktop -- original-ports` renders all 102 transition records at seven phases, comparing WebGL against independent desktop OpenGL and production ANGLE: 714 phase cases. GPU-specific random sampling uses a documented mean RGB tolerance of 12; other programs use 5.
- `npm run test:desktop -- original-export` compares the selectable original scene transitions through the complete preview/native-export pipeline using generated patterned media.
- The standalone `ported_smoke` core example exercises an original two-input shader through a disposable native project/export.

The optional `SHRAPWILL_VISION_FIXTURES=1` run with the Left Eye/Zoom Ghost filter also verifies the packaged desktop analysis command on actual face/person fixtures and compares both transitions at all seven phases. Fixtures are the official OpenCV `samples/data/lena.jpg` and `messi5.jpg`, stored only under QA for this check.

These checks establish source identity and agreement between Shrapwill's rendering hosts. They do not claim pixel-for-pixel comparison with Filmora's closed host or identical proprietary AI detections. Flip Up remains explicitly unfinished rather than receiving an invented replacement.

The follow-up [filter/effect port](filmora-filters-effects.md) adds original texture inputs, original LUT tables, source processing and additional verification.
