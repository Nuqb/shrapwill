import type { ReactNode } from 'react';
import { InspectorSection, type PropertyForm } from './InspectorFields';
import { defaultGrade } from '../preview/grading';
export function ColorSection({
  title,
  form,
  children,
  open = false,
  onReset,
}: {
  title: string;
  form: PropertyForm;
  children: ReactNode;
  open?: boolean;
  onReset?: () => void;
}) {
  const grade = form.value.grade ?? defaultGrade();
  const enabled = grade.enabled?.[title] !== false;
  return (
    <InspectorSection
      title={title}
      open={open}
      disabled={form.disabled}
      onReset={onReset}
      toggle={
        <button
          type="button"
          className="inspector-section-switch"
          role="switch"
          aria-label={'Enable ' + title}
          aria-checked={enabled}
          disabled={form.disabled}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            form.onCommit({
              ...form.value,
              grade: { ...grade, enabled: { ...grade.enabled, [title]: !enabled } },
            });
          }}
        >
          <span />
        </button>
      }
    >
      <fieldset disabled={form.disabled || !enabled} className="inspector-section-fields">
        {children}
      </fieldset>
    </InspectorSection>
  );
}
