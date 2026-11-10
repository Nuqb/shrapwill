import { qaDir, debugUrl } from './test-support/paths.mjs';
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
const qa = qaDir;
const b = await chromium.connectOverCDP(debugUrl(9223));
const p = b.contexts()[0].pages()[0];
const call = (cmd, args = {}) =>
  p.evaluate(({ cmd, args }) => window.__TAURI_INTERNALS__.invoke(cmd, args), { cmd, args });
await call('open_project', { path: path.join(qa, 'Validation.cutline') });
if (await p.locator('.launcher').count()) await p.locator('.launcher-top>button').click();
await p.waitForTimeout(300);
const s = (await call('startup')).snapshot;
const track = s.project.tracks.find((t) => t.kind === 'video' && t.clips.some((c) => !c.title));
const c = track.clips[0];
const loc = p.getByRole('button', { name: `${c.name}, ${track.name}`, exact: true }).first();
await loc.scrollIntoViewIfNeeded();
const box = await loc.boundingBox();
await p.mouse.move(box.x + box.width / 2, box.y + 36);
await p.mouse.down();
await p.mouse.move(box.x + box.width / 2 + 45, box.y + 36, { steps: 7 });
await p.mouse.up();
await p.waitForTimeout(250);
let after = (await call('startup')).snapshot;
const moved = after.project.tracks.flatMap((t) => t.clips).find((x) => x.id === c.id);
if (moved.start <= c.start) throw Error(`Drag did not move clip: ${JSON.stringify(moved)}`);
const audio = after.project.tracks.find((t) => t.kind === 'audio').clips[0];
if (audio.start !== moved.start) throw Error('Linked audio did not move');
await call('history', { direction: 'undo' });
const second = track.clips[1];
const secondLoc = p
  .getByRole('button', { name: `${second.name}, ${track.name}`, exact: true })
  .nth(1);
const handle = secondLoc.locator('.trim-handle.right');
const h = await handle.boundingBox();
await p.mouse.move(h.x + h.width / 2, h.y + 40);
await p.mouse.down();
await p.mouse.move(h.x + h.width / 2 - 15, h.y + 40, { steps: 5 });
await p.mouse.up();
await p.waitForTimeout(200);
after = (await call('startup')).snapshot;
const trimmed = after.project.tracks.flatMap((t) => t.clips).find((x) => x.id === second.id);
if (trimmed.duration >= second.duration) throw Error('Edge trim did not shorten clip');
await call('history', { direction: 'undo' });
await p
  .getByRole('button', { name: `${c.name}, ${track.name}`, exact: true })
  .first()
  .click();
await p.keyboard.press('Delete');
await p.waitForTimeout(200);
after = (await call('startup')).snapshot;
if (after.project.tracks.flatMap((t) => t.clips).some((x) => x.id === c.id))
  throw Error('Delete did not remove clip');
await p.keyboard.press('Control+z');
await p.waitForTimeout(200);
if (
  !(await call('startup')).snapshot.project.tracks
    .flatMap((t) => t.clips)
    .some((x) => x.id === c.id)
)
  throw Error('Undo did not restore deleted clip');
await fs.writeFile(
  path.join(qa, 'gesture-results.json'),
  JSON.stringify(
    {
      passed: true,
      checks: [
        'mouse clip drag',
        'linked audio movement',
        'trim handle',
        'keyboard delete',
        'keyboard undo',
      ],
    },
    null,
    2,
  ),
);
console.log('PASS: native timeline drag, trim, delete, undo');
await b.close();
