import { useState } from 'react';
import { Tab } from '../config';
import type { PreviewSource } from '../../types';
import { defaultPresetTuning } from '../actions/presetTuning';
export function useLibraryState() {
  const [tab, setTab] = useState<Tab>('Media');
  const [search, setSearch] = useState('');
  const [titlePreset, setTitlePreset] = useState('plain');
  const [source, setSource] = useState<PreviewSource | null>(null);
  const [presetTuning, setPresetTuning] = useState(defaultPresetTuning);
  return {
    tab,
    setTab,
    search,
    setSearch,
    titlePreset,
    setTitlePreset,
    source,
    setSource,
    presetTuning,
    setPresetTuning,
  };
}
