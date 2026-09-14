import type { BrandConfig } from '@/lib/brands';
import type { ProposalItem } from '@/lib/types';
import { getCurrencySymbol } from '@/lib/helpers';

export type ProposalExcelInput = {
  brand: BrandConfig;
  isBlankBrand: boolean;
  customHeaderName?: string;
  title: string;
  proposalNo: string;
  proposalDate: string;
  validityDate: string;
  projectName: string;
  customerName: string;
  customerPhone: string;
  customerCity: string;
  customerAddress: string;
  preparedBy: string;
  items: ProposalItem[];
  currency: string;
  convert: (tryAmount: number) => number;
  hidePrices: boolean;
  showVat: boolean;
  kdvRate: number;
  discountMode: 'amount' | 'percent';
  discountValue: number;
  shippingCostTry: number;
  installmentCount: number;
  paidAmountTry: number;
  paymentTypeLabel?: string;
  conditions: string;
  showIban: boolean;
  selectedIban: number;
  eurRate: number;
  usdRate: number;
  gbpRate: number;
};

const argb = (hex: string, fallback = 'FF111827') => {
  const h = (hex || '').replace('#', '').trim();
  if (h.length === 6) return `FF${h.toUpperCase()}`;
  if (h.length === 8) return h.toUpperCase();
  return fallback;
};

const stripHtml = (h: string) =>
  (h || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

const safeFile = (s: string) => (s || 'Teklif').replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim().slice(0, 80);

const thin = (color = 'FFD1D5DB') => ({
  top: { style: 'thin' as const, color: { argb: color } },
  left: { style: 'thin' as const, color: { argb: color } },
  bottom: { style: 'thin' as const, color: { argb: color } },
  right: { style: 'thin' as const, color: { argb: color } },
});

const IBANS = [
  { id: 1, title: 'GÜÇLÜ REKLAM METAL ENDÜSTRİYEL TİCARET LİMİTED ŞİRKETİ', iban: 'TR43 0006 7010 0000 0011 6944 20', bank: 'Yapı Kredi Bankası' },
  { id: 2, title: 'Buse Turancı', iban: 'TR37 0006 7010 0000 0021 0036 18', bank: 'Yapı Kredi Bankası' },
  { id: 3, title: 'GÜÇLÜ İNOKS ENDÜSTRİYEL MUTFAK SANAYİ VE TİCARET LİMİTED ŞİRKETİ', iban: 'TR57 0001 2001 8160 0010 1006 91', bank: 'Halkbank' },
];

export async function downloadProposalExcel(data: ProposalExcelInput) {
  const mod = await import('exceljs');
  const ExcelJS = (mod as { default?: typeof import('exceljs') }).default ?? (mod as typeof import('exceljs'));
  const wb = new ExcelJS.Workbook();
  wb.creator = data.preparedBy || data.brand.fullName;
  wb.created = new Date();
  wb.company = data.brand.fullName;

  const ws = wb.addWorksheet('Teklif', {
    views: [{ state: 'frozen', ySplit: 16, showGridLines: false }],
    pageSetup: {
      paperSize: 9,
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.45, right: 0.45, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.25 },
      horizontalCentered: true,
    },
    headerFooter: {
      oddHeader: `&L&B${data.brand.fullName}&C${data.title}&R${data.proposalNo}`,
      oddFooter: `&LHazırlayan: ${data.preparedBy || '-'}&CSayfa &P / &N&R${data.proposalDate}`,
    },
  });

  const accent = argb(data.brand.accentColor || data.brand.proposalHeaderBg);
  const headerBg = argb(data.brand.tableHeaderBgHex, 'FFF97316');
  const headerFg = argb(data.brand.tableHeaderTextHex, 'FFFFFFFF');
  const stripe = argb(data.brand.tableStripeBgHex, 'FFFFF7ED');
  const borderC = argb(data.brand.tableBorderHex, 'FFFED7AA');
  const yellow = 'FFFFF3C4';
  const totalGreen = 'FF065F46';
  const moneyFmt = '#,##0.00';
  const pctFmt = '0.00';
  const hide = data.hidePrices;
  const lastCol = hide ? 5 : 8;
  const lastLetter = hide ? 'E' : 'H';
  const sym = getCurrencySymbol(data.currency);

  ws.columns = hide
    ? [
        { width: 6 },
        { width: 44 },
        { width: 18 },
        { width: 42 },
        { width: 10 },
      ]
    : [
        { width: 6 },
        { width: 42 },
        { width: 16 },
        { width: 36 },
        { width: 10 },
        { width: 16 },
        { width: 10 },
        { width: 16 },
      ];

  const merge = (r: number, c1 = 1, c2 = lastCol) => ws.mergeCells(r, c1, r, c2);
  const set = (r: number, c: number, value: unknown, extra?: { font?: object; alignment?: object; border?: object; fill?: object; numFmt?: string }) => {
    const cell = ws.getCell(r, c);
    cell.value = value as never;
    if (extra?.font) cell.font = extra.font as never;
    if (extra?.alignment) cell.alignment = extra.alignment as never;
    if (extra?.border) cell.border = extra.border as never;
    if (extra?.fill) cell.fill = extra.fill as never;
    if (extra?.numFmt) cell.numFmt = extra.numFmt;
    return cell;
  };

  const fillRow = (r: number, color: string) => {
    for (let c = 1; c <= lastCol; c++) {
      ws.getCell(r, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
    }
  };

  try {
    const logoUrl = data.isBlankBrand ? '' : data.brand.logo;
    if (logoUrl && logoUrl.startsWith('/')) {
      const res = await fetch(logoUrl);
      if (res.ok) {
        const buf = await res.arrayBuffer();
        const ext = logoUrl.toLowerCase().includes('.png') ? 'png' : 'jpeg';
        const imgId = wb.addImage({ buffer: buf as unknown as ArrayBuffer, extension: ext });
        ws.addImage(imgId, { tl: { col: 0.15, row: 0.2 }, ext: { width: 168, height: 48 } });
      }
    }
  } catch { /* logo olmadan devam */ }

  ws.getRow(1).height = 22;
  ws.getRow(2).height = 18;
  merge(1, 3, lastCol);
  set(1, 3, data.isBlankBrand ? (data.customHeaderName || data.title) : data.brand.fullName, {
    font: { name: 'Calibri', size: 18, bold: true, color: { argb: accent } },
    alignment: { vertical: 'middle', horizontal: 'right' },
  });
  merge(2, 3, lastCol);
  set(2, 3, data.brand.slogan || '', {
    font: { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF6B7280' } },
    alignment: { horizontal: 'right' },
  });
  merge(3, 1, lastCol);
  const contact = data.isBlankBrand
    ? ''
    : [...(data.brand.address || []), data.brand.phone, data.brand.email, data.brand.website].filter(Boolean).join('  •  ');
  set(3, 1, contact, { font: { name: 'Calibri', size: 9, color: { argb: 'FF6B7280' } }, alignment: { wrapText: true } });
  ws.getRow(3).height = 28;

  merge(5, 1, hide ? 3 : 4);
  set(5, 1, data.title, {
    font: { name: 'Calibri', size: 16, bold: true, color: { argb: accent } },
    alignment: { vertical: 'middle' },
  });
  const metaL = hide ? 4 : 6;
  const metaV = hide ? 5 : 7;
  set(5, metaL, 'Teklif No');
  set(5, metaV, data.proposalNo, { font: { bold: true } });
  if (!hide) ws.mergeCells(5, 7, 5, 8);
  set(6, metaL, 'Tarih');
  set(6, metaV, data.proposalDate);
  if (!hide) ws.mergeCells(6, 7, 6, 8);
  set(7, metaL, 'Geçerlilik');
  set(7, metaV, data.validityDate, { font: { bold: true, color: { argb: 'FFB45309' } } });
  if (!hide) ws.mergeCells(7, 7, 7, 8);
  for (const rr of [5, 6, 7]) {
    ws.getCell(rr, metaL).font = { name: 'Calibri', size: 9, color: { argb: 'FF6B7280' } };
    ws.getCell(rr, metaL).alignment = { horizontal: 'right' };
  }

  merge(9, 1, hide ? 3 : 4);
  set(9, 1, 'MÜŞTERİ', { font: { bold: true, size: 10, color: { argb: 'FFFFFFFF' } }, alignment: { horizontal: 'left' } });
  fillRow(9, accent);
  ws.getCell(9, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: accent } };
  if (!hide) {
    ws.mergeCells(9, 6, 9, 8);
    set(9, 6, 'PROJE', { font: { bold: true, size: 10, color: { argb: 'FFFFFFFF' } } });
    ws.getCell(9, 6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: accent } };
    ws.getCell(9, 7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: accent } };
    ws.getCell(9, 8).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: accent } };
  }

  merge(10, 1, hide ? 3 : 4);
  set(10, 1, stripHtml(data.customerName) || '—', { font: { bold: true, size: 12 } });
  merge(11, 1, hide ? 3 : 4);
  set(11, 1, [data.customerPhone, data.customerCity].filter(Boolean).join('  •  ') || '—', {
    font: { size: 10, color: { argb: 'FF4B5563' } },
  });
  merge(12, 1, hide ? 3 : 4);
  set(12, 1, data.customerAddress || '', { font: { size: 9, color: { argb: 'FF6B7280' } }, alignment: { wrapText: true } });
  if (!hide) {
    ws.mergeCells(10, 6, 12, 8);
    set(10, 6, data.projectName || '—', {
      font: { bold: true, size: 12 },
      alignment: { vertical: 'middle', wrapText: true },
    });
  }

  merge(14, 1, lastCol);
  set(14, 1, hide
    ? 'Fiyatlar bu çıktıda gizlenmiştir. Adet sütunu düzenlenebilir.'
    : `Sarı hücreler düzenlenebilir (adet, birim fiyat, iskonto, kargo, ödenen). Satır toplamı ve genel toplam Excel formülüyle otomatik hesaplanır. Tutarlar ${data.currency} (${sym}).`, {
    font: { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF92400E' } },
  });
  fillRow(14, yellow);

  const headerRow = 16;
  const headers = hide
    ? ['#', 'Ürün Adı', 'Ürün Kodu', 'Açıklama', 'Adet']
    : ['#', 'Ürün Adı', 'Ürün Kodu', 'Açıklama', 'Adet', `Birim Fiyat (${sym})`, 'İsk. %', `Satır Toplamı (${sym})`];
  headers.forEach((h, i) => {
    const cell = set(headerRow, i + 1, h, {
      font: { name: 'Calibri', size: 10, bold: true, color: { argb: headerFg } },
      alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
      border: thin(borderC),
    });
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerBg } };
  });
  ws.getRow(headerRow).height = 24;

  let r = headerRow + 1;
  let n = 0;
  const productRows: number[] = [];

  for (const item of data.items) {
    if (item.type === 'section') {
      merge(r, 1, lastCol);
      const cell = set(r, 1, (item.name || 'ARA BAŞLIK').toUpperCase(), {
        font: { bold: true, size: 11, color: { argb: accent } },
        alignment: { horizontal: 'center', vertical: 'middle' },
      });
      fillRow(r, 'FFF3F4F6');
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
      for (let c = 1; c <= lastCol; c++) ws.getCell(r, c).border = thin(borderC);
      ws.getRow(r).height = 22;
      r += 1;
      continue;
    }

    n += 1;
    productRows.push(r);
    const desc = stripHtml(item.description || '');
    const unit = data.convert(item.price || 0);
    const disc = Number(item.item_discount) || 0;
    const bg = n % 2 === 0 ? stripe : 'FFFFFFFF';

    set(r, 1, n, { alignment: { horizontal: 'center', vertical: 'top' } });
    set(r, 2, item.name || '', { font: { bold: true, size: 11 }, alignment: { wrapText: true, vertical: 'top' } });
    set(r, 3, item.sku || '', { font: { size: 9, color: { argb: 'FF6B7280' } }, alignment: { vertical: 'top' } });
    set(r, 4, desc, { font: { size: 9, color: { argb: 'FF4B5563' } }, alignment: { wrapText: true, vertical: 'top' } });
    const qtyCell = set(r, 5, item.quantity || 1, { alignment: { horizontal: 'center', vertical: 'top' } });
    qtyCell.numFmt = '0';
    if (!hide) {
      qtyCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: yellow } };
      const f = set(r, 6, Math.round(unit * 100) / 100, { alignment: { horizontal: 'right', vertical: 'top' } });
      f.numFmt = moneyFmt;
      f.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: yellow } };
      const g = set(r, 7, disc, { alignment: { horizontal: 'center', vertical: 'top' } });
      g.numFmt = pctFmt;
      g.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: yellow } };
      const h = set(r, 8, { formula: `ROUND(E${r}*F${r}*(1-G${r}/100),2)` });
      h.numFmt = moneyFmt;
      h.font = { bold: true };
      h.alignment = { horizontal: 'right', vertical: 'top' };
    } else {
      qtyCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: yellow } };
    }
    for (let c = 1; c <= lastCol; c++) {
      const cell = ws.getCell(r, c);
      cell.border = thin(borderC);
      if (!cell.fill) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
    }
    const lines = Math.max(2, Math.min(6, 1 + Math.ceil((desc.length + (item.name || '').length) / 48)));
    ws.getRow(r).height = 16 * lines;
    r += 1;
  }

  if (productRows.length === 0) {
    merge(r, 1, lastCol);
    set(r, 1, 'Bu teklifte henüz ürün yok.', { font: { italic: true, color: { argb: 'FF9CA3AF' } } });
    r += 1;
  }

  r += 1;
  const sumFormula = productRows.length
    ? `SUM(H${productRows[0]}:H${productRows[productRows.length - 1]})`
    : '0';

  const label = (row: number, text: string, opts?: { bold?: boolean; color?: string }) => {
    ws.mergeCells(row, hide ? 2 : 5, row, hide ? 3 : 6);
    set(row, hide ? 2 : 5, text, {
      font: { bold: !!opts?.bold, size: opts?.bold ? 12 : 10, color: { argb: opts?.color || 'FF374151' } },
      alignment: { horizontal: 'right', vertical: 'middle' },
    });
  };
  const valueCell = (row: number, col: number) => ws.getCell(row, col);

  if (!hide) {
    const araRow = r;
    label(r, 'Ara Toplam (KDV Hariç)');
    valueCell(r, 8).value = { formula: sumFormula };
    valueCell(r, 8).numFmt = moneyFmt;
    r += 1;

    const discRow = r;
    if (data.discountMode === 'percent') {
      label(r, `İskonto (%)`);
      valueCell(r, 7).value = Math.min(Math.max(data.discountValue, 0), 100);
      valueCell(r, 7).numFmt = pctFmt;
      valueCell(r, 7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: yellow } };
      valueCell(r, 8).value = { formula: `ROUND(H${araRow}*G${discRow}/100,2)` };
    } else {
      label(r, 'İskonto');
      valueCell(r, 8).value = Math.round(data.convert(Math.max(data.discountValue, 0)) * 100) / 100;
      valueCell(r, 8).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: yellow } };
    }
    valueCell(r, 8).numFmt = moneyFmt;
    r += 1;

    const netRow = r;
    label(r, 'İndirimli Toplam');
    valueCell(r, 8).value = { formula: `H${araRow}-H${discRow}` };
    valueCell(r, 8).numFmt = moneyFmt;
    r += 1;

    let vatRow = netRow;
    if (data.showVat) {
      vatRow = r;
      label(r, `KDV (%${Math.round(data.kdvRate * 100)})`);
      valueCell(r, 8).value = { formula: `ROUND(H${netRow}*${data.kdvRate},2)` };
      valueCell(r, 8).numFmt = moneyFmt;
      r += 1;
    }

    const shipRow = r;
    label(r, 'Kargo / Taşıma');
    valueCell(r, 8).value = Math.round(data.convert(data.shippingCostTry || 0) * 100) / 100;
    valueCell(r, 8).numFmt = moneyFmt;
    valueCell(r, 8).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: yellow } };
    r += 1;

    const instRate = data.installmentCount > 0 ? data.installmentCount * 0.03 : 0;
    let instRow = shipRow;
    if (instRate > 0) {
      instRow = r;
      label(r, `Taksit Farkı (${data.installmentCount} × %3)`);
      const vatPart = data.showVat ? `H${vatRow}` : '0';
      valueCell(r, 8).value = { formula: `ROUND((H${netRow}+${vatPart}+H${shipRow})*${instRate},2)` };
      valueCell(r, 8).numFmt = moneyFmt;
      r += 1;
    }

    const grandRow = r;
    label(r, 'GENEL TOPLAM', { bold: true, color: totalGreen });
    const vatPart = data.showVat ? `H${vatRow}` : '0';
    const instPart = instRate > 0 ? `H${instRow}` : '0';
    valueCell(r, 8).value = { formula: `H${netRow}+${vatPart}+H${shipRow}+${instPart}` };
    valueCell(r, 8).numFmt = moneyFmt;
    valueCell(r, 8).font = { bold: true, size: 13, color: { argb: totalGreen } };
    fillRow(r, 'FFECFDF5');
    ws.getRow(r).height = 22;
    r += 1;

    const paidRow = r;
    label(r, data.paymentTypeLabel ? `Ödenen (${data.paymentTypeLabel})` : 'Ödenen');
    valueCell(r, 8).value = Math.round(data.convert(data.paidAmountTry || 0) * 100) / 100;
    valueCell(r, 8).numFmt = moneyFmt;
    valueCell(r, 8).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: yellow } };
    r += 1;

    label(r, 'KALAN', { bold: true });
    valueCell(r, 8).value = { formula: `H${grandRow}-H${paidRow}` };
    valueCell(r, 8).numFmt = moneyFmt;
    valueCell(r, 8).font = { bold: true, color: { argb: 'FFB91C1C' } };
    r += 2;

    if (data.currency !== 'TRY' || data.eurRate > 0) {
      merge(r, 5, 8);
      set(r, 5, `Kur bilgisi (1 birim = TL): € ${data.eurRate.toFixed(4)}   $ ${data.usdRate.toFixed(4)}   £ ${data.gbpRate.toFixed(4)}`, {
        font: { size: 8, italic: true, color: { argb: 'FF6B7280' } },
      });
      r += 1;
    }
  }

  r += 1;
  merge(r, 1, lastCol);
  set(r, 1, 'ŞARTLAR VE KOŞULLAR', {
    font: { bold: true, size: 10, color: { argb: 'FFFFFFFF' } },
  });
  fillRow(r, accent);
  r += 1;
  merge(r, 1, lastCol);
  set(r, 1, stripHtml(data.conditions) || '—', {
    font: { size: 9, color: { argb: 'FF4B5563' } },
    alignment: { wrapText: true, vertical: 'top' },
  });
  ws.getRow(r).height = 64;
  r += 2;

  if (data.showIban) {
    merge(r, 1, lastCol);
    set(r, 1, 'ÖDEME BİLGİLERİ', { font: { bold: true, size: 10, color: { argb: 'FFFFFFFF' } } });
    fillRow(r, accent);
    r += 1;
    for (const acc of IBANS) {
      if (data.selectedIban !== 0 && data.selectedIban !== acc.id) continue;
      merge(r, 1, lastCol);
      set(r, 1, `${acc.title}\n${acc.iban}  •  ${acc.bank}`, {
        font: { size: 9 },
        alignment: { wrapText: true, vertical: 'top' },
      });
      ws.getRow(r).height = 32;
      r += 1;
    }
  }

  r += 1;
  merge(r, 1, lastCol);
  set(r, 1, `Teklifi hazırlayan: ${data.preparedBy || '—'}`, {
    font: { italic: true, size: 9, color: { argb: 'FF6B7280' } },
  });

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeFile(data.proposalNo)}_${safeFile(stripHtml(data.customerName) || data.projectName || 'Teklif')}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
