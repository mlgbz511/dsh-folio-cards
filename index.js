/**
 * Host half of `dsh-rich-cards`.
 *
 * Teaches the model to end a reply with a fenced `card` block, and leaves the rendering to the
 * Client half, which upgrades that fenced block into a card in place. The `rich_card` tool below
 * is kept for reference but not registered: malformed tool arguments fail the whole turn
 * (MALFORMED_RESPONSE), while a malformed fence merely stays visible as source.
 */

const REGISTER_TOOL = false;

const ACCENTS = ['indigo', 'teal', 'amber', 'rose', 'violet', 'slate'];

const BLOCK_TYPES = [
  'heading',
  'paragraph',
  'bullets',
  'steps',
  'stats',
  'callout',
  'quote',
  'kv',
  'chips',
  'divider',
  'image',
  'timeline',
];

const DESCRIPTION = [
  'Render a rich, typographic answer card in the conversation.',
  'Use it when the reply explains rather than acts: introducing a person, place, work, event or concept;',
  'explaining how something works; comparing options; summarising facts; laying out a briefing.',
  'Do not use it for short factual replies, code or file changes, task progress, or questions back to the user.',
  'The card IS the answer: put the full explanation in the card, then write at most two short spoken sentences after it.',
  'Blocks render in order — heading (new section), paragraph, bullets, steps, stats (2-4 figures), callout (one highlight),',
  'quote, kv (fact pairs), chips (3-6 tags), timeline (dated events), image (a real URL with credit), divider.',
  'Set layout to "article" for long-form pieces: it drops the card chrome and reads like a designed page.',
  'Plain text only: no markdown, no bullet characters.',
  'Keep strings short; never put line breaks, tabs or ASCII double quotes inside a string (quote with 「」), or the tool input becomes invalid JSON and the turn fails.',
  'One card per answer; write in the user\'s language.',
].join(' ');

const GUIDE = [
  '## Rich answer cards',
  'A reply that explains rather than acts can end with one card: a fenced code block whose info',
  'string is `card` and whose body is a JSON object. The host renders that block as a typographic',
  'card in place, between the last line of prose and the cost row.',
  '',
  '```card',
  '{"title": "答案本身，30 字以内", "kicker": "分类 · 主题", "lead": "一句话导语", "accent": "indigo",',
  ' "blocks": [{"type": "heading", "text": "小节"}, {"type": "paragraph", "text": "正文"}]}',
  '```',
  '',
  'Rules:',
  '- Exactly one card fence per reply, at the very end, after at most two short sentences of prose.',
  '- The card IS the answer: put the whole explanation inside the blocks and never repeat it in prose.',
  '- The body must parse as JSON: no line breaks or ASCII double quotes inside a string (use 「」), no',
  '  trailing commas. A body that fails to parse stays visible as source, so keep strings short.',
  '- Top-level fields: title, kicker, lead, accent (indigo | teal | amber | rose | violet | slate),',
  '  layout (card | article), blocks, sources (site names), footer.',
  '- layout "card" (default) is a compact box; "article" drops the box, enlarges the type, and allows',
  '  images and timelines. Use it when the answer is a portrait, a place, a field or a long explainer.',
  '- Block types: heading, paragraph, bullets, steps, stats, callout (tone: info | tip | warn), quote,',
  '  kv, chips, timeline (events: [{time, title, detail}]), image (url + alt + caption + credit), and',
  '  divider.',
  '- Short answer: about 4 blocks. Long-form article: 6-9 blocks. More blocks with short strings beats',
  '  fewer blocks with long ones.',
  '- A card about a person, place, work, event or product should carry one image when one is easy to',
  '  find. Look it up before writing the block: curl',
  '  "https://en.wikipedia.org/w/api.php?action=query&titles=NAME&prop=pageimages&format=json&pithumbsize=1000"',
  '  and take thumbnail.source from the JSON (zh.wikipedia.org works the same way; en is often richer).',
  '  Run it through the shell tool, not web_fetch: web_fetch refuses some hosts that curl reaches.',
  '- Budget that lookup: two or three calls, at most one retry round. If nothing usable comes back,',
  '  omit the image block and write the card you would have written anyway. Never mention the search',
  '  in the prose or in the card — no 「没找到配图」「接口被拦」 line, no explaining why the card has no',
  '  picture. A missing image is not news and does not need an apology.',
  '- image needs url + caption + credit (the site or publisher). Never invent a URL.',
  '- Every string is plain text: no markdown, no bullet characters. Write in the user language.',
  '- Skip the card for short factual replies, code or file work, status reports and questions back to',
  '  the user.',
].join('\n');

const PARAMETERS = {
  type: 'object',
  properties: {
    title: {
      type: 'string',
      description: 'Card headline: one line, the answer in miniature, about 30 characters or fewer.',
    },
    kicker: {
      type: 'string',
      description: 'Optional eyebrow above the title: a category or theme, e.g. "人物 · 数学" or "概念解释".',
    },
    lead: {
      type: 'string',
      description: 'Optional lead paragraph, 1-2 sentences, set in larger secondary type.',
    },
    accent: {
      type: 'string',
      enum: ACCENTS,
      description: 'Optional color theme. Default indigo.',
    },
    layout: {
      type: 'string',
      enum: ['card', 'article'],
      description:
        'card (default) for a compact boxed card; article for a long-form document with images and larger type.',
    },
    sources: {
      type: 'array',
      items: { type: 'string' },
      description: 'Site or publisher names the answer relied on, shown as small chips at the bottom.',
    },
    blocks: {
      type: 'array',
      description: 'Ordered content blocks. 3-6 is ideal for a card, up to 12 for an article.',
      items: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: BLOCK_TYPES,
            description: 'Block kind.',
          },
          text: {
            type: 'string',
            description:
              'Text for heading, paragraph, callout and quote blocks. One or two sentences, under ~120 characters, no line breaks and NO ASCII double quotes (use 「」); add another block instead of a long string.',
          },
          items: {
            type: 'array',
            items: { type: 'string' },
            description: 'Items for bullets, steps and chips.',
          },
          stats: {
            type: 'array',
            description: 'Key figures for a stats block (2-4 entries).',
            items: {
              type: 'object',
              properties: {
                label: { type: 'string', description: 'What the figure measures.' },
                value: { type: 'string', description: 'The figure itself, e.g. "33 岁" or "1982".' },
                detail: { type: 'string', description: 'Optional one-line context.' },
              },
              required: ['label', 'value'],
            },
          },
          rows: {
            type: 'array',
            description: 'Label/value pairs for a kv block.',
            items: {
              type: 'object',
              properties: {
                k: { type: 'string', description: 'Label.' },
                v: { type: 'string', description: 'Value.' },
              },
              required: ['k', 'v'],
            },
          },
          tone: {
            type: 'string',
            enum: ['info', 'tip', 'warn'],
            description: 'Callout tone. Default info.',
          },
          title: {
            type: 'string',
            description: 'Callout headline.',
          },
          cite: {
            type: 'string',
            description: 'Quote attribution.',
          },
          url: {
            type: 'string',
            description: 'Image address for an image block. Must be a real URL seen in a tool result.',
          },
          alt: {
            type: 'string',
            description: 'Short description of the image for alt text.',
          },
          caption: {
            type: 'string',
            description: 'Image caption shown under the picture.',
          },
          credit: {
            type: 'string',
            description: 'Where the image came from, e.g. the site or publisher name.',
          },
          events: {
            type: 'array',
            description: 'Dated entries for a timeline block.',
            items: {
              type: 'object',
              properties: {
                time: { type: 'string', description: 'Year or date label, e.g. "1982".' },
                title: { type: 'string', description: 'What happened.' },
                detail: { type: 'string', description: 'Optional one-line explanation.' },
              },
              required: ['time', 'title'],
            },
          },
        },
        required: ['type'],
      },
    },
    footer: {
      type: 'string',
      description: 'Optional footnote: sources, dates, or a one-line reminder.',
    },
  },
  required: ['title', 'blocks'],
};

const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    title: { type: 'string' },
    blocks: { type: 'integer' },
    accent: { type: 'string' },
    problem: { type: 'string' },
  },
  required: ['ok'],
};

function text(value, max) {
  if (typeof value !== 'string') return '';
  const trimmed = value.replace(/\r\n/g, '\n').trim();
  return max !== undefined && trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

function normalize(args) {
  const input = args && typeof args === 'object' ? args : {};
  const title = text(input.title);
  const blocks = Array.isArray(input.blocks) ? input.blocks : [];
  const usable = blocks.filter((block) => {
    if (!block || typeof block !== 'object' || !BLOCK_TYPES.includes(block.type)) return false;
    if (block.type === 'image') return text(block.url) !== '';
    if (block.type === 'timeline') return Array.isArray(block.events) && block.events.length > 0;
    return true;
  });

  if (!title) return { ok: false, problem: 'missing title (the card headline)' };
  if (usable.length === 0) {
    return { ok: false, problem: 'blocks is empty or contains no recognised block type' };
  }

  return {
    ok: true,
    title,
    blocks: usable.length,
    accent: ACCENTS.includes(input.accent) ? input.accent : 'indigo',
  };
}

function renderResult(_args, value) {
  const receipt = value && typeof value === 'object' ? value : {};
  if (receipt.ok !== true) {
    return [
      {
        type: 'text',
        text:
          'The card was not rendered: ' +
          String(receipt.problem || 'the arguments were incomplete') +
          '. Fill in the missing pieces and call rich_card again with the same content.',
      },
    ];
  }
  return [
    {
      type: 'text',
      text:
        'Rendered the card "' +
        receipt.title +
        '" (' +
        receipt.blocks +
        ' blocks). The card is the answer and the user can already read it. ' +
        'Do not repeat its content; add at most two short sentences if they help.',
    },
  ];
}

/** Row label for surfaces that show a generic Tool call presentation. */
function presentCall(args) {
  const title = text(args && args.title, 80);
  return { card: 'generic', title: title || 'Rich answer card', kind: 'other' };
}

export const inject = ['tools', 'systemPrompt'];

export function apply(ctx) {
  if (REGISTER_TOOL) ctx.effect(
    () =>
      ctx.tools.register({
        name: 'rich_card',
        description: DESCRIPTION,
        parameters: PARAMETERS,
        output: { schema: OUTPUT_SCHEMA, render: renderResult },
        presentCall,
        isConcurrencySafe: () => true,
        timeoutMs: 5000,
        async execute(args) {
          return normalize(args);
        },
      }),
    'dsh-rich-cards: rich_card tool',
  );

  ctx.effect(
    () =>
      ctx.systemPrompt.section({
        name: 'rich-answer-cards',
        order: 34,
        text: GUIDE,
      }),
    'dsh-rich-cards: prompt guidance',
  );
}
