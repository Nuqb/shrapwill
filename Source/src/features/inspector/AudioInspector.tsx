import { useRef, useState } from 'react';
import { Music2 } from 'lucide-react';
import type { AudioSettings, Clip, Project, Properties } from '../../types';
import { defaults, fpsOf } from '../../types';
import { AudioWaveform } from './AudioWaveform';
import { audioDefaults, voiceCharacters, voiceFilters } from '../audio/settings';
import { AudioBasic } from './AudioBasic';
import { AudioDenoise } from './AudioDenoise';
import { AudioVoices } from './AudioVoices';
const tabs = ['Basic', 'Denoise', 'Voice Filters', 'Voice Characters'] as const;
type Props = {
  project: Project;
  clip: Clip;
  value: Properties;
  disabled: boolean;
  onChange: (value: Properties) => void;
  onCommit: (value: Properties) => void;
};
export function AudioInspector({ project, clip, value, disabled, onChange, onCommit }: Props) {
  const [tab, setTab] = useState<(typeof tabs)[number]>('Basic');
  const panel = useRef<HTMLDivElement>(null);
  const audio = value.audio ?? audioDefaults;
  const asset = project.assets.find((a) => a.id === clip.mediaId && a.hasAudio);
  const unavailable = disabled || !asset;
  const onAudioChange = (patch: Partial<AudioSettings>, commit = true) => {
    (commit ? onCommit : onChange)({ ...value, audio: { ...audio, ...patch } });
  };
  const fields = {
    clip,
    value,
    audio,
    disabled: unavailable,
    fps: fpsOf(project.fps),
    onAudioChange,
    onChange,
    onCommit,
  };
  return (
    <div className="audio-inspector" ref={panel}>
      <div className="audio-subtabs" role="tablist" aria-label="Audio areas">
        {tabs.map((name) => (
          <button
            key={name}
            id={'audio-tab-' + name.replaceAll(' ', '-')}
            type="button"
            role="tab"
            aria-selected={tab === name}
            aria-controls="audio-tab-panel"
            tabIndex={tab === name ? 0 : -1}
            onClick={() => {
              setTab(name);
              panel.current?.closest('.inspector-scroll')?.scrollTo(0, 0);
            }}
            onKeyDown={(event) => {
              const offset = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
              if (!offset && !['Home', 'End'].includes(event.key)) return;
              event.preventDefault();
              const next =
                event.key === 'Home'
                  ? 0
                  : event.key === 'End'
                    ? tabs.length - 1
                    : (tabs.indexOf(tab) + offset + tabs.length) % tabs.length;
              setTab(tabs[next]);
              panel.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
              panel.current?.closest('.inspector-scroll')?.scrollTo(0, 0);
            }}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="audio-waveform">
        <span>
          <Music2 size={12} /> {clip.name}
        </span>
        {asset && <AudioWaveform asset={asset} clip={clip} fps={fpsOf(project.fps)} />}
      </div>
      {disabled && <p className="audio-help audio-notice">Track locked</p>}
      {!asset && <p className="audio-help audio-notice">This clip has no audio.</p>}
      <div
        id="audio-tab-panel"
        role="tabpanel"
        aria-labelledby={'audio-tab-' + tab.replaceAll(' ', '-')}
      >
        {tab === 'Basic' && <AudioBasic {...fields} />}
        {tab === 'Denoise' && <AudioDenoise {...fields} />}
        {tab === 'Voice Filters' && (
          <AudioVoices
            label="Voice filter"
            value={audio.voiceFilter}
            options={voiceFilters}
            disabled={unavailable}
            onChange={(voiceFilter) => onAudioChange({ voiceFilter })}
          />
        )}
        {tab === 'Voice Characters' && (
          <AudioVoices
            label="Voice character"
            value={audio.voiceCharacter}
            options={voiceCharacters}
            disabled={unavailable}
            onChange={(voiceCharacter) => onAudioChange({ voiceCharacter })}
          />
        )}
      </div>
      <button
        className="audio-reset"
        disabled={unavailable}
        onClick={() =>
          onCommit({
            ...value,
            audio: { ...audioDefaults, equalizer: [...audioDefaults.equalizer] },
            gainDb: defaults.gainDb,
            fadeIn: 0,
            fadeOut: 0,
          })
        }
      >
        Reset audio
      </button>
    </div>
  );
}
