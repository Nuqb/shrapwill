import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const root = path.resolve(import.meta.dirname, '..');
const tree = JSON.parse(
  fs.readFileSync(
    'C:/ProgramData/Wondershare Filmora/configs/Category/en/categoryTree.json',
    'utf8',
  ),
);
const flatten = (items) => items.flatMap((item) => [item, ...flatten(item.children ?? [])]);
const categoryNodes = flatten(tree.en)
  .filter(
    (item) =>
      item.parent_id === flatten(tree.en).find((node) => node.slug === 'Filter_Filters_en')?.id,
  )
  .sort((a, b) => a.list_order - b.list_order);
const database = new DatabaseSync(
  path.join(process.env.APPDATA, 'Wondershare/Wondershare Filmora/resInfo.db'),
  { readOnly: true },
);
const pages = database.prepare('SELECT pageInfo_key, pageInfo_json FROM resourcePageInfos').all();
const categories = categoryNodes.map((node) => ({
  name: node.title,
  names: pages
    .filter((page) => page.pageInfo_key.includes(`_${node.slug}_PageIndex_`))
    .sort(
      (a, b) =>
        Number(a.pageInfo_key.match(/PageIndex_(\d+)/)[1]) -
        Number(b.pageInfo_key.match(/PageIndex_(\d+)/)[1]),
    )
    .flatMap((page) => JSON.parse(page.pageInfo_json).list ?? [])
    .map((entry) => entry.titles?.en)
    .filter(Boolean),
}));
database.close();
fs.writeFileSync(
  path.join(root, 'src/features/library/catalog/filter-order.json'),
  JSON.stringify({ categories }, null, 2) + '\n',
);
console.log(`Saved ${categories.length} filter category sequences from Filmora's local cache.`);
