import { useCallback, useState } from 'react';
import { emptySnapshot, type Snapshot } from '../../types';
import { Recent } from '../config';
export function useSnapshotState() {
  const [snap, setSnap] = useState<Snapshot>(emptySnapshot);
  const [ready, setReady] = useState(false);
  const [launcher, setLauncher] = useState(true);
  const [recents, setRecents] = useState<Recent[]>([]);
  const [recovery, setRecovery] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [selectedTracks, setSelectedTracks] = useState<string[]>([]);
  const selectClips = useCallback((ids: string[]) => {
    setSelectedTracks([]);
    setSelected(ids);
  }, []);
  const selectTracks = useCallback((ids: string[]) => {
    setSelected([]);
    setSelectedTracks(ids);
  }, []);
  return {
    snap,
    setSnap,
    ready,
    setReady,
    launcher,
    setLauncher,
    recents,
    setRecents,
    recovery,
    setRecovery,
    selected,
    setSelected,
    selectedTracks,
    setSelectedTracks,
    selectClips,
    selectTracks,
  };
}
