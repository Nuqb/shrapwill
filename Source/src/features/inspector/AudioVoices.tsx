import type { KeyboardEvent } from 'react';
import { Check } from 'lucide-react';
import { VoicePresetIcon } from './VoicePresetIcon';
export function AudioVoices({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: 'Voice filter' | 'Voice character';
  value: string;
  options: Record<string, string>;
  disabled: boolean;
  onChange: (id: string) => void;
}) {
  return (
    <section className="audio-section audio-voices">
      <h4>{label === 'Voice filter' ? 'Voice Filters' : 'Voice Characters'}</h4>
      <div className="audio-voice-grid" role="radiogroup" aria-label={label}>
        {Object.entries(options).map(([id, name]) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={value === id}
            tabIndex={value === id ? 0 : -1}
            data-voice={id}
            className={value === id ? 'selected' : ''}
            disabled={disabled}
            onClick={() => {
              if (id !== value) onChange(id);
            }}
            onKeyDown={(event) => navigateVoice(event, Object.keys(options), onChange)}
          >
            <span className="audio-voice-art">
              <VoicePresetIcon
                id={id}
                family={label === 'Voice character' ? 'character' : 'filter'}
              />
              {value === id && <Check className="audio-voice-check" size={12} />}
            </span>
            <span>{name}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function navigateVoice(
  event: KeyboardEvent<HTMLButtonElement>,
  choices: string[],
  onChange: (id: string) => void,
) {
  const offset = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
  if (!offset && !['Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  const index = choices.indexOf(event.currentTarget.dataset.voice!);
  const next =
    event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? choices.length - 1
        : (index + (offset ?? 0) + choices.length) % choices.length;
  onChange(choices[next]);
  event.currentTarget
    .closest('[role="radiogroup"]')
    ?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
    [next]?.focus();
}
