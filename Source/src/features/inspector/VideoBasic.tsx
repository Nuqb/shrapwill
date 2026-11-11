import {
  InspectorSection,
  PropertyNumber,
  PropertySlider,
  type PropertyForm,
} from './InspectorFields';
import { useState } from 'react';
import {
  FlipHorizontal2,
  FlipVertical2,
  RotateCw,
  RotateCcw,
  LockKeyhole,
  LockKeyholeOpen,
} from 'lucide-react';
import { InspectorSlider } from './InspectorSlider';
import { VideoSection, videoDefaults } from './VideoSection';
export function VideoBasic({ form }: { form: PropertyForm }) {
  const [linked, setLinked] = useState(true);
  const video = { ...videoDefaults, ...form.value.video };
  const height = (n: number) =>
    linked
      ? { ...form.value, scale: n / 100 / video.heightScale }
      : { ...form.value, video: { ...video, heightScale: n / 100 / form.value.scale } };
  return (
    <>
      <div className="inspector-subtabs">
        <span className="selected">Basic</span>
      </div>
      <VideoSection
        form={form}
        setting="transformEnabled"
        title="Transform"
        onReset={() =>
          form.onCommit({
            ...form.value,
            video: { ...video, heightScale: 1, flipHorizontal: false, flipVertical: false },
            x: 0,
            y: 0,
            scale: 1,
            rotation: 0,
          })
        }
      >
        <PropertySlider
          form={form}
          name="Width"
          property="scale"
          limits={[5, 300, 1]}
          factor={100}
          unit=" %"
        />
        <InspectorSlider
          label="Height"
          value={form.value.scale * video.heightScale * 100}
          min={5}
          max={300}
          step={1}
          unit=" %"
          disabled={form.disabled}
          onChange={(n) => form.onChange(height(n))}
          onCommit={(n) => form.onCommit(height(n))}
        />
        <button
          className="inspector-link-scale"
          aria-label="Link width and height"
          aria-pressed={linked}
          disabled={form.disabled}
          onClick={() => setLinked(!linked)}
        >
          {linked ? <LockKeyhole size={12} /> : <LockKeyholeOpen size={12} />} Link width and height
        </button>
        <div className="inspector-pair">
          <span>Position</span>
          <PropertyNumber form={form} label="Position X" property="x" min={-4000} max={4000} />
          <PropertyNumber form={form} label="Position Y" property="y" min={-4000} max={4000} />
        </div>
        <PropertySlider
          form={form}
          name="Rotation"
          property="rotation"
          limits={[-180, 180, 1]}
          unit="°"
        />
        <div className="inspector-flip-row">
          <span>Flip</span>
          <button
            title="Flip horizontal"
            aria-label="Flip horizontal"
            aria-pressed={video.flipHorizontal}
            onClick={() =>
              form.onCommit({
                ...form.value,
                video: { ...video, flipHorizontal: !video.flipHorizontal },
              })
            }
          >
            <FlipHorizontal2 size={15} />
          </button>
          <button
            title="Flip vertical"
            aria-label="Flip vertical"
            aria-pressed={video.flipVertical}
            onClick={() =>
              form.onCommit({
                ...form.value,
                video: { ...video, flipVertical: !video.flipVertical },
              })
            }
          >
            <FlipVertical2 size={15} />
          </button>
          <button
            title="Rotate clockwise"
            aria-label="Rotate clockwise"
            onClick={() =>
              form.onCommit({
                ...form.value,
                rotation: ((((form.value.rotation + 90 + 180) % 360) + 360) % 360) - 180,
              })
            }
          >
            <RotateCw size={15} />
          </button>
          <button
            title="Rotate counterclockwise"
            aria-label="Rotate counterclockwise"
            onClick={() =>
              form.onCommit({
                ...form.value,
                rotation: ((((form.value.rotation - 90 + 180) % 360) + 360) % 360) - 180,
              })
            }
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </VideoSection>
      <VideoSection title="Compositing" setting="compositingEnabled" form={form}>
        <PropertySlider
          form={form}
          name="Opacity"
          property="opacity"
          limits={[0, 100, 1]}
          factor={100}
          unit=" %"
        />
      </VideoSection>
      <InspectorSection title="Crop" open={false}>
        <div className="inspector-pair">
          <span>Horizontal</span>
          <PropertyNumber
            form={form}
            label="Left"
            property="cropLeft"
            min={0}
            max={0.45}
            step={0.01}
          />
          <PropertyNumber
            form={form}
            label="Right"
            property="cropRight"
            min={0}
            max={0.45}
            step={0.01}
          />
        </div>
        <div className="inspector-pair">
          <span>Vertical</span>
          <PropertyNumber
            form={form}
            label="Top"
            property="cropTop"
            min={0}
            max={0.45}
            step={0.01}
          />
          <PropertyNumber
            form={form}
            label="Bottom"
            property="cropBottom"
            min={0}
            max={0.45}
            step={0.01}
          />
        </div>
      </InspectorSection>
    </>
  );
}
