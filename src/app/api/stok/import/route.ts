import { NextRequest } from 'next/server';
import { cariDb, isCariConfigured, notConfigured } from '@/lib/cari-auth';

export const dynamic = 'force-dynamic';

// Eski STOK.html sisteminin JSON yedeğini içe aktarır.
// Beklenen: { products: [{code,name,brand,category,color,stockStoreBoxed,stockStoreUnboxed,stockWarehouseBoxed,stockWarehouseUnboxed,id}], brands: [...], categories: [...] }
export async function POST(req: NextRequest) {
  if (!isCariConfigured()) return notConfigured();
  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.products)) {
    return Response.json({ error: 'Geçersiz yedek dosyası: ürün listesi bulunamadı.' }, { status: 400 });
  }

  const productRows = body.products
    .filter((p: any) => p && (p.name || p.code))
    .map((p: any) => ({
      id: Number(p.id) || Date.now() + Math.floor(Math.random() * 100000),
      code: String(p.code || ''),
      name: String(p.name || p.code || ''),
      brand: String(p.brand || ''),
      category: String(p.category || ''),
      color: String(p.color || ''),
      store_boxed: Math.max(0, Math.trunc(Number(p.stockStoreBoxed) || 0)),
      store_unboxed: Math.max(0, Math.trunc(Number(p.stockStoreUnboxed) || 0)),
      warehouse_boxed: Math.max(0, Math.trunc(Number(p.stockWarehouseBoxed) || 0)),
      warehouse_unboxed: Math.max(0, Math.trunc(Number(p.stockWarehouseUnboxed) || 0)),
    }));

  const brands: string[] = Array.isArray(body.brands) ? body.brands : [];
  const categories: string[] = Array.isArray(body.categories) ? body.categories : [];
  // Ürünlerden gelen marka/kategorileri de listeye kat
  productRows.forEach((r: any) => { if (r.brand) brands.push(r.brand); if (r.category) categories.push(r.category); });

  const listRows = [
    ...Array.from(new Set(brands.filter(Boolean))).map((name) => ({ type: 'brand', name: String(name) })),
    ...Array.from(new Set(categories.filter(Boolean))).map((name) => ({ type: 'category', name: String(name) })),
  ];

  const db = cariDb();
  const prodRes = await db.from('stok_products').upsert(productRows);
  if (prodRes.error) return Response.json({ error: 'Ürünler aktarılamadı: ' + prodRes.error.message }, { status: 500 });
  if (listRows.length) {
    const listRes = await db.from('stok_lists').upsert(listRows, { onConflict: 'type,name' });
    if (listRes.error) return Response.json({ error: 'Listeler aktarılamadı: ' + listRes.error.message }, { status: 500 });
  }

  return Response.json({ ok: true, products: productRows.length, brands: new Set(brands).size, categories: new Set(categories).size });
}
