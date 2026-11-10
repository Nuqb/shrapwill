import { ChevronRight, Keyboard, Palette } from 'lucide-react';

export function SettingsCategoryCards({
  onCategory,
}: {
  onCategory: (category: 'shortcuts' | 'appearance') => void;
}) {
  return (
    <div className="settings-categories">
      <button className="settings-category" onClick={() => onCategory('shortcuts')}>
        <Keyboard size={25} />
        <strong>Keyboard shortcuts</strong>
        <ChevronRight size={18} />
      </button>
      <button className="settings-category" onClick={() => onCategory('appearance')}>
        <Palette size={25} />
        <strong>Appearance</strong>
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
