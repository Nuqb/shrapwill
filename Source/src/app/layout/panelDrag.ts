import type { PointerEvent as ReactPointerEvent } from 'react';
import { resizePanel, type PanelLayout, type PanelBounds, type PanelSide } from './panelSizing';
type Options = {
  side: PanelSide;
  layout: PanelLayout;
  bounds: PanelBounds;
  setLayout: (layout: PanelLayout) => void;
};
type Binding = [EventTarget, string, EventListener, boolean?];
function listen(bindings: Binding[]) {
  for (const [target, name, handler, capture] of bindings)
    target.addEventListener(name, handler, capture);
  return () => {
    for (const [target, name, handler, capture] of bindings)
      target.removeEventListener(name, handler, capture);
  };
}
function capturePointer(options: {
  element: HTMLElement;
  id: number;
  move: (event: PointerEvent) => void;
  restore: () => void;
}) {
  const { element, id, move, restore } = options;
  let remove = () => {};
  const stop = () => {
    remove();
    if (element.hasPointerCapture(id)) element.releasePointerCapture(id);
    document.body.classList.remove('resizing');
  };
  const cancel = () => {
    restore();
    stop();
  };
  const pointerEnd = (event: Event) => {
    if ((event as PointerEvent).pointerId === id) stop();
  };
  const pointerCancel = (event: Event) => {
    if ((event as PointerEvent).pointerId === id) cancel();
  };
  const key = (event: Event) => {
    if ((event as KeyboardEvent).key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      cancel();
    }
  };
  remove = listen([
    [
      window,
      'pointermove',
      (event) => {
        if ((event as PointerEvent).pointerId === id) move(event as PointerEvent);
      },
    ],
    [window, 'pointerup', pointerEnd],
    [window, 'pointercancel', pointerCancel],
    [window, 'blur', stop],
    [window, 'keydown', key, true],
    [element, 'lostpointercapture', stop],
  ]);
  element.setPointerCapture(id);
  document.body.classList.add('resizing');
  return stop;
}
export function beginPanelDrag(event: ReactPointerEvent<HTMLElement>, options: Options) {
  if (event.button !== 0 || !event.isPrimary) return () => {};
  event.preventDefault();
  const start = options.side === 'bottom' ? event.clientY : event.clientX;
  const move = (next: PointerEvent) => {
    const distance =
      options.side === 'bottom'
        ? start - next.clientY
        : options.side === 'right'
          ? start - next.clientX
          : next.clientX - start;
    options.setLayout(resizePanel(options.layout, options.side, distance, options.bounds));
  };
  return capturePointer({
    element: event.currentTarget,
    id: event.pointerId,
    move,
    restore: () => options.setLayout(options.layout),
  });
}
