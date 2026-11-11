import { useState } from 'react';
import type { ColorGrade, Properties } from '../../types';
import { defaultGrade } from '../preview/grading';
import { neutralColor } from '../library/presets';
import { InspectorTabs } from './InspectorTabs';
import { InspectorSlider } from './InspectorSlider';
import { ColorSection } from './ColorSection';
import { ColorBasic } from './ColorBasic';
import { ColorCurve } from './ColorCurve';
import { ColorWheel } from './ColorWheel';
const hues = [
  '#ed4b55',
  '#e79440',
  '#e4dc45',
  '#80cd42',
  '#29bec7',
  '#6275ed',
  '#9760dc',
  '#d54bc7',
];
const names = ['Red', 'Orange', 'Yellow', 'Green', 'Aqua', 'Blue', 'Purple', 'Magenta'];
type Props = {
  value: Properties;
  disabled: boolean;
  onChange: (p: Properties) => void;
  onCommit: (p: Properties) => void;
};
export function ColorGradingControls({ value, disabled, onChange, onCommit }: Props) {
  const [tab, setTab] = useState('Basic'),
    [channel, setChannel] = useState(0),
    [curveChannel, setCurveChannel] = useState(0);
  const g = { ...defaultGrade(), ...value.grade };
  const form = { value, disabled, onChange, onCommit };
  const inactive = (name: string) => disabled || g.enabled?.[name] === false;
  const update = (next: ColorGrade, commit = true) =>
    (commit ? onCommit : onChange)({ ...value, grade: next });
  const row = (key: 'hsl' | 'curves' | 'wheels', index: number, next: number[], commit = true) =>
    update({ ...g, [key]: g[key].map((p, i) => (i === index ? next : p)) }, commit);
  return (
    <div className="color-inspector inspector-surface">
      <InspectorTabs
        label="Color areas"
        items={['Basic', 'HSL', 'Curves', 'Color Wheels', 'HDR']}
        value={tab}
        onChange={setTab}
      />
      {tab === 'Basic' && <ColorBasic form={{ value, disabled, onChange, onCommit }} />}
      {tab === 'HSL' && (
        <ColorSection
          form={form}
          title="HSL"
          open
          onReset={() => update({ ...g, hsl: defaultGrade().hsl })}
        >
          <div className="hsl-swatches" role="radiogroup" aria-label="Color range">
            {names.map((name, i) => (
              <button
                key={name}
                role="radio"
                aria-checked={channel === i}
                aria-label={name}
                className={channel === i ? 'selected' : ''}
                style={{ '--swatch': hues[i] } as React.CSSProperties}
                onClick={() => setChannel(i)}
              />
            ))}
          </div>
          {['Hue', 'Saturation', 'Luminance'].map((name, index) => (
            <div
              key={name}
              className={'hsl-control hsl-control-' + index}
              style={{ '--swatch': hues[channel] } as React.CSSProperties}
            >
              <InspectorSlider
                label={name}
                value={g.hsl[channel][index]}
                min={-1}
                max={1}
                step={0.01}
                disabled={disabled}
                onChange={(n) =>
                  row(
                    'hsl',
                    channel,
                    g.hsl[channel].map((v, i) => (i === index ? n : v)),
                    false,
                  )
                }
                onCommit={(n) =>
                  row(
                    'hsl',
                    channel,
                    g.hsl[channel].map((v, i) => (i === index ? n : v)),
                  )
                }
              />
            </div>
          ))}
        </ColorSection>
      )}
      {tab === 'Curves' && (
        <>
          <ColorSection
            form={form}
            title="Curves"
            open
            onReset={() => update({ ...g, curves: defaultGrade().curves })}
          >
            <div className="curve-channels" role="radiogroup" aria-label="Curve channel">
              {['Master', 'Red', 'Green', 'Blue'].map((name, i) => (
                <button
                  key={name}
                  role="radio"
                  aria-label={name}
                  aria-checked={curveChannel === i}
                  className={curveChannel === i ? 'selected' : ''}
                  style={
                    {
                      '--swatch': ['#e8edf0', '#ef6069', '#4fcc89', '#5295f1'][i],
                    } as React.CSSProperties
                  }
                  onClick={() => setCurveChannel(i)}
                >
                  {i === 0 ? 'Y' : name[0]}
                </button>
              ))}
            </div>
            <ColorCurve
              label={['Master', 'Red', 'Green', 'Blue'][curveChannel] + ' curve'}
              values={g.curves[curveChannel]}
              color={['#edf2f5', '#ef6069', '#4fcc89', '#5295f1'][curveChannel]}
              disabled={inactive('Curves')}
              onChange={(v) => row('curves', curveChannel, v, false)}
              onCommit={(v) => row('curves', curveChannel, v)}
            />
          </ColorSection>
          <ColorSection
            form={form}
            title="Hue/Saturation Curves"
            open
            onReset={() => update({ ...g, secondaryCurves: defaultGrade().secondaryCurves })}
          >
            {[
              'Hue vs Sat',
              'Hue vs Hue',
              'Hue vs Luma',
              'Luma vs Sat',
              'Sat vs Sat',
              'Sat vs Luma',
            ].map((name, index) => {
              const setCurve = (points: number[], commit = true) =>
                update(
                  {
                    ...g,
                    secondaryCurves: g.secondaryCurves!.map((curve, i) =>
                      i === index ? points : curve,
                    ),
                  },
                  commit,
                );
              return (
                <section className="secondary-curve-editor" key={name}>
                  <div className="curve-editor-heading">
                    <h5 className="curve-subtitle">{name}</h5>
                    <button
                      className="curve-reset"
                      aria-label={'Reset ' + name}
                      disabled={disabled}
                      onClick={() => setCurve(Array(5).fill(0.5))}
                    >
                      ↺
                    </button>
                  </div>
                  <ColorCurve
                    label={name + ' curve'}
                    spectrum={index < 3}
                    values={g.secondaryCurves![index]}
                    color="#edf2f5"
                    disabled={inactive('Hue/Saturation Curves')}
                    onChange={(v) => setCurve(v, false)}
                    onCommit={(v) => setCurve(v)}
                  />
                </section>
              );
            })}
          </ColorSection>
        </>
      )}
      {tab === 'Color Wheels' && (
        <ColorSection
          form={form}
          title="Color Wheels"
          open
          onReset={() => update({ ...g, wheels: defaultGrade().wheels })}
        >
          <div className="color-wheels-grid">
            {['Shadows', 'Midtones', 'Highlights'].map((name, i) => (
              <ColorWheel
                key={name}
                label={name}
                value={g.wheels[i]}
                disabled={inactive('Color Wheels')}
                onChange={(rgb) => row('wheels', i, rgb, false)}
                onCommit={(rgb) => row('wheels', i, rgb)}
              />
            ))}
          </div>
        </ColorSection>
      )}
      {tab === 'HDR' && (
        <ColorSection
          form={form}
          title="HDR Color Wheel"
          open
          onReset={() => update({ ...g, hdrWheels: defaultGrade().hdrWheels })}
        >
          <div className="color-wheels-grid hdr-wheels-grid">
            {['Black', 'Dark', 'Shadow', 'Light', 'Highlight', 'Specular', 'Global'].map(
              (name, i) => {
                const setWheel = (rgb: number[], commit = true) =>
                  update(
                    { ...g, hdrWheels: g.hdrWheels!.map((v, j) => (i === j ? rgb : v)) },
                    commit,
                  );
                return (
                  <ColorWheel
                    key={name}
                    label={name}
                    coordinates
                    value={g.hdrWheels![i]}
                    disabled={inactive('HDR Color Wheel')}
                    onChange={(rgb) => setWheel(rgb, false)}
                    onCommit={(rgb) => setWheel(rgb)}
                  />
                );
              },
            )}
          </div>
          <p className="field-note">
            Tone wheels adjust the SDR image. Preview and export use SDR color; HDR delivery is
            unavailable.
          </p>
        </ColorSection>
      )}
      <div className="inspector-footer">
        <button
          className="inspector-action"
          disabled={disabled}
          onClick={() => update(defaultGrade())}
        >
          Reset grading
        </button>
        <button
          className="inspector-action"
          disabled={disabled}
          onClick={() =>
            onCommit({ ...value, ...neutralColor, grade: defaultGrade(), vignette: 0 })
          }
        >
          Reset color
        </button>
      </div>
    </div>
  );
}
