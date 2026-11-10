import { ArrowLeft, Keyboard, X } from 'lucide-react';

export function ShortcutSettingsHeader({
  onBack,
  onClose,
}: {
  onBack?: () => void;
  onClose: () => void;
}) {
  return (
    <header>
      <div>
        {onBack && (
          <button className="settings-back" aria-label="Back to settings" onClick={onBack}>
            <ArrowLeft size={16} /> Settings
          </button>
        )}
        <h2 id="shortcut-heading">
          <Keyboard size={21} /> Keyboard shortcuts
        </h2>
      </div>
      <button aria-label="Close keyboard shortcut settings" onClick={onClose}>
        <X size={19} />
      </button>
    </header>
  );
}
