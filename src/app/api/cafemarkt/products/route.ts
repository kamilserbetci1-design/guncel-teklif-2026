import { NextRequest, NextResponse } from 'next/server';
import { searchCafeMarktProducts } from '@/lib/cafemarkt-catalog';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').trim();
  const page = Math.max(1, Number(url.searchParams.get('page') || '1') || 1);

  try {
    const data = await searchCafeMarktProducts(q, page);
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'CafeMarkt kataloğu alınamadı';
    return NextResponse.json({ error: message, products: [], hasMore: false, total: 0 }, { status: 502 });
  }
}
