import { usePreview } from './context';
import { useEffect, useState } from 'react';

export function FilterComparison() {
  const { source, comparison, setComparison, canvas, plan } = usePreview();
  const [bounds, setBounds] = useState({ left: 0, top: 0, width: 0, height: 0 });
  useEffect(() => {
    const picture = canvas.current;
    if (!picture) return;
    const measure = () => {
      const sourceWidth = plan?.width || picture.width;
      const sourceHeight = plan?.height || picture.height;
      const scale = Math.min(
        picture.clientWidth / sourceWidth,
        picture.clientHeight / sourceHeight,
      );
      const width = sourceWidth * scale,
        height = sourceHeight * scale;
      setBounds({
        left: (picture.clientWidth - width) / 2,
        top: (picture.clientHeight - height) / 2,
        width,
        height,
      });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(picture);
    measure();
    return () => observer.disconnect();
  }, [canvas, plan?.width, plan?.height]);
  if (source?.kind !== 'preset' || source.presetKind !== 'filter') return null;
  return (
    <div className="filter-comparison" style={bounds}>
      <span className="comparison-label filtered">Filtered</span>
      <span className="comparison-label original">Original</span>
      <div
        className="comparison-divider"
        role="slider"
        tabIndex={0}
        aria-label="Filter comparison divider"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(comparison * 100)}
        style={{ left: `${comparison * 100}%` }}
        onDoubleClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.preventDefault();
          event.currentTarget.focus();
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
          const rect = event.currentTarget.parentElement!.getBoundingClientRect();
          setComparison(Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)));
        }}
        onPointerUp={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId))
            event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onKeyDown={(event) => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault();
          event.stopPropagation();
          setComparison(
            event.key === 'Home'
              ? 0
              : event.key === 'End'
                ? 1
                : Math.max(0, Math.min(1, comparison + (event.key === 'ArrowLeft' ? -0.01 : 0.01))),
          );
        }}
      >
        <span>↔</span>
      </div>
    </div>
  );
}
