import { useEffect, useRef } from 'react';
import { useEditor } from '../EditorContext';
import { beginPanelDrag } from './panelDrag';
import { fitPanels, resizePanel, type PanelBounds, type PanelSide } from './panelSizing';
export function PanelDivider({ side, bounds }: { side: PanelSide; bounds: PanelBounds }) {
  const { layout, setLayout, p } = useEditor();
  const cleanup = useRef(() => {});
  useEffect(() => () => cleanup.current(), [p.id]);
  const current = fitPanels(layout, bounds)[side];
  return (
    <div
      role="separator"
      tabIndex={0}
      aria-label={
        side === 'left'
          ? 'Resize library'
          : side === 'right'
            ? 'Resize inspector'
            : 'Resize timeline'
      }
      aria-orientation={side === 'bottom' ? 'horizontal' : 'vertical'}
      aria-valuenow={Math.round(current)}
      className={`resize-handle ${side === 'bottom' ? 'horizontal' : 'vertical'}`}
      onPointerDown={(event) => {
        cleanup.current();
        cleanup.current = beginPanelDrag(event, { side, layout, bounds, setLayout });
      }}
      onKeyDown={(event) => {
        const direction =
          side === 'bottom'
            ? { ArrowUp: 1, ArrowDown: -1 }[event.key]
            : { ArrowRight: 1, ArrowLeft: -1 }[event.key];
        if (!direction) return;
        event.preventDefault();
        event.stopPropagation();
        const sign = side === 'right' ? -1 : 1;
        setLayout(
          resizePanel(
            layout,
            side,
            direction * (side === 'bottom' ? 1 : sign) * (event.shiftKey ? 50 : 20),
            bounds,
          ),
        );
      }}
    />
  );
}
