import { useEffect, useRef } from 'react';
import type { Clip } from '../../types';
import { animationAt } from '../preview/animation';
import landscape from '../library/art/assets/coastal-sunset.jpg';
import { KeyframeArt } from './KeyframeArt';

type Props = { clip: Clip; id: string; name: string; area: string; active: boolean };

function animationSample(node: SVGGElement, clip: Clip, id: string, area: string) {
  const keyframe = area === 'Keyframe Presets';
  const key = keyframe ? 'keyframe' : area === 'In' ? 'inPreset' : 'outPreset';
  const sample = {
    ...clip,
    start: 0,
    duration: 120,
    props: {
      ...clip.props,
      animation: {
        keyframe: '',
        inPreset: '',
        outPreset: '',
        frames: 60,
        [key]: id,
      },
    },
  };
  return (progress: number) => {
    const frame = keyframe ? progress * 120 : (area === 'Out' ? 60 : 0) + progress * 60;
    const m = animationAt(sample, frame);
    node.setAttribute(
      'transform',
      `translate(${50 + m.x * 100} ${32 + m.y * 64}) rotate(${m.rotation}) scale(${m.scaleX} ${m.scaleY})`,
    );
    node.setAttribute('opacity', String(m.opacity));
  };
}

export function AnimationArt({ clip, id, name, area, active }: Props) {
  const picture = useRef<SVGGElement>(null);
  const keyframe = area === 'Keyframe Presets';
  useEffect(() => {
    const node = picture.current;
    if (!node || !id) return;
    const draw = animationSample(node, clip, id, area);
    draw(0.5);
    if (keyframe && !active) {
      node.setAttribute('transform', 'translate(50 32)');
      node.setAttribute('opacity', '1');
    }
    if (!active || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let request = 0;
    const start = performance.now();
    const animate = (now: number) => {
      // Hold the final pose briefly before repeating, only while the card is active.
      draw(Math.min(1, ((now - start) % 1800) / 1400));
      request = requestAnimationFrame(animate);
    };
    request = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(request);
  }, [clip, id, area, keyframe, active]);
  return (
    <svg
      viewBox="0 0 100 64"
      aria-hidden="true"
      className={'animation-preset-art' + (keyframe ? ' keyframe-preset-art' : '')}
    >
      {!id ? (
        <g fill="none" stroke="#9ba5ac" strokeWidth="1.2">
          <circle cx="50" cy="32" r="17" />
          <path d="m38 20 24 24" />
        </g>
      ) : (
        <>
          <g ref={picture} className={keyframe ? 'keyframe-moving-picture' : undefined}>
            {keyframe ? (
              <rect x="-17" y="-11" width="34" height="22" fill="#77838d" stroke="#e1e5e8" />
            ) : (
              <image
                href={landscape}
                x="-50"
                y="-32"
                width="100"
                height="64"
                preserveAspectRatio="xMidYMid slice"
              />
            )}
          </g>
          {keyframe && <KeyframeArt name={name} />}
        </>
      )}
    </svg>
  );
}
