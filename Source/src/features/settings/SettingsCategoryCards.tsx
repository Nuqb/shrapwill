import { ChevronRight, Keyboard, Palette, Download } from 'lucide-react';

export function SettingsCategoryCards({
  onCategory,
}: {
  onCategory: (category: 'shortcuts' | 'appearance' | 'updates') => void;
}) {
  return (
    <div className="settings-categories">
      <button className="settings-category" onClick={() => onCategory('updates')}>
        <Download size={25} />
        <strong>Updates</strong>
        <ChevronRight size={18} />
      </button>
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
