import type { Product } from '@/lib/types';

export type ImportedListRow = {
  name: string;
  category?: string;
  quantity: number;
};

const TR_MAP: Record<string, string> = {
  ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u',
  Ç: 'c', Ğ: 'g', İ: 'i', I: 'i', Ö: 'o', Ş: 's', Ü: 'u',
};

export const foldTr = (s: string) =>
  (s || '')
    .replace(/[çğıöşüÇĞİIÖŞÜ]/g, (ch) => TR_MAP[ch] || ch)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const HEADER = /^(urun|ürün|adi|adı|name|isim|kategori|category|kod|sku|adet|qty|no|#)$/i;

const CATEGORY_HINTS = [
  'kahve degirmeni', 'blender', 'filtre kahve', 'buz makinesi', 'teshir dolabi',
  'sogutucu dolap', 'mikrodalga', 'derin dondurucu', 'bulasik makinesi', 'barista seti',
  'kokteyl seti', 'turk kahvesi', 'cay makinesi', 'espresso makinesi', 'makinesi',
];

export function parseListText(text: string): ImportedListRow[] {
  const lines = text.replace(/\r/g, '\n').split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const out: ImportedListRow[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    if (line.length < 4) continue;
    if (/^--\s*\d+\s+of\s+\d+\s*--$/i.test(line)) continue;
    if (/^(ürün|urun)\s*(adi|adı)?(\s+(kategori|category))?$/i.test(line)) continue;
    if (/^ürün\s*adi|^urun\s*adi|^kategori$/i.test(line)) continue;

    const tabbed = line.split(/\t+/).map((s) => s.trim()).filter(Boolean);
    let name = '';
    let category = '';
    if (tabbed.length >= 2) {
      name = tabbed[0];
      category = tabbed[tabbed.length - 1];
    } else {
      const folded = foldTr(line);
      let cut = -1;
      for (const hint of CATEGORY_HINTS) {
        const idx = folded.lastIndexOf(hint);
        if (idx > 12) cut = Math.max(cut, idx);
      }
      if (cut > 12) {
        const orig = line;
        let acc = 0;
        let splitAt = orig.length;
        const tokens = orig.split(' ');
        let fAcc = '';
        for (let i = 0; i < tokens.length; i++) {
          fAcc = foldTr((fAcc ? fAcc + ' ' : '') + tokens[i]);
          if (fAcc.length >= cut) {
            splitAt = tokens.slice(0, i).join(' ').length;
            break;
          }
          acc = fAcc.length;
        }
        if (splitAt > 8 && splitAt < orig.length - 3) {
          name = orig.slice(0, splitAt).trim();
          category = orig.slice(splitAt).trim();
        } else {
          name = orig;
        }
      } else {
        name = line;
      }
    }

    name = name.replace(/^[\d.)\-]+\s+/, '').trim();
    if (!name || HEADER.test(name)) continue;
    if (name.length < 6 && !category) continue;
    const key = foldTr(name);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name, category: category || undefined, quantity: 1 });
  }
  return out;
}

export function parseExcelGrid(rows: unknown[][]): ImportedListRow[] {
  if (!rows.length) return [];
  const asText = rows.map((r) => (r || []).map((c) => String(c ?? '').trim()));
  const headerIdx = asText.findIndex((r) => r.some((c) => /urun|ürün|adi|adı|isim|name|sku|kod/i.test(c)));
  let start = 0;
  let nameIdx = 0;
  let catIdx = -1;
  let qtyIdx = -1;
  if (headerIdx >= 0) {
    const h = asText[headerIdx].map((c) => c.toLowerCase());
    const find = (keys: string[]) => h.findIndex((x) => keys.some((k) => x.includes(k)));
    nameIdx = find(['ürün', 'urun', 'adi', 'adı', 'isim', 'name']);
    if (nameIdx < 0) nameIdx = find(['sku', 'kod']) >= 0 ? find(['sku', 'kod']) : 0;
    catIdx = find(['kategori', 'category']);
    qtyIdx = find(['adet', 'qty', 'miktar', 'quantity']);
    start = headerIdx + 1;
  }
  const out: ImportedListRow[] = [];
  const seen = new Set<string>();
  for (let i = start; i < asText.length; i++) {
    const row = asText[i];
    const name = (row[nameIdx] || '').trim();
    if (!name || HEADER.test(name)) continue;
    const key = foldTr(name);
    if (seen.has(key)) continue;
    seen.add(key);
    const qty = qtyIdx >= 0 ? parseInt(row[qtyIdx], 10) : 1;
    out.push({
      name,
      category: catIdx >= 0 ? row[catIdx] || undefined : undefined,
      quantity: Number.isFinite(qty) && qty > 0 ? qty : 1,
    });
  }
  return out;
}

export type CatalogMatch = { product: Product; score: number };

export function matchCatalog(query: string, products: Product[], category?: string): CatalogMatch[] {
  const q = foldTr(query);
  if (!q || products.length === 0) return [];
  const qWords = q.split(' ').filter((w) => w.length > 2);
  const cat = foldTr(category || '');
  const scored: CatalogMatch[] = [];

  for (const p of products) {
    const name = foldTr(p.name);
    const hay = foldTr([p.name, p.sku || '', p.category || '', p.manufacturer || ''].join(' '));
    let score = 0;
    if (name === q) score = 100;
    else if (p.sku && foldTr(p.sku) === q) score = 98;
    else if (name.includes(q) || q.includes(name)) score = 82;
    else {
      const hits = qWords.filter((w) => hay.includes(w)).length;
      if (qWords.length) score = Math.round((hits / qWords.length) * 70);
    }
    if (cat && foldTr(p.category || '').includes(cat)) score += 8;
    if (score >= 38) scored.push({ product: p, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 6);
}
