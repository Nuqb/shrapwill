import { useState, type ReactNode } from 'react';
import { useEditor } from '../../app/EditorContext';
import { matchesPreset } from './presets';
import { filterCategoryOrder } from './filterOrder';
import { orderedCategoryItems, type PresetCategoryGroup } from './presetOrdering';

export function PresetCollection<T extends { name: string; category: string }>({
  items,
  renderItem,
  categoryGroups,
}: {
  items: T[];
  renderItem: (item: T) => ReactNode;
  categoryGroups?: PresetCategoryGroup[];
}) {
  const { search, tab } = useEditor();
  const [category, setCategory] = useState('All');
  const categories = [...new Set(items.map((item) => item.category))];
  const orderedCategories = tab === 'Filters' ? filterCategoryOrder(categories) : categories;
  const displayedCategories = categoryGroups?.map((group) => group.name) ?? orderedCategories;
  const orderedItems = categoryGroups
    ? orderedCategoryItems(items, categoryGroups, category)
    : items;
  const visible = orderedItems.filter(
    (item) =>
      matchesPreset(item, search) &&
      (categoryGroups || category === 'All' || item.category === category),
  );
  return (
    <div className="preset-collection sidebar-categories">
      <nav className="preset-categories" aria-label={`${tab} categories`}>
        {['All', ...displayedCategories].map((name) => (
          <button key={name} aria-pressed={category === name} onClick={() => setCategory(name)}>
            {name}
          </button>
        ))}
      </nav>
      <div className="preset-results">
        <p className="preset-count" aria-live="polite">
          {visible.length} of {items.length} presets
        </p>
        {visible.length ? (
          <div className="preset-grid">{visible.map(renderItem)}</div>
        ) : (
          <p className="preset-empty">
            {categoryGroups && category !== 'All' && !search
              ? 'No effects from this category have been ported yet.'
              : 'No presets match. Try another search or category.'}
          </p>
        )}
      </div>
    </div>
  );
}
