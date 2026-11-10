# Filmora Fast Downloader

Run `Outputs/FilmoraDownloader/FilmoraDownloader.exe` from the workspace root.
This is a separate local helper, not part of the Shrapwill editor. It downloads
through Filmora's normal interface. It never saves or automatically undoes projects.

1. Open Filmora and choose Titles, Effects, Filters, or Transitions and a category.
2. Use Filmora's **List View** (the three-dot view menu beside its search field).
3. Keep Filmora at the size and position used for calibration. The delivered setup
   is calibrated to the currently open 1920 × 1032 window and its download column.
4. Press **F8** to start or pause. Press **Esc** to stop immediately.
5. Direct-icon mode is the default. The helper finds a download arrow, moves onto
   it, waits 50 ms for the hover state, checks that it is still an arrow, then clicks
   once. Already-available plus buttons are skipped. A watched timeline change stops
   further input. This detects changes after they occur; review the timeline before
   resuming after that stop.
   It scrolls results automatically. Filmora can continue into adjacent categories within the
   expanded group as the results scroll. Check the selected category when a pass
   ends, then select another group or tab and press F8 to continue.

The helper sends input only while Filmora is in front. Switching applications makes
it wait without clicking; it resumes automatically after Filmora regains focus for
600 ms. It does not bring Filmora forward automatically while waiting. Moving/resizing
Moving or resizing Filmora makes it wait until its calibrated position and size
return. A lasting changed results heading or a dialog covering a target pauses it.
Resizing the library/timeline divider also requires
recalibrating the results area, so the timeline stays outside the scan. The
heading check samples the area just above the calibrated results; calibrate with
the category list and column headings visible. No clicks occur while the heading
differs. A brief category load can recover automatically; a change lasting 1.5 seconds
pauses the run. The helper does not automatically
navigate categories or handle login, purchases, subscription prompts, or installers.
Queued clicks count download requests, not verified completed downloads.

If Filmora's layout or display scaling changes, click **Calibrate icon + area**.
Drag tightly around an unhovered download arrow, then select the scrolling results
area below its headings and above the timeline. Include the arrow's column, but
exclude the sidebar and player. Finally select the timeline lanes to watch for
unwanted additions. Direct mode requires this watch area. It must be separate from
the results. Playback, selection changes or thumbnail refreshes in the watched area
can also trigger a stop. Calibration is saved beside the helper. Keep the
mouse outside the icon column while calibrating so the arrow is not hover-highlighted.

The default minimum interval between requests is 80 ms; hover checks, detection and
Filmora's responsiveness also affect actual speed. It captures a fresh image before
each request and uses normalized luminance correlation only within the calibrated
icon column. The optional **Use explicit Download menu (slower)** checkbox instead
opens the asset menu and selects only **Download Now**. In that mode, the command's
name, enabled state, type and owning process are
read together, then verified again at its click position. Filmora's exposed Invoke
action was ineffective in live verification, so the verified menu entry receives
a physical click. An unknown menu stops this mode without selecting Apply. The
timeline pixel watch is used in direct mode; it is disabled while menu overlays are
being used. Pointer positioning and its click or wheel event are sent together
in one Windows input batch. Progress updates after scrolling and requests. A row is
tracked by both its position and a fingerprint of its visible name. Inserted Similar
recommendations rows can therefore replace an old row without being skipped; selection
highlight changes do not reset the tracking. The helper does not disable Filmora's
recommendation panel. Already-downloaded plus buttons are not matched. Scrolling
waits 750 ms for the list to settle and stops after four unchanged views. This detects
an unchanged screen, not complete catalog coverage. There are limits of 5,000 clicks
and 2,000 scrolls per run; failed downloads and remaining groups need review.

Clicks within eight pixels of the previous click wait at least 700 ms, or Windows'
double-click interval plus 100 ms when longer. This also covers small position shifts
when recommendation rows appear. Different rows retain the normal fast interval.

Build with `node scripts/build-filmora-downloader.mjs` from `Source`. The installed
Windows .NET Framework compiler is used; no additional runtime is downloaded.
The build references Windows' bundled accessibility assemblies and runs synthetic
tests for arrow matching, plus rejection, blank rejection,
invalid calibration, recommendation row reflow, the nearby-click cooldown, and
recovery from a transient heading change without accepting a lasting layout change,
and waiting safely through focus loss before automatic recovery.
Source files are included by the existing scripts/docs
source-packaging rules. Generated settings, icon samples and scan previews remain
in Outputs and are not bundled into Shrapwill.

For diagnosis, `--geometry` records the Filmora bounds; `--setup x y w h ix iy iw ih`
captures calibration from known window-relative rectangles; `--scan` performs a
detection-only preview; `--test-batch N` stops after N matching download clicks.
Batch mode hides its helper form so it cannot take focus from Filmora. These
command-line options are for isolated verification. Normal use needs no terminal.
