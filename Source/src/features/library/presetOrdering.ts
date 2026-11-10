export type PresetCategoryGroup = { name: string; names: string[] };

export function orderedCategoryItems<T extends { name: string }>(
  items: T[],
  groups: PresetCategoryGroup[],
  category = 'All',
) {
  const names =
    category === 'All'
      ? groups.flatMap((group) => group.names)
      : (groups.find((group) => group.name === category)?.names ?? []);
  const byName = new Map(items.map((item) => [item.name, item]));
  return [...new Set(names)].flatMap((name) => {
    const item = byName.get(name);
    return item ? [item] : [];
  });
}
