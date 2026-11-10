import { useState } from 'react';
export function usePlaybackState() {
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [quality, setQuality] = useState(720);
  return { frame, setFrame, playing, setPlaying, quality, setQuality };
}
