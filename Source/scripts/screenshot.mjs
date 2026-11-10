import { qaPath, outputPath, debugUrl } from './test-support/paths.mjs';
import { chromium } from 'playwright';
import path from 'node:path';
const b = await chromium.connectOverCDP(debugUrl(9223));
const p = b.contexts()[0].pages()[0];
await p.evaluate(() =>
  localStorage.setItem('cutline-layout', JSON.stringify({ left: 340, right: 280, bottom: 380 })),
);
await p.reload();
await p.waitForSelector('.launcher');
await p.evaluate(
  (path) => window.__TAURI_INTERNALS__.invoke('open_project', { path }),
  qaPath('Reference-100-clips.cutline'),
);
await p.locator('.launcher-top>button').click();
await p.setViewportSize({ width: 1600, height: 1000 });
await p.getByRole('button', { name: 'Main picture, Video 1', exact: true }).first().click();
await p.locator('.ruler').click({ position: { x: 142 + 165 * 1.5, y: 14 } });
await p.waitForTimeout(1000);
await p.screenshot({ path: outputPath('Cutline.png') });
await b.close();
