import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

// ponytail: 宿主包 @deepseek-ai/schemastery 只存在于 DSH profile，测试时在仓库内挂链接。
const repo = path.resolve(import.meta.dirname, '..');
const linkDir = path.join(repo, 'node_modules', '@deepseek-ai');
const target = 'C:/Users/MTL/.dsh/profiles/desktop/node_modules/@deepseek-ai/schemastery';
if (!fs.existsSync(path.join(linkDir, 'schemastery')) && fs.existsSync(target)) {
  fs.mkdirSync(linkDir, { recursive: true });
  fs.symlinkSync(target, path.join(linkDir, 'schemastery'), 'junction');
}

const mod = await import('../index.js');

// 深度锁死：任何配置都注入同一份「全量详尽」提示词
const capture = (config) => {
  const sections = [];
  let commandRegistrations = 0;
  mod.apply({
    effect: (fn) => { const out = fn(); return typeof out === 'function' ? out : () => {}; },
    inject: (deps, fn) => {
      fn({
        commands: { register: () => { commandRegistrations += 1; return () => {}; } },
        webServer: { register: () => () => {} },
      });
    },
    systemPrompt: { section: (spec) => { sections.push(spec); return () => {}; } },
    tools: { register: () => () => {} },
  }, config);
  return { text: sections.find((spec) => spec.name === 'folio-cards')?.text ?? '', commandRegistrations };
};

const guides = ['verbose', 'concise', '1', '3', 'auto', 'bogus', undefined].map((depth) => capture({ depth }).text);
assert.equal(new Set(guides).size, 1, 'every depth setting yields the same guide');

const guide = guides[0];
assert.ok(guide.length > 500, 'guide is present');

// 该有的：完整输出、不截断
assert.ok(guide.includes('Answer in full'), 'states the full-output rule');
assert.ok(guide.includes('Never compress'), 'forbids compressing to fit the card');
assert.ok(guide.includes('never truncate it'), 'code is never truncated');

// 不该有的：任何「压缩输出」的说法
for (const banned of ['two short sentences', 'Depth: ', '3-4 short paragraphs', 'three or four short paragraphs', '24 lines or fewer', 'about 4 blocks']) {
  assert.ok(!guide.includes(banned), 'no compression instruction: ' + banned);
}

// 命令与热重载一并撤掉
assert.equal(capture({ depth: 'concise' }).commandRegistrations, 0, 'no /depth command registered');

console.log('DEPTH-OK');
