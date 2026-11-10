import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scanTypescript } from './scan-typescript.mjs';
import { scanRust } from './scan-rust.mjs';

test('TypeScript scanner flags independent functions and ignores nesting inside callbacks', () => {
  const source = `function outer(a,b,c,d,e) {
    if(a) { for(const b of []) { if(b) { while(c) {} } } }
    return () => { if(a) { if(b) {} } };
  }`;
  const findings = scanTypescript(source, 'fixture.ts');
  assert.equal(findings.find((item) => item.rule === 'parameters').value, 5);
  assert.equal(findings.find((item) => item.rule === 'nesting').value, 4);
  assert.equal(findings.filter((item) => item.rule === 'nesting').length, 1);
});

test('function names stay stable when unrelated lines are inserted', () => {
  const source = 'const callback = (a,b,c,d,e) => a;';
  assert.equal(
    scanTypescript(source, 'fixture.ts')[0].name,
    scanTypescript(`\n\n${source}`, 'fixture.ts')[0].name,
  );
});

test('Rust scanner ignores braces in strings and counts nested generic arguments once', () => {
  const source = `pub fn sample(a: Vec<(u32,u32)>, b: &str, c: u32, d: u32, e: u32) {
    let text = "{ fn fake(a,b,c,d,e) {} }";
    // } fn invisible(a,b,c,d,e) {}
  }`;
  const findings = scanRust(source, 'fixture.rs');
  assert.deepEqual(
    findings.map((item) => [item.name, item.value]),
    [['sample', 5]],
  );
});
