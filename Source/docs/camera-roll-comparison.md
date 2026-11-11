# Camera Roll comparison

This independent local utility compares `F:\Camera Roll` against the I drive.
It never changes, copies, or deletes media and does not modify the editor.
It needs the existing Node.js installation; no downloads or network access occur.
The existing source packaging includes this guide and the scripts automatically.

Double-click `Source/scripts/Compare Camera Roll.cmd` to run a fresh fast scan
and open the report. If Camera Roll access is denied, right-click the launcher
and choose **Run as administrator**. It does not change folder permissions.
Read the report's unreadable/skipped list before interpreting the result.
Each run writes a separate folder in `Outputs` and preserves previous reports.

The fast scan matches filenames, ignoring case and folder layout, plus exact
byte sizes. It includes photos, videos, editing sidecars and every other file type.
It is not proof that two files have identical contents. Files with repeated
names are checked against every same-name candidate rather than just the first.

- `likely-copy`: filename and byte size match; contents remain unchecked.
- `missing`: no matching filename in the readable destination folders.
- `different-size`: matching filename exists, but none has the same size.
- `verified-copy`: SHA-256 matched a same-name, same-size destination file.
- `not-verified`: content differed, changed during scanning, or was unreadable.

The report provides searchable unresolved files, a complete CSV, an unresolved
CSV, and JSON. A renamed file may show as missing. A destination file can cover
multiple identical source copies; this checks preservation of file contents,
not the number of duplicate copies or empty folders. Links are skipped and
reported rather than followed.

For full content verification, run from the project folder in PowerShell:

```powershell
node Source/scripts/camera-roll-compare.mjs "F:\Camera Roll" "I:/" "F:\Programming\Shrapwill\Outputs\Camera-Roll-Verified" --verify
```

Use a new report folder name each time. The output's parent must already exist.
Full verification reads the complete files on both drives and can take much
longer than the metadata scan. File size and modification time are checked
before and after hashing. Keep both folders unchanged during verification;
results describe that scan, not future changes. All source files must have
verified copies, with no unresolved reads, before the tool reports full coverage.

Review missing/different files and preserve their originals when transferring;
do not overwrite a same-name destination file just because its name matches.
The tool deliberately provides no transfer or deletion command.

The focused regression test uses disposable generated files:

```powershell
node --test Source/scripts/camera-roll-compare.test.mjs
```
