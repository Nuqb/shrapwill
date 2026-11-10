import { useState } from 'react';
import { readBindings, type Bindings } from '../../shortcuts';
export function useShortcutsState() {
  const [bindings, setBindings] = useState<Bindings>(readBindings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tool, setTool] = useState<'select' | 'razor'>('select');
  const [snapping, setSnapping] = useState(true);
  return {
    bindings,
    setBindings,
    settingsOpen,
    setSettingsOpen,
    tool,
    setTool,
    snapping,
    setSnapping,
  };
}
