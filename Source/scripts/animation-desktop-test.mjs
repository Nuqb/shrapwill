import { chromium, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { qaDir, debugUrl } from './test-support/paths.mjs';
const browser = await chromium.connectOverCDP(debugUrl());
try {
  const page = browser.contexts()[0].pages()[0];
  const invoke = (cmd, args = {}) =>
    page.evaluate(({ cmd, args }) => window.__TAURI_INTERNALS__.invoke(cmd, args), { cmd, args });
  const snapshot = async () => (await invoke('startup')).snapshot;
  await invoke('open_project', { path: path.join(qaDir, 'Validation.cutline') });
  if (await page.locator('.launcher').count()) await page.locator('.launcher-top>button').click();
  const original = (await snapshot()).project;
  const track = original.tracks.find((t) => t.kind === 'video' && t.clips.some((c) => !c.title));
  const clip = track.clips.find((c) => !c.title);
  const current = async () =>
    (await snapshot()).project.tracks.flatMap((t) => t.clips).find((c) => c.id === clip.id);
  const timing = (p) =>
    p.tracks.flatMap((t) =>
      t.clips.map((c) => [c.id, c.start, c.duration, c.sourceIn, c.mediaId, c.link]),
    );
  const primary = (name) =>
    page.locator('.inspector-tabs').getByRole('button', { name, exact: true });
  const select = async () => page.locator('[data-clip-id="' + clip.id + '"]').click();
  await select();
  await primary('Video').click();
  await expect(page.getByLabel('Clip transition', { exact: true })).toHaveCount(0);
  await primary('Animation').click();
  await expect(page.getByLabel('Clip transition', { exact: true })).toHaveCount(0);
  const revision = (await snapshot()).revision;
  await page.getByRole('radio', { name: 'No Motion', exact: true }).click();
  expect((await snapshot()).revision).toBe(revision);
  await page.getByRole('tab', { name: 'Keyframe Presets', exact: true }).click();
  const playhead = await page.locator('.player-status>span:first-child').textContent();
  await page.getByRole('radio', { name: 'Slide Left', exact: true }).click();
  await expect
    .poll(async () => (await current()).props.animation?.keyframe)
    .toBe('local-slide-left');
  await expect(page.locator('.player-status>span:first-child')).toHaveText(playhead);
  expect(timing((await snapshot()).project)).toEqual(timing(original));
  const saved = path.join(qaDir, 'Animation-inspector.cutline');
  await invoke('save', { path: saved });
  await invoke('history', { direction: 'undo' });
  expect((await current()).props.animation).toBeNull();
  await invoke('open_project', { path: saved });
  await select();
  await primary('Animation').click();
  expect((await current()).props.animation.keyframe).toBe('local-slide-left');
  await page.getByRole('tab', { name: 'Motion Presets', exact: true }).click();
  await page.getByRole('tab', { name: 'Out', exact: true }).click();
  await page.getByRole('radio', { name: 'Fade In', exact: true }).click();
  await expect
    .poll(async () => (await current()).props.animation?.outPreset)
    .toBe('local-out-local-motion-fade');
  expect((await current()).props.animation.keyframe).toBe('local-slide-left');
  expect(timing((await snapshot()).project)).toEqual(timing(original));
  await invoke('history', { direction: 'undo' });
  expect((await current()).props.animation.outPreset).toBe('');
  await invoke('edit', { operation: { type: 'set_track', id: track.id, locked: true } });
  await expect(page.getByRole('radio', { name: 'Fade In', exact: true })).toBeDisabled();
  await page
    .locator('.inspector')
    .screenshot({ path: path.join(qaDir, 'inspector-animation.png'), animations: 'disabled' });
  const persisted = JSON.parse(await fs.readFile(saved, 'utf8'));
  expect(
    persisted.tracks.flatMap((t) => t.clips).find((c) => c.id === clip.id).props.animation.keyframe,
  ).toBe('local-slide-left');
  console.log(
    'PASS: Animation placement, In/Out and keyframe selection, source/timing preservation, Undo, save/reopen and locks.',
  );
} finally {
  await browser.close();
}
