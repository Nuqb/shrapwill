import { Download, MonitorPlay } from 'lucide-react';
import { fpsOf, durationOf } from '../../types';
import { useEditor } from '../../app/EditorContext';
export function ExportResolution() {
  const { exportRes, setExportRes } = useEditor();
  return (
    <label className="form-label">
      Resolution
      <select value={exportRes} onChange={(e) => setExportRes(+e.target.value)}>
        <option value={1080}>1080p · Full HD</option>
        <option value={720}>720p · HD</option>
      </select>
    </label>
  );
}
export function ExportQuality() {
  const { exportQuality, setExportQuality } = useEditor();
  return (
    <label className="form-label">
      Quality
      <select value={exportQuality} onChange={(e) => setExportQuality(e.target.value)}>
        <option value="draft">Draft · Smaller file</option>
        <option value="balanced">Balanced · Recommended</option>
        <option value="high">High · Best picture</option>
      </select>
    </label>
  );
}
export function ExportEncoder() {
  const { encoder, setEncoder, encoders } = useEditor();
  return (
    <label className="form-label">
      Encoder
      <select value={encoder} onChange={(e) => setEncoder(e.target.value)}>
        {encoders.map((enc) => (
          <option key={enc} value={enc}>
            {enc === 'software'
              ? 'Software · Reliable'
              : enc === 'h264_nvenc'
                ? 'NVIDIA hardware'
                : enc === 'h264_qsv'
                  ? 'Intel hardware'
                  : 'AMD hardware'}
          </option>
        ))}
      </select>
    </label>
  );
}
export function ExportSettings() {
  return (
    <div className="export-settings">
      <ExportResolution />
      <ExportQuality />
      <ExportEncoder />
    </div>
  );
}
export function ExportNote() {
  const { p } = useEditor();
  return (
    <div className="export-note">
      <MonitorPlay size={17} />
      <p>
        Exports use your original media at {fpsOf(p.fps).toFixed(2).replace('.00', '')} fps. Preview
        quality does not affect your finished video.
      </p>
    </div>
  );
}
export function ExportFooter() {
  const { p, exportVideo } = useEditor();
  return (
    <div className="dialog-footer">
      <span>No watermark. No upload.</span>
      <button className="primary" disabled={!durationOf(p)} onClick={() => void exportVideo()}>
        <Download size={15} /> Export video
      </button>
    </div>
  );
}
