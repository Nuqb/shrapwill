import { useState } from 'react';
import { useEditor } from '../../app/EditorContext';
import { titlePresets, matchesPreset } from './presets';
import { TitleCategoryNavigation } from './TitleCategoryNavigation';
import { TitlePresetCard } from './TitlePresets';
import {
  categoryContains,
  titleCategoryId,
  titleCategoryNames,
  type TitleCategory,
} from './titleCategories';

export function TitleCollection() {
  const { search } = useEditor();
  const [category, setCategory] = useState<TitleCategory | null>(null);
  const visible = titlePresets.filter((preset) => {
    const id = titleCategoryId(preset);
    const matchesCategory = !category || categoryContains(category, id);
    return (
      matchesCategory &&
      matchesPreset({ ...preset, category: titleCategoryNames(id).join(' ') }, search)
    );
  });
  return (
    <div className="preset-collection sidebar-categories title-collection">
      <TitleCategoryNavigation selected={category?.id || 'all'} onSelect={setCategory} />
      <div className="preset-results">
        <p className="preset-count" aria-live="polite">
          {visible.length} of {titlePresets.length} presets
        </p>
        {visible.length ? (
          <div className="preset-grid">
            {visible.map((preset) => (
              <TitlePresetCard key={preset.style} t={preset} />
            ))}
          </div>
        ) : (
          <p className="preset-empty">
            {search.trim()
              ? 'No titles match this search in this category.'
              : 'No titles are available in this category yet.'}
          </p>
        )}
      </div>
    </div>
  );
}
