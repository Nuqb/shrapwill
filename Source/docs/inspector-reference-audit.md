# Inspector reference audit

Technical provenance, November 10, 2026. The running Wondershare Filmora
15.6.4.20299 installation was inspected directly, using tab selection,
disclosure controls and vertical scrolling. The official [audio ducking guide](https://filmora.wondershare.com/guide/ducking.html) and [Mac user guide](https://filmora.wondershare.com/guide/filmora-user-guide-v14-for-mac.pdf) were also checked for fade-control semantics: Fade Position shifts the start time. No media, preset, slider or project
content was changed. User-supplied screenshots supplemented this inspection.

## Reference observations and implemented behavior

- Primary areas: Video, Audio, Speed, Animation, Color. Animation separates Motion
  Presets and Keyframe Presets; motion has In/Out choices and wrapping cards.
  Shrapwill now follows this organization and locates Transition in Animation.
- Uniform Speed has rate, duration, reverse, ripple and pitch preservation.
  Speed Ramping has its eight cards and graph, without those three switches.
  There is no Apply button. Shrapwill applies gestures automatically and retains
  a source baseline to avoid compounding consecutive rate changes.
- Color presets wrap vertically. LUT, Color, Light, Adjust and Vignette have
  separate enable and disclosure controls, initially enabled. Settings survive
  bypass, save/reopen and undo. Shrapwill uses its selected accent theme.
- Basic color: temperature, tint, vibrance, saturation; exposure, brightness,
  contrast, highlight, shadow, white and black; sharpening; vignette amount,
  size, roundness, feather, exposure and highlight. All these controls have local
  preview/export implementations. LUT treatment strength is independent.
- Curves has Master/R/G/B and six secondary editors: Hue vs Sat, Hue vs Hue,
  Hue vs Luma, Luma vs Sat, Sat vs Sat and Sat vs Luma. Each secondary editor has
  an independent reset. Shrapwill uses five fixed horizontal sample positions.
- Color Wheels has three RGB wheels. The HDR reference has Black, Dark, Shadow,
  Light, Highlight, Specular and Global wheels. Shrapwill implements these tone
  regions with RGB bias, X/Y controls and level sliders, within an SDR pipeline.
- Audio Basic has channel routing, balance, pitch, equalizer, normalization
  targets and duck amount/fade duration/fade position. Denoise has independent
  normal noise reduction, reverb, hum and hiss controls. Shrapwill also retains
  wind removal and de-essing. Disable switches preserve stored strengths.
- Voice filters and characters were inspected directly. Additional environment,
  Haas, electrical/diving and non-AI character treatments now have local DSP and
  authored SVG icons. Existing saved preset identifiers remain supported.
- Video Transform and Compositing have independent enabled states. Width/Height
  can be linked or independent; flips and quarter-turn rotation are available.

## Capability boundaries

This is not a claim of complete Filmora feature or signal-processing parity.
Voice presets use local FFmpeg DSP; noise-tail reduction uses a soft gate.
The portable motion catalog contains 11 keyframe, 29 entrance and 29 local exit
presets. It preserves available transform values with linear interpolation;
proprietary interpolation/compiled host animation code is not replicated. The
exit variants are local adaptations, rather than recovered host animation code.

AI enhancement, vocal removal, AI matting and other AI tools are excluded.
Custom mask editing, anchor-point/path-curve controls, corner rounding, blend
modes, background/shadow compositing tools, stabilization, tracking, lens
correction, flicker removal and temporal video denoise are still unavailable.
No decorative switches were added for these unimplemented processing paths.
Color white-balance sampling/auto correction, external LUT import/skin protection,
custom saved color presets and arbitrary curve-point insertion are also absent.
True HDR working space, HDR scopes and HDR delivery remain unsupported. The HDR
tab explicitly identifies its current SDR tone-adjustment behavior.

## Validation

Generated-media tests exercise every selectable animation at three positions,
all voice/character DSP combinations, pitch/routing/normalization and ducking.
Isolated browser/native tests cover narrow/wide layouts, SVG uniqueness, theme
accent, field locks, undo, save/reopen, automatic rate replacement and agreement
between the Rust and browser color LUTs. Picture comparison includes combined
animation, independent height scale, flip, sharpening, vignette shape, secondary
curves and tone-wheel adjustments. QA artifacts stay outside source packaging.

Final validation passed: 122 frontend tests, 61 core unit tests, four real-media
integration tests (including all 486 filter/character combinations), five updater
tests, 13 isolated desktop suites, and the narrow/wide inspector fixture. Original
shader comparison passed 1,995 frames across 285 programs; transition sampling
passed 283 programs at 61 phases. Both ordinary and combined inspector
preview/export comparisons passed the existing tolerances. The delivered local
build at that checkpoint was `shrapwill-0.10.0-a71f45fa75e014ae.exe`.
Subsequent timeline and interface work is included in the 0.11.0 release; the
stable launcher follows the most recently completed build.

## Structural review

Context: React/TypeScript presentation, a local Tauri/Rust engine, desktop IPC and
file storage. Server, authentication and database checks do not apply. Media
coordination stays in hooks/services and the native retiming worker; model
validation and atomic editing stay in the core. Stored adjustments are separate
from their effective render settings.

Formatting and Clippy passed. The historical scanner remains nonzero: 121
candidates, including 86 new/growing entries relative to its older inventory.
These are not all pre-existing debt. Markup-heavy views, flat shader/configuration
and exempt test suites were reviewed under the current project rules; coordinated
speed state and shared color mathematics were kept together by responsibility.
The native speed worker was split into capture, source selection, preparation
and commit responsibilities. The historical debt inventory was not enlarged.
