import groups from './catalog/preset-categories.json' with { type: 'json' };

// Presentation categories are independent of imported source/package metadata.
const categories = new Map(
  Object.entries(groups).flatMap(([family, sections]) =>
    Object.entries(sections).flatMap(([category, names]) =>
      names.map((name) => [`${family}/${name}`, category] as const),
    ),
  ),
);
export function originalPresetCategory(entry: { family: string; name: string; category?: string }) {
  const sourceCategory = entry.category?.trim();
  if (sourceCategory && sourceCategory !== 'Filmora') return sourceCategory;
  return (
    categories.get(`${entry.family}/${entry.name}`) ??
    (entry.family === 'filter' ? 'Color Correction' : 'Stylize')
  );
}
