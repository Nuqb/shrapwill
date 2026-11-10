import fs from 'node:fs';
import path from 'node:path';

const source =
  process.env.SHRAPWILL_FILMORA_CATEGORIES ||
  'C:/ProgramData/Wondershare Filmora/configs/Category/en/categoryTree.json';
const tree = JSON.parse(fs.readFileSync(source, 'utf8').replace(/^\uFEFF/, ''));
const roots = [];
function collect(value) {
  if (!value || typeof value !== 'object') return;
  if (['Title Effects', 'Title Templates'].includes(value.title)) {
    roots.push(value);
    return;
  }
  Object.values(value).forEach(collect);
}
function category(node) {
  return {
    id: String(node.id),
    name: node.title,
    order: node.list_order,
    children: [...(node.children || [])].sort((a, b) => a.list_order - b.list_order).map(category),
  };
}
collect(tree);
if (roots.length !== 2) throw Error('Expected Filmora Title Effects and Title Templates roots.');
const destination = path.resolve(
  import.meta.dirname,
  '../src/features/library/catalog/title-categories.json',
);
fs.writeFileSync(
  destination,
  JSON.stringify(roots.sort((a, b) => a.list_order - b.list_order).map(category), null, 2) + '\n',
);
