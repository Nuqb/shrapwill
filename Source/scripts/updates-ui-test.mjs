import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium, expect } from '@playwright/test';
import { createServer } from 'vite';
import { sourceRoot, qaDir } from './test-support/paths.mjs';

const directory = path.join(qaDir, 'updates');
fs.mkdirSync(directory, { recursive: true });
const server = await createServer({
  root: sourceRoot,
  cacheDir: path.join(directory, 'vite-cache'),
  server: { host: '127.0.0.1', port: 0, hmr: false, watch: { ignored: ['**/*'] } },
});
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (const mode of ['portable', 'installed']) {
    await page.goto(`${server.resolvedUrls.local[0]}scripts/updates-ui.html?mode=${mode}`);
    await expect(page.getByRole('button', { name: 'Download update', exact: true })).toBeVisible();
    await expect(page.getByText('Checks public releases on GitHub.', { exact: false })).toHaveCount(
      0,
    );
    await expect(page.getByRole('switch', { name: 'Automatic update checks' })).toBeChecked();
    assert.equal(
      await page.evaluate(
        () => window.updateFixture.calls.filter((c) => c === 'check_for_updates').length,
      ),
      1,
    );
    assert.equal(
      await page.evaluate(() => window.updateFixture.calls.includes('download_app_update')),
      false,
    );
    await page.getByRole('button', { name: 'Download update', exact: true }).click();
    const install = page.getByRole('button', {
      name: mode === 'portable' ? 'Install for next launch' : 'Install and restart',
      exact: true,
    });
    await expect(install).toBeVisible();
    for (const [width, height] of [
      [1366, 768],
      [1920, 1080],
    ]) {
      await page.setViewportSize({ width, height });
      const box = await page.getByRole('dialog').boundingBox();
      assert.ok(
        box.x >= 0 && box.y >= 0 && box.x + box.width <= width && box.y + box.height <= height,
      );
      await page.screenshot({ path: path.join(directory, `${mode}-${width}.png`) });
    }
    await install.click();
    if (mode === 'portable') {
      await expect(page.getByRole('alertdialog')).toHaveCount(0);
      assert.equal(await page.evaluate(() => window.updateFixture.dirty), true);
      await page.getByRole('button', { name: 'Restart now', exact: true }).click();
    }
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await page.getByRole('button', { name: /Keep editing/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    assert.equal(
      await page.evaluate(
        (mode) =>
          window.updateFixture.calls.includes(
            mode === 'portable' ? 'restart_for_update' : 'install_app_update',
          ),
        mode,
      ),
      false,
    );
    await page
      .getByRole('button', {
        name: mode === 'portable' ? 'Restart now' : 'Install and restart',
        exact: true,
      })
      .click();
    await page.getByRole('button', { name: 'Save changes', exact: true }).click();
    await expect
      .poll(() => page.evaluate(() => window.updateFixture.calls.includes('save-fixture')))
      .toBe(true);
    const calls = await page.evaluate(() => window.updateFixture.calls);
    assert.ok(
      calls.indexOf('save-fixture') <
        calls.lastIndexOf(mode === 'portable' ? 'restart_for_update' : 'install_app_update'),
    );
  }
  await page.goto(`${server.resolvedUrls.local[0]}scripts/updates-ui.html`);
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.evaluate(() => {
    window.exitSnapshots = [];
    new MutationObserver((records) => {
      for (const record of records)
        for (const node of record.addedNodes) {
          if (!(node instanceof HTMLElement) || !node.hasAttribute('data-overlay-exit')) continue;
          window.exitSnapshots.push({
            inert: node.inert,
            hidden: node.getAttribute('aria-hidden'),
            ids: node.querySelectorAll('[id]').length,
            width: node.getBoundingClientRect().width,
          });
        }
    }).observe(document.body, { childList: true });
  });
  await page.getByRole('button', { name: 'Close settings', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const exits = await page.evaluate(() => window.exitSnapshots);
  assert.ok(exits.length > 0, 'Closing a live dialog must animate an exit visual');
  assert.ok(
    exits.every((exit) => exit.inert && exit.hidden === 'true' && exit.ids === 0 && exit.width > 0),
  );
  // Exit visuals must be hidden from assistive technology and cannot accept input.
  for (const snapshot of await page.locator('[data-overlay-exit]').all()) {
    assert.equal(await snapshot.getAttribute('aria-hidden'), 'true');
    assert.equal(await snapshot.evaluate((node) => node.inert), true);
    assert.equal(await snapshot.locator('[id]').count(), 0);
  }
  await expect(page.locator('[data-overlay-exit]')).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await expect(page.getByRole('dialog')).toBeVisible();
  assert.equal(
    await page
      .locator('.modal-backdrop')
      .evaluate((node) => node.getAnimations({ subtree: true }).length),
    0,
  );
  await page.getByRole('button', { name: 'Close settings', exact: true }).click();
  await expect(page.locator('[data-overlay-exit]')).toHaveCount(0);
  assert.deepEqual(errors, []);
  console.log(
    'Update screens, startup check, portable staging, keep-editing cancellation and save-before-restart passed at both workspace sizes.',
  );
} finally {
  await browser?.close();
  await server.close();
}
