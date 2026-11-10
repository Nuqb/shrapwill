import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { qaDir, sourceRoot } from './test-support/paths.mjs';

fs.mkdirSync(qaDir, { recursive: true });
const work = fs.mkdtempSync(path.join(qaDir, 'transition-sampling-'));
const server = await createServer({
  root: sourceRoot,
  cacheDir: path.join(work, 'vite-cache'),
  server: { host: '127.0.0.1', port: 0, hmr: false, watch: { ignored: ['**/*'] } },
});
let browser;
try {
  await server.listen();
  browser = await chromium.launch({
    ...(process.env.SHRAPWILL_REFERENCE_BROWSER
      ? { executablePath: process.env.SHRAPWILL_REFERENCE_BROWSER }
      : { channel: 'msedge' }),
    headless: true,
  });
  const page = await browser.newPage();
  await page.exposeFunction('portScenes', () => null);
  await page.exposeFunction('portAnalyze', () => ({ eye: [0.5, 0.5], width: 0, height: 0 }));
  await page.goto(`${server.resolvedUrls.local[0]}scripts/ports/validation.html`);
  await page.waitForFunction(() => window.portTest);
  const results = await page.evaluate(async () => {
    const { auditSceneSampling } = await import('/scripts/ports/sampling.mjs');
    return auditSceneSampling(window.portTest.programs, window.portTest.render);
  });
  fs.writeFileSync(path.join(work, 'results.json'), JSON.stringify(results, null, 2));
  const failures = results.filter((row) => row.collapsed.length);
  assert.equal(failures.length, 0, JSON.stringify(failures, null, 2));
  console.log(
    `PASS: ${results.length} transition programs at 61 phases; no unintended line collapse.`,
  );
  console.log(`Results: ${work}`);
} finally {
  await browser?.close();
  await server.close();
}
