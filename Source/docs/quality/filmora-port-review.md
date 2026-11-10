# Original rendering port review

## Context detected

- UI: React/TypeScript with WebGL 2.
- Backend: no server; local Tauri commands and Rust editing/media processing.
- Data access: local source resources, project files, export cache, desktop IPC and bundled media processes.
- Skipped checks: server routes, authentication and database checks do not apply.

## Scope and findings

Original shader imports, two-input scene rendering, source availability, native GPU export, thumbnails, and transition placement were reviewed together. Source import records exact hashes and named host adaptations. Unfinished originals are rejected for new edits; existing project identifiers remain readable. The internal mask utility is excluded from the menu.

The new rendering modules separate source lookup, GPU passes, scene preparation and cancellation-aware process execution. Shader bodies and manifest records are vendor/declarative content and are exempt from structural size review. C# graphics entry-point wrappers deliberately preserve native ABI parameter lists. Test suites are reviewed under the test exemptions.

The legacy scanner still reports existing and earlier-session candidates in the inspector, preview lifecycle, media source, export encoding and tests. Its inventory has not been enlarged. PortedPass program compilation and uniform binding were extracted by responsibility; native pair preparation, source processing, runtime extraction and asynchronous texture allocation are separate responsibilities. Generated asset lookup mappings, markup-heavy controls and clear test fixtures are deliberate declarative/test exemptions. The render graph separates geometry/budget validation, input binding, target reuse and execution. Test-suite length and the generated asset mapping are deliberate exemptions. The legacy scanner reports 64 structural candidates, including 22 new/growing candidates, without enlarging its inventory. No new runtime finding remains after the current guideline's counting and exemptions. The historical compositor and final-export functions remain larger orchestration points.

Local file reads never alter Filmora resources. Native exports use private cache paths, bounded lossless slices, cancellable child processes and a kill-on-close job. No project-supplied shader code is executed. Publication preserves existing running executables and source media. ANGLE provenance hashes and its upstream license accompany the source and portable application.

## Validation

- 67 frontend tests and 48 core tests, including unfinished-port rejection, legacy loading, original preset round trips, atomic undo and resource limits based on source dimensions.
- Exact source/runtime hash checks, release publication tests, TypeScript build, Rust formatting and workspace Clippy.
- 80 transition programs and 236 filter/effect programs (including retained aliases) at seven phases: 2,212 WebGL frames compared against standalone desktop OpenGL and production ANGLE hosts.
- Previous baseline: 77 original transitions through complete playback/native export (231 comparisons). The two newly enabled stage-based transitions add six complete pipeline comparisons.
- Previous baseline: 164 original filters/effects through complete playback/native export (492 comparisons). All 38 newly enabled presets add 114 comparisons. Another 27 complete-pipeline comparisons cover multi-stage effects, alpha, imported color filters, geometry, interval boundaries and original transitions.
- 457 available preset previews, plus actual apply/reset, legacy-style controls, undo, save/reopen, covers, opposite directions, hover/reduced motion, editing, audio timing, media jobs and cancellation checks.
- Isolated desktop suites cover thumbnails, preset playback, editing and export behavior. QA results retain detailed frame errors and screenshots.

The incomplete plugin/AI/media adapters listed in `docs/filmora-code-port.md` and `docs/filmora-filters-effects.md` are remaining functional limitations, not verified ports. Random Block now uses a precomputed float32 table of its fixed original random expression and passes cross-host checks; its older identifier remains readable. Import regeneration retains superseded identifiers as hidden legacy programs rather than dropping saved references.

The complete-pipeline regression caught stale sampler bindings after a blurred clip. Every stage now binds all sampler slots to its declared input or a safe original scene, preventing framebuffer feedback through inactive branches. The same protection is used by native rendering.

## Formerly unfinished transitions follow-up

Context remains React/WebGL, Tauri/Rust and local files/processes, with no server, authentication or database. The additional data boundary accepts only a bounded pixel frame and one of two analysis modes; it cannot accept a model, executable, shader or file path from the caller. Backend-only checks remain inapplicable.

The source/recipe adapters, lossless media frames, original render kernels and local subject-analysis support complete 21 formerly unfinished cards. The unnumbered Warp Zoom is a hidden compatibility alias. Flip Up remains explicitly unavailable because its referenced Turn implementation is missing. Proprietary AI calls use independently bundled CPU models; identical Filmora detections are not claimed.

Rendering responsibilities remain separate: original-file import/provenance, script-to-stage adapters, reusable kernels, video texture decoding, stage validation/execution, scalar animation curves, GPU readback, analysis coordination and desktop IPC. Native ABI delegates retain their required signatures. The small bilinear sampler deliberately takes explicit scalar pixel coordinates/dimensions in its hot loop; it does not cross a data boundary. Original shader bodies, model headers, generated mappings and test suites retain the stated vendor/declarative/test exemptions. No inventory was enlarged to silence the legacy scan. The existing large compositor loop remains a reviewed orchestration/debt point; its added timing argument preserves source frame selection without introducing data access in a view.

Both hosts cap render graphs at 32 stages and 256 MiB, bound imported texture caches, and retain one decoded video frame per stream. CPU inference disables telemetry, uses bounded tensors and fixed local models, and releases native tensor/session resources. Preview allows one request in flight; the core serializes subprocess requests and removes temporary frame/result files. Original videos are bundled only in the native asset closure; derived lossless browser frames are bundled only in frontend resources, avoiding duplicate embedding of both representations in both hosts.

Verified regressions include full-range video-mask decoding, the original alpha-transition kernel, D3D compilation of Flash Zoom host curves, integer/float32 packed-video frame selection on short transitions, and real face/person inputs through the packaged desktop command. Source/runtime/model hashes and exact decoded video-frame channels are checked. The full source comparison passed 102 transition records and 236 filter/effect records at seven phases against both native graphics paths; final affected programs were checked again with face/person fixtures. These checks establish Shrapwill host consistency and source provenance, not comparison against Filmora's closed renderer.

Final delivery checks passed: 69 frontend tests, 48 core tests, seven source/resource integrity checks, four publication/launcher tests, three quality-scanner tests, formatting, TypeScript/Vite build and workspace Clippy. All 21 newly enabled transitions passed 63 patterned complete playback/export comparisons. Covers passed direction, hover, reduced-motion and layout checks; all 478 available transition/filter/effect previews passed explicit-apply and timeline-isolation checks. Track selection/deletion, shortcuts, magnetic/linked editing, gestures, normal editing, preview/export picture and audio timing, save/recovery, relinking, jobs and cancellation regressions passed in isolated sessions. The legacy structural scan still reports 64 candidates, including 23 new/growing candidates under its older heuristics; the unchanged inventory and scoped review above distinguish existing orchestration debt, generated mappings and exempt suites from new runtime findings.
