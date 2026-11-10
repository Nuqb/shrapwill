import { X, Check, AlertCircle } from 'lucide-react';
import { useEditor } from '../../app/EditorContext';
export function ExportPercent() {
  const { currentExport } = useEditor();
  if (!currentExport) return null;
  return (
    <div className="export-percent">
      {currentExport.status === 'complete' ? (
        <Check size={38} />
      ) : currentExport.status === 'failed' ? (
        <AlertCircle size={38} />
      ) : currentExport.status === 'cancelled' ? (
        <X size={38} />
      ) : (
        <span>
          {Math.round(currentExport.progress * 100)}
          <small>%</small>
        </span>
      )}
    </div>
  );
}
export function ExportProgressFooter() {
  const { currentExport, cancelJob, setExportJob, setExportOpen } = useEditor();
  if (!currentExport) return null;
  return (
    <div className="dialog-footer">
      <span>
        {currentExport.status === 'running' ? 'Your original media stays untouched.' : ''}
      </span>
      {currentExport.status === 'running' ? (
        <button className="secondary" onClick={() => cancelJob(currentExport.id)}>
          Cancel export
        </button>
      ) : (
        <button
          className="primary"
          onClick={() => {
            setExportJob(null);
            setExportOpen(false);
          }}
        >
          Done
        </button>
      )}
    </div>
  );
}
export function ExportProgress() {
  const { currentExport } = useEditor();
  if (!currentExport) return null;
  return (
    <div className="export-progress">
      <ExportPercent />
      <h3>
        {currentExport.status === 'complete'
          ? 'Ready for the world'
          : currentExport.status === 'failed'
            ? 'Export could not finish'
            : currentExport.status === 'cancelled'
              ? 'Export cancelled'
              : 'Bringing it all together…'}
      </h3>
      <div className="progress-bar">
        <i style={{ width: `${Math.round(currentExport.progress * 100)}%` }} />
      </div>
      {currentExport.path && <p className="export-path">{currentExport.path}</p>}
      {currentExport.message && <p className="error-text">{currentExport.message}</p>}
      <ExportProgressFooter />
    </div>
  );
}
