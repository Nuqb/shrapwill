import { chromium, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { qaDir, debugUrl } from './test-support/paths.mjs';
const browser = await chromium.connectOverCDP(debugUrl());
try {
  const page = browser.contexts()[0].pages()[0];
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const invoke = (cmd, args = {}) =>
    page.evaluate(({ cmd, args }) => window.__TAURI_INTERNALS__.invoke(cmd, args), { cmd, args });
  const snapshot = async () => (await invoke('startup')).snapshot;
  await invoke('open_project', { path: path.join(qaDir, 'Validation.cutline') });
  if (await page.locator('.launcher').count())
    await page.getByRole('button', { name: 'Back to editor', exact: true }).click();
  const p = (await snapshot()).project;
  const track = p.tracks.find((t) => t.kind === 'video' && t.clips.some((c) => !c.title));
  const clip = track.clips.find((c) => !c.title);
  const current = async () =>
    (await snapshot()).project.tracks.flatMap((t) => t.clips).find((c) => c.id === clip.id);
  await page.locator('[data-clip-id="' + clip.id + '"]').click();
  const primary = (name) =>
    page.locator('.inspector-tabs').getByRole('button', { name, exact: true });
  await primary('Video').click();
  await page.getByLabel('Width', { exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(async () => (await current()).props.scale).toBe(clip.props.scale + 0.01);
  await invoke('history', { direction: 'undo' });
  await primary('Color').click();
  await page.getByRole('tab', { name: 'HSL', exact: true }).click();
  await page.getByRole('radio', { name: 'Blue', exact: true }).click();
  await page.getByLabel('Hue', { exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(async () => (await current()).props.grade.hsl[5][0]).toBe(0.01);
  await invoke('history', { direction: 'undo' });
  await page.getByRole('tab', { name: 'Curves', exact: true }).click();
  const curve = await page.getByRole('img', { name: 'Master curve', exact: true }).boundingBox();
  const revision = (await snapshot()).revision;
  await page.mouse.move(curve.x + curve.width / 2, curve.y + curve.height / 2);
  await page.mouse.down();
  await page.mouse.move(curve.x + curve.width / 2, curve.y + curve.height * 0.3);
  await page.mouse.up();
  await expect.poll(async () => (await current()).props.grade.curves[0][2]).toBeGreaterThan(0.6);
  expect((await snapshot()).revision).toBe(revision + 1);
  await invoke('history', { direction: 'undo' });
  await expect.poll(async () => (await current()).props.grade.curves[0][2]).toBe(0.5);
  await page.getByRole('tab', { name: 'Color Wheels', exact: true }).click();
  const wheel = await page
    .getByRole('img', { name: 'Shadows color wheel', exact: true })
    .boundingBox();
  await page.mouse.click(wheel.x + wheel.width / 2, wheel.y + wheel.height * 0.25);
  await expect.poll(async () => (await current()).props.grade.wheels[0][0]).toBeGreaterThan(0.1);
  await invoke('history', { direction: 'undo' });
  expect((await current()).props.grade.wheels[0]).toEqual([0, 0, 0]);
  for (const width of [1366, 1920]) {
    await page.setViewportSize({ width, height: width === 1366 ? 768 : 1080 });
    for (const name of ['Video', 'Speed', 'Animation', 'Color', 'Audio']) {
      await primary(name).click();
      await page.mouse.move(400, 25);
      await page.screenshot({ path: path.join(qaDir, 'inspector-' + name + '-' + width + '.png') });
    }
  }
  await page.getByRole('tab', { name: 'Voice Characters', exact: true }).click();
  await page.getByRole('radio', { name: 'Robot', exact: true }).click();
  const checkColor = await page
    .locator('.audio-voice-check')
    .evaluate((el) => getComputedStyle(el).color);
  expect(checkColor).toBe('rgb(255, 155, 69)');
  const icons = await page
    .locator('[data-voice-icon] path')
    .evaluateAll((els) => els.map((el) => el.getAttribute('d')));
  expect(new Set(icons).size).toBe(icons.length);
  const divider = page.getByRole('separator', { name: 'Resize inspector', exact: true });
  await divider.focus();
  for (let i = 0; i < 10; i++) await page.keyboard.press('Shift+ArrowLeft');
  for (const [primaryName, areaName] of [
    ['Video', null],
    ['Animation', 'Motion Presets'],
    ['Animation', 'Keyframe Presets'],
    ['Speed', 'Uniform Speed'],
    ['Speed', 'Speed Ramping'],
    ['Color', 'Basic'],
    ['Color', 'HSL'],
    ['Color', 'Curves'],
    ['Color', 'Color Wheels'],
    ['Color', 'HDR'],
    ['Audio', 'Voice Filters'],
    ['Audio', 'Voice Characters'],
  ]) {
    await primary(primaryName).click();
    if (areaName) await page.getByRole('tab', { name: areaName, exact: true }).click();
    await page.mouse.move(400, 25);
    await page.locator('.inspector').screenshot({
      path: path.join(
        qaDir,
        'inspector-panel-' + (areaName || primaryName).replaceAll(' ', '-') + '.png',
      ),
    });
  }
  await invoke('edit', { operation: { type: 'set_track', id: track.id, locked: true } });
  await expect(page.getByRole('radio', { name: 'Robot', exact: true })).toBeDisabled();
  await primary('Color').click();
  await page.getByRole('tab', { name: 'Color Wheels', exact: true }).click();
  await expect(page.getByLabel('Shadows Red', { exact: true })).toBeDisabled();
  expect(errors).toEqual([]);
  console.log(
    'PASS: native transform/HSL edits, curve and wheel Undo, single-commit gestures, accent color, SVG artwork, locks and both workspace sizes.',
  );
} finally {
  await browser.close();
}
