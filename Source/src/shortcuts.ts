export const commands = {
  new_project: { name: 'New project', category: 'File', defaults: ['Ctrl+N'], scope: 'app' },
  open_project: { name: 'Open project', category: 'File', defaults: ['Ctrl+O'], scope: 'app' },
  save: { name: 'Save project', category: 'File', defaults: ['Ctrl+S'], scope: 'editor' },
  save_as: {
    name: 'Save project as',
    category: 'File',
    defaults: ['Ctrl+Shift+S'],
    scope: 'editor',
  },
  import_media: { name: 'Import media', category: 'File', defaults: ['Ctrl+I'], scope: 'app' },
  export_video: { name: 'Export video', category: 'File', defaults: ['Ctrl+E'], scope: 'editor' },
  settings: {
    name: 'Settings',
    category: 'File',
    defaults: ['Ctrl+,'],
    scope: 'app',
  },
  undo: { name: 'Undo', category: 'Editing', defaults: ['Ctrl+Z'], scope: 'editor' },
  redo: {
    name: 'Redo',
    category: 'Editing',
    defaults: ['Ctrl+Shift+Z', 'Ctrl+Y'],
    scope: 'editor',
  },
  copy: { name: 'Copy clips', category: 'Editing', defaults: ['Ctrl+C'], scope: 'editor' },
  cut: { name: 'Cut clips', category: 'Editing', defaults: ['Ctrl+X'], scope: 'editor' },
  paste: {
    name: 'Paste clips at playhead',
    category: 'Editing',
    defaults: ['Ctrl+V'],
    scope: 'editor',
  },
  duplicate: {
    name: 'Duplicate clips',
    category: 'Editing',
    defaults: ['Ctrl+D'],
    scope: 'editor',
  },
  select_all: { name: 'Select all', category: 'Editing', defaults: ['Ctrl+A'], scope: 'editor' },
  deselect: {
    name: 'Clear selection',
    category: 'Editing',
    defaults: ['Ctrl+Shift+A'],
    scope: 'editor',
  },
  split: { name: 'Split at playhead', category: 'Editing', defaults: ['Ctrl+B'], scope: 'editor' },
  delete: {
    name: 'Delete selection',
    category: 'Editing',
    defaults: ['Delete', 'Backspace'],
    scope: 'editor',
  },
  ripple_delete: {
    name: 'Ripple delete',
    category: 'Editing',
    defaults: ['Shift+Delete'],
    scope: 'editor',
  },
  trim_start: {
    name: 'Trim start to playhead',
    category: 'Editing',
    defaults: ['Alt+['],
    scope: 'editor',
  },
  trim_end: {
    name: 'Trim end to playhead',
    category: 'Editing',
    defaults: ['Alt+]'],
    scope: 'editor',
  },
  detach_audio: {
    name: 'Detach audio',
    category: 'Editing',
    defaults: ['Ctrl+Alt+D'],
    scope: 'editor',
  },
  tool_select: { name: 'Selection tool', category: 'Tools', defaults: ['V'], scope: 'editor' },
  tool_razor: { name: 'Razor tool', category: 'Tools', defaults: ['C'], scope: 'editor' },
  auto_ripple: { name: 'Auto Ripple', category: 'Timeline', defaults: [], scope: 'editor' },
  snapping: { name: 'Enable timeline snap', category: 'Tools', defaults: ['S'], scope: 'editor' },
  magnetic_timeline: {
    name: 'Magnetic timeline (main track magnet)',
    category: 'Timeline',
    defaults: ['Shift+M'],
    scope: 'editor',
  },
  play_pause: { name: 'Play / pause', category: 'Playback', defaults: ['Space'], scope: 'editor' },
  stop: { name: 'Stop playback', category: 'Playback', defaults: ['K'], scope: 'editor' },
  previous_frame: {
    name: 'Previous frame',
    category: 'Playback',
    defaults: ['ArrowLeft'],
    scope: 'editor',
    repeat: true,
  },
  next_frame: {
    name: 'Next frame',
    category: 'Playback',
    defaults: ['ArrowRight'],
    scope: 'editor',
    repeat: true,
  },
  previous_second: {
    name: 'Back one second',
    category: 'Playback',
    defaults: ['Shift+ArrowLeft'],
    scope: 'editor',
    repeat: true,
  },
  next_second: {
    name: 'Forward one second',
    category: 'Playback',
    defaults: ['Shift+ArrowRight'],
    scope: 'editor',
    repeat: true,
  },
  start: { name: 'Go to start', category: 'Playback', defaults: ['Home'], scope: 'editor' },
  end: { name: 'Go to end', category: 'Playback', defaults: ['End'], scope: 'editor' },
  previous_cut: {
    name: 'Previous edit point',
    category: 'Playback',
    defaults: ['ArrowUp'],
    scope: 'editor',
    repeat: true,
  },
  next_cut: {
    name: 'Next edit point',
    category: 'Playback',
    defaults: ['ArrowDown'],
    scope: 'editor',
    repeat: true,
  },
  zoom_in: {
    name: 'Zoom timeline in',
    category: 'Timeline',
    defaults: ['=', 'NumpadAdd'],
    scope: 'editor',
    repeat: true,
  },
  zoom_out: {
    name: 'Zoom timeline out',
    category: 'Timeline',
    defaults: ['-', 'NumpadSubtract'],
    scope: 'editor',
    repeat: true,
  },
  zoom_fit: { name: 'Fit timeline', category: 'Timeline', defaults: ['\\'], scope: 'editor' },
  track_menu: { name: 'Add track menu', category: 'Timeline', defaults: [], scope: 'editor' },
  add_video_track: {
    name: 'Add video track',
    category: 'Timeline',
    defaults: ['Ctrl+Alt+V'],
    scope: 'editor',
  },
  add_audio_track: {
    name: 'Add audio track',
    category: 'Timeline',
    defaults: ['Ctrl+Alt+A'],
    scope: 'editor',
  },
  add_title: { name: 'Add title', category: 'Timeline', defaults: ['Ctrl+T'], scope: 'editor' },
  mute_track: {
    name: 'Mute / unmute selected track',
    category: 'Timeline',
    defaults: ['Ctrl+Shift+M'],
    scope: 'editor',
  },
  lock_track: {
    name: 'Lock / unlock selected track',
    category: 'Timeline',
    defaults: ['Ctrl+Shift+L'],
    scope: 'editor',
  },
  show_media: {
    name: 'Show media library',
    category: 'Workspace',
    defaults: ['Alt+1'],
    scope: 'editor',
  },
  show_audio: {
    name: 'Show audio library',
    category: 'Workspace',
    defaults: ['Alt+2'],
    scope: 'editor',
  },
  show_titles: { name: 'Show titles', category: 'Workspace', defaults: ['Alt+3'], scope: 'editor' },
  show_transitions: {
    name: 'Show transitions',
    category: 'Workspace',
    defaults: ['Alt+4'],
    scope: 'editor',
  },
  show_effects: {
    name: 'Show effects',
    category: 'Workspace',
    defaults: ['Alt+5'],
    scope: 'editor',
  },
  show_filters: {
    name: 'Show filters',
    category: 'Workspace',
    defaults: ['Alt+6'],
    scope: 'editor',
  },
  reset_layout: {
    name: 'Reset workspace layout',
    category: 'Workspace',
    defaults: ['Ctrl+Alt+0'],
    scope: 'app',
  },
} as const;
export type ActionId = keyof typeof commands;
export type Bindings = Record<ActionId, string[]>;
export const actionIds = Object.keys(commands) as ActionId[];
export const storageKey = 'shrapwill-shortcuts-v1';
export function defaultBindings(): Bindings {
  return Object.fromEntries(actionIds.map((id) => [id, [...commands[id].defaults]])) as Bindings;
}
const named: Record<string, string> = {
  Space: 'Space',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  Backspace: 'Backspace',
  Delete: 'Delete',
  Home: 'Home',
  End: 'End',
  PageUp: 'Page Up',
  PageDown: 'Page Down',
  NumpadAdd: 'Numpad +',
  NumpadSubtract: 'Numpad −',
  NumpadMultiply: 'Numpad ×',
  NumpadDivide: 'Numpad ÷',
  NumpadDecimal: 'Numpad .',
  Enter: 'Enter',
  Tab: 'Tab',
};
const punctuation: Record<string, string> = {
  Equal: '=',
  Minus: '-',
  BracketLeft: '[',
  BracketRight: ']',
  Backslash: '\\',
  Semicolon: ';',
  Quote: "'",
  Comma: ',',
  Period: '.',
  Slash: '/',
  Backquote: '`',
};
export function displayBinding(binding: string) {
  return binding
    .split('+')
    .map((key) => named[key] || key)
    .join('+');
}
export function shortcutText(bindings: Bindings, id: ActionId) {
  return bindings[id].map(displayBinding).join(' / ') || 'Unassigned';
}
export function fromKeyboard(
  event: Pick<
    KeyboardEvent,
    | 'code'
    | 'key'
    | 'ctrlKey'
    | 'altKey'
    | 'shiftKey'
    | 'metaKey'
    | 'isComposing'
    | 'getModifierState'
  >,
): string | null {
  if (
    event.isComposing ||
    event.getModifierState?.('AltGraph') ||
    ['Dead', 'Process', 'Unidentified'].includes(event.key)
  )
    return null;
  if (['Control', 'Alt', 'Shift', 'Meta', 'AltGraph'].includes(event.key)) return null;
  let key = /^Key[A-Z]$/.test(event.code)
    ? event.code.slice(3)
    : /^Digit\d$/.test(event.code)
      ? event.code.slice(5)
      : punctuation[event.code] || event.code;
  if (!key)
    key =
      event.key === ' ' ? 'Space' : event.key.length === 1 ? event.key.toUpperCase() : event.key;
  return [
    event.ctrlKey ? 'Ctrl' : null,
    event.altKey ? 'Alt' : null,
    event.shiftKey ? 'Shift' : null,
    event.metaKey ? 'Win' : null,
    key,
  ]
    .filter(Boolean)
    .join('+');
}
export function bindingProblem(binding: string): string | null {
  const bits = binding.split('+'),
    key = bits.at(-1) || '';
  const modifiers = bits.slice(0, -1);
  if (
    modifiers.some((m) => !['Ctrl', 'Alt', 'Shift', 'Win'].includes(m)) ||
    new Set(modifiers).size !== modifiers.length
  )
    return 'Invalid modifier combination.';
  if (modifiers.includes('Win'))
    return 'Windows-key shortcuts belong to Windows. Use Ctrl, Alt, or Shift instead.';
  if (['Escape', 'Tab', 'Enter'].includes(binding))
    return `${binding} is kept for cancelling, moving focus, or activating buttons.`;
  if (
    ['Alt+F4', 'Alt+Tab', 'Ctrl+Alt+Delete', 'Ctrl+Escape', 'Ctrl+Shift+Escape'].includes(binding)
  )
    return 'This combination is reserved by Windows.';
  if (
    !/^[A-Z0-9]$/.test(key) &&
    !Object.values(punctuation).includes(key) &&
    !Object.keys(named).includes(key) &&
    !/^F([1-9]|1\d|2[0-4])$/.test(key) &&
    !/^Numpad\d$/.test(key)
  )
    return 'Choose a letter, number, function key, punctuation key, or navigation key.';
  return null;
}
export function conflicts(bindings: Bindings, id: ActionId, values: string[]): ActionId[] {
  return actionIds.filter(
    (other) => other !== id && bindings[other].some((binding) => values.includes(binding)),
  );
}
export function assignBindings(
  bindings: Bindings,
  id: ActionId,
  values: string[],
  replaceConflicts = false,
): Bindings {
  const clean = [...new Set(values)];
  for (const value of clean) {
    const problem = bindingProblem(value);
    if (problem) throw Error(problem);
  }
  const duplicates = conflicts(bindings, id, clean);
  if (duplicates.length && !replaceConflicts) throw Error('This shortcut is already assigned.');
  const next = { ...bindings, [id]: clean };
  for (const other of duplicates) next[other] = next[other].filter((v) => !clean.includes(v));
  return next;
}
export function readBindings(storage: Pick<Storage, 'getItem'> = localStorage): Bindings {
  try {
    const saved = JSON.parse(storage.getItem(storageKey) || 'null');
    if (!saved || saved.version !== 1) return defaultBindings();
    const result = defaultBindings(),
      used = new Set<string>();
    for (const id of actionIds) {
      const value = saved.bindings[id];
      if (value === undefined) continue;
      if (
        !Array.isArray(value) ||
        value.length > 8 ||
        value.some((v) => typeof v !== 'string' || bindingProblem(v))
      )
        throw Error('Invalid shortcut data');
      result[id] = [...new Set(value)];
      for (const key of result[id]) {
        if (used.has(key)) throw Error('Duplicate shortcut');
        used.add(key);
      }
    }
    for (const id of actionIds) {
      if (saved.bindings[id] !== undefined) continue;
      result[id] = result[id].filter((value) => !used.has(value));
      for (const value of result[id]) used.add(value);
    }
    return result;
  } catch {
    return defaultBindings();
  }
}
export function saveBindings(bindings: Bindings, storage: Pick<Storage, 'setItem'> = localStorage) {
  storage.setItem(storageKey, JSON.stringify({ version: 1, bindings }));
}
export function commandFor(bindings: Bindings, event: KeyboardEvent): ActionId | undefined {
  const binding = fromKeyboard(event);
  if (!binding || bindingProblem(binding)) return;
  return actionIds.find((id) => bindings[id].includes(binding));
}
export function isTextEntry(target: EventTarget | null) {
  return (
    typeof Element !== 'undefined' &&
    target instanceof Element &&
    !!target.closest(
      'input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"]',
    )
  );
}
