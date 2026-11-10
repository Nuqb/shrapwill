import categories from './catalog/title-categories.json' with { type: 'json' };

export type TitleCategory = { id: string; name: string; children: TitleCategory[] };
export const titleCategories: TitleCategory[] = categories;

const builtinCategories: Record<string, string> = {
  plain: '129',
  lower: '55524',
  cinematic: '55608',
  caption: '119',
  headline: '55608',
  outline: '54712',
  neon: '109026',
  label: '55524',
  quote: '55608',
  minimal: '129',
  retro: '54712',
  credits: '55568',
};
// Preserve the existing designs while placing them in the matching Filmora text types.
const legacyCategories: Record<string, string> = {
  Openers: '55528',
  'Lower thirds': '55524',
  Subtitles: '119',
  'End cards': '55568',
  News: '106426',
  Social: '55616',
  Wedding: '51072',
  Travel: '55528',
  Quotes: '55608',
  Default: '54712',
};

export function titleCategoryId(preset: { style: string; category: string }) {
  return builtinCategories[preset.style] || legacyCategories[preset.category] || preset.category;
}

export function categoryContains(category: TitleCategory, id: string): boolean {
  return category.id === id || category.children.some((child) => categoryContains(child, id));
}

export function titleCategoryNames(id: string, nodes = titleCategories): string[] {
  for (const node of nodes) {
    if (node.id === id) return [node.name];
    const children = titleCategoryNames(id, node.children);
    if (children.length) return [node.name, ...children];
  }
  return [];
}
