import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// ponytail: 宿主包 @deepseek-ai/schemastery 只存在于 DSH profile，测试时在仓库内挂链接。
const repo = path.resolve(import.meta.dirname, '..');
const linkDir = path.join(repo, 'node_modules', '@deepseek-ai');
const target = 'C:/Users/MTL/.dsh/profiles/desktop/node_modules/@deepseek-ai/schemastery';
if (!fs.existsSync(path.join(linkDir, 'schemastery')) && fs.existsSync(target)) {
  fs.mkdirSync(linkDir, { recursive: true });
  fs.symlinkSync(target, path.join(linkDir, 'schemastery'), 'junction');
}

// 假 profile：一个临时 home，里面放 cordis.patch.yml
const home = fs.mkdtempSync(path.join(os.tmpdir(), 'folio-home-'));
const patchDir = path.join(home, '.dsh', 'profiles', 'desktop');
fs.mkdirSync(patchDir, { recursive: true });
const patch = path.join(patchDir, 'cordis.patch.yml');
const write = (depth) => fs.writeFileSync(
  patch,
  ['plugins:', '- id: folio-cards', '  name: dsh-folio-cards', '  config:', '    depth: ' + depth, ''].join('\n'),
);
write('concise');
process.env.USERPROFILE = home;
process.env.HOME = home;

const mod = await import('../index.js');

// 1) 纯函数：能正确读出 depth
assert.equal(mod.depthInPatch(fs.readFileSync(patch, 'utf8')), 'concise');
assert.equal(mod.depthInPatch('- id: folio-cards\n  config:\n    depth: sideways'), null, 'illegal depth yields null');
assert.equal(mod.depthInPatch('nothing here'), null);
assert.equal(mod.depthInPatch(undefined), null);

// 2) 能找到这个假 profile 的 patch 文件
assert.deepEqual(mod.patchFiles(), [patch]);

// 3) 热重挂：改文件后提示词自己换档，不需要重启
const seen = [];
let command = null;
const ctx = {
  effect: (fn) => { const out = fn(); return typeof out === 'function' ? out : () => {}; },
  inject: (deps, fn) => fn({ commands: { register: (spec) => { command = spec; return () => {}; } } }),
  systemPrompt: { section: (spec) => { seen.push(spec.text); return () => {}; } },
  tools: { register: () => () => {} },
};
mod.apply(ctx, { depth: 'auto' });
assert.ok(seen[0].includes('Depth: auto'), 'starts on auto by default');

write('verbose');
const deadline = Date.now() + 4000;
while (Date.now() < deadline && !seen.some((text) => text.includes('Depth: verbose'))) {
  await new Promise((resolve) => setTimeout(resolve, 100));
}
assert.ok(seen.some((text) => text.includes('Depth: verbose')), 'watcher remounts the section with verbose');

// 4) 非法值不触发重挂
const before = seen.length;
write('sideways');
await new Promise((resolve) => setTimeout(resolve, 500));
assert.equal(seen.length, before, 'illegal value does not remount');

// 5) setDepthInPatch 只改本插件块里的值
assert.equal(mod.depthInPatch(mod.setDepthInPatch(fs.readFileSync(patch, 'utf8'), 'balanced')), 'balanced');
assert.equal(mod.setDepthInPatch('nothing here', 'balanced'), 'nothing here', 'unrelated text untouched');
assert.equal(mod.setDepthInPatch(fs.readFileSync(patch, 'utf8'), 'bogus'), fs.readFileSync(patch, 'utf8'), 'illegal depth leaves text alone');

// 6) /depth 命令：注册了、改档、写回文件、立刻重挂
assert.ok(command, '/depth command registered');
assert.equal(command.name, 'depth');
const reply = await command.handler({ rawInput: 'balanced' });
assert.equal(reply.kind, 'success', 'handler reports success');
assert.equal(mod.depthInPatch(fs.readFileSync(patch, 'utf8')), 'balanced', 'patch file rewritten');
assert.ok(seen[seen.length - 1].includes('Depth: balanced'), 'section remounted by the command');
const usage = await command.handler({ rawInput: '' });
assert.equal(usage.kind, 'success');
assert.ok(usage.text.includes('当前深度'), 'no-arg form reports current depth');
const bad = await command.handler({ rawInput: 'detailed' });
assert.equal(bad.kind, 'error', 'unknown depth rejected');

fs.rmSync(home, { recursive: true, force: true });
console.log('WATCH-OK');