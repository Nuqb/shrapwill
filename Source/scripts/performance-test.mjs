import { qaDir, debugUrl } from './test-support/paths.mjs';
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const qa = qaDir;
const browser = await chromium.connectOverCDP(debugUrl(9223));
const page = browser.contexts()[0].pages()[0];
const cd = await browser.newBrowserCDPSession();
const invoke = (cmd, args = {}) =>
  page.evaluate(({ cmd, args }) => window.__TAURI_INTERNALS__.invoke(cmd, args), { cmd, args });
async function sample(label) {
  const { processInfo } = await cd.send('SystemInfo.getProcessInfo');
  const pids = processInfo.map((p) => p.id);
  const data = execFileSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-Command',
      `$processes = Get-Process -Id ${pids.join(',')} -ErrorAction SilentlyContinue; $appProcess = Get-Process -Name cutline -ErrorAction SilentlyContinue; @($processes) + @($appProcess) | Select-Object Id,ProcessName,WorkingSet64,PrivateMemorySize64,CPU | ConvertTo-Json -Compress`,
    ],
    { encoding: 'utf8', windowsHide: true },
  );
  const procs = JSON.parse(data);
  return {
    label,
    time: Date.now(),
    workingSetMB: procs.reduce((sum, p) => sum + p.WorkingSet64, 0) / 1048576,
    privateMB: procs.reduce((sum, p) => sum + p.PrivateMemorySize64, 0) / 1048576,
    processes: procs,
  };
}
await page.waitForTimeout(1500);
const idle = await sample('idle');
await page.evaluate(() => {
  window.__qaVideoPlayers = [];
  const original = document.createElement.bind(document);
  document.createElement = function (tag, ...args) {
    const el = original(tag, ...args);
    if (tag === 'video') window.__qaVideoPlayers.push(el);
    return el;
  };
});
await invoke('open_project', { path: path.join(qa, 'Reference-100-clips.cutline') });
await page.waitForTimeout(1500);
await page.setViewportSize({ width: 1440, height: 900 });
if (await page.locator('.launcher').count()) await page.locator('.launcher-top>button').click();
await page.evaluate(() => {
  window.__inputTimings = [];
  try {
    new PerformanceObserver((list) => {
      for (const event of list.getEntries())
        window.__inputTimings.push({ name: event.name, duration: event.duration });
    }).observe({ type: 'event', durationThreshold: 16 });
  } catch {}
});
const samples = [await sample('loaded')];
const s = await invoke('startup');
if (s.snapshot.project.tracks.flatMap((t) => t.clips).length !== 100)
  throw Error('Reference does not contain 100 clips');
const responsiveness = [];
for (let i = 0; i < 10; i++) {
  const time = performance.now();
  await page
    .locator('.library-tabs button')
    .nth(i % 5)
    .click();
  responsiveness.push(performance.now() - time);
}
await page.locator('.library-tabs button').first().click();
await page.locator('.play-button').click();
await page.waitForTimeout(5000);
samples.push(await sample('playing-5s'));
await page.waitForTimeout(5000);
samples.push(await sample('playing-10s'));
await page.waitForTimeout(5000);
samples.push(await sample('playing-15s'));
await page.waitForTimeout(5000);
samples.push(await sample('playing-20s'));
await page.locator('.play-button').click();
await page.waitForTimeout(1000);
const sorted = [...responsiveness].sort((a, b) => a - b);
const metrics = await page.evaluate(() => ({
  frame: document.querySelector('.player-status>span')?.textContent,
  visibleClipNodes: document.querySelectorAll('.timeline-clip').length,
  canvas: [document.querySelector('canvas').width, document.querySelector('canvas').height],
  heap: performance.memory?.usedJSHeapSize,
  videoQuality: window.__qaVideoPlayers
    .filter((v) => v.currentSrc)
    .map((v) => ({
      time: v.currentTime,
      readyState: v.readyState,
      total: v.getVideoPlaybackQuality().totalVideoFrames,
      dropped: v.getVideoPlaybackQuality().droppedVideoFrames,
    })),
}));
const inputTimings = await page.evaluate(() => window.__inputTimings);
const inputDurations = inputTimings.map((e) => e.duration).sort((a, b) => a - b);
const stats = {
  idle,
  reference: {
    minutes: 10,
    timelineClips: 100,
    sourceResolution: [1920, 1080],
    previewResolution: [1280, 720],
    videoLayers: 2,
    titleLayers: 1,
    audioLayers: 2,
  },
  samples,
  uiActionMilliseconds: responsiveness,
  p95ActionMs: sorted[Math.ceil(sorted.length * 0.95) - 1],
  inputTimings,
  p95BrowserInputMs: inputDurations.length
    ? inputDurations[Math.ceil(inputDurations.length * 0.95) - 1]
    : null,
  metrics,
  peakWorkingSetMB: Math.max(...samples.map((s) => s.workingSetMB)),
  note: 'Action timings include the automation round trip. Browser input timings measure event-to-paint latency and are quantized. Working sets sum the app and its WebView process tree; shared pages may be counted more than once.',
};
await page.screenshot({ path: path.join(qa, 'reference-editor.png') });
await fs.writeFile(path.join(qa, 'performance-results.json'), JSON.stringify(stats, null, 2));
console.log(
  JSON.stringify({
    peakWorkingSetMB: stats.peakWorkingSetMB,
    p95ActionMs: stats.p95ActionMs,
    metrics,
  }),
);
await browser.close();
