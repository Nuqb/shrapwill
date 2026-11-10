import designs from './catalog/titles.json' with { type: 'json' };
import { useEditor } from '../../app/EditorContext';
import { useLibraryDrag } from '../libraryDrag/LibraryDragProvider';
type TitlePreset = { style: string; name: string; sample: string };
function TitleArt({ t }: { t: TitlePreset }) {
  const design = designs.find((d) => d.style === t.style);
  const paint = design?.paint;
  const style = design
    ? {
        color: design.color,
        fontFamily: design.family,
        fontWeight: design.weight,
        letterSpacing: `${design.spacing / 6}px`,
        borderColor: design.accent,
        WebkitTextStroke: paint
          ? `${paint.strokeWidth / 6}px ${paint.stroke}${Math.round(paint.strokeOpacity * 255)
              .toString(16)
              .padStart(2, '0')}`
          : undefined,
        paintOrder: paint ? ('stroke fill' as const) : undefined,
        textShadow: paint
          ? `0 0 ${paint.shadowBlur / 6}px ${paint.shadow}${Math.round(paint.shadowOpacity * 255)
              .toString(16)
              .padStart(2, '0')}`
          : undefined,
        opacity: paint?.opacity,
      }
    : undefined;
  return (
    <div className="preset-art">
      <span style={style}>{t.sample}</span>
    </div>
  );
}
export function TitlePresetCard({ t }: { t: TitlePreset }) {
  const { titlePreset, previewTitle, addTitle } = useEditor();
  const drag = useLibraryDrag();
  const design = designs.find((d) => d.style === t.style);
  return (
    <button
      className={`preset-card title-preset ${t.style} ${design ? `design-${design.base}` : ''} ${titlePreset === t.style ? 'selected-preset' : ''}`}
      aria-pressed={titlePreset === t.style}
      key={t.style}
      onClick={() => void previewTitle(t.style)}
      onDoubleClick={() => void addTitle(t.style)}
      onClickCapture={drag.captureClick}
      onDragStart={(e) => e.preventDefault()}
      onPointerDown={(e) =>
        drag.start(e, {
          type: 'title',
          id: t.style,
          name: t.name,
          kind: 'video',
          duration: 5,
        })
      }
    >
      <TitleArt t={t} />
      <strong>{t.name}</strong>
    </button>
  );
}
