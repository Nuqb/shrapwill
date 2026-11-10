import { Film, Music2, Type, Layers, ArrowRightLeft, Folder, Palette } from 'lucide-react';
export type Recent = {
  name: string;
  path: string;
};
export type Tab = 'Media' | 'Audio' | 'Titles' | 'Transitions' | 'Filters' | 'Effects';
export const tabs: {
  name: Tab;
  icon: typeof Film;
}[] = [
  { name: 'Media', icon: Folder },
  { name: 'Audio', icon: Music2 },
  { name: 'Titles', icon: Type },
  { name: 'Transitions', icon: ArrowRightLeft },
  { name: 'Filters', icon: Palette },
  { name: 'Effects', icon: Layers },
];
export { filterPresets } from '../features/library/presets';
export const defaultLayout = { left: 320, right: 280, bottom: 300 };
export function readLayout() {
  try {
    return { ...defaultLayout, ...JSON.parse(localStorage.getItem('cutline-layout') || '{}') };
  } catch {
    return defaultLayout;
  }
}
