import { useEffect, useRef, useState } from 'react';
import type { Clip } from '../../types';
import { retimeClip } from '../../services/desktop/speed';
export const speedBaseline = (clip: Clip) =>
  clip.sourceIn === 0 && clip.duration === clip.props.speed?.renderedDuration
    ? clip.props.speed
    : undefined;
const initial = (clip: Clip) => ({
  rate: speedBaseline(clip)?.rate ?? 1,
  reverse: speedBaseline(clip)?.reverse ?? false,
  maintainPitch: speedBaseline(clip)?.maintainPitch ?? true,
  points: speedBaseline(clip)?.points?.length
    ? speedBaseline(clip)!.points
    : [
        [0, 1],
        [1, 1],
      ],
});
export function useSpeedControls(clip: Clip) {
  const [mode, setMode] = useState(
    speedBaseline(clip)?.points.length ? 'Speed Ramping' : 'Uniform Speed',
  );
  const [state, setState] = useState(() => initial(clip));
  const latest = useRef(state);
  const [ripple, setRipple] = useState(true);
  const [preset, setPreset] = useState(speedBaseline(clip)?.points.length ? 'Customize' : 'None');
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  const dirty = useRef(false);
  const [error, setError] = useState('');
  const options = () => ({
    ...latest.current,
    points: mode === 'Speed Ramping' ? latest.current.points : [],
    reverse: mode === 'Speed Ramping' ? false : latest.current.reverse,
    maintainPitch: mode === 'Speed Ramping' ? true : latest.current.maintainPitch,
    rate: mode === 'Speed Ramping' ? 1 : latest.current.rate,
  });
  const applied = useRef(
    JSON.stringify({ ...initial(clip), points: speedBaseline(clip)?.points ?? [] }),
  );
  useEffect(() => {
    dirty.current = false;
    latest.current = initial(clip);
    setState(latest.current);
    applied.current = JSON.stringify({
      ...latest.current,
      points: speedBaseline(clip)?.points ?? [],
    });
  }, [clip.props.speed]);
  const set = <K extends keyof typeof state>(key: K, value: (typeof state)[K]) => {
    dirty.current = true;
    latest.current = { ...latest.current, [key]: value };
    setState(latest.current);
  };
  const apply = async () => {
    const next = options();
    const key = JSON.stringify(next);
    if (running.current || !dirty.current) return;
    if (key === applied.current) {
      dirty.current = false;
      return;
    }
    dirty.current = false;
    running.current = true;
    setBusy(true);
    setError('');
    try {
      await retimeClip(clip.id, next, ripple);
      applied.current = key;
    } catch (error) {
      setError(String(error));
    } finally {
      running.current = false;
      setBusy(false);
    }
  };
  return {
    ...state,
    mode,
    setMode,
    ripple,
    setRipple,
    preset,
    setPreset,
    busy,
    error,
    apply,
    setRate: (n: number) => set('rate', n),
    setReverse: (v: boolean) => set('reverse', v),
    setMaintainPitch: (v: boolean) => set('maintainPitch', v),
    setPoints: (v: number[][]) => set('points', v),
  };
}
