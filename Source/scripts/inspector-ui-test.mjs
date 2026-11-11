import { chromium, expect } from '@playwright/test';
import { createServer } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { qaDir, sourceRoot } from './test-support/paths.mjs';
const directory = path.join(qaDir, 'inspector-ui');
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
  const page = await browser.newPage({ viewport: { width: 820, height: 980 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(server.resolvedUrls.local[0] + 'scripts/inspector-ui.html');
  await expect(page.getByLabel('Width', { exact: true })).toBeVisible();
  const mainTab = (name) =>
    page.locator('.inspector-tabs').getByRole('button', { name, exact: true });
  for (const width of [300, 820]) {
    await page.setViewportSize({ width, height: 980 });
    for (const name of ['Video', 'Speed', 'Animation', 'Color', 'Audio']) {
      await mainTab(name).click();
      await expect(page.getByLabel('Clip transition', { exact: true })).toHaveCount(0);
      await expect
        .poll(() => mainTab(name).evaluate((el) => getComputedStyle(el).backgroundColor))
        .toBe('rgb(48, 54, 56)');
      if (name === 'Color')
        await expect
          .poll(
            async () =>
              page
                .locator('.color-preset-art canvas')
                .first()
                .evaluate((canvas) => canvas.getContext('2d').getImageData(0, 0, 1, 1).data[3]),
            { timeout: 30000 },
          )
          .toBe(255);
      await page.mouse.move(0, 0);
      await page.screenshot({
        animations: 'disabled',
        path: path.join(directory, name + '-' + width + '.png'),
      });
      const overflow = await page
        .locator('.inspector')
        .evaluate((el) => el.scrollWidth > el.clientWidth + 1);
      expect(overflow).toBe(false);
    }
    await mainTab('Speed').click();
    await page.getByRole('tab', { name: 'Speed Ramping', exact: true }).click();
    await page.getByRole('radio', { name: 'Montage', exact: true }).click();
    await expect(page.getByRole('img', { name: 'Speed ramp graph' })).toBeVisible();
    await page.screenshot({
      animations: 'disabled',
      path: path.join(directory, 'Ramping-' + width + '.png'),
    });
    await expect(page.getByRole('switch', { name: 'Reverse Speed', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Apply speed', exact: true })).toHaveCount(0);
    await mainTab('Animation').click();
    const beforeHover = await page.evaluate(() => window.inspectorFixture.revision());
    const motionFade = page.getByRole('radio', { name: 'Fade In', exact: true });
    const picture = motionFade.locator('svg > g');
    for (const direction of ['In', 'Out']) {
      await page.getByRole('tab', { name: direction, exact: true }).click();
      await motionFade.hover();
      await page.waitForTimeout(150);
      const first = Number(await picture.getAttribute('opacity'));
      await page.waitForTimeout(200);
      const second = Number(await picture.getAttribute('opacity'));
      expect(direction === 'In' ? second > first : second < first).toBe(true);
      await page.mouse.move(0, 0);
      await expect(picture).toHaveAttribute('opacity', '0.5');
    }
    expect(await page.evaluate(() => window.inspectorFixture.revision())).toBe(beforeHover);
    await page.getByRole('tab', { name: 'Out', exact: true }).click();
    expect(await page.locator('.animation-preset-grid button').count()).toBeGreaterThan(20);
    await page.getByRole('tab', { name: 'Keyframe Presets', exact: true }).click();
    await expect(page.locator('.animation-preset-grid button')).toHaveCount(12);
    const guides = await page
      .locator('.keyframe-direction-guide path')
      .evaluateAll((els) => els.map((el) => el.getAttribute('d')));
    expect(new Set(guides).size).toBe(11);
    const slide = page.getByRole('radio', { name: 'Slide Left', exact: true });
    await slide.hover();
    const moving = slide.locator('.keyframe-moving-picture');
    const pose = await moving.getAttribute('transform');
    await expect.poll(() => moving.getAttribute('transform')).not.toBe(pose);
    await page.mouse.move(0, 0);
    await expect(moving).toHaveAttribute('transform', 'translate(50 32)');
    expect(await page.evaluate(() => window.inspectorFixture.revision())).toBe(beforeHover);
    const previewBefore = await page.evaluate(() => window.inspectorFixture.preview());
    await page.getByRole('radio', { name: 'Slide Left', exact: true }).click();
    expect(await page.evaluate(() => window.inspectorFixture.preview())).toEqual({
      drafts: previewBefore.drafts + 1,
      timeline: previewBefore.timeline + 1,
    });
    await page.screenshot({
      animations: 'disabled',
      path: path.join(directory, 'Keyframes-' + width + '.png'),
    });
    await mainTab('Video').click();
    await expect(page.getByLabel('Clip transition', { exact: true })).toHaveCount(0);
    await mainTab('Color').click();
    const grid = page.locator('.color-preset-strip');
    expect(await grid.evaluate((el) => getComputedStyle(el).display)).toBe('grid');
    expect(await grid.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    for (const name of ['LUT', 'Color', 'Light', 'Adjust', 'Vignette'])
      await expect(page.getByRole('switch', { name: 'Enable ' + name, exact: true })).toBeChecked();
    for (const name of ['HSL', 'Curves', 'Color Wheels', 'HDR']) {
      await page.getByRole('tab', { name, exact: true }).click();
      await page.screenshot({
        animations: 'disabled',
        path: path.join(directory, name.replaceAll(' ', '-') + '-' + width + '.png'),
      });
    }
    await mainTab('Audio').click();
    for (const name of ['Voice Filters', 'Voice Characters']) {
      await page.getByRole('tab', { name, exact: true }).click();
      const paths = await page
        .locator('[data-voice-icon] path')
        .evaluateAll((els) => els.map((e) => e.getAttribute('d')));
      expect(new Set(paths).size).toBe(paths.length);
      expect(paths.every((path) => typeof path === 'string' && path.length > 20)).toBe(true);
      await page.screenshot({
        animations: 'disabled',
        path: path.join(directory, name.replaceAll(' ', '-') + '-' + width + '.png'),
      });
    }
  }
  await mainTab('Color').click();
  await page.getByRole('tab', { name: 'Curves', exact: true }).click();
  await expect(page.locator('.secondary-curve-editor')).toHaveCount(6);
  const scrolling = page.locator('.inspector-scroll');
  await scrolling.evaluate((el) => {
    el.scrollTop = 800;
  });
  await expect(page.getByRole('tab', { name: 'HSL', exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'HSL', exact: true }).click();
  expect(await scrolling.evaluate((el) => el.scrollTop)).toBe(0);
  await page.getByRole('tab', { name: 'Curves', exact: true }).click();
  const curve = page.getByRole('img', { name: 'Master curve', exact: true });
  const box = await curve.boundingBox();
  const before = await page.evaluate(() => window.inspectorFixture.revision());
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.3);
  await page.mouse.up();
  expect(await page.evaluate(() => window.inspectorFixture.revision())).toBe(before + 1);
  expect(
    await page.evaluate(() => window.inspectorFixture.current().props.grade.curves[0][2]),
  ).toBeGreaterThan(0.6);
  await page.getByRole('tab', { name: 'Color Wheels', exact: true }).click();
  const wheel = await page
    .getByRole('img', { name: 'Shadows color wheel', exact: true })
    .boundingBox();
  await page.mouse.click(wheel.x + wheel.width / 2, wheel.y + wheel.height * 0.25);
  expect(
    await page.evaluate(() => window.inspectorFixture.current().props.grade.wheels[0][0]),
  ).toBeGreaterThan(0.1);
  await mainTab('Audio').click();
  await page.getByRole('tab', { name: 'Voice Characters', exact: true }).click();
  await page.getByRole('radio', { name: 'Robot', exact: true }).click();
  await page.evaluate(() => window.inspectorFixture.theme('violet'));
  const accent = await page
    .locator('.audio-voice-check')
    .evaluate((el) => getComputedStyle(el).color);
  expect(accent).toBe('rgb(181, 154, 255)');
  await page.screenshot({
    animations: 'disabled',
    path: path.join(directory, 'Voice-Characters-violet.png'),
  });
  await page.evaluate(() => window.inspectorFixture.lock(true));
  await expect(page.getByRole('radio', { name: 'Robot', exact: true })).toBeDisabled();
  await mainTab('Animation').click();
  await expect(page.getByRole('radio', { name: 'Fade In', exact: true })).toBeDisabled();
  await page.evaluate(() => window.inspectorFixture.lock(false));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const reduced = page.getByRole('radio', { name: 'Fade In', exact: true });
  await reduced.hover();
  const still = reduced.locator('svg > g');
  const reducedPose = await still.getAttribute('opacity');
  await page.waitForTimeout(200);
  expect(await still.getAttribute('opacity')).toBe(reducedPose);
  expect(errors).toEqual([]);
  console.log(
    'PASS: inspector layouts, unique SVG artwork, theme accent, editable curves/wheels, single commits, and locked controls.',
  );
} finally {
  await browser?.close();
  await server.close();
}
