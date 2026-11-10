import { qaDir, outputPath, debugUrl } from './test-support/paths.mjs';
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

// Use an isolated app/profile. The save mode expects the actual window X to have opened the dialog.
const mode = process.argv[2] || 'save';
const qa = qaDir,
  projectPath = path.join(qa, 'Close-custom.cutline');
const browser = await chromium.connectOverCDP(debugUrl(9233));
const page = browser.contexts()[0].pages()[0],
  errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const call = (cmd, args = {}) =>
  page.evaluate(({ cmd, args }) => window.__TAURI_INTERNALS__.invoke(cmd, args), { cmd, args });
const current = async () => (await call('startup')).snapshot;
const prompt = () => page.getByRole('alertdialog');
const requestClose = () => call('plugin:event|emit', { event: 'close-requested', payload: null });
const keep = () => prompt().getByRole('button', { name: /^Keep editing/ });
if (mode === 'save-event') {
  await page.waitForSelector('.launcher');
  await call('open_project', { path: path.join(qa, 'Validation.cutline') });
  await call('save', { path: projectPath });
  await page.locator('.launcher-top>button').click();
  await call('edit', { operation: { type: 'rename', name: 'A moment worth saving' } });
  await requestClose();
}
if (mode === 'discard') {
  await page.waitForSelector('.launcher');
  await call('open_project', { path: projectPath });
  await call('edit', { operation: { type: 'rename', name: 'Discarded test edit' } });
  await call('autosave');
  await requestClose();
  await prompt().waitFor();
  const closed = page.waitForEvent('close', { timeout: 10000 });
  await prompt().getByRole('button', { name: 'Discard changes', exact: true }).click();
  await closed;
  assert.notEqual(JSON.parse(await fs.readFile(projectPath, 'utf8')).name, 'Discarded test edit');
  console.log('PASS: Discard changes closed the app without saving the generated test edit');
  await browser.close().catch(() => {});
  process.exit(0);
}
await prompt().waitFor();
assert.match(await prompt().innerText(), /Save changes before closing/);
await page.setViewportSize({ width: 1366, height: 768 });
assert.equal(await page.locator('.unsaved-dialog').count(), 1);
assert.equal(await prompt().getByRole('button', { name: 'Save changes', exact: true }).count(), 1);
assert.equal(
  await prompt().getByRole('button', { name: 'Discard changes', exact: true }).count(),
  1,
);
assert.equal(
  await prompt()
    .getByRole('button', { name: /^Keep editing/ })
    .count(),
  1,
);
await page.screenshot({ path: outputPath('Shrapwill-unsaved-changes.png') });
// Keyboard focus remains inside the dialog, and Escape behaves like Keep editing.
for (let i = 0; i < 7; i++) {
  await page.keyboard.press('Tab');
  assert.equal(
    await page.evaluate(() => !!document.activeElement.closest('.unsaved-dialog')),
    true,
  );
}
await keep().click();
assert.equal(await prompt().count(), 0);
assert.equal((await current()).dirty, true);
await requestClose();
await prompt().waitFor();
await page.keyboard.press('Escape');
assert.equal(await prompt().count(), 0);
assert.equal((await current()).dirty, true);
await requestClose();
await requestClose();
await prompt().waitFor();
assert.equal(await prompt().count(), 1);
await prompt().getByRole('button', { name: 'Close unsaved changes dialog', exact: true }).click();
assert.equal((await current()).dirty, true);
// New project uses the same custom dialog and honours Keep editing.
const before = await current();
await page.keyboard.press('Control+n');
await page.getByRole('button', { name: /Create project/ }).click();
await prompt().waitFor();
assert.match(await prompt().innerText(), /before continuing/);
await keep().click();
assert.equal((await current()).project.id, before.project.id);
await page.getByRole('button', { name: 'Close new project dialog', exact: true }).click();
// A real save failure must leave the editor and the dialog open.
try {
  await fs.chmod(projectPath, 0o444);
  await requestClose();
  await prompt().waitFor();
  await prompt().getByRole('button', { name: 'Save changes', exact: true }).click();
  await prompt().getByRole('alert').waitFor();
  assert.equal((await current()).dirty, true);
  assert.match(await prompt().getByRole('alert').innerText(), /not saved/);
} finally {
  await fs.chmod(projectPath, 0o666);
}
const closed = page.waitForEvent('close', { timeout: 10000 });
await prompt().getByRole('button', { name: 'Save changes', exact: true }).click();
await closed;
assert.equal(JSON.parse(await fs.readFile(projectPath, 'utf8')).name, 'A moment worth saving');
assert.deepEqual(errors, []);
await fs.writeFile(
  path.join(qa, 'close-results.json'),
  JSON.stringify(
    {
      passed: true,
      checks: [
        mode === 'save-event'
          ? 'close event opens custom prompt'
          : 'actual native X opens custom prompt',
        'themed dialog at 1366x768',
        'focus trap',
        'Keep editing retains edits',
        'Escape cancellation',
        'repeated X does not duplicate dialogs',
        'dialog close button cancels',
        'new-project custom confirmation',
        'save failure retains edits',
        'save and exit',
      ],
      errors,
    },
    null,
    2,
  ),
);
console.log(
  'PASS: custom unsaved dialog, cancel/Escape, save failure protection, save and application exit',
);
await browser.close().catch(() => {});
