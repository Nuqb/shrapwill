import { overlayMotion } from '../overlays/motion';
import { type CSSProperties } from 'react';
import { Check } from 'lucide-react';
import ShortcutSettings from '../../ShortcutSettings';
import { type Bindings } from '../../shortcuts';
import { themes } from '../../services/themes';
import { useThemePreference } from './useThemePreference';
import { useDialogFocus } from './useDialogFocus';
import { SettingsCategoryCards } from './SettingsCategoryCards';
import { useSettingsNavigation } from './useSettingsNavigation';
import { SettingsHeader } from './SettingsHeader';
import { UpdateSettings } from '../updates/UpdateSettings';

export default function SettingsDialog({
  bindings,
  onSave,
  onClose,
  initialCategory = 'home',
}: {
  bindings: Bindings;
  onSave: (bindings: Bindings) => void;
  onClose: () => void;
  initialCategory?: 'home' | 'updates';
}) {
  const { category, setCategory } = useSettingsNavigation(onClose, initialCategory);
  if (category === 'shortcuts') {
    return (
      <ShortcutSettings
        bindings={bindings}
        onSave={onSave}
        onClose={onClose}
        onBack={() => setCategory('home')}
      />
    );
  }
  return (
    <SettingsCategories
      key={category}
      category={category}
      onCategory={setCategory}
      onClose={onClose}
    />
  );
}

function SettingsCategories({
  category,
  onCategory,
  onClose,
}: {
  category: 'home' | 'appearance' | 'updates';
  onCategory: (category: 'home' | 'shortcuts' | 'appearance' | 'updates') => void;
  onClose: () => void;
}) {
  const dialog = useDialogFocus();
  return (
    <div ref={overlayMotion} className="modal-backdrop shortcut-backdrop">
      <section
        ref={dialog}
        tabIndex={-1}
        className="settings-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-heading"
      >
        <SettingsHeader
          title={
            category === 'home' ? 'Settings' : category === 'updates' ? 'Updates' : 'Appearance'
          }
          onBack={category === 'home' ? undefined : () => onCategory('home')}
          onClose={onClose}
        />
        {category === 'home' ? (
          <SettingsCategoryCards onCategory={onCategory} />
        ) : category === 'updates' ? (
          <UpdateSettings />
        ) : (
          <AppearanceSettings />
        )}
      </section>
    </div>
  );
}

function AppearanceSettings() {
  const { theme, selectTheme, error } = useThemePreference();
  return (
    <div className="appearance-settings">
      <h3>Theme</h3>
      <p>A bright accent for your dark workspace. Changes are saved automatically.</p>
      <div className="theme-grid" role="group" aria-label="Accent theme">
        {themes.map((option) => (
          <button
            key={option.id}
            className="theme-card"
            aria-pressed={theme === option.id}
            onClick={() => selectTheme(option.id)}
            style={{ '--theme-accent': option.accent } as CSSProperties}
          >
            <span className="theme-preview" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            <span className="theme-name">
              {option.name}
              {option.id === 'orange' && <small>Default</small>}
              {theme === option.id && <Check size={15} />}
            </span>
          </button>
        ))}
      </div>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
