import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { setTimeout } from 'node:timers/promises';
import { buildLauncher, compileWindowsExecutable } from './build.mjs';
import { publishRelease } from '../release/publish.mjs';

const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

async function waitForFile(file) {
  for (let attempt = 0; attempt < 200; attempt++) {
    if (fs.existsSync(file)) return;
    await setTimeout(25);
  }
  throw Error(`Test child did not write ${file}`);
}

function testEditor(root, label) {
  const source = path.join(root, `${label}.cs`);
  const destination = path.join(root, `${label}.exe`);
  fs.writeFileSync(
    source,
    `using System; using System.IO; using System.Diagnostics; using System.Threading;
    class TestEditor { static void Main(string[] args) {
      string output = Environment.GetEnvironmentVariable("SHRAPWILL_LAUNCHER_TEST_OUTPUT");
      File.WriteAllLines(output, new string[] { "${label}", Environment.CurrentDirectory, Process.GetCurrentProcess().Id.ToString() });
      File.WriteAllLines(output + ".args", args);
      for (int i = 0; i < 400 && !File.Exists(output + ".release"); i++) Thread.Sleep(25);
      File.WriteAllText(output + ".done", "done");
    } }`,
  );
  compileWindowsExecutable({ source, destination });
  return destination;
}

test(
  'the unchanged native launcher opens the new build while an old session keeps running',
  { skip: process.platform !== 'win32' },
  async (t) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'shrapwill launcher '));
    const firstOutput = path.join(root, 'first-output');
    const secondOutput = path.join(root, 'second-output');
    t.after(async () => {
      for (const output of [firstOutput, secondOutput])
        fs.writeFileSync(`${output}.release`, 'exit');
      for (const output of [firstOutput, secondOutput]) {
        if (fs.existsSync(output)) await waitForFile(`${output}.done`);
      }
      await setTimeout(100);
      fs.rmSync(root, { recursive: true, force: true });
    });
    const launcher = buildLauncher(sourceRoot);
    const appDirectory = path.join(root, 'App');
    const first = publishRelease({
      executable: testEditor(root, 'first'),
      launcher,
      appDirectory,
      version: '1.0.0',
    });
    const entry = path.join(appDirectory, 'shrapwill.exe');
    const args = [
      'a project with spaces.cutline',
      'quote"inside',
      'C:\\trailing path\\',
      '',
      '日本語',
    ];
    function launch(output) {
      const result = spawnSync(entry, args, {
        stdio: 'ignore',
        env: { ...process.env, SHRAPWILL_LAUNCHER_TEST_OUTPUT: output },
        windowsHide: true,
      });
      assert.equal(result.status, 0, result.error?.message);
    }
    launch(firstOutput);
    await waitForFile(`${firstOutput}.args`);
    const firstPid = Number(fs.readFileSync(firstOutput, 'utf8').trim().split(/\r?\n/)[2]);
    const second = publishRelease({
      executable: testEditor(root, 'second'),
      launcher,
      appDirectory,
      version: '1.0.1',
    });
    assert.notEqual(first, second);
    // The online updater uses a version directory, while older local builds
    // used flat executable names. Both must work with the stable launcher.
    const versionDirectory = path.join(appDirectory, 'releases', 'shrapwill-1.0.1-test');
    fs.mkdirSync(versionDirectory, { recursive: true });
    fs.copyFileSync(second, path.join(versionDirectory, 'shrapwill.exe'));
    fs.writeFileSync(
      path.join(appDirectory, 'current-release.txt'),
      'releases/shrapwill-1.0.1-test/shrapwill.exe\n',
    );
    assert.equal(process.kill(firstPid, 0), true);
    assert.equal(fs.existsSync(`${firstOutput}.done`), false);
    launch(secondOutput);
    await waitForFile(`${secondOutput}.args`);
    assert.equal(fs.readFileSync(secondOutput, 'utf8').split(/\r?\n/)[0], 'second');
    assert.equal(fs.readFileSync(secondOutput, 'utf8').split(/\r?\n/)[1], appDirectory);
    assert.deepEqual(
      fs
        .readFileSync(`${secondOutput}.args`, 'utf8')
        .replace(/\r\n/g, '\n')
        .split('\n')
        .slice(0, -1),
      args,
    );
  },
);
