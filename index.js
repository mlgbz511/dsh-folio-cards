/**
 * Host half of `dsh-folio-cards`.
 *
 * Teaches the model to end a reply with a fenced `card` block and leaves the rendering to the
 * Client half, which upgrades that fence into a card in place.
 *
 * No tool is registered on purpose: malformed tool arguments fail the whole turn
 * (MALFORMED_RESPONSE), while a malformed fence merely stays visible as source. The tool channel
 * is therefore gone, not merely switched off by a constant.
 */

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
  '- image blocks only take an `https` URL that already appeared in a tool result or that the user',
  '  supplied. Never invent one, and never point one at localhost, a LAN address or any private',
  '  host: the browser would fetch it from the user machine. A card needs no image; when there is',
  '  no URL at hand, write the card without one and do not comment on the absence.',
  '- image needs url + caption + credit (the site or publisher).',
  '- Every string is plain text: no markdown, no bullet characters. Write in the user language.',
  '- Skip the card for short factual replies, code or file work, status reports and questions back to',
  '  the user.',
].join('\n');

export const inject = ['systemPrompt'];

export function apply(ctx) {
  ctx.effect(
    () =>
      ctx.systemPrompt.section({
        name: 'rich-answer-cards',
        order: 34,
        text: GUIDE,
      }),
    'dsh-folio-cards: prompt guidance',
  );
}
