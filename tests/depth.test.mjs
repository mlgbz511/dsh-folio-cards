import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

// ponytail: 宿主包 @deepseek-ai/schemastery 只存在于 DSH profile 里，
// 测试时在仓库内挂一个 gitignore 掉的 node_modules 链接。装回 profile 后即不再需要。
const repo = path.resolve(import.meta.dirname, '..');
const linkDir = path.join(repo, 'node_modules', '@deepseek-ai');
const target = 'C:/Users/MTL/.dsh/profiles/desktop/node_modules/@deepseek-ai/schemastery';
if (!fs.existsSync(path.join(linkDir, 'schemastery')) && fs.existsSync(target)) {
  fs.mkdirSync(linkDir, { recursive: true });
  fs.symlinkSync(target, path.join(linkDir, 'schemastery'), 'junction');
}

const mod = await import('../index.js');
const capture = (config) => {
  const seen = [];
  mod.apply({
    effect: (fn) => { const out = fn(); return typeof out === 'function' ? out : () => {}; },
    inject: (deps, fn) => fn({ commands: { register: () => () => {} } }),
    systemPrompt: { section: (spec) => { seen.push(spec); return () => {}; } },
    tools: { register: () => () => {} },
  }, config);
  return seen.find((s) => s.name === 'folio-cards')?.text ?? '';
};

assert.ok(mod.Config, 'Config is exported');
assert.equal(mod.Config({}).depth, 'verbose', 'Config defaults to verbose');

const texts = {
  verbose: capture({ depth: 'verbose' }),
  balanced: capture({ depth: 'balanced' }),
  concise: capture({ depth: 'concise' }),
  auto: capture({ depth: 'auto' }),
};

// 四档互不相同
const values = new Set(Object.values(texts));
assert.equal(values.size, 4, 'all four depths produce distinct guidance');

// 关键语义
assert.ok(texts.verbose.includes('no length cap'), 'verbose allows long prose');
assert.ok(texts.verbose.includes('rejected'), 'verbose asks for rejected alternatives');
assert.ok(texts.balanced.includes('three or four short paragraphs'), 'balanced sets a paragraph budget');
assert.ok(texts.concise.includes('two short sentences'), 'concise keeps the old two-sentence rule');
assert.ok(texts.auto.includes('chosen at runtime'), 'auto is decided at runtime');
assert.ok(texts.auto.includes('concise') && texts.auto.includes('balanced') && texts.auto.includes('verbose'), 'auto names all three choices');

// 长度关系：详尽的提示词最长，精简最短
assert.ok(texts.verbose.length > texts.balanced.length, 'verbose guidance is longer than balanced');
assert.ok(texts.balanced.length > texts.concise.length, 'balanced guidance is longer than concise');

// 每档都保留结构化块规则，防止拼接丢段
for (const [name, text] of Object.entries(texts)) {
  assert.ok(text.includes('table'), name + ' keeps the table rule');
  assert.ok(text.includes('verdict'), name + ' keeps the verdict rule');
  assert.ok(text.includes('code block'), name + ' keeps the code rule');
  assert.ok(text.includes('must not restate the prose'), name + ' keeps the no-restate rule');
}

// 非法值回落 auto，绝不抛异常
assert.equal(capture({ depth: 'AUTO ' }), texts.auto, 'case and padding tolerated for words');
for (const bad of [{ depth: 'detailed' }, { depth: 'AUTOISH' }, { depth: 42 }, {}, undefined]) {
  assert.equal(capture(bad), texts.verbose, 'invalid depth falls back to verbose: ' + JSON.stringify(bad));
}

// 数字别名：1 详尽 / 2 适中 / 3 精简 / 0 自适应
assert.equal(capture({ depth: '1' }), texts.verbose, '1 maps to verbose');
assert.equal(capture({ depth: '2' }), texts.balanced, '2 maps to balanced');
assert.equal(capture({ depth: '3' }), texts.concise, '3 maps to concise');
assert.equal(capture({ depth: '0' }), texts.auto, '0 maps to auto');
assert.equal(capture({ depth: ' 1 ' }), texts.verbose, 'whitespace tolerated');

console.log('DEPTH-OK');
