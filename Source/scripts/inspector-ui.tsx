import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import Inspector from '../src/Inspector';
import { defaults, emptySnapshot, type Clip, type Edit } from '../src/types';
import { audioDefaults } from '../src/features/audio/settings';
import { defaultGrade } from '../src/features/preview/grading';
import { applyTheme } from '../src/services/themes';
import '../src/style.css';
const clip: Clip = {
  id: 'ui-clip',
  mediaId: 'ui-media',
  name: 'Studio interview',
  start: 0,
  duration: 300,
  sourceIn: 0,
  link: null,
  audioEnabled: true,
  title: null,
  transition: null,
  props: { ...defaults, grade: defaultGrade(), audio: audioDefaults },
};
const project = emptySnapshot().project;
project.assets = [
  {
    id: 'ui-media',
    path: '',
    name: 'Studio interview',
    kind: 'video',
    duration: 10,
    width: 1920,
    height: 1080,
    hasAudio: true,
    previewPath: null,
    thumbnailPath: null,
    waveform: Array.from({ length: 240 }, (_, i) => 0.08 + Math.sin(i * 0.17) ** 2 * 0.3),
    missing: false,
  },
];
function Fixture() {
  const [current, setCurrent] = useState(clip),
    [locked, setLocked] = useState(false);
  const revision = React.useRef(0);
  const preview = React.useRef({ drafts: 0, timeline: 0 });
  window.inspectorFixture = {
    current: () => current,
    revision: () => revision.current,
    lock: setLocked,
    theme: applyTheme,
    preview: () => ({ ...preview.current }),
  };
  const edit = async (operation: Edit) => {
    if (locked) throw Error('Locked');
    if (operation.type === 'properties') {
      revision.current++;
      setCurrent({ ...current, props: operation.props });
    }
  };
  return (
    <main style={{ width: '100%', height: '100%', padding: 8 }}>
      <Inspector
        project={project}
        clip={current}
        locked={locked}
        edit={edit}
        onDraft={(props) => {
          if (props) preview.current.drafts++;
        }}
        onShowTimeline={() => {
          preview.current.timeline++;
        }}
        kind="video"
      />
    </main>
  );
}
createRoot(document.getElementById('root')!).render(<Fixture />);
