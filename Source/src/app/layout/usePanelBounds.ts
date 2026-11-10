import { useLayoutEffect, useRef, useState } from 'react';
export function usePanelBounds() {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({
    width: window.innerWidth - 12,
    height: window.innerHeight - 70,
  });
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => {
      const style = getComputedStyle(element);
      setSize({
        width: element.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
        height:
          element.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom),
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return { ref, ...size };
}
