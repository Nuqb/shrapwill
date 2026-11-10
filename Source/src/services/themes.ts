export const themes = [
  { id: 'orange', name: 'Orange', accent: '#ff9b45' },
  { id: 'amber', name: 'Amber', accent: '#f6c453' },
  { id: 'coral', name: 'Coral', accent: '#ff8b82' },
  { id: 'rose', name: 'Rose', accent: '#f58fbc' },
  { id: 'violet', name: 'Violet', accent: '#b59aff' },
  { id: 'indigo', name: 'Indigo', accent: '#96a6ff' },
  { id: 'blue', name: 'Blue', accent: '#71b8ff' },
  { id: 'cyan', name: 'Cyan', accent: '#56d7ed' },
  { id: 'mint', name: 'Mint', accent: '#39dfc0' },
  { id: 'lime', name: 'Lime', accent: '#b4d96b' },
] as const;

export type ThemeId = (typeof themes)[number]['id'];
export const themeStorageKey = 'shrapwill-theme-v1';

export function readTheme(): ThemeId {
  try {
    const stored = localStorage.getItem(themeStorageKey);
    return themes.find((theme) => theme.id === stored)?.id ?? 'orange';
  } catch {
    return 'orange';
  }
}

export function applyTheme(id: ThemeId) {
  const theme = themes.find((theme) => theme.id === id) ?? themes[0];
  document.documentElement.style.setProperty('--accent', theme.accent);
  document.documentElement.dataset.theme = theme.id;
}

export function saveTheme(id: ThemeId) {
  localStorage.setItem(themeStorageKey, id);
  applyTheme(id);
}
