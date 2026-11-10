import { Upload, Plus, Film, Music2, Image as ImageIcon } from 'lucide-react';
import { assetUrl } from '../../bridge';
import { useEditor } from '../../app/EditorContext';
import type { MediaAsset } from '../../types';
import { useLibraryDrag } from '../libraryDrag/LibraryDragProvider';
export function MediaThumbnail({ a }: { a: MediaAsset }) {
  const { previewAsset } = useEditor();
  return (
    <button className="media-image" onClick={() => previewAsset(a.id)} title={`Preview ${a.name}`}>
      {a.thumbnailPath ? (
        <img src={assetUrl(a.thumbnailPath)} alt="" draggable={false} />
      ) : a.kind === 'audio' ? (
        <Music2 size={25} />
      ) : a.kind === 'image' ? (
        <ImageIcon size={25} />
      ) : (
        <Film size={25} />
      )}
      <span className="media-duration">
        {Math.floor(a.duration / 60)}:
        {Math.floor(a.duration % 60)
          .toString()
          .padStart(2, '0')}
      </span>
      {a.missing && <span className="missing-badge">Relink</span>}
    </button>
  );
}
export function MediaCard({ a }: { a: MediaAsset }) {
  const { previewAsset, addMedia, tab } = useEditor();
  const drag = useLibraryDrag();
  return (
    <div
      key={a.id}
      className={`media-card ${a.missing ? 'missing' : ''}`}
      onDragStart={(e) => e.preventDefault()}
      onClickCapture={drag.captureClick}
      onPointerDown={(e) => {
        if (a.missing || (e.target as Element).closest('.add-media')) return;
        drag.start(e, {
          type: 'media',
          id: a.id,
          name: a.name,
          kind: tab === 'Audio' || a.kind === 'audio' ? 'audio' : 'video',
          duration: a.duration,
          hasAudio: a.hasAudio,
        });
      }}
      onDoubleClick={() => previewAsset(a.id)}
    >
      <MediaThumbnail a={a} />
      <button
        className="add-media"
        aria-label={`Add ${a.name} to timeline`}
        title="Add to timeline"
        onClick={() => void addMedia(a.id)}
      >
        <Plus size={13} />
      </button>
      <div className="media-name" title={a.name}>
        {a.name}
      </div>
    </div>
  );
}
export function MediaGrid() {
  const { assets } = useEditor();
  return (
    <div className="media-grid">
      {assets.map((a) => (
        <MediaCard key={a.id} a={a} />
      ))}
    </div>
  );
}
export function LibraryEmpty() {
  const { importFiles, search, tab } = useEditor();
  return (
    <div className="library-empty">
      <div className="import-outline" onClick={() => void importFiles()}>
        <Upload size={27} strokeWidth={1.4} />
      </div>
      <h3>
        {search
          ? 'No matching media'
          : tab === 'Audio'
            ? 'Bring your edit to life'
            : 'Bring your story in'}
      </h3>
      <p>
        {search
          ? 'Try a different search.'
          : tab === 'Audio'
            ? 'Import music, voiceovers, and sound.'
            : 'Import videos, photos, and audio, or drop files into this window.'}
      </p>
      {!search && (
        <button className="primary" onClick={() => void importFiles()}>
          <Plus size={14} /> Import media
        </button>
      )}
      <span className="format-hint">MP4 · MOV · MKV · WAV · JPG · PNG</span>
    </div>
  );
}
