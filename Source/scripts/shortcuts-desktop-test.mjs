import { qaDir, outputPath, debugUrl } from './test-support/paths.mjs';
import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs/promises';
const root = qaDir,
  browser = await chromium.connectOverCDP(debugUrl(9226));
const page = browser.contexts()[0].pages()[0];
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const call = (cmd, args = {}) =>
  page.evaluate(({ cmd, args }) => window.__TAURI_INTERNALS__.invoke(cmd, args), { cmd, args });
const state = async () => (await call('startup')).snapshot;
const count = (s) => s.project.tracks.flatMap((t) => t.clips).length;
const tool = (id) => page.locator(`.timeline [data-action="${id}"]`);
const assertTool = async (id) => {
  if ((await tool(id).getAttribute('aria-pressed')) !== 'true')
    throw Error(`${id} was not selected`);
};
const press = async (keys) => {
  await page.locator('.timeline-caption').click();
  await page.keyboard.press(keys);
  await page.waitForTimeout(100);
};
const settings = () => page.getByRole('dialog', { name: 'Keyboard shortcuts', exact: true });
const openSettings = async () => {
  await page.locator('.app-header [data-action="settings"]').click();
  await page.getByRole('button', { name: 'Keyboard shortcuts', exact: true }).click();
  await settings().waitFor();
};
async function record(action, keys, add = false) {
  await settings().getByLabel('Search shortcuts').fill('');
  const row = settings().locator(`[data-command="${action}"]`);
  await row.scrollIntoViewIfNeeded();
  await row
    .getByRole('button', {
      name: add
        ? `Add shortcut for ${action === 'tool_select' ? 'Selection tool' : 'Razor tool'}`
        : `Change ${action === 'tool_select' ? 'Selection tool' : 'Razor tool'} shortcut 1`,
      exact: true,
    })
    .click();
  await page.getByLabel('Record keyboard shortcut').waitFor();
  await page.keyboard.press(keys);
  await page.waitForTimeout(100);
}
await page.waitForSelector('.launcher');
await call('open_project', { path: path.join(root, 'Validation.cutline') });
await page.locator('.launcher-top>button').click();
await page.waitForSelector('.timeline-clip');
await page.mouse.move(1, 1);
await tool('tool_select').hover();
await page.getByRole('tooltip').waitFor();
let text = await page.getByRole('tooltip').innerText();
if (!text.includes('Selection tool') || !text.includes('V'))
  throw Error('Selection tooltip missing label or key: ' + text);
await press('c');
await assertTool('tool_razor');
await page.mouse.move(1, 1);
await tool('tool_razor').hover();
await page.getByRole('tooltip').waitFor();
text = await page.getByRole('tooltip').innerText();
if (!text.includes('Razor tool') || !text.includes('C'))
  throw Error('Razor tooltip missing label or key: ' + text);
const before = await state(),
  video = before.project.tracks.find((t) => t.kind === 'video' && t.clips.some((c) => !c.title));
const clip = video.clips[0];
const target = page
  .getByRole('button', { name: `${clip.name}, ${video.name}`, exact: true })
  .first();
const box = await target.boundingBox();
await page.mouse.click(box.x + box.width / 2, box.y + 32);
await page.waitForTimeout(150);
if (count(await state()) !== count(before) + 2)
  throw Error('Razor click did not split linked audio and video');
await press('v');
await assertTool('tool_select');
await openSettings();
await record('tool_select', 'Control+Alt+w');
await settings().getByRole('button', { name: 'Save shortcuts', exact: true }).click();
await press('c');
await press('Control+Alt+w');
await assertTool('tool_select');
await press('c');
await press('v');
await assertTool('tool_razor');
await tool('tool_select').hover();
await page.getByRole('tooltip').waitFor();
text = await page.getByRole('tooltip').innerText();
if (!text.includes('Ctrl+Alt+W') || text.match(/\bV\b/))
  throw Error('Tooltip did not follow the custom binding');
await page.screenshot({ path: outputPath('Shrapwill-shortcut-tooltip.png') });
await openSettings();
await record('tool_select', 'c');
await settings().getByRole('alert').filter({ hasText: 'already assigned' }).waitFor();
await settings().getByRole('button', { name: 'Keep existing', exact: true }).click();
await record('tool_select', 'c');
await settings().getByRole('button', { name: 'Reassign shortcut', exact: true }).click();
let razor = settings().locator('[data-command="tool_razor"]');
if (!(await razor.getByText('Unassigned', { exact: true }).count()))
  throw Error('Conflict reassignment did not unbind the original command');
await settings().getByRole('button', { name: 'Reset all', exact: true }).click();
await settings().getByRole('button', { name: 'Restore defaults', exact: true }).click();
await record('tool_select', 'Control+Alt+w');
await record('tool_select', 'Control+Alt+Shift+w', true);
await settings().getByRole('button', { name: 'Save shortcuts', exact: true }).click();
await page.reload();
await page.waitForSelector('.launcher');
await page.locator('.launcher-top>button').click();
await press('c');
await press('Control+Alt+Shift+w');
await assertTool('tool_select');
await openSettings();
await settings().getByLabel('Search shortcuts').fill('selection');
const row = settings().locator('[data-command="tool_select"]');
if (
  !(await row.getByText('Ctrl+Alt+W', { exact: true }).count()) ||
  !(await row.getByText('Ctrl+Alt+Shift+W', { exact: true }).count())
)
  throw Error('Alternate shortcuts did not persist');
await settings()
  .getByRole('button', { name: 'Change Selection tool shortcut 1', exact: true })
  .click();
await page.keyboard.press('Escape');
if (await page.getByLabel('Record keyboard shortcut').count())
  throw Error('Escape did not cancel recording');
await page.keyboard.press('Escape');
if (await settings().count()) throw Error('Escape did not close settings');
await press('Alt+3');
await page.locator('.title-preset.plain').dblclick();
const title = page.getByLabel('Title text', { exact: true });
await title.waitFor();
const beforeTyping = count(await state());
await title.focus();
await page.keyboard.press('Control+a');
await page.keyboard.type('v c safety');
await assertTool('tool_select');
await page.keyboard.press('Backspace');
await page.keyboard.press('Control+Alt+w');
if (count(await state()) !== beforeTyping) throw Error('Text editing triggered a clip command');
if ((await title.inputValue()) !== 'v c safet')
  throw Error('Text input did not retain native typing');
await title.blur();
await press('Control+Alt+w');
const select = page
  .getByRole('button', { name: `${clip.name}, ${video.name}`, exact: true })
  .first();
await select.click();
const originalCount = count(await state());
await page.keyboard.press('Control+c');
await page.keyboard.press('Control+v');
await page.waitForTimeout(150);
if (count(await state()) !== originalCount + 2)
  throw Error('Copy/paste did not preserve linked clips');
await page.keyboard.press('Control+x');
await page.waitForTimeout(100);
if (count(await state()) !== originalCount) throw Error('Cut failed');
await page.keyboard.press('Control+v');
await page.waitForTimeout(100);
await page.keyboard.press('Control+d');
await page.waitForTimeout(100);
if (count(await state()) !== originalCount + 4) throw Error('Duplicate failed');
await page.keyboard.press('Control+z');
await page.waitForTimeout(100);
if (count(await state()) !== originalCount + 2) throw Error('Undo duplicate failed');
await page.keyboard.press('Control+Shift+z');
await page.waitForTimeout(100);
if (count(await state()) !== originalCount + 4) throw Error('Redo duplicate failed');
await press('Control+Comma');
await page.getByRole('button', { name: 'Keyboard shortcuts', exact: true }).click();
await settings().waitFor();
await settings().getByLabel('Shortcut category').selectOption('Tools');
await page.setViewportSize({ width: 1366, height: 768 });
await page.screenshot({ path: outputPath('Shrapwill-keyboard-settings.png') });
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
if (overflow) throw Error('Settings overflow the window');
await settings().getByRole('button', { name: 'Cancel', exact: true }).click();
await fs.writeFile(
  path.join(root, 'shortcut-results.json'),
  JSON.stringify(
    {
      passed: true,
      checks: [
        'Selection and razor tools',
        'hover labels and live shortcut hints',
        'click-to-cut with linked audio',
        'Ctrl+Alt+W assignment',
        'exact modifiers',
        'conflict keep/reassign',
        'restore defaults',
        'alternate Ctrl+Alt+Shift binding',
        'persistence after reload',
        'Escape cancellation',
        'native text editing protection',
        'copy/cut/paste/duplicate',
        'undo/redo',
        'settings shortcut',
        '1366x768 layout',
      ],
      errors,
    },
    null,
    2,
  ),
);
if (errors.length) throw Error(errors.join('\n'));
console.log('PASS: customizable shortcuts, tooltips, razor and clipboard in native Shrapwill');
await browser.close();
