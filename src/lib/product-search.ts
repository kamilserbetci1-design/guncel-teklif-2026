const TR_MAP: Record<string, string> = {
  ç: 'c',
  ğ: 'g',
  ı: 'i',
  ö: 'o',
  ş: 's',
  ü: 'u',
  Ç: 'c',
  Ğ: 'g',
  İ: 'i',
  I: 'i',
  Ö: 'o',
  Ş: 's',
  Ü: 'u',
};

const STOP = new Set([
  've',
  'ile',
  'icin',
  'veya',
  'bir',
  'adet',
  'cm',
  'mm',
  'lt',
  'kg',
  'li',
  'lu',
  'set',
  'tip',
  'the',
  'and',
  'of',
]);

const GENERIC = new Set(['makine', 'makinesi', 'makinalari', 'urun', 'aparat', 'cihaz', 'model', 'standart']);

const SYN: Record<string, string[]> = {
  izgara: ['grill', 'barbeku', 'bbq'],
  grill: ['izgara', 'barbeku'],
  barbeku: ['izgara', 'grill', 'bbq'],
  bbq: ['izgara', 'grill'],
  elektrikli: ['elektrik'],
  elektrik: ['elektrikli'],
  makinesi: ['makine'],
  makine: ['makinesi'],
};

export function foldSearchText(value: string) {
  return (value || '')
    .replace(/İ/g, 'i')
    .replace(/I/g, 'i')
    .replace(/ı/g, 'i')
    .replace(/[çğıöşüÇĞİIÖŞÜ]/g, (ch) => TR_MAP[ch] || ch)
    .toLocaleLowerCase('tr-TR')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** CafeMarkt arama motoru Türkçe ı/ğ harflerini yutuyor; ASCII gönder. */
export function asciiSearchQuery(query: string) {
  return foldSearchText(query);
}

/** 412.G.GN.150.D.2 / CS-TEZ-3700 gibi ürün kodu aramaları. */
export function isSkuLikeQuery(query: string) {
  const compact = (query || '').trim().replace(/\s+/g, '');
  if (compact.length < 5) return false;
  if (!/^[A-Za-z0-9]+([.\-\/_][A-Za-z0-9]+)+$/.test(compact)) return false;
  return /[0-9]/.test(compact) && /[A-Za-z]/.test(compact);
}

const variants = (token: string) => {
  const out = [token, ...(SYN[token] || [])];
  if (token.length >= 5) {
    if (/(ler|lar)$/.test(token)) out.push(token.slice(0, -3));
    if (/(leri|lari|sinin)$/.test(token)) out.push(token.slice(0, -4));
    if (/(si|li|lu|lik)$/.test(token)) out.push(token.slice(0, -2));
  }
  return Array.from(new Set(out.filter((v) => v.length >= 2)));
};

export const tokenInHay = (hay: string, token: string) => variants(token).some((v) => hay.includes(v));

export function searchTokens(query: string) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of foldSearchText(query).split(/\s+/)) {
    if (t.length < 2 || STOP.has(t) || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

const primaryToken = (tokens: string[]) => {
  const content = tokens.filter((t) => !GENERIC.has(t));
  const pool = content.length ? content : tokens;
  return [...pool].sort((a, b) => b.length - a.length || a.localeCompare(b))[0] || '';
};

export function scoreSearchText(hayRaw: string, query: string) {
  const hay = foldSearchText(hayRaw);
  const tokens = searchTokens(query);
  if (!hay || !tokens.length) return 0;
  const hits = tokens.filter((t) => tokenInHay(hay, t));
  if (!hits.length) return 0;
  const primary = primaryToken(tokens);
  const primaryHit = primary ? tokenInHay(hay, primary) : false;
  const allHit = hits.length === tokens.length;
  if (!allHit && !primaryHit) return 0;
  const phrase = tokens.join(' ');
  let score = hits.length * 16;
  if (allHit) score += 48;
  else score += Math.round((hits.length / tokens.length) * 24);
  if (hay.includes(phrase)) score += 36;
  if (primaryHit) score += 12;
  return score;
}

export function productSearchHay(p: {
  name?: string;
  sku?: string;
  category?: string;
  manufacturer?: string;
  description?: string;
  product_link?: string;
}) {
  return [p.name, p.sku, p.category, p.manufacturer, p.description, p.product_link].filter(Boolean).join(' ');
}

export function foldedIncludes(hay: string, query: string) {
  const q = foldSearchText(query);
  if (!q) return true;
  const h = foldSearchText(hay);
  if (h.includes(q)) return true;
  const tokens = searchTokens(query);
  return tokens.length > 0 && tokens.every((t) => tokenInHay(h, t));
}

export function rankProducts<T extends Parameters<typeof productSearchHay>[0]>(items: T[], query: string, limit = 80): T[] {
  const q = query.trim();
  if (!q) return items.slice(0, limit);
  return items
    .map((item) => ({ item, score: scoreSearchText(productSearchHay(item), q) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.item);
}
