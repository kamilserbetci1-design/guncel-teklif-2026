import { NextResponse } from 'next/server';
import { PDFParse } from 'pdf-parse';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const MAX = 25 * 1024 * 1024;

function usefulLen(s: string) {
  return s.replace(/\s+/g, '').length;
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const forceRender = String(form.get('render') || '') === '1';
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Dosya gerekli' }, { status: 400 });
    }
    if (file.size > MAX) {
      return NextResponse.json({ error: 'Dosya 25 MB sınırını aşıyor' }, { status: 413 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const head = buf.subarray(0, 8).toString('utf8');
    if (!head.includes('%PDF')) {
      return NextResponse.json({ error: 'Geçerli bir PDF değil' }, { status: 400 });
    }

    const parser = new PDFParse({ data: new Uint8Array(buf) });
    try {
      const textResult = await parser.getText({
        pageJoiner: '\n',
        cellSeparator: '\t',
        lineEnforce: true,
      });
      const text = String(textResult?.text || '')
        .replace(/--\s*\d+\s+of\s+\d+\s*--/gi, '')
        .trim();

      let tables: string[][][] = [];
      try {
        const tableResult = await parser.getTable();
        tables = (tableResult.mergedTables || []).filter((t) => t.length > 0);
      } catch {
        tables = [];
      }

      const hasText = usefulLen(text) >= 12;
      const hasTable = tables.some((t) => t.some((row) => row.some((c) => String(c).trim().length > 2)));

      let images: string[] = [];
      if (forceRender || (!hasText && !hasTable)) {
        const shot = await parser.getScreenshot({
          first: 8,
          scale: 2,
          imageDataUrl: true,
          imageBuffer: false,
        });
        images = (shot.pages || []).map((p) => p.dataUrl).filter(Boolean);
      }

      return NextResponse.json({
        text: hasText ? text : '',
        tables,
        images,
        pages: textResult?.total || 0,
      });
    } finally {
      await parser.destroy();
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'PDF okunamadı';
    console.error('Liste PDF import:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
