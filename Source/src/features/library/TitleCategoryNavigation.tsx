import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { titleCategories, type TitleCategory } from './titleCategories';

type CategorySelection = {
  selected: string;
  onSelect: (category: TitleCategory | null) => void;
};

function CategoryItem({
  category,
  selection,
}: {
  category: TitleCategory;
  selection: CategorySelection;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = category.children.length > 0;
  return (
    <li>
      <button
        aria-pressed={selection.selected === category.id}
        aria-expanded={hasChildren ? expanded : undefined}
        onClick={() => {
          selection.onSelect(category);
          if (hasChildren) setExpanded(!expanded);
        }}
      >
        {hasChildren && (
          <ChevronRight size={12} className={expanded ? 'expanded' : ''} aria-hidden="true" />
        )}
        <span>{category.name}</span>
      </button>
      {hasChildren && expanded && (
        <ul>
          {category.children.map((child) => (
            <CategoryItem key={child.id} category={child} selection={selection} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function TitleCategoryNavigation(selection: CategorySelection) {
  return (
    <nav className="preset-categories title-categories" aria-label="Titles categories">
      <button aria-pressed={selection.selected === 'all'} onClick={() => selection.onSelect(null)}>
        All
      </button>
      <ul>
        {titleCategories.map((category) => (
          <CategoryItem key={category.id} category={category} selection={selection} />
        ))}
      </ul>
    </nav>
  );
}
