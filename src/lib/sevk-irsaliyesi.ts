import type { BrandConfig } from '@/lib/brands';
import type { Proposal, ProposalItem } from '@/lib/types';

export type SevkIrsaliyeItem = {
  name: string;
  quantity: number;
  unit?: string;
  sku?: string;
  description?: string;
};

export type SevkIrsaliyeInput = {
  brand: BrandConfig;
  belgeNo: string;
  teklifNo?: string;
  projectName?: string;
  customerName: string;
  customerAddress?: string;
  customerCity?: string;
  customerPhone?: string;
  customerTaxOffice?: string;
  customerTaxNumber?: string;
  items: SevkIrsaliyeItem[];
  notes?: string;
  orderDate?: string;
};

function esc(s: string): string {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function absoluteAssetUrl(path: string): string {
  if (!path) return '';
  if (/^https?:\/\//i.test(path) || path.startsWith('data:')) return path;
  if (typeof window === 'undefined') return path;
  const origin = window.location.origin;
  return path.startsWith('/') ? `${origin}${path}` : `${origin}/${path}`;
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

/** Teklif kalemlerinden (başlık satırları hariç) irsaliye listesi üretir. */
export function itemsFromProposal(items: ProposalItem[]): SevkIrsaliyeItem[] {
  return (items || [])
    .filter((i) => i.type !== 'section' && (i.name || '').trim())
    .map((i) => ({
      name: (i.name || '').trim(),
      quantity: Number(i.quantity) > 0 ? Number(i.quantity) : 1,
      unit: 'Adet',
      sku: i.sku,
      description: i.description,
    }));
}

export function sevkInputFromProposal(
  brand: BrandConfig,
  proposal: Pick<
    Proposal,
    | 'proposal_no'
    | 'proposal_date'
    | 'project_name'
    | 'customer_name'
    | 'customer_phone'
    | 'customer_city'
    | 'customer_address'
    | 'items'
  >,
  stripHtml: (v: string) => string
): SevkIrsaliyeInput {
  return {
    brand,
    belgeNo: `SI-${proposal.proposal_no}`,
    teklifNo: proposal.proposal_no,
    projectName: (proposal.project_name || '').trim(),
    customerName: stripHtml(proposal.customer_name || ''),
    customerAddress: proposal.customer_address || '',
    customerCity: proposal.customer_city || '',
    customerPhone: proposal.customer_phone || '',
    items: itemsFromProposal(proposal.items || []),
    orderDate: proposal.proposal_date,
  };
}

/** Yazdırılabilir sevk irsaliyesi penceresi açar. */
export function openSevkIrsaliyesi(input: SevkIrsaliyeInput): boolean {
  const items = input.items.filter((i) => (i.name || '').trim());
  if (items.length === 0) {
    if (typeof window !== 'undefined') {
      window.alert('Sevk irsaliyesi için teklifte en az bir ürün olmalı.');
    }
    return false;
  }

  const now = new Date();
  const todayFormatted = `${pad2(now.getDate())}.${pad2(now.getMonth() + 1)}.${now.getFullYear()}`;
  const timeFormatted = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
  const accent = input.brand.accentColor || '#111111';
  const logoUrl = absoluteAssetUrl(input.brand.logo);
  const senderName = (input.brand.legalName || input.brand.fullName || '').trim();
  const projectNote = (input.projectName || '').trim();
  const totalAdet = items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);

  const itemRows = items
    .map((item, i) => {
      const bg = i % 2 === 1 ? 'background-color:#f9f9f9;' : '';
      const qty = Number(item.quantity) || 0;
      const unit = item.unit || 'Adet';
      return `
      <tr style="${bg}">
        <td style="padding:8px 10px;border:1px solid #e5e7eb;font-size:12px;text-align:center;color:#6b7280;">${i + 1}</td>
        <td style="padding:8px 10px;border:1px solid #e5e7eb;font-size:12px;">
          <div style="font-weight:600;color:#111;">${esc(item.name)}</div>
          ${item.sku ? `<div style="font-size:10px;color:#9ca3af;margin-top:2px;">${esc(item.sku)}</div>` : ''}
          ${item.description ? `<div style="font-size:10px;color:#6b7280;margin-top:2px;">${esc(item.description)}</div>` : ''}
        </td>
        <td style="padding:8px 10px;border:1px solid #e5e7eb;font-size:13px;text-align:center;font-weight:700;">${qty}</td>
        <td style="padding:8px 10px;border:1px solid #e5e7eb;font-size:11px;text-align:center;color:#6b7280;">${esc(unit)}</td>
      </tr>`;
    })
    .join('');

  const senderTax =
    input.brand.taxOffice || input.brand.taxNumber
      ? `<div style="margin-top:8px;font-size:11px;border-top:1px dashed #e5e7eb;padding-top:6px;line-height:1.6;">
          ${input.brand.taxOffice ? `<strong>Vergi Dairesi:</strong> ${esc(input.brand.taxOffice)}<br/>` : ''}
          ${input.brand.taxNumber ? `<strong>Vergi No:</strong> <span class="mono">${esc(input.brand.taxNumber)}</span>` : ''}
        </div>`
      : '';

  const customerTax =
    input.customerTaxOffice || input.customerTaxNumber
      ? `<div style="margin-top:8px;font-size:11px;border-top:1px dashed #e5e7eb;padding-top:6px;line-height:1.6;">
          ${input.customerTaxOffice ? `<strong>V.D:</strong> ${esc(input.customerTaxOffice)}<br/>` : ''}
          ${input.customerTaxNumber ? `<strong>Vergi No:</strong> <span class="mono">${esc(input.customerTaxNumber)}</span>` : ''}
        </div>`
      : '';

  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8" />
<title>Sevk İrsaliyesi - ${esc(input.belgeNo)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" />
<style>
  @page { size: A4; margin: 10mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: Inter, Helvetica Neue, Arial, sans-serif; }
  body { background: #fff; color: #333; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .box { max-width: 900px; margin: auto; padding: 24px 28px; }
  .mono { font-family: 'JetBrains Mono', Consolas, monospace; }
  @media print {
    .no-print { display: none !important; }
    .box { padding: 0; max-width: none; }
  }
</style>
</head>
<body>
<div class="no-print" style="text-align:center;padding:16px;background:#f9fafb;border-bottom:1px solid #e5e7eb;position:sticky;top:0;z-index:10;">
  <button onclick="window.print()" style="padding:12px 28px;background:${accent};color:#fff;border:none;border-radius:8px;font-weight:700;font-size:14px;cursor:pointer;">Yazdır / PDF İndir</button>
  <div style="margin-top:8px;font-size:12px;color:#6b7280;">${items.length} kalem · toplam ${totalAdet} adet${projectNote ? ` · ${esc(projectNote)}` : ''}</div>
</div>

<div class="box">
  <table style="width:100%;border-collapse:collapse;margin-bottom:18px;">
    <tr>
      <td style="vertical-align:middle;width:55%;">
        ${logoUrl ? `<img src="${esc(logoUrl)}" alt="${esc(input.brand.fullName)}" style="max-height:68px;max-width:260px;object-fit:contain;" />` : `<div style="font-size:22px;font-weight:800;color:#111;">${esc(input.brand.fullName)}</div>`}
        <div style="font-size:11px;font-weight:700;color:#111;margin-top:8px;line-height:1.35;">${esc(senderName)}</div>
        ${input.brand.slogan ? `<div style="font-size:10px;font-weight:600;color:#6b7280;margin-top:4px;letter-spacing:1px;text-transform:uppercase;">${esc(input.brand.slogan)}</div>` : ''}
      </td>
      <td style="vertical-align:top;width:45%;text-align:right;">
        <div style="font-size:22px;font-weight:800;color:${accent};letter-spacing:0.5px;">SEVK İRSALİYESİ</div>
        <div style="font-size:12px;color:#6b7280;line-height:1.8;margin-top:6px;">
          <strong style="color:#374151;">Belge No:</strong> <span class="mono">${esc(input.belgeNo)}</span><br/>
          ${input.teklifNo ? `<strong style="color:#374151;">Teklif No:</strong> <span class="mono">${esc(input.teklifNo)}</span>` : ''}
        </div>
      </td>
    </tr>
  </table>

  <table style="width:100%;border-collapse:collapse;margin-bottom:18px;">
    <tr>
      <td style="vertical-align:top;width:48%;border:1.5px solid ${accent};padding:12px;">
        <div style="font-size:10px;color:${accent};font-weight:700;margin-bottom:6px;text-transform:uppercase;letter-spacing:2px;">Gönderen (Firma)</div>
        <div style="font-size:12px;line-height:1.6;color:#111;">
          <strong>${esc(senderName)}</strong><br/>
          ${input.brand.address.map((line) => esc(line)).join('<br/>')}
        </div>
        ${senderTax}
        ${input.brand.phone ? `<div style="margin-top:8px;font-size:11px;"><strong>Tel:</strong> <span class="mono">${esc(input.brand.phone)}</span></div>` : ''}
      </td>
      <td style="width:4%;"></td>
      <td style="vertical-align:top;width:48%;border:1.5px solid #111;padding:12px;">
        <div style="font-size:10px;color:#111;font-weight:700;margin-bottom:6px;text-transform:uppercase;letter-spacing:2px;">Alıcı Bilgileri</div>
        <div style="font-size:12px;line-height:1.6;color:#111;">
          <strong>${esc(input.customerName || 'Alıcı belirtilmedi')}</strong><br/>
          ${input.customerAddress ? `${esc(input.customerAddress)}<br/>` : ''}
          ${input.customerCity ? esc(input.customerCity) : ''}
        </div>
        ${projectNote ? `<div style="margin-top:8px;font-size:14px;font-weight:800;color:#c41e3a;letter-spacing:1px;">${esc(projectNote)}</div>` : ''}
        ${customerTax}
        ${input.customerPhone ? `<div style="margin-top:8px;font-size:11px;"><strong>Tel:</strong> <span class="mono">${esc(input.customerPhone)}</span></div>` : ''}
        <table style="width:100%;border-collapse:collapse;margin-top:10px;">
          <tr><td style="padding:5px 0;font-size:11px;border-bottom:1px solid #f3f4f6;font-weight:600;color:#6b7280;">Düzenleme Tarihi</td><td style="padding:5px 0;font-size:11px;border-bottom:1px solid #f3f4f6;text-align:right;" class="mono">${todayFormatted}</td></tr>
          <tr><td style="padding:5px 0;font-size:11px;border-bottom:1px solid #f3f4f6;font-weight:600;color:#6b7280;">Fiili Sevk Tarihi</td><td style="padding:5px 0;font-size:11px;border-bottom:1px solid #f3f4f6;text-align:right;" class="mono">${todayFormatted}</td></tr>
          <tr><td style="padding:5px 0;font-size:11px;border-bottom:1px solid #f3f4f6;font-weight:600;color:#6b7280;">Sevk Saati</td><td style="padding:5px 0;font-size:11px;border-bottom:1px solid #f3f4f6;text-align:right;" class="mono">${timeFormatted}</td></tr>
          ${input.orderDate ? `<tr><td style="padding:5px 0;font-size:11px;font-weight:600;color:#6b7280;">Teklif Tarihi</td><td style="padding:5px 0;font-size:11px;text-align:right;" class="mono">${esc(input.orderDate)}</td></tr>` : ''}
        </table>
      </td>
    </tr>
  </table>

  <table style="width:100%;border-collapse:collapse;margin-bottom:18px;">
    <thead>
      <tr>
        <th style="background:${accent};color:#fff;padding:9px;font-size:11px;text-align:center;border:1px solid ${accent};width:6%;">No</th>
        <th style="background:${accent};color:#fff;padding:9px;font-size:11px;text-align:left;border:1px solid ${accent};width:68%;letter-spacing:1px;">ÜRÜN AÇIKLAMASI</th>
        <th style="background:${accent};color:#fff;padding:9px;font-size:11px;text-align:center;border:1px solid ${accent};width:13%;">ADET</th>
        <th style="background:${accent};color:#fff;padding:9px;font-size:11px;text-align:center;border:1px solid ${accent};width:13%;">BİRİM</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
      <tr>
        <td colspan="2" style="text-align:right;font-weight:700;padding:11px 10px;background:#f9fafb;border:1px solid #e5e7eb;font-size:13px;">TOPLAM (${items.length} Kalem)</td>
        <td style="text-align:center;font-weight:800;padding:11px 10px;background:#f9fafb;border:1px solid #e5e7eb;font-size:15px;">${totalAdet}</td>
        <td style="text-align:center;font-weight:600;padding:11px 10px;background:#f9fafb;border:1px solid #e5e7eb;font-size:12px;color:#6b7280;">Adet</td>
      </tr>
    </tbody>
  </table>

  ${input.notes ? `<div style="margin-bottom:16px;padding:10px 14px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:4px;font-size:12px;color:#6b7280;"><strong style="color:#374151;">Not:</strong> ${esc(input.notes)}</div>` : ''}

  <table style="width:100%;border-collapse:collapse;margin-top:20px;">
    <tr>
      <td style="width:50%;border:1px solid #e5e7eb;padding:14px;text-align:center;height:95px;vertical-align:top;font-size:12px;font-weight:700;color:#6b7280;background:#fafafa;letter-spacing:1px;text-transform:uppercase;">
        Teslim Eden
        <div style="margin-top:42px;border-top:1px dashed #d1d5db;width:60%;margin-left:auto;margin-right:auto;padding-top:6px;font-size:11px;font-weight:500;color:#9ca3af;">İmza / Kaşe</div>
      </td>
      <td style="width:50%;border:1px solid #e5e7eb;padding:14px;text-align:center;height:95px;vertical-align:top;font-size:12px;font-weight:700;color:#6b7280;background:#fafafa;letter-spacing:1px;text-transform:uppercase;">
        Teslim Alan
        <div style="margin-top:42px;border-top:1px dashed #d1d5db;width:60%;margin-left:auto;margin-right:auto;padding-top:6px;font-size:11px;font-weight:500;color:#9ca3af;">İmza / Kaşe</div>
      </td>
    </tr>
  </table>

  <div style="margin-top:22px;text-align:center;font-size:10px;color:#9ca3af;border-top:1px solid #f3f4f6;padding-top:10px;line-height:1.6;">
    <div style="font-weight:700;color:#111;">${esc(senderName)}</div>
    <div>${input.brand.address.map((l) => esc(l)).join(' • ')}${input.brand.phone ? ` | ${esc(input.brand.phone)}` : ''}${input.brand.email ? ` | ${esc(input.brand.email)}` : ''}</div>
    ${input.brand.taxOffice || input.brand.taxNumber ? `<div>${input.brand.taxOffice ? `Vergi Dairesi: ${esc(input.brand.taxOffice)}` : ''}${input.brand.taxOffice && input.brand.taxNumber ? ' · ' : ''}${input.brand.taxNumber ? `VN: ${esc(input.brand.taxNumber)}` : ''}</div>` : ''}
    <div style="margin-top:3px;">Bu belge dijital ortamda oluşturulmuştur.</div>
  </div>
</div>
</body>
</html>`;

  const w = window.open('', '_blank');
  if (!w) {
    window.alert('Açılır pencere engellendi. Lütfen bu site için pop-up izni verin.');
    return false;
  }
  w.document.write(html);
  w.document.close();
  return true;
}
