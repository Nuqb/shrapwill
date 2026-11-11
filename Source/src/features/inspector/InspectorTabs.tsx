import { useRef } from 'react';
export function InspectorTabs({
  label,
  items,
  value,
  onChange,
}: {
  label: string;
  items: string[];
  value: string;
  onChange: (name: string) => void;
}) {
  const bar = useRef<HTMLDivElement>(null);
  const select = (name: string) => {
    onChange(name);
    bar.current?.closest('.inspector-scroll')?.scrollTo(0, 0);
  };
  return (
    <div className="inspector-subtabs" role="tablist" aria-label={label} ref={bar}>
      {items.map((name, index) => (
        <button
          key={name}
          role="tab"
          aria-selected={value === name}
          tabIndex={value === name ? 0 : -1}
          onClick={() => select(name)}
          onKeyDown={(e) => {
            const offset = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
            if (!offset && !['Home', 'End'].includes(e.key)) return;
            e.preventDefault();
            const next =
              e.key === 'Home'
                ? 0
                : e.key === 'End'
                  ? items.length - 1
                  : (index + (offset ?? 0) + items.length) % items.length;
            select(items[next]);
            bar.current?.querySelectorAll<HTMLButtonElement>('button')[next]?.focus();
          }}
        >
          {name}
        </button>
      ))}
    </div>
  );
}
