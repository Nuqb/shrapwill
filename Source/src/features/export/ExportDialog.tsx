import { Film, X } from 'lucide-react';
import { durationOf, timecode } from '../../types';
import { useEditor } from '../../app/EditorContext';
import { ExportProgress } from './ExportProgress';
import { ExportSettings, ExportNote, ExportFooter } from './ExportSettings';
export function ExportSummary() {
  const { p } = useEditor();
  return (
    <div className="export-summary">
      <div className="export-summary-icon">
        <Film size={26} />
      </div>
      <div>
        <strong>{p.name}</strong>
        <span>{timecode(durationOf(p), p.fps)} · MP4 · H.264 / AAC</span>
      </div>
    </div>
  );
}
export function ExportHeading() {
  const { setExportOpen } = useEditor();
  return (
    <div className="dialog-heading">
      <div>
        <span className="eyebrow">THE FINISHING TOUCH</span>
        <h2>Export your story</h2>
      </div>
      <button aria-label="Close export dialog" onClick={() => setExportOpen(false)}>
        <X size={18} />
      </button>
    </div>
  );
}
export function ExportForm() {
  const { currentExport } = useEditor();
  return (
    <div className="dialog export-dialog">
      <ExportHeading />
      <ExportSummary />
      {currentExport ? (
        <ExportProgress />
      ) : (
        <>
          <ExportSettings />
          <ExportNote />
          <ExportFooter />
        </>
      )}
    </div>
  );
}
export function ExportDialog() {
  return (
    <div className="modal-backdrop">
      <ExportForm />
    </div>
  );
}
