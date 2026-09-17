import { NextRequest, NextResponse } from 'next/server';
import { fetchWebsiteProductPage, searchWebsiteProducts } from '@/lib/guclu-mutfak-catalog';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').trim();
  const page = Math.max(1, Number(url.searchParams.get('page') || '1') || 1);
  const pageSize = Math.min(24, Math.max(4, Number(url.searchParams.get('pageSize') || '12') || 12));

  try {
    if (q) {
      const offset = Math.max(0, Number(url.searchParams.get('offset') || '0') || 0);
      const limit = Math.min(50, Math.max(10, Number(url.searchParams.get('limit') || '40') || 40));
      const data = await searchWebsiteProducts(q, offset, limit);
      return NextResponse.json(data);
    }
    const data = await fetchWebsiteProductPage(page, pageSize);
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Site kataloğu alınamadı';
    return NextResponse.json({ error: message, products: [], hasMore: false, total: 0 }, { status: 502 });
  }
}
