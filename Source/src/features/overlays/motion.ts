const easing = 'cubic-bezier(0.22, 1, 0.36, 1)';
const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function animateSurface(node: HTMLElement, closing: boolean) {
  return node.animate(
    closing
      ? [
          { translate: '0 0', scale: '1' },
          { translate: '0 6px', scale: '0.985' },
        ]
      : [
          { translate: '0 10px', scale: '0.975' },
          { translate: '0 0', scale: '1' },
        ],
    { duration: closing ? 140 : 220, easing, fill: 'both' },
  );
}

function createSnapshot(node: HTMLElement) {
  const rect = node.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const snapshot = node.cloneNode(true) as HTMLElement;
  snapshot.inert = true;
  snapshot.setAttribute('aria-hidden', 'true');
  snapshot.dataset.overlayExit = '';
  for (const element of [snapshot, ...snapshot.querySelectorAll('[id]')]) {
    element.removeAttribute('id');
  }
  Object.assign(snapshot.style, {
    position: 'fixed',
    inset: 'auto',
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    margin: '0',
    transform: 'none',
    translate: 'none',
    scale: 'none',
    pointerEvents: 'none',
  });
  document.body.append(snapshot);
  const originals = node.querySelectorAll<HTMLElement>('*');
  snapshot.querySelectorAll<HTMLElement>('*').forEach((element, index) => {
    element.scrollTop = originals[index].scrollTop;
    element.scrollLeft = originals[index].scrollLeft;
  });
  return snapshot;
}

function exitSnapshot(node: HTMLElement, opacity: string) {
  const snapshot = createSnapshot(node);
  if (!snapshot) return;
  const surface = snapshot.classList.contains('modal-backdrop')
    ? snapshot.firstElementChild
    : snapshot;
  if (surface instanceof HTMLElement) animateSurface(surface, true);
  const fade = snapshot.animate([{ opacity }, { opacity: 0 }], {
    duration: 140,
    easing: 'ease-out',
    fill: 'both',
  });
  const remove = () => snapshot.remove();
  fade.onfinish = remove;
  fade.oncancel = remove;
}

// React removes live controls immediately, restoring focus and releasing listeners.
// Only an inert, aria-hidden visual snapshot remains for the brief exit animation.
export function overlayMotion(node: HTMLElement | null) {
  if (!node || reduceMotion()) return;
  const surface = node.classList.contains('modal-backdrop') ? node.firstElementChild : node;
  const movement = surface instanceof HTMLElement ? animateSurface(surface, false) : undefined;
  const fade = node.animate([{ opacity: 0 }, { opacity: 1 }], {
    duration: 180,
    easing,
    fill: 'both',
  });
  return () => {
    const opacity = getComputedStyle(node).opacity;
    movement?.cancel();
    fade.cancel();
    if (node.isConnected && !reduceMotion()) exitSnapshot(node, opacity);
  };
}
