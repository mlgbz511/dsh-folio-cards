/**
 * Client half of `dsh-rich-cards`.
 *
 * Registers a Tool call view for the `rich_card` tool and draws the persisted
 * arguments as a typographic card. Nothing here owns state: the card is a pure
 * function of the Tool call, so replay, fork and resume reproduce it exactly.
 */

window.__ModuleLoader__.load({
  id: 'dsh-rich-cards',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const ACCENTS = ['indigo', 'teal', 'amber', 'rose', 'violet', 'slate'];

    const CSS = `
.rc-card {
  --rc-base: #6366f1;
  --rc-accent: color-mix(in oklab, var(--rc-base) 78%, var(--dsw-alias-label-primary));
  position: relative;
  margin: 8px 0 12px;
  padding: 22px 24px 20px;
  border-radius: 18px;
  background: linear-gradient(
    180deg,
    color-mix(in oklab, var(--rc-accent) 6%, var(--dsw-alias-bg-layer-1)) 0%,
    var(--dsw-alias-bg-layer-1) 54%
  );
  border: 1px solid color-mix(in oklab, var(--rc-accent) 20%, var(--dsw-alias-border-l1));
  box-shadow: 0 1px 2px rgba(15, 20, 40, 0.05), 0 18px 40px -28px rgba(15, 20, 40, 0.55);
  color: var(--dsw-alias-label-primary);
  font-size: 14px;
  line-height: 1.78;
  overflow: hidden;
  animation: rc-in 260ms cubic-bezier(0.22, 0.61, 0.36, 1) both;
}
.rc-card::before {
  content: '';
  position: absolute;
  inset: 0 0 auto 0;
  height: 2px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    color-mix(in oklab, var(--rc-accent) 55%, transparent) 50%,
    transparent 100%
  );
}
.rc-card[data-accent='teal'] { --rc-base: #0d9488; }
.rc-card[data-accent='amber'] { --rc-base: #d97706; }
.rc-card[data-accent='rose'] { --rc-base: #e11d48; }
.rc-card[data-accent='violet'] { --rc-base: #7c3aed; }
.rc-card[data-accent='slate'] { --rc-base: #475569; }

.rc-kicker {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--rc-accent);
}
.rc-kicker-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--rc-accent);
  box-shadow: 0 0 0 3px color-mix(in oklab, var(--rc-accent) 16%, transparent);
}
.rc-title {
  margin: 9px 0 0;
  font-size: 20px;
  line-height: 1.5;
  font-weight: 650;
  letter-spacing: 0;
  color: var(--dsw-alias-label-primary);
  text-wrap: pretty;
}
.rc-lead {
  margin: 10px 0 0;
  color: var(--dsw-alias-label-secondary);
  font-size: 14px;
  line-height: 1.85;
  text-wrap: pretty;
}
.rc-body { margin-top: 2px; }

.rc-h {
  position: relative;
  margin: 22px 0 0;
  padding-left: 13px;
  font-size: 15px;
  line-height: 1.6;
  font-weight: 650;
  letter-spacing: 0.01em;
}
.rc-h::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.44em;
  width: 3px;
  height: 1em;
  border-radius: 2px;
  background: var(--rc-accent);
}
.rc-p {
  margin: 9px 0 0;
  font-size: 14px;
  line-height: 1.85;
  text-wrap: pretty;
}
.rc-ul,
.rc-ol {
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
}
.rc-ul li {
  position: relative;
  margin: 5px 0;
  padding-left: 18px;
  font-size: 14px;
  line-height: 1.8;
}
.rc-ul li::before {
  content: '';
  position: absolute;
  left: 4px;
  top: 0.74em;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: color-mix(in oklab, var(--rc-accent) 82%, transparent);
}
.rc-ol { counter-reset: rc-step; }
.rc-ol li {
  position: relative;
  margin: 7px 0;
  padding-left: 27px;
  font-size: 14px;
  line-height: 1.8;
  counter-increment: rc-step;
}
.rc-ol li::before {
  content: counter(rc-step);
  position: absolute;
  left: 0;
  top: 0.26em;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  font-size: 11px;
  font-weight: 650;
  line-height: 1;
  color: var(--rc-accent);
  background: color-mix(in oklab, var(--rc-accent) 12%, var(--dsw-alias-bg-layer-1));
  border: 1px solid color-mix(in oklab, var(--rc-accent) 22%, transparent);
}

.rc-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(118px, 1fr));
  gap: 10px;
  margin: 12px 0 0;
}
.rc-stat {
  padding: 11px 13px;
  border-radius: 12px;
  background: color-mix(in oklab, var(--rc-accent) 7%, var(--dsw-alias-bg-layer-1));
  border: 1px solid color-mix(in oklab, var(--rc-accent) 15%, transparent);
}
.rc-stat-k {
  font-size: 11.5px;
  letter-spacing: 0.05em;
  color: var(--dsw-alias-label-secondary);
}
.rc-stat-v {
  margin-top: 3px;
  font-size: 19px;
  line-height: 1.35;
  font-weight: 680;
  color: var(--rc-accent);
}
.rc-stat-d {
  margin-top: 2px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--dsw-alias-label-secondary);
}

.rc-callout {
  margin: 12px 0 0;
  padding: 11px 14px;
  border-radius: 12px;
  border-left: 3px solid var(--rc-accent);
  background: color-mix(in oklab, var(--rc-accent) 8%, var(--dsw-alias-bg-layer-1));
}
.rc-callout-t {
  font-size: 13px;
  font-weight: 650;
  color: var(--rc-accent);
}
.rc-callout p {
  margin: 3px 0 0;
  font-size: 13.5px;
  line-height: 1.75;
}
.rc-callout[data-tone='tip'] {
  border-left-color: var(--dsw-alias-state-success-primary);
  background: color-mix(in oklab, var(--dsw-alias-state-success-primary) 9%, var(--dsw-alias-bg-layer-1));
}
.rc-callout[data-tone='tip'] .rc-callout-t { color: var(--dsw-alias-state-success-primary); }
.rc-callout[data-tone='warn'] {
  border-left-color: var(--dsw-alias-state-warn-primary);
  background: color-mix(in oklab, var(--dsw-alias-state-warn-primary) 9%, var(--dsw-alias-bg-layer-1));
}
.rc-callout[data-tone='warn'] .rc-callout-t { color: var(--dsw-alias-state-warn-primary); }

.rc-quote {
  margin: 12px 0 0;
  padding: 2px 0 2px 14px;
  border-left: 2px solid var(--dsw-alias-border-l2);
}
.rc-quote p {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.8;
  color: var(--dsw-alias-label-secondary);
}
.rc-quote cite {
  display: block;
  margin-top: 5px;
  font-style: normal;
  font-size: 12px;
  color: var(--dsw-alias-label-secondary);
  opacity: 0.78;
}

.rc-kv {
  display: grid;
  gap: 7px;
  margin: 10px 0 0;
  padding: 0;
}
.rc-kv-row {
  display: grid;
  grid-template-columns: 92px 1fr;
  gap: 10px;
  align-items: baseline;
}
.rc-kv-k {
  font-size: 12.5px;
  color: var(--dsw-alias-label-secondary);
}
.rc-kv-v {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.7;
}

.rc-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 11px 0 0;
}
.rc-chip {
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--rc-accent);
  background: color-mix(in oklab, var(--rc-accent) 9%, var(--dsw-alias-bg-layer-1));
  border: 1px solid color-mix(in oklab, var(--rc-accent) 18%, transparent);
}

.rc-div {
  height: 0;
  margin: 18px 0 0;
  border: 0;
  border-top: 1px solid var(--dsw-alias-border-l1);
}

.rc-foot {
  margin-top: 16px;
  padding-top: 11px;
  border-top: 1px solid var(--dsw-alias-border-l1);
  font-size: 11.5px;
  line-height: 1.6;
  color: var(--dsw-alias-label-secondary);
}

.rc-skeleton { padding: 20px 24px; }
.rc-skel-line {
  height: 10px;
  margin: 9px 0;
  border-radius: 6px;
  background: color-mix(in oklab, var(--dsw-alias-label-secondary) 14%, transparent);
  animation: rc-pulse 1.5s ease-in-out infinite;
}

.rc-card[data-layout="article"] {
  background: none;
  border: 0;
  box-shadow: none;
  border-radius: 0;
  padding: 0;
  margin: 6px 0 10px;
  overflow: visible;
}
.rc-card[data-layout="article"]::before { display: none; }
.rc-card[data-layout="article"] .rc-title { font-size: 26px; line-height: 1.32; margin-top: 6px; }
.rc-card[data-layout="article"] .rc-lead { font-size: 16px; line-height: 1.75; }
.rc-card[data-layout="article"] .rc-h { font-size: 19px; margin-top: 24px; }
.rc-card[data-layout="article"] .rc-p { font-size: 15.5px; }

.rc-fig { margin: 16px 0; }
.rc-fig img {
  display: block;
  width: 100%;
  max-height: 360px;
  object-fit: cover;
  border-radius: 12px;
  border: 1px solid var(--dsw-alias-border-l1);
  background: color-mix(in oklab, var(--dsw-alias-label-secondary) 7%, transparent);
}
.rc-fig figcaption {
  display: flex;
  gap: 10px;
  align-items: baseline;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--dsw-alias-label-secondary);
}
.rc-credit {
  flex: none;
  padding: 1px 8px;
  border-radius: 999px;
  font-size: 11px;
  background: color-mix(in oklab, var(--dsw-alias-label-secondary) 12%, transparent);
}
.rc-fig-fail {
  padding: 22px 16px;
  border-radius: 12px;
  text-align: center;
  font-size: 12px;
  color: var(--dsw-alias-label-secondary);
  border: 1px dashed var(--dsw-alias-border-l1);
  background: color-mix(in oklab, var(--dsw-alias-label-secondary) 5%, transparent);
}

.rc-tl { display: grid; gap: 12px; margin: 10px 0 6px; }
.rc-tl-row { display: grid; grid-template-columns: 74px 1fr; gap: 14px; }
.rc-tl-time { font-size: 12.5px; font-weight: 600; padding-top: 2px; color: var(--rc-accent); }
.rc-tl-title { font-size: 14.5px; font-weight: 600; line-height: 1.5; }
.rc-tl-detail { font-size: 13.5px; line-height: 1.65; margin-top: 3px; color: var(--dsw-alias-label-secondary); }

.rc-sources { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 16px; }
.rc-src {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  color: var(--dsw-alias-label-secondary);
  background: color-mix(in oklab, var(--dsw-alias-label-secondary) 10%, transparent);
}

.rc-fence { margin: 14px 0 6px; }

/* A claimed fence keeps its card but loses the code-block chrome: the 代码块 label,
   the copy button and the grey frame the markdown renderer drew around the source. */
.rc-fence-shell {
  background: transparent !important;
  border: 0 !important;
  border-radius: 0 !important;
  padding: 0 !important;
  box-shadow: none !important;
  overflow: visible !important;
}
.rc-fence-shell > [data-rc-fence-head="1"] { display: none !important; }

.rc-turn { margin: 10px 0 2px; }

@keyframes rc-in {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes rc-pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}
@media (max-width: 520px) {
  .rc-card { padding: 18px; border-radius: 16px; }
  .rc-title { font-size: 18px; }
  .rc-stats { grid-template-columns: 1fr 1fr; }
  .rc-kv-row { grid-template-columns: 78px 1fr; }
}
@media (prefers-reduced-motion: reduce) {
  .rc-card { animation: none; }
  .rc-skel-line { animation: none; }
}
`;

    function text(value) {
      if (typeof value === 'string') return value.replace(/\r\n/g, '\n').trim();
      if (typeof value === 'number' && Number.isFinite(value)) return String(value);
      return '';
    }

    function list(value) {
      return Array.isArray(value) ? value : [];
    }

    /** Unknown = arguments still streaming; null = no usable arguments. */
    function parseArguments(raw) {
      if (typeof raw !== 'string') return null;
      const source = raw.trim();
      if (!source) return null;
      try {
        const value = JSON.parse(source);
        return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
      } catch (error) {
        return undefined;
      }
    }

    function specOf(block) {
      if (!block || typeof block !== 'object') return null;
      const call = block.call && typeof block.call === 'object' ? block.call : null;

      // 1) Raw JSON strings: the Tool call keeps the exact arguments the model sent.
      const raws = [block.argsRaw, call && call.argsRaw, block.args, call && call.args];
      for (let index = 0; index < raws.length; index += 1) {
        const value = raws[index];
        if (typeof value !== 'string') continue;
        const parsed = parseArguments(value);
        if (parsed) return parsed;
      }

      // 2) Plain objects that actually look like a card. A lazy `args` accessor has
      // neither `blocks` nor `title`, so it is ignored instead of rendering a blank card.
      const objects = [block.args, call && call.args, block];
      for (let index = 0; index < objects.length; index += 1) {
        const value = objects[index];
        if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
        if (Array.isArray(value.blocks) || typeof value.title === 'string') return value;
      }

      return null;
    }

    function paragraphs(value, key) {
      const parts = text(value)
        .split(/\n+/)
        .map((line) => line.trim())
        .filter((line) => line !== '');
      return parts.map((line, index) =>
        h('p', { className: 'rc-p', key: key + ':' + index }, line),
      );
    }

    function renderStat(entry, key) {
      if (!entry || typeof entry !== 'object') return null;
      const label = text(entry.label);
      const value = text(entry.value);
      const detail = text(entry.detail);
      if (!label && !value) return null;
      return h(
        'div',
        { className: 'rc-stat', key },
        label ? h('div', { className: 'rc-stat-k' }, label) : null,
        h('div', { className: 'rc-stat-v' }, value || '—'),
        detail ? h('div', { className: 'rc-stat-d' }, detail) : null,
      );
    }

    function renderRow(entry, key) {
      if (!entry || typeof entry !== 'object') return null;
      const label = text(entry.k !== undefined ? entry.k : entry.label);
      const value = text(entry.v !== undefined ? entry.v : entry.value);
      if (!label && !value) return null;
      return h(
        'div',
        { className: 'rc-kv-row', key },
        h('dt', { className: 'rc-kv-k' }, label),
        h('dd', { className: 'rc-kv-v' }, value),
      );
    }

    function Figure(props) {
      const url = text(props.url);
      const alt = text(props.alt);
      const caption = text(props.caption);
      const credit = text(props.credit);
      const failedState = React.useState(false);
      const failed = failedState[0];
      const setFailed = failedState[1];
      if (!url) return null;
      return h(
        'figure',
        { className: 'rc-fig' },
        failed
          ? h('div', { className: 'rc-fig-fail' }, alt || '图片未能加载')
          : h('img', {
              src: url,
              alt: alt,
              loading: 'lazy',
              onError: function () { setFailed(true); },
            }),
        caption || credit
          ? h(
              'figcaption',
              null,
              h('span', null, caption),
              credit ? h('span', { className: 'rc-credit' }, credit) : null,
            )
          : null,
      );
    }

    function renderTimeline(block, key) {
      const events = list(block.events !== undefined ? block.events : block.items);
      const rows = events
        .map(function (entry, index) {
          if (!entry || typeof entry !== 'object') return null;
          const time = text(entry.time !== undefined ? entry.time : entry.year);
          const title = text(entry.title);
          const detail = text(entry.detail);
          if (!time && !title && !detail) return null;
          return h(
            'div',
            { className: 'rc-tl-row', key: 'e' + index },
            h('div', { className: 'rc-tl-time' }, time),
            h(
              'div',
              null,
              title ? h('div', { className: 'rc-tl-title' }, title) : null,
              detail ? h('div', { className: 'rc-tl-detail' }, detail) : null,
            ),
          );
        })
        .filter(Boolean);
      return rows.length ? h('div', { className: 'rc-tl', key }, rows) : null;
    }

    function renderBlock(block, index) {
      if (!block || typeof block !== 'object') return null;
      const key = 'b' + index;
      const type = text(block.type);

      if (type === 'heading') {
        const title = text(block.text);
        return title ? h('div', { className: 'rc-h', key }, title) : null;
      }

      if (type === 'paragraph') {
        return h(React.Fragment, { key }, paragraphs(block.text, key));
      }

      if (type === 'bullets' || type === 'steps' || type === 'chips') {
        const items = list(block.items)
          .map((item) => text(item))
          .filter((item) => item !== '');
        if (items.length === 0) return null;
        if (type === 'chips') {
          return h(
            'div',
            { className: 'rc-chips', key },
            items.map((item, i) => h('span', { className: 'rc-chip', key: i }, item)),
          );
        }
        const tag = type === 'steps' ? 'ol' : 'ul';
        return h(
          tag,
          { className: type === 'steps' ? 'rc-ol' : 'rc-ul', key },
          items.map((item, i) => h('li', { key: i }, item)),
        );
      }

      if (type === 'stats') {
        const entries = list(block.stats !== undefined ? block.stats : block.items);
        const nodes = entries.map((entry, i) => renderStat(entry, i)).filter(Boolean);
        return nodes.length ? h('div', { className: 'rc-stats', key }, nodes) : null;
      }

      if (type === 'kv') {
        const entries = list(block.rows !== undefined ? block.rows : block.items);
        const nodes = entries.map((entry, i) => renderRow(entry, i)).filter(Boolean);
        return nodes.length ? h('dl', { className: 'rc-kv', key }, nodes) : null;
      }

      if (type === 'callout') {
        const title = text(block.title);
        const tone = ['info', 'tip', 'warn'].indexOf(text(block.tone)) >= 0 ? text(block.tone) : 'info';
        const body = text(block.text);
        if (!title && !body) return null;
        return h(
          'aside',
          { className: 'rc-callout', 'data-tone': tone, key },
          title ? h('div', { className: 'rc-callout-t' }, title) : null,
          body ? h('p', null, body) : null,
        );
      }

      if (type === 'quote') {
        const body = text(block.text);
        const cite = text(block.cite);
        if (!body) return null;
        return h(
          'blockquote',
          { className: 'rc-quote', key },
          h('p', null, body),
          cite ? h('cite', null, '— ' + cite) : null,
        );
      }

      if (type === 'image') {
        return h(Figure, {
          key: key,
          url: block.url,
          alt: block.alt,
          caption: block.caption,
          credit: block.credit,
        });
      }

      if (type === 'timeline') return renderTimeline(block, key);

      if (type === 'divider') return h('hr', { className: 'rc-div', key });

      return null;
    }

    function Skeleton() {
      return h(
        'div',
        { className: 'rc-card rc-skeleton', 'data-accent': 'indigo', 'aria-hidden': 'true' },
        h('div', { className: 'rc-skel-line', style: { width: '38%' } }),
        h('div', { className: 'rc-skel-line', style: { width: '74%', height: '14px' } }),
        h('div', { className: 'rc-skel-line', style: { width: '88%' } }),
        h('div', { className: 'rc-skel-line', style: { width: '62%', marginBottom: 0 } }),
      );
    }

    function Card(props) {
      const spec = props.spec;
      const accent = ACCENTS.indexOf(text(spec.accent)) >= 0 ? text(spec.accent) : 'indigo';
      const title = text(spec.title);
      const kicker = text(spec.kicker);
      const lead = text(spec.lead);
      const footer = text(spec.footer);
      const blocks = list(spec.blocks).slice(0, 40);
      const body = blocks.map((block, index) => renderBlock(block, index)).filter(Boolean);
      const layout = text(spec.layout) === 'article' ? 'article' : 'card';
      const sources = list(spec.sources)
        .map((entry) => text(entry))
        .filter((entry) => entry !== '');

      return h(
        'article',
        {
          className: 'rc-card',
          'data-accent': accent,
          'data-layout': layout,
          'aria-label': title || 'Rich answer card',
        },
        kicker
          ? h(
              'div',
              { className: 'rc-kicker' },
              h('span', { className: 'rc-kicker-dot' }),
              kicker,
            )
          : null,
        h('div', { className: 'rc-title', role: 'heading', 'aria-level': 3 }, title || 'Rich answer card'),
        lead ? h('p', { className: 'rc-lead' }, lead) : null,
        body.length ? h('div', { className: 'rc-body' }, body) : null,
        sources.length
          ? h(
              'div',
              { className: 'rc-sources' },
              sources.map((entry, index) => h('span', { className: 'rc-src', key: index }, entry)),
            )
          : null,
        footer ? h('div', { className: 'rc-foot' }, footer) : null,
      );
    }

    function nodeAt(pool, id) {
      if (!pool) return null;
      if (typeof pool.get === 'function') return pool.get(id) || null;
      return pool[id] || null;
    }

    /** Last rich_card call that belongs to `turn`, read straight from the Chat nodes. */
    function cardOf(chat, turn) {
      if (!chat || !turn || !Array.isArray(chat.order)) return null;
      const startSeq =
        turn.start && typeof turn.start.seq === 'number' ? turn.start.seq : -Infinity;
      const endSeq = turn.end && typeof turn.end.seq === 'number' ? turn.end.seq : Infinity;
      const ids = chat.order;
      for (let index = ids.length - 1; index >= 0; index -= 1) {
        const node = nodeAt(chat.nodes, ids[index]);
        if (!node || node.kind !== 'tool-call') continue;
        const anchor = node.anchorSeq;
        if (typeof anchor === 'number' && anchor < startSeq) break;
        if (typeof anchor === 'number' && anchor > endSeq) continue;
        const root = node.data && node.data.root;
        if (!root || root.name !== 'rich_card') continue;
        let spec = null;
        try {
          spec = specOf(root);
        } catch (error) {
          spec = null;
        }
        const usable =
          spec &&
          ((typeof spec.title === 'string' && spec.title.trim() !== '') ||
            (Array.isArray(spec.blocks) && spec.blocks.length > 0));
        if (usable) return spec;
      }
      return null;
    }

    /**
     * Rendered at the end of a completed Turn, outside the folded process log, so the
     * answer card stays visible instead of living behind a dropdown.
     */
    function TurnCard(props) {
      let chat = null;
      try {
        chat = typeof props.useChat === 'function' ? props.useChat((state) => state) : null;
      } catch (error) {
        chat = null;
      }
      const spec = React.useMemo(
        function () {
          try {
            return cardOf(chat, props.turn);
          } catch (error) {
            return null;
          }
        },
        [chat, props.turn],
      );
      if (!spec) return null;
      try {
        return h('div', { className: 'rc-turn' }, h(Card, { spec }));
      } catch (error) {
        return null;
      }
    }

    function RichCardView(props) {
      // The settled card renders once, by TurnCard at the end of the Turn, outside the
      // folded process log. Keep only the streaming placeholder here so the same card
      // does not appear twice.
      if (props && (props.phase === 'preparing' || props.phase === 'start')) return h(Skeleton, null);
      return null;
    }

    function parseFence(pre) {
      const text = (pre.textContent || '').trim();
      if (text.charAt(0) !== '{') return null;
      if (text.indexOf('"blocks"') === -1) return null;
      let spec = null;
      try {
        spec = JSON.parse(text);
      } catch (error) {
        return null;
      }
      if (!spec || typeof spec !== 'object') return null;
      if (!Array.isArray(spec.blocks) || spec.blocks.length === 0) return null;
      return spec;
    }

    /**
     * Claim fenced card blocks in the transcript and mount a real card in their place.
     * A blob that does not parse is left alone and stays visible as source: failing open
     * is the whole point, because a malformed card must never break the answer.
     */
    function installCardFences() {
      let ReactDOM = null;
      try {
        ReactDOM = require('react-dom/client');
      } catch (error) {
        ReactDOM = null;
      }
      if (!ReactDOM || typeof ReactDOM.createRoot !== 'function') return function () {};
      if (typeof MutationObserver !== 'function') return function () {};

      const roots = new Map();
      let frame = 0;

      function mount(pre, spec) {
        pre.setAttribute('data-rc-claimed', '1');
        pre.style.display = 'none';
        const shell = shellOf(pre);
        const box = shell || pre.parentNode;
        const parent = (box && box.parentNode) || null;
        // Re-rendering the message can hand us a fresh <pre> next to an older card; drop that
        // card first so one fence never produces two cards.
        if (parent) {
          const stale = parent.querySelector(':scope > .rc-fence');
          if (stale) {
            const old = roots.get(stale);
            if (old) {
              try {
                old.unmount();
              } catch (error) {}
              roots.delete(stale);
            }
            if (stale.parentNode) stale.parentNode.removeChild(stale);
          }
        }
        const host = document.createElement('div');
        host.className = 'rc-fence';
        if (parent && box) parent.insertBefore(host, box.nextSibling);
        else if (pre.parentNode) pre.parentNode.insertBefore(host, pre.nextSibling);
        // Only after the card is in the document: a code block we mistake for ours must never
        // take the replacement with it.
        if (shell) shell.style.display = 'none';
        else if (box) hideBanner(box, pre);
        const root = ReactDOM.createRoot(host);
        roots.set(host, root);
        try {
          root.render(h(Card, { spec: spec }));
        } catch (error) {}
      }

      /** The renderer's code block is a box with the banner row and the content div as children
       *    div.md-code-block > [div > div[data-code-block-banner]] + div[data-code-block-content] > pre
       *  The hashed classes change between builds; the data attributes are stable. */
      function findLabelRow(scope, pre) {
        const controls = scope.querySelectorAll('button, [role="button"]');
        for (let index = 0; index < controls.length; index += 1) {
          let row = controls[index].parentNode;
          for (let hop = 0; hop < 3 && row && row !== scope.parentNode; hop += 1) {
            if (row.contains && row.contains(pre)) break;
            if ((row.textContent || '').trim().length <= 24) return row;
            row = row.parentNode;
          }
        }
        return null;
      }

      /** The box that holds nothing but this code block, or null when the structure is unfamiliar. */
      function shellOf(pre) {
        try {
          const shell = pre.closest('.md-code-block');
          if (shell) return shell;
        } catch (error) {}
        let node = pre.parentNode;
        for (let depth = 0; depth < 3 && node && node !== document.body; depth += 1) {
          if (node.querySelector && node.querySelector('[data-code-block-banner]')) return node;
          node = node.parentNode;
        }
        return null;
      }

      /** Unknown build: drop the banner row and flatten the wrapper instead of hiding it. */
      function hideBanner(box, pre) {
        let row = box.querySelector('[data-code-block-banner]');
        if (!row) row = findLabelRow(box, pre);
        if (row) {
          while (row.parentNode && row.parentNode !== box && row.parentNode.children.length === 1) {
            row = row.parentNode;
          }
          row.setAttribute('data-rc-fence-head', '1');
          row.style.display = 'none';
        }
        box.classList.add('rc-fence-shell');
      }

      function sweep() {
        frame = 0;
        const blocks = document.querySelectorAll('pre');
        for (let index = 0; index < blocks.length; index += 1) {
          const pre = blocks[index];
          if (pre.getAttribute('data-rc-claimed') === '1') continue;
          const spec = parseFence(pre);
          if (!spec) continue;
          mount(pre, spec);
        }
      }

      function schedule() {
        if (frame) return;
        frame = window.requestAnimationFrame(sweep);
      }

      const observer = new MutationObserver(schedule);
      observer.observe(document.body, { childList: true, subtree: true });
      schedule();

      return function () {
        observer.disconnect();
        if (frame) window.cancelAnimationFrame(frame);
        roots.forEach(function (root, host) {
          try {
            root.unmount();
          } catch (error) {}
          if (host.parentNode) host.parentNode.removeChild(host);
        });
        roots.clear();
      };
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        const style = document.createElement('style');
        style.setAttribute('data-dsh-rich-cards', '');
        style.textContent = CSS;
        document.head.appendChild(style);

        ctx.effect(() => () => {
          if (style.parentNode) style.parentNode.removeChild(style);
        });

        // Clear the diagnostic marker left in the window title by an earlier build.
        try {
          if (typeof document.title === 'string' && document.title.indexOf('P|') === 0) {
            document.title = 'DeepSeek Harness';
          }
        } catch (error) {}

        ctx.effect(() =>
          ctx.slots.inject('conversation.chat.turnTail', () =>
            ctx.slots.register(
              { name: 'conversation.chat.turnTail', id: 'rich-card-answer', order: 5 },
              TurnCard,
            ),
          ),
        );

        ctx.effect(() => installCardFences(), 'dsh-rich-cards: card fences');

        ctx.effect(() =>
          ctx.slots.inject('tool.call.toolview', () =>
            ctx.slots.register({ name: 'tool.call.toolview', key: 'rich_card' }, RichCardView),
          ),
        );
      },
    };
  },
});
