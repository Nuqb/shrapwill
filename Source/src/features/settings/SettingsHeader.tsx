import { ArrowLeft, Settings, X } from 'lucide-react';

export function SettingsHeader({
  title,
  onBack,
  onClose,
}: {
  title: string;
  onBack?: () => void;
  onClose: () => void;
}) {
  return (
    <header>
      <div>
        {onBack && (
          <button aria-label="Back to settings" onClick={onBack}>
            <ArrowLeft size={18} />
          </button>
        )}
        <h2 id="settings-heading">
          <Settings size={21} />
          {title}
        </h2>
      </div>
      <button aria-label="Close settings" onClick={onClose}>
        <X size={19} />
      </button>
    </header>
  );
}
