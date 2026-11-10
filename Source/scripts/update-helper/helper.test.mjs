import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout } from 'node:timers/promises';
import { test } from 'node:test';
import { compileWindowsExecutable } from '../launcher/build.mjs';

async function waitFor(file) {
  for (let attempt = 0; attempt < 200; attempt++) {
    if (fs.existsSync(file)) return;
    await setTimeout(25);
  }
  throw Error('The generated helper fixture did not finish.');
}
test(
  'the update helper waits for its owner and forwards NSIS arguments without closing it',
  { skip: process.platform !== 'win32' },
  async (t) => {
    // Retain isolated child-process fixtures with the other native QA artifacts.
    const fixtures = path.resolve(import.meta.dirname, '../../../QA/updates');
    fs.mkdirSync(fixtures, { recursive: true });
    const root = fs.mkdtempSync(path.join(fixtures, 'helper '));
    const source = path.join(root, 'Fixture.cs'),
      fixture = path.join(root, 'Fixture.exe');
    fs.writeFileSync(
      source,
      `using System; using System.IO; using System.Threading;
    class Fixture { static void Main(string[] args) {
      string output = Environment.GetEnvironmentVariable("SHRAPWILL_HELPER_OUTPUT");
      if (args.Length > 0 && args[0] == "owner") {
        File.WriteAllText(output + ".owner", "ready");
        for (int i = 0; i < 400 && !File.Exists(output + ".release"); i++) Thread.Sleep(25);
      } else File.WriteAllLines(output, args);
    } }`,
    );
    compileWindowsExecutable({ source, destination: fixture });
    const helper = path.join(root, 'UpdateHelper.exe');
    compileWindowsExecutable({
      source: path.join(import.meta.dirname, 'UpdateHelper.cs'),
      destination: helper,
    });
    const output = path.join(root, 'result');
    const options = {
      env: { ...process.env, SHRAPWILL_HELPER_OUTPUT: output },
      windowsHide: true,
      stdio: 'ignore',
    };
    const owner = spawn(fixture, ['owner'], options);
    const exited = once(owner, 'exit');
    t.after(async () => {
      fs.writeFileSync(output + '.release', 'exit');
      await exited;
    });
    await waitFor(output + '.owner');
    const hash = createHash('sha256').update(fs.readFileSync(fixture)).digest('hex');
    const handoff = spawn(helper, ['installer', String(owner.pid), fixture, hash, root], options);
    const completed = once(handoff, 'exit');
    await setTimeout(250);
    assert.equal(fs.existsSync(output), false, 'installer must wait for the owner');
    assert.equal(process.kill(owner.pid, 0), true, 'helper must not terminate its owner');
    fs.writeFileSync(output + '.release', 'exit');
    await exited;
    const [code] = await completed;
    assert.equal(code, 0);
    await waitFor(output);
    const args = fs.readFileSync(output, 'utf8').trim().split(/\r?\n/);
    assert.deepEqual(args.slice(0, 3), ['/UPDATE', '/P', '/R']);
    // NSIS parses the raw tail itself; the fixture's standard argv parser splits spaces.
    assert.equal(args.slice(3).join(' '), '/D=' + root);
  },
);
