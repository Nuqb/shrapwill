import { chromium, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { qaDir, debugUrl } from './test-support/paths.mjs';
import { defaults } from '../src/types.ts';
import voiceCatalog from '../src/features/audio/presets.json' with { type: 'json' };
const { filters: voiceFilters, characters: voiceCharacters } = voiceCatalog;

const browser = await chromium.connectOverCDP(debugUrl());
const page = browser.contexts()[0].pages()[0];
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const invoke = (cmd, args = {}) =>
  page.evaluate(({ cmd, args }) => window.__TAURI_INTERNALS__.invoke(cmd, args), { cmd, args });
const fixture = JSON.parse(await fs.readFile(path.join(qaDir, 'Validation.cutline'), 'utf8'));
const asset = fixture.assets.find((a) => a.hasAudio);
const original = fixture.tracks.flatMap((t) => t.clips).find((c) => c.mediaId === asset.id);
const clip = {
  ...original,
  id: 'audio-controls-qa',
  start: 0,
  duration: 90,
  sourceIn: 0,
  props: defaults,
  title: null,
  transition: null,
  audioEnabled: true,
};
const track = { ...fixture.tracks.find((t) => t.kind === 'video'), clips: [clip] };
const project = {
  ...fixture,
  id: 'audio-qa-project',
  name: 'Audio QA',
  magneticTimeline: false,
  assets: [asset],
  tracks: [track],
};
const file = path.join(qaDir, 'Audio-controls.cutline');
await fs.writeFile(file, JSON.stringify(project));
await invoke('open_project', { path: file });
if (await page.locator('.launcher').count())
  await page.getByRole('button', { name: 'Back to editor', exact: true }).click();
await page.locator(`[data-clip-id="${clip.id}"]`).click();
await page.locator('.inspector-tabs').getByRole('button', { name: 'Audio', exact: true }).click();
const current = async () => (await invoke('startup')).snapshot.project.tracks[0].clips[0];
const audioDefaults = structuredClone((await current()).props.audio);
const area = (name) => page.getByRole('tab', { name, exact: true });
await expect(page.getByRole('tablist', { name: 'Audio areas' })).toBeVisible();
await expect(area('Basic')).toHaveAttribute('aria-selected', 'true');
for (const name of [
  'Audio channels',
  'Sound balance',
  'Pitch',
  'Equalizer preset',
  'Auto normalize',
  'Audio ducking',
]) {
  await expect(page.getByLabel(name, { exact: true })).toBeAttached();
}
await expect(page.getByLabel('Normal denoise', { exact: true })).toHaveCount(0);
await expect(page.getByRole('radiogroup', { name: 'Voice filter', exact: true })).toHaveCount(0);
const beforeNavigation = (await invoke('startup')).snapshot;
for (const name of ['Denoise', 'Voice Filters', 'Voice Characters', 'Basic'])
  await area(name).click();
const afterNavigation = (await invoke('startup')).snapshot;
expect(afterNavigation.revision).toBe(beforeNavigation.revision);
expect(afterNavigation.project).toEqual(beforeNavigation.project);
await area('Basic').focus();
await page.keyboard.press('ArrowRight');
await expect(area('Denoise')).toBeFocused();
await expect(area('Denoise')).toHaveAttribute('aria-selected', 'true');
await page.keyboard.press('Home');
await expect(area('Basic')).toBeFocused();
await page.getByLabel('Audio channels', { exact: true }).selectOption('left');
await expect.poll(async () => (await current()).props.audio.channels).toBe('left');
await invoke('history', { direction: 'undo' });
await expect(page.getByLabel('Audio channels', { exact: true })).toHaveValue('stereo');
await page.getByLabel('Pitch', { exact: true }).focus();
await page.keyboard.press('ArrowRight');
await expect.poll(async () => (await current()).props.audio.pitch).toBe(0.1);
await invoke('history', { direction: 'undo' });
await expect(page.getByLabel('Pitch', { exact: true })).toHaveValue('0');
await page.getByLabel('Equalizer preset', { exact: true }).selectOption('Voice');
await expect.poll(async () => (await current()).props.audio.equalizer[6]).toBe(4);
await page.getByRole('switch', { name: 'Auto normalize', exact: true }).check();
await expect.poll(async () => (await current()).props.audio.normalize).toBe(true);
await page.getByRole('switch', { name: 'Audio ducking', exact: true }).check();
await expect(page.getByLabel('Duck amount', { exact: true })).toBeVisible();
await area('Denoise').click();
await expect(page.getByLabel('Volume', { exact: true })).toHaveCount(0);
for (const name of [
  'Denoise intensity',
  'Denoise level',
  'Remove hum',
  'Reduce reverb',
  'De-esser intensity',
])
  await expect(page.getByLabel(name, { exact: true })).toBeAttached();
await page.getByRole('switch', { name: 'Wind removal', exact: true }).check();
await page.getByRole('switch', { name: 'Hum removal', exact: true }).check();
await page.getByLabel('Remove hum', { exact: true }).selectOption('60');
await area('Voice Filters').click();
await expect(
  page.getByRole('radiogroup', { name: 'Voice filter', exact: true }).getByRole('radio'),
).toHaveCount(Object.keys(voiceFilters).length);
await page.getByRole('radio', { name: 'Telephone', exact: true }).click();
await area('Voice Characters').click();
await expect(
  page.getByRole('radiogroup', { name: 'Voice character', exact: true }).getByRole('radio'),
).toHaveCount(Object.keys(voiceCharacters).length);
await page.getByRole('radio', { name: 'Chipmunk', exact: true }).click();
await expect.poll(async () => (await current()).props.audio.voiceCharacter).toBe('chipmunk');
const selectedRevision = (await invoke('startup')).snapshot.revision;
await page.getByRole('radio', { name: 'Chipmunk', exact: true }).click();
expect((await invoke('startup')).snapshot.revision).toBe(selectedRevision);
await page.getByRole('radio', { name: 'Chipmunk', exact: true }).focus();
await page.keyboard.press('ArrowRight');
await expect.poll(async () => (await current()).props.audio.voiceCharacter).toBe('deep');
await invoke('history', { direction: 'undo' });
await expect.poll(async () => (await current()).props.audio.voiceCharacter).toBe('chipmunk');
const saved = (await current()).props.audio;
const prepared = await invoke('prepare_audio', { id: clip.id, settings: saved });
expect((await fs.stat(prepared)).size).toBeGreaterThan(1000);
await invoke('save', { path: file });
await invoke('open_project', { path: file });
await page.locator(`[data-clip-id="${clip.id}"]`).click();
expect((await current()).props.audio).toEqual(saved);
await area('Voice Characters').click();
await invoke('edit', { operation: { type: 'set_track', id: track.id, locked: true } });
await expect(page.getByRole('radio', { name: 'Chipmunk', exact: true })).toBeDisabled();
await area('Basic').click();
await expect(page.getByLabel('Audio channels', { exact: true })).toBeDisabled();
await invoke('edit', { operation: { type: 'set_track', id: track.id, locked: false } });
await page.getByRole('button', { name: 'Reset audio', exact: true }).click();
await expect.poll(async () => (await current()).props.audio).toEqual(audioDefaults);
await invoke('history', { direction: 'undo' });
expect((await current()).props.audio).toEqual(saved);
for (const width of [1366, 1920]) {
  await page.setViewportSize({ width, height: width === 1366 ? 768 : 1080 });
  for (const name of ['Basic', 'Denoise', 'Voice Filters', 'Voice Characters']) {
    await area(name).click();
    await expect(area(name)).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tabpanel')).toHaveCount(1);
    const overflow = await page
      .locator('.audio-inspector')
      .evaluate((el) => el.scrollWidth > el.clientWidth + 1);
    expect(overflow).toBe(false);
    for (const tab of await page
      .getByRole('tablist', { name: 'Audio areas' })
      .getByRole('tab')
      .all()) {
      const textFits = await tab.evaluate((el) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        const text = range.getBoundingClientRect();
        const box = el.getBoundingClientRect();
        return text.left >= box.left - 1 && text.right <= box.right + 1;
      });
      expect(textFits).toBe(true);
    }
    await page.mouse.move(400, 25);
    await page.screenshot({
      path: path.join(qaDir, 'audio-tabs-' + name.replaceAll(' ', '-') + '-' + width + '.png'),
    });
  }
}
await area('Basic').click();
const divider = page.getByRole('separator', { name: 'Resize inspector', exact: true });
await divider.focus();
for (let i = 0; i < 10; i++) await page.keyboard.press('Shift+ArrowLeft');
await expect
  .poll(async () => Number(await divider.getAttribute('aria-valuenow')))
  .toBeGreaterThan(700);
await area('Basic').click();
await page.mouse.move(400, 25);
await page.screenshot({ path: path.join(qaDir, 'audio-tabs-Basic-wide.png') });
await page.locator('.inspector').screenshot({ path: path.join(qaDir, 'audio-tabs-panel.png') });
await page.getByRole('button', { name: 'Setting', exact: true }).click();
await expect(page.getByRole('group', { name: 'Customize equalizer', exact: true })).toBeVisible();
await page.screenshot({ path: path.join(qaDir, 'audio-tabs-equalizer-wide.png') });
await page.getByRole('button', { name: 'Setting', exact: true }).click();
await page.locator('.player-status').click();
await page.keyboard.press('Home');
await page.locator('.play-button').click();
await expect
  .poll(
    async () =>
      Number(
        await page
          .getByRole('meter', { name: 'Preview audio level' })
          .getAttribute('aria-valuenow'),
      ),
    { timeout: 15000, intervals: [100] },
  )
  .toBeGreaterThan(0);
await page.locator('.play-button').click();
if (errors.length) throw Error(errors.join('\n'));
console.log(
  'Audio area tabs, keyboard navigation, isolated settings, Undo, save/reopen, locks, playback and both layouts passed.',
);
await browser.close();
