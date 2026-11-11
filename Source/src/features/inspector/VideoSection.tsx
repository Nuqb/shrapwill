import type { ReactNode } from 'react';
import type { VideoSettings } from '../../types';
import { InspectorSection, type PropertyForm } from './InspectorFields';
export const videoDefaults: VideoSettings = {
  transformEnabled: true,
  compositingEnabled: true,
  flipHorizontal: false,
  flipVertical: false,
  heightScale: 1,
};
export function VideoSection({
  title,
  setting,
  form,
  children,
  onReset,
}: {
  title: string;
  setting: 'transformEnabled' | 'compositingEnabled';
  form: PropertyForm;
  children: ReactNode;
  onReset?: () => void;
}) {
  const video = { ...videoDefaults, ...form.value.video };
  return (
    <InspectorSection
      title={title}
      disabled={form.disabled}
      onReset={onReset}
      toggle={
        <button
          className="inspector-section-switch"
          role="switch"
          aria-label={'Enable ' + title}
          aria-checked={video[setting]}
          disabled={form.disabled}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.onCommit({ ...form.value, video: { ...video, [setting]: !video[setting] } });
          }}
        >
          <span />
        </button>
      }
    >
      <fieldset className="inspector-section-fields" disabled={form.disabled || !video[setting]}>
        {children}
      </fieldset>
    </InspectorSection>
  );
}
