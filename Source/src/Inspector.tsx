import { useEffect, useRef, useState } from 'react';
import type { Clip, Project, Properties, Edit, Title } from './types';
import { defaults } from './types';
import { TitleControls } from './features/inspector/TitleControls';
import { AnimationControls } from './features/inspector/AnimationControls';
import { VideoEffectControls } from './features/inspector/VideoEffectControls';
import { SpeedControls } from './features/inspector/SpeedControls';
import { ColorGradingControls } from './features/inspector/ColorGradingControls';
import { AudioInspector } from './features/inspector/AudioInspector';
import { VideoBasic } from './features/inspector/VideoBasic';
export default function Inspector({
  project,
  clip,
  locked,
  edit,
  onDraft,
  kind,
  onShowTimeline,
}: {
  project: Project;
  clip: Clip | null;
  locked: boolean;
  kind?: string;
  edit: (op: Edit) => Promise<unknown>;
  onDraft: (p: Properties | null) => void;
  onShowTimeline?: () => void;
}) {
  const [tab, setTab] = useState('Video'),
    [props, setProps] = useState<Properties>(defaults),
    [title, setTitle] = useState<Title | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scroller.current?.scrollTo(0, 0);
  }, [tab, clip?.id]);
  useEffect(() => {
    setProps(clip?.props || defaults);
    setTitle(clip?.title || null);
    onDraft(null);
  }, [clip?.id, clip?.props, clip?.title]);
  useEffect(() => {
    if (kind === 'audio') setTab('Audio');
    else if (clip?.title) setTab('Video');
  }, [clip?.id, kind]);
  const change = (next: Properties) => {
    setProps(next);
    onDraft(next);
  };
  const commit = async (next: Properties) => {
    if (!clip || locked) return;
    if (JSON.stringify(next) === JSON.stringify(clip.props)) {
      onDraft(null);
      return;
    }
    setProps(next);
    await edit({ type: 'properties', id: clip.id, props: next });
    onDraft(null);
  };
  if (!clip) return null;
  const form = {
    value: props,
    disabled: locked,
    onChange: change,
    onCommit: (next: Properties) => {
      void commit(next);
    },
  };
  return (
    <aside className="inspector panel">
      <div className="inspector-tabs">
        {(kind === 'audio'
          ? ['Audio', 'Speed']
          : ['Video', 'Audio', 'Speed', 'Animation', 'Color']
        ).map((name) => (
          <button key={name} className={tab === name ? 'active' : ''} onClick={() => setTab(name)}>
            {name}
          </button>
        ))}
      </div>
      <div className="inspector-scroll inspector-surface" ref={scroller}>
        {locked && tab !== 'Audio' && <p className="inspector-lock-note">Track locked</p>}
        {tab === 'Video' && (
          <>
            <VideoBasic form={form} />
            {title && (
              <TitleControls
                title={title}
                disabled={locked}
                onChange={setTitle}
                onCommit={(next) => {
                  void edit({ type: 'set_title', id: clip.id, title: next });
                }}
              />
            )}
            <VideoEffectControls clip={clip} disabled={locked} edit={edit} onDraft={onDraft} />
          </>
        )}
        {tab === 'Speed' && (
          <SpeedControls
            key={clip.id}
            clip={clip}
            fps={project.fps}
            disabled={locked || !!clip.title || kind === 'image'}
          />
        )}
        {tab === 'Animation' && (
          <AnimationControls
            key={clip.id}
            clip={clip}
            form={{
              ...form,
              onChange: (next) => {
                onShowTimeline?.();
                change(next);
              },
            }}
          />
        )}
        {tab === 'Color' && <ColorGradingControls {...form} />}
        {tab === 'Audio' && <AudioInspector project={project} clip={clip} {...form} />}
      </div>
    </aside>
  );
}
