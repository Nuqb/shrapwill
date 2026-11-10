import { useEffect, useRef, useState } from 'react';

export function useSettingsNavigation(onClose: () => void) {
  const trigger = useRef(document.activeElement);
  const [category, setCategory] = useState<'home' | 'shortcuts' | 'appearance'>('home');
  useEffect(
    () => () => {
      if (trigger.current instanceof HTMLElement && trigger.current.isConnected)
        trigger.current.focus();
    },
    [],
  );
  useEffect(() => {
    if (category === 'shortcuts') return;
    const close = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (category === 'appearance') setCategory('home');
      else onClose();
    };
    window.addEventListener('keydown', close, true);
    return () => window.removeEventListener('keydown', close, true);
  }, [category, onClose]);
  return { category, setCategory };
}
