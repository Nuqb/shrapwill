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
  assert.deepEqual(errors, []);
  console.log(
    'Update screens, startup check, portable staging, keep-editing cancellation and save-before-restart passed at both workspace sizes.',
  );
} finally {
  await browser?.close();
  await server.close();
}
