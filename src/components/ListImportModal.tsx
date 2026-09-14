'use client';

import { useRef, useState } from 'react';
import type { Product } from '@/lib/types';
import { matchCatalog, parseExcelGrid, parseListText, type ImportedListRow } from '@/lib/list-import';
import { FileSpreadsheet, ImagePlus, Loader2, Upload, X } from 'lucide-react';

export type ImportPick = {
  name: string;
  quantity: number;
  product: Product | null;
};

type DraftRow = {
  id: string;
  raw: ImportedListRow;
  matches: ReturnType<typeof matchCatalog>;
  selectedId: string | null;
  skip: boolean;
};

type Props = {
  open: boolean;
  products: Product[];
  onClose: () => void;
  onImport: (rows: ImportPick[]) => void;
};

export default function ListImportModal({ open, products, onClose, onImport }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [paste, setPaste] = useState('');
  const [rows, setRows] = useState<DraftRow[]>([]);

  if (!open) return null;

  const toDraft = (list: ImportedListRow[]): DraftRow[] =>
    list.map((raw, i) => {
      const matches = matchCatalog(raw.name, products, raw.category);
      return {
        id: `imp-${Date.now()}-${i}`,
        raw,
        matches,
        selectedId: matches[0]?.product.id || null,
        skip: false,
      };
    });

  const applyText = (text: string) => {
    const parsed = parseListText(text);
    if (!parsed.length) {
      setStatus('Satır okunamadı. Excel veya daha net bir görsel deneyin.');
      setRows([]);
      return;
    }
    setRows(toDraft(parsed));
    setStatus(`${parsed.length} satır bulundu. Eşleşmeleri kontrol edip teklife ekleyin.`);
  };

  const handleFile = async (file: File) => {
    setBusy(true);
    setStatus(`${file.name} okunuyor…`);
    setRows([]);
    const name = file.name.toLowerCase();
    try {
      if (name.endsWith('.csv') || name.endsWith('.txt')) {
        applyText(await file.text());
        return;
      }
      if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
        const XLSX = await import('xlsx');
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false }) as unknown[][];
        const parsed = parseExcelGrid(grid);
        if (!parsed.length) {
          setStatus('Excel’de ürün adı sütunu bulunamadı. İlk sütun ürün adı olmalı.');
          return;
        }
        setRows(toDraft(parsed));
        setStatus(`${parsed.length} satır Excel’den alındı.`);
        return;
      }
      const head = new Uint8Array(await file.slice(0, 8).arrayBuffer());
      const looksPdf =
        name.endsWith('.pdf') ||
        file.type === 'application/pdf' ||
        Array.from(head).map((b) => String.fromCharCode(b)).join('').includes('%PDF');
      if (looksPdf) {
        const readPdf = async (render: boolean) => {
          const form = new FormData();
          form.append('file', file);
          if (render) form.append('render', '1');
          const res = await fetch('/api/teklif/import-pdf', { method: 'POST', body: form });
          const data = await res.json().catch(() => ({} as { error?: string; text?: string; tables?: unknown[][][]; images?: string[] }));
          if (!res.ok) throw new Error(data.error || 'PDF okunamadı');
          return data;
        };

        setStatus('PDF okunuyor…');
        let data = await readPdf(false);

        let parsed: ImportedListRow[] = [];
        for (const table of data.tables || []) {
          parsed = parsed.concat(parseExcelGrid(table));
        }
        if (!parsed.length && data.text) parsed = parseListText(String(data.text));

        if (!parsed.length && !data.images?.length) {
          setStatus('PDF sayfaları görsele çevriliyor…');
          data = await readPdf(true);
        }

        if (!parsed.length && data.images?.length) {
          setStatus('PDF görsel, yazı fotoğraf gibi okunuyor…');
          const { createWorker } = await import('tesseract.js');
          const worker = await createWorker('tur+eng');
          let ocr = '';
          try {
            for (const url of data.images) {
              const { data: rec } = await worker.recognize(url);
              ocr += `\n${rec.text || ''}`;
            }
          } finally {
            await worker.terminate();
          }
          parsed = parseListText(ocr);
        }

        if (!parsed.length) {
          setStatus('PDF içinden ürün satırı çıkmadı. Excel veya daha net bir fotoğraf deneyin.');
          return;
        }
        setRows(toDraft(parsed));
        setStatus(`${parsed.length} satır PDF’den alındı.`);
        return;
      }
      if (file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(name)) {
        setStatus('Görsel okunuyor (ilk seferde dil paketi inebilir, 10–20 sn)…');
        const { createWorker } = await import('tesseract.js');
        const worker = await createWorker('tur+eng');
        const { data } = await worker.recognize(file);
        await worker.terminate();
        applyText(data.text || '');
        return;
      }
      setStatus('Excel, CSV, PDF veya görsel (PNG/JPG) yükleyin.');
    } catch (err) {
      console.error(err);
      setStatus(err instanceof Error ? err.message : 'Dosya okunamadı.');
    } finally {
      setBusy(false);
    }
  };

  const confirm = () => {
    const picks: ImportPick[] = rows
      .filter((r) => !r.skip)
      .map((r) => ({
        name: r.raw.name,
        quantity: r.raw.quantity || 1,
        product: r.matches.find((m) => m.product.id === r.selectedId)?.product || null,
      }));
    if (!picks.length) {
      setStatus('Eklenecek satır yok.');
      return;
    }
    onImport(picks);
    setRows([]);
    setPaste('');
    setStatus('');
    onClose();
  };

  const matched = rows.filter((r) => !r.skip && r.selectedId).length;
  const unmatched = rows.filter((r) => !r.skip && !r.selectedId).length;

  return (
    <div className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <h2 className="font-bold text-gray-900">Listeyi içe aktar</h2>
            <p className="text-xs text-gray-500 mt-0.5">Excel, PDF veya görsel — ürünler sırayla teklife eklenir. Katalogda varsa fiyatı gelir.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept=".xlsx,.xls,.csv,.txt,.pdf,image/png,image/jpeg,image/webp"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = ''; }}
          />
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) void handleFile(f); }}
            onClick={() => !busy && fileRef.current?.click()}
            className={`cursor-pointer rounded-xl border-2 border-dashed px-4 py-8 text-center transition ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-slate-50 hover:border-blue-400'}`}
          >
            {busy ? (
              <Loader2 className="w-8 h-8 mx-auto mb-2 text-blue-600 animate-spin" />
            ) : (
              <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            )}
            <p className="text-sm font-bold text-gray-800">Dosyayı bırakın veya tıklayın</p>
            <p className="text-xs text-gray-500 mt-1 flex items-center justify-center gap-3">
              <span className="inline-flex items-center gap-1"><FileSpreadsheet className="w-3.5 h-3.5" /> Excel / CSV</span>
              <span>PDF</span>
              <span className="inline-flex items-center gap-1"><ImagePlus className="w-3.5 h-3.5" /> Fotoğraf</span>
            </p>
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase">Veya metni yapıştırın</label>
            <textarea
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              placeholder={'ÜRÜN ADI\nCUNILL TRANQUILO …\nVOSCO VSH-211E …'}
              className="mt-1 w-full h-24 p-2 border rounded-lg text-sm"
            />
            <button
              type="button"
              onClick={() => applyText(paste)}
              className="mt-1 text-xs font-bold text-blue-700 hover:underline"
            >
              Yapıştırılanı oku
            </button>
          </div>

          {status && <p className="text-sm text-gray-600 bg-gray-50 border rounded-lg px-3 py-2">{status}</p>}

          {rows.length > 0 && (
            <div className="border rounded-xl overflow-hidden">
              <div className="px-3 py-2 bg-gray-50 text-xs text-gray-500 flex justify-between">
                <span>{rows.length} satır · {matched} katalogda bulundu · {unmatched} elle eklenecek</span>
              </div>
              <div className="max-h-64 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white text-[11px] uppercase text-gray-400">
                    <tr>
                      <th className="text-left px-2 py-1.5">#</th>
                      <th className="text-left px-2 py-1.5">Okunan</th>
                      <th className="text-left px-2 py-1.5">Teklife eklenecek</th>
                      <th className="w-16" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={r.id} className={`border-t ${r.skip ? 'opacity-40' : ''}`}>
                        <td className="px-2 py-1.5 text-gray-400">{i + 1}</td>
                        <td className="px-2 py-1.5">
                          <div className="font-medium text-gray-800">{r.raw.name}</div>
                          {r.raw.category && <div className="text-[10px] text-gray-400">{r.raw.category}</div>}
                        </td>
                        <td className="px-2 py-1.5">
                          <select
                            value={r.selectedId || ''}
                            onChange={(e) => setRows((prev) => prev.map((x) => x.id === r.id ? { ...x, selectedId: e.target.value || null } : x))}
                            className="w-full text-xs border rounded px-1 py-1 bg-white"
                          >
                            <option value="">Katalogda yok — adı ile ekle (fiyat 0)</option>
                            {r.matches.map((m) => (
                              <option key={m.product.id} value={m.product.id}>
                                {m.product.name} {m.score >= 80 ? '✓' : ''}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-1.5">
                          <button type="button" onClick={() => setRows((prev) => prev.map((x) => x.id === r.id ? { ...x, skip: !x.skip } : x))} className="text-[10px] font-bold text-red-500">
                            {r.skip ? 'Al' : 'Atla'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-100">Vazgeç</button>
          <button
            onClick={confirm}
            disabled={!rows.some((r) => !r.skip) || busy}
            className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300"
          >
            Sırayla teklife ekle
          </button>
        </div>
      </div>
    </div>
  );
}
