import { defaultGrade } from '../preview/grading';
import { PropertySlider, type PropertyForm } from './InspectorFields';
import { InspectorSlider } from './InspectorSlider';
import { ColorSection } from './ColorSection';
import { ColorExtras } from './ColorExtras';
export function ColorBasic({ form }: { form: PropertyForm }) {
  const g = form.value.grade ?? defaultGrade();
  const field = (
    name: string,
    key: 'exposure' | 'vibrance' | 'highlights' | 'shadows' | 'whites' | 'blacks',
  ) => (
    <InspectorSlider
      key={key}
      label={name}
      value={g[key] * (key === 'exposure' ? 25 : 100)}
      min={-100}
      max={100}
      step={1}
      disabled={form.disabled}
      onChange={(n) =>
        form.onChange({
          ...form.value,
          grade: { ...g, [key]: n / (key === 'exposure' ? 25 : 100) },
        })
      }
      onCommit={(n) =>
        form.onCommit({
          ...form.value,
          grade: { ...g, [key]: n / (key === 'exposure' ? 25 : 100) },
        })
      }
      onReset={() => form.onCommit({ ...form.value, grade: { ...g, [key]: 0 } })}
    />
  );
  return (
    <>
      <ColorExtras
        value={form.value}
        disabled={form.disabled}
        onChange={form.onChange}
        onCommit={form.onCommit}
      />
      <ColorSection form={form} title="Color" open={false}>
        <PropertySlider
          form={form}
          name="Temperature"
          property="warmth"
          limits={[-100, 100, 1]}
          factor={100}
        />
        <PropertySlider
          form={form}
          name="Tint"
          property="tint"
          limits={[-100, 100, 1]}
          factor={100}
        />
        <PropertySlider
          form={form}
          name="Saturation"
          property="saturation"
          limits={[-100, 100, 1]}
          factor={100}
          offset={1}
        />
        {field('Vibrance', 'vibrance')}
      </ColorSection>
      <ColorSection form={form} title="Light" open={false}>
        {field('Exposure', 'exposure')}
        <PropertySlider
          form={form}
          name="Brightness"
          property="brightness"
          limits={[-100, 100, 1]}
          factor={100}
        />
        <PropertySlider
          form={form}
          name="Contrast"
          property="contrast"
          limits={[-100, 100, 1]}
          factor={100}
          offset={1}
        />
        {(['highlights', 'shadows', 'whites', 'blacks'] as const).map((key) =>
          field(key[0].toUpperCase() + key.slice(1), key),
        )}
      </ColorSection>
      <ColorSection form={form} title="Adjust" open={false}>
        <InspectorSlider
          label="Sharpen"
          value={(g.sharpen ?? 0) * 100}
          min={0}
          max={100}
          step={1}
          disabled={form.disabled}
          onChange={(n) => form.onChange({ ...form.value, grade: { ...g, sharpen: n / 100 } })}
          onCommit={(n) => form.onCommit({ ...form.value, grade: { ...g, sharpen: n / 100 } })}
        />
        <PropertySlider
          form={form}
          name="Filter strength"
          property="filterStrength"
          limits={[0, 1, 0.01]}
        />
        <PropertySlider form={form} name="Sepia" property="sepia" limits={[0, 1, 0.01]} />
        <PropertySlider form={form} name="Invert" property="invert" limits={[0, 1, 0.01]} />
        <label className="inspector-labeled-field">
          <span>Posterize levels</span>
          <select
            aria-label="Posterize levels"
            disabled={form.disabled}
            value={form.value.posterize}
            onChange={(e) => form.onCommit({ ...form.value, posterize: +e.target.value })}
          >
            <option value={0}>Off</option>
            {[2, 3, 4, 5, 6, 8, 12, 16].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
      </ColorSection>
      <ColorSection form={form} title="Vignette" open={false}>
        <PropertySlider
          form={form}
          name="Amount"
          property="vignette"
          limits={[0, 100, 1]}
          factor={100}
        />
        {['Size', 'Roundness', 'Feather', 'Exposure', 'Highlight'].map((name, i) => {
          const values = g.vignetteSettings ?? [1, 0, 0.5, 0, 0.5];
          const next = (n: number) => ({
            ...form.value,
            grade: { ...g, vignetteSettings: values.map((v, j) => (j === i ? n : v)) },
          });
          return (
            <InspectorSlider
              key={name}
              label={name}
              value={values[i] * 100}
              min={i === 3 ? -100 : 0}
              max={100}
              step={1}
              disabled={form.disabled}
              onChange={(n) => form.onChange(next(n / 100))}
              onCommit={(n) => form.onCommit(next(n / 100))}
            />
          );
        })}
      </ColorSection>
    </>
  );
}
