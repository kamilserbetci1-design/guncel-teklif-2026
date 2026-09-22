import type { Product } from '@/lib/types';
import { ensureWebsiteNetPrice, websiteNetPrice } from '@/lib/guclu-mutfak-catalog';
import { asciiSearchQuery, isSkuLikeQuery, scoreSearchText } from '@/lib/product-search';

export const CAFEMARKT_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';
const BASE = 'https://www.cafemarkt.com';

export function isCafeMarktCdnUrl(src: string) {
  return /^(https:)?\/\/witcdn\.cafemarkt\.com\//i.test(src.trim());
}

/** witcdn CafeMarkt dışından CORS kapalı; teklifte crossOrigin=anonymous görseli düşürüyor. */
export function cafeMarktProxiedImage(src: string) {
  const raw = (src || '').trim();
  if (!raw) return '';
  const abs = raw.startsWith('//') ? `https:${raw}` : raw;
  if (/Logo-Animasyon|\.gif(\?|$)|\/Icon\//i.test(abs)) return '';
  if (!isCafeMarktCdnUrl(abs)) return abs;
  return `/api/cafemarkt/image?u=${encodeURIComponent(abs)}`;
}

const pickListingImage = (seg: string) => {
  const urls = Array.from(
    seg.matchAll(/(?:data-src|src)="((?:https:)?\/\/witcdn\.cafemarkt\.com\/[^"]+)"/gi)
  ).map((m) => (m[1].startsWith('//') ? `https:${m[1]}` : m[1]));
  const real = urls.find((u) => !/\.gif(\?|$)/i.test(u) && !/Logo-Animasyon/i.test(u) && !/\/Icon\//i.test(u));
  return real ? cafeMarktProxiedImage(real) : '';
};

const parseTrPrice = (raw: string) => {
  const s = raw.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

export function parseCafeMarktSearchHtml(html: string, pageUrl: string): Product[] {
  const hrefs = Array.from(html.matchAll(/<a href="(\/[^"]+)" class="image-wrapper" title="([^"]+)"/g));
  const seen = new Set<string>();
  const starts: { pos: number; href: string; title: string }[] = [];
  for (const m of hrefs) {
    const href = m[1];
    if (!href || href.includes('?') || href.split('/').filter(Boolean).length !== 1) continue;
    if (seen.has(href)) continue;
    seen.add(href);
    starts.push({ pos: m.index || 0, href, title: m[2] });
  }

  const products: Product[] = [];
  for (let i = 0; i < starts.length; i++) {
    const cur = starts[i];
    const nextPos = i + 1 < starts.length ? starts[i + 1].pos : html.length;
    const seg = html.slice(cur.pos, nextPos);
    const priceMatch = seg.match(/class="product-price">([^<]+)<\/span>/);
    const altMatch = seg.match(/alt="[^"]*-\s*([^"]+)"/);
    const manufacturer = (altMatch?.[1] || '').replace(/\s+/g, ' ').trim() || undefined;
    const slug = cur.href.replace(/^\//, '');
    const gross = priceMatch ? parseTrPrice(priceMatch[1]) : 0;
    products.push(
      ensureWebsiteNetPrice({
        id: `web-cm-${slug}`.slice(0, 120),
        brand_id: 'guclumutfak',
        name: cur.title.trim(),
        description: '',
        price: websiteNetPrice(gross),
        cost: 0,
        image: pickListingImage(seg),
        product_link: `${BASE}${cur.href}`,
        category: 'CafeMarkt',
        currency: 'TRY',
        manufacturer,
        origin: 'cafemarkt',
        vat_included: false,
      })
    );
  }
  void pageUrl;
  return products;
}

const compactSku = (value: string) => value.replace(/\s+/g, '').toUpperCase();

async function confirmProductsBySku(products: Product[], sku: string) {
  const needle = compactSku(sku);
  if (!needle || products.length === 0) return products;
  const checks = await Promise.all(
    products.slice(0, 8).map(async (p) => {
      if (!p.product_link) return null;
      try {
        const res = await fetch(p.product_link, {
          headers: { 'user-agent': CAFEMARKT_UA, accept: 'text/html,application/xhtml+xml', referer: `${BASE}/` },
          cache: 'no-store',
        });
        if (!res.ok) return null;
        const html = await res.text();
        const compactHtml = compactSku(html);
        if (!compactHtml.includes(needle)) return null;
        return { ...p, sku: sku.trim() };
      } catch {
        return null;
      }
    })
  );
  const matched = checks.filter((p): p is Product => !!p);
  return matched.length ? matched : products;
}

export async function searchCafeMarktProducts(query: string, page = 1) {
  const original = query.trim();
  const skuQuery = isSkuLikeQuery(original);
  const q = skuQuery ? original : (asciiSearchQuery(original) || original);
  if (q.length < 2) {
    return { products: [] as Product[], total: 0, page: 1, pageCount: 1, hasMore: false, query: original };
  }
  const fetchPage = async (term: string, pg: number) => {
    const params = new URLSearchParams({ q: term, Arama: term, pg: String(Math.max(1, pg)) });
    const url = `${BASE}/arama?${params.toString()}`;
    const res = await fetch(url, {
      headers: { 'user-agent': CAFEMARKT_UA, accept: 'text/html,application/xhtml+xml', referer: `${BASE}/` },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`CafeMarkt araması alınamadı (${res.status})`);
    const html = await res.text();
    const products = parseCafeMarktSearchHtml(html, url);
    const shown = Number((html.match(/<strong>(\d+)<\/strong>\s*ürün/) || [])[1] || 0);
    const maxPg = Math.max(1, ...Array.from(html.matchAll(/[?&]pg=(\d+)/g)).map((m) => Number(m[1]) || 1));
    return { products, shown, maxPg, url };
  };

  let hit = await fetchPage(q, page);
  if (!skuQuery && !hit.products.length && q.includes(' ')) {
    const fallback = q.split(/\s+/).sort((a, b) => b.length - a.length)[0];
    if (fallback && fallback !== q) hit = await fetchPage(fallback, page);
  }
  let products = skuQuery
    ? await confirmProductsBySku(hit.products, original)
    : [...hit.products].sort(
        (a, b) => scoreSearchText(`${b.name} ${b.manufacturer} ${b.sku}`, original || q) - scoreSearchText(`${a.name} ${a.manufacturer} ${a.sku}`, original || q)
      );
  const total = skuQuery ? products.length : (hit.shown || products.length);
  const pageCount = skuQuery ? 1 : Math.max(hit.maxPg, page);
  return {
    products,
    total,
    page,
    pageCount,
    hasMore: !skuQuery && page < pageCount,
    query: original,
  };
}
