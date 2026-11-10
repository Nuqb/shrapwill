import { useState } from 'react';
import { TransitionArt } from './TransitionArt';
import { useEditor } from '../../app/EditorContext';
import { transitionPresets } from './presets';
import { PresetCollection } from './PresetCollection';
import { unavailableOriginal, originalPortNotice } from '../preview/ported/availability';
export function TransitionPresetCard({
  t,
}: {
  t: {
    kind: string;
    name: string;
  };
}) {
  const { applyTransition, previewTransition, presetTuning } = useEditor();
  const [active, setActive] = useState(false);
  const unavailable = unavailableOriginal(t.kind);
  return (
    <button
      className={`preset-card transition-preset ${t.kind}`}
      key={t.kind}
      disabled={unavailable}
      title={unavailable ? originalPortNotice(t.kind) : undefined}
      onPointerEnter={() => setActive(true)}
      onPointerLeave={() => setActive(false)}
      onFocus={() => setActive(true)}
      onBlur={() => setActive(false)}
      onClick={() => void previewTransition(t.kind)}
      onDoubleClick={() => applyTransition(t.kind)}
    >
      <div className="preset-art">
        {unavailable ? (
          <span className="transition-port-pending">Port not finished</span>
        ) : (
          <TransitionArt kind={t.kind} active={active} duration={presetTuning.transitionSeconds} />
        )}
      </div>
      <strong>{t.name}</strong>
    </button>
  );
}
export function TransitionPresets() {
  return (
    <div className="transition-browser">
      <PresetCollection
        items={transitionPresets}
        renderItem={(t) => <TransitionPresetCard key={t.kind} t={t} />}
      />
    </div>
  );
}
