import type { Product } from '@/lib/types';
import { foldSearchText, scoreSearchText, searchTokens } from '@/lib/product-search';

const SITEMAP_URL = 'https://guclumutfak.com/products.xml';
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

type SitemapCache = { at: number; urls: string[] };
let sitemapCache: SitemapCache | null = null;
const productCache = new Map<string, Product>();

const asRecord = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;

const asArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : v == null ? [] : [v]);

const text = (v: unknown): string => {
  if (v == null) return '';
  if (typeof v === 'string' || typeof v === 'number') return String(v).trim();
  const rec = asRecord(v);
  if (rec?.name) return text(rec.name);
  return '';
};

const parseScripts = (html: string): unknown[] => {
  const out: unknown[] = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try {
      out.push(JSON.parse(m[1]));
    } catch {
      /* ignore broken blocks */
    }
  }
  return out;
};

const flattenLd = (node: unknown, acc: Record<string, unknown>[] = []): Record<string, unknown>[] => {
  const rec = asRecord(node);
  if (rec) {
    acc.push(rec);
    const graph = rec['@graph'];
    if (Array.isArray(graph)) graph.forEach((g) => flattenLd(g, acc));
  } else if (Array.isArray(node)) {
    node.forEach((g) => flattenLd(g, acc));
  }
  return acc;
};

const typeOf = (rec: Record<string, unknown>) =>
  asArray(rec['@type'])
    .map((t) => String(t).toLowerCase())
    .join(' ');

/** Site fiyatı KDV dahil; teklifte alta KDV eklendiği için %20 düşülür. */
export const websiteNetPrice = (gross: number) => {
  const n = Number(gross);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round((n / 1.2) * 100) / 100;
};

export function ensureWebsiteNetPrice(p: Product): Product {
  if ((p.origin !== 'website' && p.origin !== 'cafemarkt') || p.vat_included === false) return p;
  return { ...p, price: websiteNetPrice(p.price), vat_included: false };
}

export function mapWebsiteProduct(html: string, url: string): Product | null {
  const nodes = parseScripts(html).flatMap((n) => flattenLd(n));
  const product = nodes.find((n) => typeOf(n).includes('product'));
  if (!product) return null;

  const name = text(product.name);
  if (!name) return null;

  const offers = asArray(product.offers).map(asRecord).filter(Boolean) as Record<string, unknown>[];
  const offer = offers[0] || {};
  const price = Number(String(offer.price ?? product.price ?? '0').replace(',', '.')) || 0;
  const currency = (text(offer.priceCurrency) || 'TRY').toUpperCase();
  const sku = text(product.sku) || text(product.mpn);
  const images = asArray(product.image)
    .map((img) => {
      if (typeof img === 'string') return img;
      const r = asRecord(img);
      return text(r?.url || r?.contentUrl);
    })
    .filter(Boolean);
  const brandName = text(product.brand);
  const breadcrumb = nodes.find((n) => typeOf(n).includes('breadcrumb'));
  const crumbs = asArray(breadcrumb?.itemListElement)
    .map(asRecord)
    .filter(Boolean) as Record<string, unknown>[];
  const crumbNames = crumbs
    .sort((a, b) => Number(a.position || 0) - Number(b.position || 0))
    .map((c) => text(c.name))
    .filter((n) => n && !/güçlü mutfak/i.test(n) && n !== name);
  const category = crumbNames.slice(-2).join(' > ') || crumbNames.join(' > ');

  const slugId = url.replace(/\/$/, '').split('/').pop() || name;
  return {
    id: `web-gm-${slugId}`.slice(0, 120),
    brand_id: 'guclumutfak',
    name,
    description: text(product.description),
    price: websiteNetPrice(price),
    cost: 0,
    image: images[0] || '',
    product_link: url.replace('http://', 'https://'),
    category,
    currency,
    manufacturer: brandName || undefined,
    sku: sku || undefined,
    origin: 'website',
    vat_included: false,
  };
}

export async function getProductSitemapUrls(): Promise<string[]> {
  if (sitemapCache && Date.now() - sitemapCache.at < 1000 * 60 * 60) {
    return sitemapCache.urls;
  }
  const res = await fetch(SITEMAP_URL, {
    headers: { 'user-agent': UA, accept: 'application/xml,text/xml,*/*' },
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`Sitemap alınamadı (${res.status})`);
  const xml = await res.text();
  const urls = Array.from(xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g))
    .map((m) => m[1].trim())
    .filter((u) => /^https?:\/\/(www\.)?guclumutfak\.com\//i.test(u));
  sitemapCache = { at: Date.now(), urls };
  return urls;
}

async function fetchProductPage(url: string): Promise<Product | null> {
  const cached = productCache.get(url);
  if (cached) {
    const fixed = ensureWebsiteNetPrice(cached);
    if (fixed.price !== cached.price || fixed.vat_included !== cached.vat_included) {
      productCache.set(url, fixed);
    }
    return fixed;
  }
  const res = await fetch(url, {
    headers: {
      'user-agent': UA,
      accept: 'text/html,application/xhtml+xml',
    },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const html = await res.text();
  const product = mapWebsiteProduct(html, url);
  if (product) productCache.set(url, product);
  return product;
}

async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  const worker = async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

export async function fetchWebsiteProductPage(page: number, pageSize: number) {
  const urls = await getProductSitemapUrls();
  const total = urls.length;
  const start = Math.max(0, (page - 1) * pageSize);
  const slice = urls.slice(start, start + pageSize);
  const rows = await mapPool(slice, 8, fetchProductPage);
  const products = rows.filter((p): p is Product => Boolean(p)).map(ensureWebsiteNetPrice);
  return {
    products,
    page,
    pageSize,
    total,
    fetched: start + slice.length,
    hasMore: start + slice.length < total,
    cached: productCache.size,
  };
}

const slugify = foldSearchText;

export async function searchWebsiteProducts(query: string, offset = 0, limit = 40) {
  const tokens = searchTokens(query);
  if (!tokens.length) {
    return { products: [] as Product[], total: 0, query, offset, hasMore: false };
  }

  const urls = await getProductSitemapUrls();
  const matchedUrls = urls
    .map((url) => ({ url, score: scoreSearchText(slugify(url), query) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.url.length - b.url.length)
    .map((row) => row.url);

  const total = matchedUrls.length;
  const start = Math.max(0, offset);
  const slice = matchedUrls.slice(start, start + Math.max(1, Math.min(limit, 50)));
  const rows = await mapPool(slice, 12, fetchProductPage);
  const products = rows
    .filter((p): p is Product => Boolean(p))
    .map(ensureWebsiteNetPrice)
    .sort(
      (a, b) =>
        scoreSearchText(`${b.name} ${b.category} ${b.manufacturer} ${b.sku}`, query) -
        scoreSearchText(`${a.name} ${a.category} ${a.manufacturer} ${a.sku}`, query)
    );

  return {
    products,
    total,
    query,
    offset: start,
    fetched: start + slice.length,
    hasMore: start + slice.length < total,
  };
}

export const catalogProductKey = (p: { id?: string; sku?: string; name?: string }) => {
  const sku = (p.sku || '').trim().toLowerCase();
  const name = (p.name || '').trim().toLowerCase();
  return sku ? `sku:${sku}` : `name:${name}|id:${String(p.id || '')}`;
};

export function mergeRegisteredWithWebsite(registered: Product[], website: Product[]): Product[] {
  const map = new Map<string, Product>();
  for (const p of registered) {
    const id = String(p.id || catalogProductKey(p));
    map.set(id, { ...p, id, origin: p.origin === 'website' || p.origin === 'cafemarkt' ? p.origin : p.origin || 'catalog' });
  }
  for (const p of website) {
    const id = String(p.id);
    map.set(id, ensureWebsiteNetPrice({ ...p, origin: p.origin === 'cafemarkt' ? 'cafemarkt' : 'website' }));
  }
  return Array.from(map.values());
}
