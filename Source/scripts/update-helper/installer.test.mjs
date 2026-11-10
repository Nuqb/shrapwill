import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout } from 'node:timers/promises';
import { test } from 'node:test';
import { compileWindowsExecutable } from '../launcher/build.mjs';

async function waitFor(file) {
  for (let attempt = 0; attempt < 200; attempt++) {
    if (fs.existsSync(file)) return;
    await setTimeout(25);
  }
  throw Error('Generated installer fixture did not start.');
}
test(
  'the installer refuses a running editor without killing it, then succeeds after normal exit',
  { skip: process.platform !== 'win32' },
  async (t) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'shrapwill installer '));
    const source = path.join(root, 'Editor.cs'),
      editor = path.join(root, 'editor.exe');
    fs.writeFileSync(
      source,
      `using System; using System.IO; using System.Threading;
    class Editor { static void Main() {
      string root = AppDomain.CurrentDomain.BaseDirectory;
      File.WriteAllText(Path.Combine(root, "ready"), "ready");
      for (int i = 0; i < 400 && !File.Exists(Path.Combine(root, "release")); i++) Thread.Sleep(25);
    } }`,
    );
    compileWindowsExecutable({ source, destination: editor });
    const installer = path.join(root, 'installer.exe'),
      script = path.join(root, 'test.nsi');
    fs.writeFileSync(
      script,
      `Unicode true
    !include LogicLib.nsh
    !include "Win\\RestartManager.nsh"
    !include "${path.join(import.meta.dirname, 'installer-hooks.nsh')}"
    Name "Shrapwill generated installer fixture"
    OutFile "${installer}"
    RequestExecutionLevel user
    SilentInstall silent
    Section
      !insertmacro CheckIfAppIsRunning "${editor}" "Generated editor"
      FileOpen $9 "${path.join(root, 'installed')}" w
      FileWrite $9 "installed"
      FileClose $9
    SectionEnd
  `,
    );
    const compiler = path.join(process.env.LOCALAPPDATA, 'tauri/NSIS/Bin/makensis.exe');
    const build = spawnSync(compiler, ['/V2', script], { encoding: 'utf8', windowsHide: true });
    assert.equal(build.status, 0, build.error?.message || build.stderr || build.stdout);
    const owner = spawn(editor, [], { stdio: 'ignore', windowsHide: true });
    const exited = once(owner, 'exit');
    t.after(async () => {
      fs.writeFileSync(path.join(root, 'release'), 'exit');
      await exited;
      fs.rmSync(root, { recursive: true, force: true });
    });
    await waitFor(path.join(root, 'ready'));
    const blocked = spawnSync(installer, [], { windowsHide: true });
    assert.notEqual(blocked.status, 0);
    assert.equal(fs.existsSync(path.join(root, 'installed')), false);
    assert.equal(process.kill(owner.pid, 0), true, 'installer must preserve running editor');
    fs.writeFileSync(path.join(root, 'release'), 'exit');
    await exited;
    const installed = spawnSync(installer, [], { windowsHide: true });
    assert.equal(installed.status, 0);
    assert.equal(fs.readFileSync(path.join(root, 'installed'), 'utf8'), 'installed');
  },
);
