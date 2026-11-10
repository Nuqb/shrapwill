import { useState } from 'react';
import { readTheme, saveTheme, type ThemeId } from '../../services/themes';

export function useThemePreference() {
  const [theme, setTheme] = useState(readTheme);
  const [error, setError] = useState('');
  function selectTheme(id: ThemeId) {
    try {
      saveTheme(id);
      setTheme(id);
      setError('');
    } catch {
      setError('Your theme could not be saved. Please try again.');
    }
  }
  return { theme, selectTheme, error };
}
