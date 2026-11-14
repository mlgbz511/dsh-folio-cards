import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

// 宿主包 @deepseek-ai/schemastery 只存在于 DSH profile，测试时在仓库内挂链接。
const repo = path.resolve(import.meta.dirname, '..');
const linkDir = path.join(repo, 'node_modules', '@deepseek-ai');
const target = 'C:/Users/MTL/.dsh/profiles/desktop/node_modules/@deepseek-ai/schemastery';
if (!fs.existsSync(path.join(linkDir, 'schemastery')) && fs.existsSync(target)) {
  fs.mkdirSync(linkDir, { recursive: true });
  fs.symlinkSync(target, path.join(linkDir, 'schemastery'), 'junction');
}

const mod = await import('../index.js');

// 1) vendor 里的包存在，并且自己挂了 globalThis.mermaid
const vendor = path.join(repo, 'vendor', 'mermaid.min.js');
assert.ok(fs.existsSync(vendor), 'vendor/mermaid.min.js present');
const bundle = fs.readFileSync(vendor, 'utf8');
assert.ok(bundle.length > 1000000, 'bundle is substantial: ' + bundle.length);
assert.ok(bundle.includes('globalThis["mermaid"]'), 'bundle installs the global');
assert.ok(fs.existsSync(path.join(repo, 'vendor', 'mermaid.LICENSE')), 'license shipped');

// 2) 宿主的静态路由：路径正确，handler 能吐出整份 bundle
let route = null;
const ctx = {
  effect: (fn) => { const out = fn(); return typeof out === 'function' ? out : () => {}; },
  inject: (deps, fn) => { fn({ webServer: { register: (spec) => { route = spec; return () => {}; } } }); },
  systemPrompt: { section: () => () => {} },
  tools: { register: () => () => {} },
};
mod.apply(ctx);
assert.ok(route, 'mermaid asset route registered');
assert.equal(route.path, '/folio-cards/mermaid.min.js');
assert.equal(route.kind, 'exact');

const res = { code: 0, headers: null, body: null, writeHead(code, headers) { this.code = code; this.headers = headers; }, end(body) { this.body = body; } };
route.handler({}, res);
assert.equal(res.code, 200, 'route answers 200');
assert.ok(String(res.headers['content-type']).includes('javascript'), 'served as javascript');
assert.ok(res.body && res.body.length > 1000000, 'route serves the whole bundle');

// 3) 客户端：只接管 mermaid 围栏，失败必须保留原代码块
const client = fs.readFileSync(path.join(repo, 'client.js'), 'utf8');
assert.ok(client.includes("pre code.language-mermaid"), 'targets mermaid fences only');
assert.ok(client.includes("'/folio-cards/mermaid.min.js'"), 'client loads the host route');
assert.ok(client.includes("setAttribute(MERMAID_SEEN, 'failed')"), 'fail-open on render error');
assert.ok(client.includes('mermaid.render'), 'renders through mermaid.render');
assert.ok(!/eval\(/.test(client), 'no eval in client');

console.log('MERMAID-OK');
