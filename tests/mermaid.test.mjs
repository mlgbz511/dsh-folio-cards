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
  inject: (deps, fn) => {
    fn({
      webServer: {
        register: (spec) => {
          if (spec.path === '/folio-cards/mermaid.min.js') route = spec;
          return () => {};
        },
      },
    });
  },
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

// 2b) 宿主预渲染路由 + 健康检查
const routes = [];
const ctx2 = {
  effect: (fn) => { const out = fn(); return typeof out === 'function' ? out : () => {}; },
  inject: (deps, fn) => { fn({ webServer: { register: (spec) => { routes.push(spec); return () => {}; } } }); },
  systemPrompt: { section: () => () => {} },
  tools: { register: () => () => {} },
};
mod.apply(ctx2);
const paths = routes.map((entry) => entry.path);
assert.ok(paths.includes('/folio-cards/mermaid-render'), 'host render route registered');
assert.ok(paths.includes('/folio-cards/health'), 'health route registered');
const healthRes = { code: 0, headers: null, body: null, headersSent: false, writeHead(code, headers) { this.code = code; this.headers = headers; }, end(body) { this.body = body; } };
routes.find((entry) => entry.path === '/folio-cards/health').handler({ headers: { host: '127.0.0.1:1' } }, healthRes);
assert.equal(healthRes.code, 200, 'health answers 200');
const health = JSON.parse(String(healthRes.body));
assert.equal(health.ok, true, 'health reports ok');
assert.ok('electron' in health && 'renderer' in health, 'health reports renderer facts');

// 3) 客户端：只接管 mermaid 围栏，失败必须保留原代码块
const client = fs.readFileSync(path.join(repo, 'client.js'), 'utf8');
assert.ok(client.includes("querySelectorAll('pre')"), 'scans pre elements (DSH keeps the fence text there)');
assert.ok(client.includes(".md-code-block"), 'replaces the whole code-block shell');
assert.ok(client.includes("data-rc-claimed"), 'never touches a fence the card renderer already claimed');
assert.ok(client.includes("'/folio-cards/mermaid.min.js'"), 'client loads the host route');
assert.ok(client.includes("setAttribute(MERMAID_SEEN, 'failed')"), 'fail-open on render error');
assert.ok(client.includes('mermaid.render'), 'renders through mermaid.render');
assert.ok(!/eval\(/.test(client), 'no eval in client');

// 4) 点图放大：全屏遮罩、Esc 关闭、键盘可开
assert.ok(client.includes("'rc-mermaid-zoom'"), 'zoom overlay exists');
assert.ok(client.includes("event.key === 'Escape'") || client.includes("key === 'Escape'"), 'Esc closes the overlay');
assert.ok(client.includes("addEventListener('click', onClick)"), 'click opens the overlay');
assert.ok(client.includes("removeEventListener('click', onClick)"), 'listener removed on dispose');
assert.ok(client.includes("setAttribute('role', 'button')"), 'figure is focusable');
assert.ok(client.includes("aria-label', 'mermaid 图，点击放大'"), 'figure is labelled');
// 可读性：不被压到容器宽、放大后可缩放/平移
assert.ok(client.includes('useMaxWidth: false'), 'mermaid keeps its natural size');
assert.ok(client.includes('fontSize'), 'theme sets a readable font size');
assert.ok(client.includes("'wheel'"), 'overlay zooms with the wheel');
assert.ok(client.includes("'pointerdown'"), 'overlay pans by dragging');
assert.ok(client.includes('dblclick'), 'double click refits the view');
assert.ok(client.includes('const fit = () =>'), 'lightbox fits the diagram on open');
// 性能：结果缓存、占位、可见才渲染、空闲帧调度
assert.ok(client.includes('function cachedSvg'), 'rendered SVGs are cached by source hash');
assert.ok(client.includes('async function hostSvg'), 'client asks the host to pre-render');
assert.ok(client.includes("'/folio-cards/mermaid-render'"), 'client posts to the host render route');
assert.ok(client.includes('const hosted = await hostSvg(source)'), 'host result is mounted directly');
assert.ok(client.includes('const mermaid = await loadMermaid()'), 'local renderer kept as the fallback');
assert.ok(client.includes('function rememberSvg'), 'renders are written back to the cache');
assert.ok(client.includes("'folio-mermaid-svg:'"), 'cache key is namespaced');
assert.ok(client.includes('rc-mermaid-pending'), 'a placeholder holds the layout while rendering');
assert.ok(client.includes('new IntersectionObserver'), 'diagrams render only when near the viewport');
assert.ok(client.includes('requestIdleCallback'), 'rendering is deferred to an idle frame');
assert.ok(client.includes('configureMermaid'), 'mermaid is configured once, not per diagram');
assert.ok(client.includes('vw * 0.92'), 'fit uses the viewport, not the element size');
assert.ok(client.includes('Math.max(0.85, fitScale)'), 'the opened view never shrinks below a legible floor');
assert.ok(client.includes('const centerAt = (next)'), 'double click can switch to 1:1');
// 模糊与误触的两条回归：SVG 上不许有 filter；遮罩必须给标题栏让位并有自己的关闭按钮
assert.ok(!/\.rc-mermaid-zoom svg \{[^}]*filter:/.test(client), 'no CSS filter on the zoomed svg (it rasterises and blurs)');
assert.ok(client.includes('inset: 34px 6px 6px 6px'), 'overlay keeps clear of the window chrome');
assert.ok(client.includes('rc-mermaid-zoom-close'), 'overlay has its own close button');
// 合成层栅格化是第二个模糊源：缩放元素上不许出现 will-change
assert.ok(!/\.rc-mermaid-zoom svg \{[^}]*will-change:/.test(client), 'no will-change on the scaled svg');
assert.ok(client.includes('rc-mermaid-zoom-tools'), 'overlay exposes zoom buttons');
assert.ok(client.includes("fontSize: '18px'"), 'labels are 18px');
assert.ok(/fontSize: '(1[6-9]|[2-9][0-9])px'/.test(client), 'labels are at least 16px');
assert.ok(client.includes('getBoundingClientRect'), 'wheel zoom reads the live box');
assert.ok(client.includes('1 - next / scale'), 'wheel zoom compensates the pan so the cursor stays put');
assert.ok(client.includes("transformOrigin = '0 0'"), 'transform origin is top-left for cursor-anchored zoom');
assert.ok(!client.includes('max-width: 100%; height: auto; display: block'), 'inline svg is no longer squeezed');


// 4) 检测启发式：DSH 不暴露语言，所以既要认 language-mermaid，也要认内容开头
let clientMod = null;
globalThis.window = { __ModuleLoader__: { load: (m) => { clientMod = m; } } };
globalThis.document = {
  createElement: () => ({ setAttribute() {}, style: {}, appendChild() {}, querySelector: () => null }),
  head: { appendChild() {} },
  body: { appendChild() {}, removeChild() {} },
  querySelectorAll: () => [],
};
globalThis.MutationObserver = class { observe() {} disconnect() {} };
await import('../client.js');
const api = clientMod.factory(() => ({ createElement: () => ({}), useState: (v) => [v, () => {}], useMemo: (fn) => fn() }));
const { isMermaid } = api.__test;

assert.ok(isMermaid({ className: 'language-mermaid', textContent: '' }), 'class wins');
assert.ok(isMermaid({ className: '', textContent: 'flowchart TB\n  A --> B' }), 'flowchart head');
assert.ok(isMermaid({ className: '', textContent: '  sequenceDiagram\n  A->>B: hi' }), 'sequenceDiagram head');
assert.ok(!isMermaid({ className: 'language-js', textContent: 'const a = 1' }), 'plain js not mermaid');
assert.ok(!isMermaid({ className: '', textContent: 'graphical user interface notes' }), 'prefix must be a word boundary');

console.log('MERMAID-OK');
