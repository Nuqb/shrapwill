import { overlayMotion } from './features/overlays/motion';
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { commands, shortcutText, type ActionId, type Bindings, defaultBindings } from './shortcuts';
export const ShortcutContext = createContext<Bindings>(defaultBindings());
export function ShortcutHint({ action }: { action: ActionId }) {
  const bindings = useContext(ShortcutContext);
  return (
    <span className="shortcut-hint">
      {shortcutText(bindings, action) === 'Unassigned' ? '' : shortcutText(bindings, action)}
    </span>
  );
}
export function ToolButton({
  action,
  children,
  description,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  action: ActionId;
  children: ReactNode;
  description?: string;
}) {
  const bindings = useContext(ShortcutContext),
    id = useId();
  const host = useRef<HTMLSpanElement>(null),
    timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [position, setPosition] = useState<{ left: number; top: number; below: boolean } | null>(
    null,
  );
  const hide = () => {
    clearTimeout(timer.current);
    setPosition(null);
  };
  const show = (delay = 320) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const rect = host.current?.getBoundingClientRect();
      if (rect)
        setPosition({
          left: Math.max(145, Math.min(innerWidth - 145, rect.left + rect.width / 2)),
          top: rect.top < 85 ? rect.bottom + 8 : rect.top - 8,
          below: rect.top < 85,
        });
    }, delay);
  };
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <span
      ref={host}
      className="tooltip-host"
      onMouseEnter={() => show()}
      onMouseLeave={hide}
      onFocusCapture={() => show(0)}
      onBlurCapture={hide}
      onPointerDown={hide}
    >
      <button
        {...props}
        data-action={action}
        aria-label={props['aria-label'] || commands[action].name}
        aria-describedby={position ? id : undefined}
      >
        {children}
      </button>
      {position &&
        createPortal(
          <div
            ref={overlayMotion}
            className={`tool-tooltip ${position.below ? 'below' : ''}`}
            role="tooltip"
            id={id}
            style={{ left: position.left, top: position.top }}
          >
            <div>
              <strong>{commands[action].name}</strong>
              <kbd>{shortcutText(bindings, action)}</kbd>
            </div>
            {description && <span>{description}</span>}
          </div>,
          document.body,
        )}
    </span>
  );
}
