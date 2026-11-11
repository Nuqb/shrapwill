import { characterIconPaths, filterIconPaths } from './voiceIconPaths';
export function VoicePresetIcon({ id, family }: { id: string; family: 'filter' | 'character' }) {
  const path = (family === 'filter' ? filterIconPaths : characterIconPaths)[id];
  return (
    <svg
      viewBox="0 0 64 64"
      className="voice-preset-icon"
      aria-hidden="true"
      data-voice-icon={family + ':' + id}
    >
      <circle cx="32" cy="32" r="28" fill="currentColor" opacity="0.05" />
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
