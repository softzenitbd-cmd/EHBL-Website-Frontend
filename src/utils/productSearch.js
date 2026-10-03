/**
 * Product search shared by the invoice (POS) and the inventory page.
 *
 * The old matcher returned anything whose name, code, size or *category*
 * contained the text, in catalogue order. Typing "hand" therefore listed every
 * product in "Hand Tools" and the products actually called "Hand ..." were cut
 * off by the result limit. This one ranks matches instead:
 *
 *   exact code  >  code prefix  >  name prefix  >  a word in the name starts
 *   with it  >  name contains it  >  size  >  company  >  category
 *
 * Several words narrow the search - every word has to match somewhere, so
 * "socket 8" finds the 8mm socket. A category-only hit is only shown when
 * nothing matched by name, code or size.
 */

const norm = (v) => String(v || '').toLowerCase().replace(/\s+/g, ' ').trim();

const wordStarts = (text, token) => {
  // Words split on spaces and on the punctuation the catalogue uses (: , - / .)
  const words = text.split(/[\s:,\-/.()]+/);
  return words.some((w) => w.startsWith(token));
};

/** Score one token against one product; 0 means no match. */
const scoreToken = (p, token) => {
  const code = norm(p.product_code || p.id);
  const name = norm(p.name);
  const variant = norm(p.variant);
  const category = norm(p.category || p.category_name);
  const company = norm(p.company || p.company_name);

  if (code === token) return 1000;
  if (code.startsWith(token)) return 600;
  if (name.startsWith(token)) return 400;
  if (wordStarts(name, token)) return 300;
  if (name.includes(token)) return 150;
  if (code.includes(token)) return 120;
  if (variant && (variant === token || variant.startsWith(token))) return 60;
  if (variant.includes(token)) return 40;
  // Brand / company (RKL, Bir, ...) is a deliberate search, so it counts.
  if (company && wordStarts(company, token)) return 45;
  if (category && wordStarts(category, token)) return 5;
  return 0;
};

/**
 * @returns products ordered best match first, at most `limit`.
 */
export const searchProducts = (products, query, limit = 12) => {
  const tokens = norm(query).split(' ').filter(Boolean);
  if (tokens.length === 0) return [];

  const scored = [];
  for (const p of products || []) {
    let total = 0;
    let strong = false;
    let ok = true;
    for (const t of tokens) {
      const s = scoreToken(p, t);
      if (s === 0) { ok = false; break; }
      if (s >= 40) strong = true;
      total += s;
    }
    if (ok) scored.push({ p, total, strong });
  }

  // If anything matched on name, code or size, category-only hits are noise.
  const anyStrong = scored.some((x) => x.strong);
  const kept = anyStrong ? scored.filter((x) => x.strong) : scored;

  kept.sort((a, b) =>
    b.total - a.total
    // Then in-stock first, then shorter (closer) names, then alphabetical.
    || (Number(b.p.stock) > 0) - (Number(a.p.stock) > 0)
    || String(a.p.name || '').length - String(b.p.name || '').length
    || String(a.p.name || '').localeCompare(String(b.p.name || '')));

  return (limit ? kept.slice(0, limit) : kept).map((x) => x.p);
};

/** Score-free yes/no, for filtering a whole list (inventory table). */
export const productMatches = (p, query) => {
  const tokens = norm(query).split(' ').filter(Boolean);
  return tokens.every((t) => scoreToken(p, t) > 0);
};
