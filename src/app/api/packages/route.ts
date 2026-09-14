import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// POST: Paketleri JSON dosyasına kaydet
export async function POST(request: Request) {
  try {
    const { brand_id, packages } = await request.json();

    if (!brand_id || !Array.isArray(packages)) {
      return NextResponse.json({ error: 'brand_id ve packages gerekli' }, { status: 400 });
    }

    const fileName = `packages-${brand_id}.json`;
    const filePath = path.join(process.cwd(), 'public', fileName);

    fs.writeFileSync(filePath, JSON.stringify(packages, null, 2), 'utf-8');

    console.log(`✅ ${packages.length} paket ${fileName} dosyasına kaydedildi.`);
    return NextResponse.json({ success: true, count: packages.length });
  } catch (err: any) {
    console.error('Paket kaydetme hatası:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
