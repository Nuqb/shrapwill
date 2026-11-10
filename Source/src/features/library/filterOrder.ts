import order from './catalog/filter-order.json' with { type: 'json' };

const normalize = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '');
const categoryRanks = new Map(order.categories.map((entry, index) => [entry.name, index]));
const nameRanks = new Map(
  order.categories.map((entry) => [
    entry.name,
    new Map(entry.names.map((name, index) => [normalize(name), index])),
  ]),
);

// Uncached/bundled-only cards follow the cached sequence; local extras follow Filmora groups.
export function compareFilters(
  a: { name: string; category: string },
  b: { name: string; category: string },
) {
  if (a.name === 'Original') return -1;
  if (b.name === 'Original') return 1;
  const categoryDifference =
    (categoryRanks.get(a.category) ?? order.categories.length) -
    (categoryRanks.get(b.category) ?? order.categories.length);
  if (categoryDifference) return categoryDifference;
  if (a.category !== b.category) return a.category.localeCompare(b.category, 'en');
  const ranks = nameRanks.get(a.category);
  const difference =
    (ranks?.get(normalize(a.name)) ?? Number.MAX_SAFE_INTEGER) -
    (ranks?.get(normalize(b.name)) ?? Number.MAX_SAFE_INTEGER);
  return difference || a.name.localeCompare(b.name, 'en', { numeric: true });
}

export function filterCategoryOrder(categories: string[]) {
  return [...categories].sort(
    (a, b) =>
      (categoryRanks.get(a) ?? order.categories.length) -
        (categoryRanks.get(b) ?? order.categories.length) || a.localeCompare(b, 'en'),
  );
}
