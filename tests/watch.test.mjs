import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// 深度锁死之后不应再监听 patch 文件：改文件也不重挂提示词
const repo = path.resolve(import.meta.dirname, '..');
const linkDir = path.join(repo, 'node_modules', '@deepseek-ai');
const target = 'C:/Users/MTL/.dsh/profiles/desktop/node_modules/@deepseek-ai/schemastery';
if (!fs.existsSync(path.join(linkDir, 'schemastery')) && fs.existsSync(target)) {
  fs.mkdirSync(linkDir, { recursive: true });
  fs.symlinkSync(target, path.join(linkDir, 'schemastery'), 'junction');
}

const home = fs.mkdtempSync(path.join(os.tmpdir(), 'folio-home-'));
const patchDir = path.join(home, '.dsh', 'profiles', 'desktop');
fs.mkdirSync(patchDir, { recursive: true });
const patch = path.join(patchDir, 'cordis.patch.yml');
fs.writeFileSync(patch, ['plugins:', '- id: folio-cards', '  name: dsh-folio-cards', '  config:', '    depth: 3', ''].join('\n'));
process.env.USERPROFILE = home;
process.env.HOME = home;

const mod = await import('../index.js');
const seen = [];
mod.apply({
  effect: (fn) => { const out = fn(); return typeof out === 'function' ? out : () => {}; },
  inject: () => {},
  systemPrompt: { section: (spec) => { seen.push(spec.text); return () => {}; } },
  tools: { register: () => () => {} },
}, { depth: '3' });

assert.equal(seen.length, 1, 'one section registered');
fs.writeFileSync(patch, ['plugins:', '- id: folio-cards', '  name: dsh-folio-cards', '  config:', '    depth: 1', ''].join('\n'));
await new Promise((resolve) => setTimeout(resolve, 600));
assert.equal(seen.length, 1, 'patch changes no longer remount the section');
assert.equal(seen[0], seen[0], 'the single guide is stable');

fs.rmSync(home, { recursive: true, force: true });
console.log('WATCH-OK');
