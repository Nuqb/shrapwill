import fs from 'node:fs';
import { chromium } from 'playwright';
import { createServer } from 'vite';
const server = await createServer({
  server: { host: '127.0.0.1', port: 5185, hmr: false, watch: { ignored: ['**/*'] } },
});
await server.listen();
const browser = await chromium.launch({
  executablePath:
    process.env.SHRAPWILL_REFERENCE_BROWSER ||
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
});
try {
  const page = await browser.newPage();
  await page.goto(server.resolvedUrls.local[0]);
  const results = await page.evaluate(async () => {
    const { fragmentSource } = await import('/src/features/preview/ported/registry.ts');
    const manifests = await Promise.all(
      ['manifest', 'effects-manifest'].map(async (name) => [
        name,
        (await import('/src/features/preview/ported/' + name + '.json')).default,
      ]),
    );
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) throw Error('WebGL 2 is required to validate imported shaders.');
    const results = [];
    for (const [file, items] of manifests)
      for (const e of items.filter((e) => e.status === 'shader')) {
        let error = '';
        for (const body of e.passes?.map((p) => p.body) || [e.preamble + '\n' + e.body]) {
          const s = gl.createShader(gl.FRAGMENT_SHADER);
          gl.shaderSource(s, fragmentSource(body));
          gl.compileShader(s);
          if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) error += gl.getShaderInfoLog(s);
          gl.deleteShader(s);
        }
        results.push({ file, kind: e.kind, name: e.name, error });
      }
    return results;
  });
  fs.writeFileSync('../QA/filmora-refresh/compile-results.json', JSON.stringify(results, null, 2));
  console.log(results.length, 'compiled;', results.filter((r) => r.error).length, 'failures');
} finally {
  await browser.close();
  await server.close();
}
