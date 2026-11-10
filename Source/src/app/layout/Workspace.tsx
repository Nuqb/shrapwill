import { isRenderedSource } from '../../types';
import { useMediaSource } from '../session/useMediaSource';
import Preview from '../../Preview';
import Timeline from '../../Timeline';
import Inspector from '../../Inspector';
import { useEditor } from '../EditorContext';
import { MediaLibrary } from '../../features/library/Library';
import { PanelDivider } from './PanelDivider';
import { usePanelBounds } from './usePanelBounds';
import { fitPanels } from './panelSizing';
export function EditorPreview() {
  const {
    render,
    frame,
    playbackFrame,
    playing,
    playbackPlaying,
    p,
    quality,
    changeQuality,
    source: rawSource,
    setSource,
    ensureMedia,
    applyPreviewPreset,
    selectedClip,
    selectedTrack,
  } = useEditor();
  const source = useMediaSource(rawSource, p.assets);
  const renderedSource = isRenderedSource(source) ? source : null;
  return (
    <Preview
      plan={renderedSource ? renderedSource.plan : render}
      frame={renderedSource ? renderedSource.frame : frame}
      onFrame={playbackFrame}
      playing={renderedSource ? renderedSource.playing : playing}
      onPlaying={playbackPlaying}
      fps={p.fps}
      quality={quality}
      onQuality={(q) => void changeQuality(q)}
      source={source}
      onClearSource={() => setSource(null)}
      onApplyPreset={
        selectedClip && !selectedTrack?.locked && selectedTrack?.kind === 'video'
          ? applyPreviewPreset
          : undefined
      }
      onNeedMedia={ensureMedia}
    />
  );
}
export function EditorInspector() {
  const { p, selectedClip, selectedTrack, edit, setDraft } = useEditor();
  return (
    <Inspector
      project={p}
      clip={selectedClip}
      locked={!!selectedTrack?.locked}
      kind={selectedTrack?.kind}
      edit={edit}
      onDraft={setDraft}
    />
  );
}
export function EditorTimeline() {
  const {
    runAction,
    timelineControls,
    tool,
    setTool,
    snapping,
    setSnapping,
    p,
    frame,
    seek,
    selected,
    timelineSelectClips: selectClips,
    selectedTracks,
    timelineSelectTracks: selectTracks,
    edit,
    addMedia,
    addTitle,
    split,
    remove,
    detach,
  } = useEditor();
  return (
    <Timeline
      onMagneticChange={() => runAction('magnetic_timeline')}
      controls={timelineControls}
      tool={tool}
      onToolChange={setTool}
      snap={snapping}
      onSnapChange={setSnapping}
      project={p}
      frame={frame}
      onFrame={seek}
      selected={selected}
      onSelected={selectClips}
      selectedTracks={selectedTracks}
      onSelectedTracks={selectTracks}
      edit={edit}
      addMedia={(id, track, start) => void addMedia(id, track, start)}
      addTitle={(style, start, track) => void addTitle(style, start, track)}
      split={split}
      remove={remove}
      detach={detach}
    />
  );
}
export function WorkspacePanels() {
  const { layout, selectedClip } = useEditor();
  const size = usePanelBounds();
  const bounds = { ...size, inspector: !!selectedClip };
  const fitted = fitPanels(layout, bounds);
  return (
    <div
      className="workspace"
      ref={size.ref}
      style={{
        gridTemplateColumns: `${fitted.left}px 6px minmax(0,1fr)${selectedClip ? ` 6px ${fitted.right}px` : ''}`,
      }}
    >
      <MediaLibrary />
      <PanelDivider side="left" bounds={bounds} />
      <EditorPreview />
      {selectedClip && (
        <>
          <PanelDivider side="right" bounds={bounds} />
          <EditorInspector />
        </>
      )}
    </div>
  );
}
export function EditorWorkspace() {
  const { layout } = useEditor();
  const size = usePanelBounds();
  const bounds = { ...size, inspector: false };
  const fitted = fitPanels(layout, bounds);
  return (
    <main
      ref={size.ref}
      className="editor-main"
      style={{ gridTemplateRows: `minmax(200px,1fr) 6px ${fitted.bottom}px` }}
    >
      <WorkspacePanels />
      <PanelDivider side="bottom" bounds={bounds} />
      <EditorTimeline />
    </main>
  );
}
