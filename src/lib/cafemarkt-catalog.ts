import type { Product } from '@/lib/types';
import { ensureWebsiteNetPrice, websiteNetPrice } from '@/lib/guclu-mutfak-catalog';

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

export async function searchCafeMarktProducts(query: string, page = 1) {
  const q = query.trim();
  if (q.length < 2) {
    return { products: [] as Product[], total: 0, page: 1, pageCount: 1, hasMore: false, query: q };
  }
  const params = new URLSearchParams({ q, Arama: q, pg: String(Math.max(1, page)) });
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
  const total = shown || products.length;
  const pageCount = Math.max(maxPg, page);
  return {
    products,
    total,
    page,
    pageCount,
    hasMore: page < pageCount,
    query: q,
  };
}
