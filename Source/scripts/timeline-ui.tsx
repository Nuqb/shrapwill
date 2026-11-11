import React, { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Timeline from '../src/Timeline';
import Preview from '../src/Preview';
import { EditorContext, type EditorController } from '../src/app/EditorContext';
import { LibraryDragProvider } from '../src/features/libraryDrag/LibraryDragProvider';
import { defaults, emptySnapshot, type Clip, type RenderPlan, type Edit } from '../src/types';
import photo from '../src/features/library/art/assets/garden-portrait.jpg';
import '../src/style.css';
import { useEditorKeyboard } from '../src/app/lifecycle/useEditorKeyboard';
import type { LifecycleContext } from '../src/app/lifecycle/types';
import { defaultBindings } from '../src/shortcuts';

const initial = emptySnapshot().project;
const clip: Clip = {
  id: 'photo',
  name: 'Photo',
  mediaId: null,
  start: 0,
  duration: 900,
  sourceIn: 0,
  audioEnabled: false,
  link: null,
  title: null,
  transition: null,
  props: { ...defaults },
};
initial.tracks[0].clips = [
  clip,
  { ...clip, id: 'second', name: 'Second photo', start: 900, duration: 1800 },
];
const filtered = { ...clip, duration: 2700, props: { ...defaults, sepia: 1 } };
const plan: RenderPlan = {
  width: 1280,
  height: 720,
  duration: 2700,
  fps: initial.fps,
  clips: [
    {
      clip: filtered,
      trackId: 'v1',
      kind: 'video',
      source: photo,
      width: 1280,
      height: 720,
      audible: false,
      previewReady: true,
    },
  ],
};
function Fixture() {
  const [p, setProject] = useState(initial);
  const [frame, setFrame] = useState(0),
    [selected, setSelected] = useState<string[]>([]);
  const [selectedTracks, setSelectedTracks] = useState<string[]>([]);
  const [snap, setSnap] = useState(true);
  const [tool, setTool] = useState<'select' | 'razor'>('select');
  const controls = useRef(null);
  const dispatched = useRef<string[]>([]);
  const keyboardState = useRef({ bindings: defaultBindings(), launcher: false });
  const dispatch = useRef((action: string) => {
    dispatched.current.push(action);
  });
  useEditorKeyboard({ keyboardState, dispatch } as unknown as LifecycleContext);
  const edit = async (operation: Edit) => {
    if (operation.type === 'set_auto_ripple') setProject({ ...p, autoRipple: operation.enabled });
    if (operation.type === 'add_track')
      setProject({
        ...p,
        tracks: [
          ...p.tracks,
          {
            id: `track-${p.tracks.length}`,
            name: 'Added track',
            kind: operation.kind,
            locked: false,
            muted: false,
            visible: true,
            clips: [],
          },
        ],
      });
  };
  const source = {
    kind: 'preset' as const,
    presetKind: 'filter' as const,
    name: 'Sepia',
    presetKey: 'sepia',
    requestId: 'comparison',
    plan,
    frame: 0,
    playing: false,
  };
  window.timelineFixture = {
    replaceProject: setProject,
    frame: () => frame,
    project: () => p,
    dispatched: () => dispatched.current,
  };
  const editor = {
    p,
    source,
    addMedia: () => {},
    addTitle: () => {},
    presetTuning: { filterStrength: 1 },
    updatePresetTuning: () => {},
  } as unknown as EditorController;
  return (
    <EditorContext.Provider value={editor}>
      <LibraryDragProvider>
        <main className="app-shell" style={{ display: 'grid', gridTemplateRows: '60% 40%' }}>
          <Preview
            plan={plan}
            frame={0}
            onFrame={() => {}}
            playing={false}
            onPlaying={() => {}}
            fps={initial.fps}
            quality={360}
            onQuality={() => {}}
            source={source}
            onClearSource={() => {}}
            onNeedMedia={() => {}}
          />
          <Timeline
            project={p}
            frame={frame}
            onFrame={setFrame}
            selected={selected}
            onSelected={setSelected}
            selectedTracks={selectedTracks}
            onSelectedTracks={setSelectedTracks}
            tool={tool}
            onToolChange={setTool}
            snap={snap}
            onSnapChange={setSnap}
            controls={controls}
            edit={edit}
            onMagneticChange={() => setProject({ ...p, magneticTimeline: !p.magneticTimeline })}
            addMedia={() => {}}
            addTitle={() => {}}
            split={() => {}}
            remove={() => {}}
            detach={() => {}}
          />
        </main>
      </LibraryDragProvider>
    </EditorContext.Provider>
  );
}
createRoot(document.getElementById('root')!).render(<Fixture />);
