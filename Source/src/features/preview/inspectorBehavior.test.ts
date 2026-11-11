import { describe, expect, it } from 'vitest';
import { defaults, type Clip } from '../../types';
import { animatedPicture, animationAt, animationPresets } from './animation';
import { effectivePictureSettings } from './pictureSettings';
import { gradeColor } from './color';
import { defaultGrade } from './grading';
import { speedBaseline } from '../inspector/useSpeedControls';
const clip: Clip = {
  id: 'clip',
  mediaId: 'original',
  name: 'Fixture',
  start: 30,
  duration: 120,
  sourceIn: 0,
  link: null,
  audioEnabled: false,
  props: defaults,
  title: null,
  transition: null,
};
describe('inspector behavior', () => {
  it('keeps disabled transforms and compositing bypassed during live color drafts', () => {
    const id = animationPresets.find((p) => p.scene === 'keyframe' && p.name === 'Fade in')!.id;
    const c = {
      ...clip,
      props: {
        ...defaults,
        x: 100,
        y: 200,
        rotation: 90,
        opacity: 0.2,
        video: {
          transformEnabled: false,
          compositingEnabled: false,
          heightScale: 2,
          flipHorizontal: true,
          flipVertical: true,
        },
        animation: { keyframe: id, inPreset: '', outPreset: '', frames: 30 },
      },
    };
    const { props } = animatedPicture(c, 90, 640, 360);
    expect([props.x, props.y, props.rotation, props.opacity, props.video!.heightScale]).toEqual([
      0, 0, 0, 0.5, 1,
    ]);
    expect(c.props.x).toBe(100);
  });
  it('evaluates fade and slide presets without changing clip timing', () => {
    const id = animationPresets.find((p) => p.scene === 'keyframe' && p.name === 'Fade in')!.id;
    const c = {
      ...clip,
      props: { ...defaults, animation: { keyframe: id, inPreset: '', outPreset: '', frames: 30 } },
    };
    expect(animationAt(c, 30).opacity).toBe(0);
    expect(animationAt(c, 90).opacity).toBe(0.5);
    expect(animationAt(c, 150).opacity).toBe(1);
    expect(c.start).toBe(30);
    expect(c.duration).toBe(120);
    expect(animationPresets.filter((p) => p.scene === 'keyframe')).toHaveLength(11);
    expect(
      animationPresets.filter((p) => p.scene === 'animation_scene_out').length,
    ).toBeGreaterThan(20);
  });
  it('keeps outgoing motion neutral before its window and independent of incoming motion', () => {
    for (const preset of animationPresets.filter((p) => p.scene === 'animation_scene_out')) {
      const c = {
        ...clip,
        props: {
          ...defaults,
          animation: { keyframe: '', inPreset: '', outPreset: preset.id, frames: 30 },
        },
      };
      expect(animationAt(c, 30)).toEqual({
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        opacity: 1,
      });
    }
  });
  it('bypasses sections while preserving their stored adjustments', () => {
    const g = defaultGrade();
    g.exposure = 1;
    g.hsl[0] = [0.2, 0.3, 0.1];
    g.enabled = {
      Color: false,
      Light: false,
      HSL: false,
      Curves: false,
      'Color Wheels': false,
      'Hue/Saturation Curves': false,
    };
    const props = { ...defaults, warmth: 0.5, brightness: 0.3, grade: g };
    const before = JSON.stringify(props);
    const rgb = [0.2, 0.4, 0.6];
    expect(gradeColor(rgb, props)).toEqual(rgb);
    expect(effectivePictureSettings(props).brightness).toBe(0);
    expect(JSON.stringify(props)).toBe(before);
  });
  it.each([0, 1, 2, 3, 4, 5])('renders secondary curve %i and can bypass it', (index) => {
    const g = defaultGrade();
    g.secondaryCurves![index].fill(0.75);
    const rgb = [0.25, 0.5, 0.75];
    expect(gradeColor(rgb, { ...defaults, grade: g })).not.toEqual(rgb);
    g.enabled = { 'Hue/Saturation Curves': false };
    expect(gradeColor(rgb, { ...defaults, grade: g })).toEqual(rgb);
  });
  it('invalidates a speed baseline after trimming the rendered clip', () => {
    const c = {
      ...clip,
      props: {
        ...defaults,
        speed: {
          mediaId: 'original',
          sourceIn: 0,
          duration: 240,
          renderedDuration: 120,
          rate: 2,
          reverse: false,
          maintainPitch: true,
          points: [],
        },
      },
    };
    expect(speedBaseline(c)?.duration).toBe(240);
    expect(speedBaseline({ ...c, sourceIn: 1 })).toBeUndefined();
    expect(speedBaseline({ ...c, duration: 90 })).toBeUndefined();
  });
});
