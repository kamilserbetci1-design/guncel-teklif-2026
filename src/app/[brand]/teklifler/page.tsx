'use client';

import { useParams, useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { getBrand } from '@/lib/brands';
import { formatCurrency, getCurrencySymbol } from '@/lib/helpers';
import { Search, Trash2, Clock, CheckCircle, XCircle, Eye, Send, Upload, UserCheck, Calendar, FileText, Copy, FileDown } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useState, useRef } from 'react';
import type { ProposalStatus, Proposal } from '@/lib/types';
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/types';
import Link from 'next/link';
import { stripHtml } from '@/components/RichEditor';

export default function TekliflerPage() {
  const params = useParams();
  const brandId = params.brand as string;
  const router = useRouter();
  const brand = getBrand(brandId);
  const { proposals, addProposal, setProposals, updateProposal, removeProposal } = useAppStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [preparedByFilter, setPreparedByFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tüm hazırlayan kişileri bul (benzersiz)
  const allPreparedBy = Array.from(new Set(
    proposals.filter(p => p.prepared_by).map(p => p.prepared_by)
  ));

  const brandProposals = proposals
    .filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (preparedByFilter && (p.prepared_by || '') !== preparedByFilter) return false;
      if (dateFilter && (p.proposal_date || '') !== dateFilter) return false;
      if (!search) return true;
      const s = search.toLocaleLowerCase('tr-TR');
      return (
        (p.project_name || '').toLocaleLowerCase('tr-TR').includes(s) ||
        stripHtml(p.customer_name || '').toLocaleLowerCase('tr-TR').includes(s) ||
        (p.proposal_no || '').toLocaleLowerCase('tr-TR').includes(s) ||
        (p.prepared_by || '').toLocaleLowerCase('tr-TR').includes(s)
      );
    });

  const handleDelete = (id: string) => {
    if (confirm('Bu teklifi silmek istediğinize emin misiniz?')) {
      removeProposal(id);
    }
  };

  const handleStatusChange = (id: string, status: ProposalStatus) => {
    updateProposal(id, { status });
  };

  const duplicateProposal = async (p: Proposal) => {
    const newId = `dup-${Date.now()}-${Math.random().toString(36).substr(2, 7)}`;
    const newNo = p.proposal_no + '-KOPYA';
    const dup: Proposal = {
      ...p,
      id: newId,
      proposal_no: newNo,
      status: 'draft' as ProposalStatus,
      items: p.items.map(item => ({ ...item, id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}` })),
    };
    await addProposal(dup);
    router.push(`/${brandId}/teklif/yeni?id=${newId}`);
  };

  // Eski teklifleri Excel, CSV, JSON veya PDF'den içe aktar
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'xlsx' || ext === 'xls') {
      try {
        const XLSX = await import('xlsx');
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet);

        let imported = 0;
        for (const row of rows) {
          const proposal: Proposal = {
            id: `import-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            brand_id: brandId,
            proposal_no: row['Teklif No'] || row['proposal_no'] || `IMP-${Date.now()}`,
            proposal_date: row['Tarih'] || row['proposal_date'] || new Date().toLocaleDateString('tr-TR'),
            project_name: row['Proje'] || row['project_name'] || '',
            customer_name: row['Müşteri'] || row['customer_name'] || '',
            customer_phone: row['Telefon'] || row['customer_phone'] || '',
            customer_city: row['Şehir'] || row['customer_city'] || '',
            customer_address: row['Adres'] || row['customer_address'] || '',
            prepared_by: row['Hazırlayan'] || row['prepared_by'] || '',
            items: [],
            discount_value: 0,
            currency: 'TRY',
            include_vat: true,
            conditions: '',
            global_hide_prices: false,
            status: 'approved',
            total: parseFloat(row['Toplam'] || row['total'] || '0') || 0,
          };
          await addProposal(proposal);
          imported++;
        }
        alert(`${imported} teklif başarıyla içe aktarıldı!`);
      } catch {
        alert('Excel dosyası okunurken hata oluştu.');
      }
    } else if (ext === 'csv') {
      try {
        const Papa = await import('papaparse');
        const text = await file.text();
        const result = Papa.default.parse(text, { header: true });
        let imported = 0;
        for (const row of result.data as any[]) {
          if (!row['Teklif No'] && !row['proposal_no'] && !row['Müşteri'] && !row['customer_name']) continue;
          const proposal: Proposal = {
            id: `import-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            brand_id: brandId,
            proposal_no: row['Teklif No'] || row['proposal_no'] || `IMP-${Date.now()}`,
            proposal_date: row['Tarih'] || row['proposal_date'] || new Date().toLocaleDateString('tr-TR'),
            project_name: row['Proje'] || row['project_name'] || '',
            customer_name: row['Müşteri'] || row['customer_name'] || '',
            customer_phone: row['Telefon'] || row['customer_phone'] || '',
            customer_city: row['Şehir'] || row['customer_city'] || '',
            customer_address: row['Adres'] || row['customer_address'] || '',
            prepared_by: row['Hazırlayan'] || row['prepared_by'] || '',
            items: [],
            discount_value: 0,
            currency: 'TRY',
            include_vat: true,
            conditions: '',
            global_hide_prices: false,
            status: 'approved',
            total: parseFloat(row['Toplam'] || row['total'] || '0') || 0,
          };
          await addProposal(proposal);
          imported++;
        }
        alert(`${imported} teklif başarıyla içe aktarıldı!`);
      } catch {
        alert('CSV dosyası okunurken hata oluştu.');
      }
    } else if (ext === 'json') {
      try {
        const text = await file.text();
        const jsonData = JSON.parse(text);

        // Eski MultiPanel yedek formatı desteği
        let arr: any[];
        if (jsonData.savedProposals && Array.isArray(jsonData.savedProposals)) {
          arr = jsonData.savedProposals;
        } else if (Array.isArray(jsonData)) {
          arr = jsonData;
        } else {
          arr = [jsonData];
        }

        // Mevcut teklif ID'lerini al (duplicate engelleme)
        const existingIds = new Set(proposals.map((p) => p.id));
        const existingNos = new Set(proposals.map((p) => p.proposal_no));

        let imported = 0;
        let skipped = 0;
        for (const row of arr) {
          // Eski camelCase formatından dönüştür
          const customer = row.customer || {};
          const proposalNo = row.proposal_no || row.proposalNo || `IMP-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

          // Duplicate kontrolü: aynı ID veya aynı teklif no varsa atla
          const originalId = row.id?.toString() || '';
          if (originalId && existingIds.has(originalId)) { skipped++; continue; }
          if (existingNos.has(proposalNo)) { skipped++; continue; }

          const mapItems = (items: any[]) => items.map((item: any) => ({
            id: item.id || `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            name: item.name || '',
            description: item.description || '',
            price: item.price || 0,
            cost: item.cost || 0,
            quantity: item.quantity || 1,
            image: item.image || '',
            product_link: item.productLink || item.product_link || '',
            item_discount: item.itemDiscount || item.item_discount || 0,
            total: item.total || (item.price || 0) * (1 - (item.itemDiscount || item.item_discount || 0) / 100) * (item.quantity || 1),
            input_currency: item.inputCurrency || item.input_currency || 'TRY',
            exchange_rate: item.exchangeRate || item.exchange_rate || 1,
            hide_price: item.hidePrice || item.hide_price || false,
            shipped: item.shipped || false,
          }));

          // Her zaman aktif markanın brand_id'sini kullan
          const newId = `import-${brandId}-${Date.now()}-${Math.random().toString(36).substr(2, 7)}`;
          const proposal: Proposal = {
            id: newId,
            brand_id: brandId,
            proposal_no: proposalNo,
            proposal_date: row.proposal_date || row.proposalDate || new Date().toLocaleDateString('tr-TR'),
            project_name: row.project_name || row.projectName || '',
            customer_name: row.customer_name || customer.name || '',
            customer_phone: row.customer_phone || customer.phone || '',
            customer_city: row.customer_city || customer.city || '',
            customer_address: row.customer_address || customer.address || '',
            prepared_by: row.prepared_by || row.preparedBy || '',
            items: Array.isArray(row.items) ? mapItems(row.items) : [],
            discount_value: row.discount_value ?? row.discountValue ?? 0,
            currency: row.currency || 'TRY',
            include_vat: row.include_vat ?? row.includeVAT ?? true,
            conditions: row.conditions || '',
            global_hide_prices: row.global_hide_prices ?? row.globalHidePrices ?? false,
            status: row.status || 'approved',
            total: row.total || 0,
          };
          await addProposal(proposal);
          existingIds.add(newId);
          existingNos.add(proposalNo);
          imported++;
        }
        const msg = skipped > 0
          ? `${imported} teklif içe aktarıldı! (${skipped} mükerrer teklif atlandı)`
          : `${imported} teklif başarıyla içe aktarıldı!`;
        alert(msg);
      } catch (err) {
        console.error('JSON import error:', err);
        alert('JSON dosyası okunurken hata oluştu.');
      }
    } else if (ext === 'pdf') {
      try {
        // Dosya adından bilgi çıkar: "MP-2604-864_Ertan Yavuz.pdf" gibi
        const baseName = file.name.replace(/\.pdf$/i, '');
        const parts = baseName.split('_');
        const proposalNo = parts[0] || `PDF-${Date.now()}`;
        const projectName = parts.slice(1).join('_') || baseName;

        // PDF'i Supabase Storage'a yükle
        let pdfUrl = '';
        if (isSupabaseConfigured()) {
          const fileName = `${brandId}/${Date.now()}-${file.name}`;
          const { error: uploadErr } = await supabase.storage
            .from('proposal-pdfs')
            .upload(fileName, file, { contentType: 'application/pdf' });
          if (!uploadErr) {
            const { data: urlData } = supabase.storage.from('proposal-pdfs').getPublicUrl(fileName);
            pdfUrl = urlData.publicUrl;
          } else {
            console.error('PDF upload error:', uploadErr);
          }
        }

        const proposal: Proposal = {
          id: `pdf-${Date.now()}-${Math.random().toString(36).substr(2, 7)}`,
          brand_id: brandId,
          proposal_no: proposalNo,
          proposal_date: new Date().toLocaleDateString('tr-TR'),
          project_name: projectName,
          customer_name: '',
          customer_phone: '',
          customer_city: '',
          customer_address: '',
          prepared_by: '',
          items: [],
          discount_value: 0,
          currency: 'TRY',
          include_vat: true,
          conditions: '',
          global_hide_prices: false,
          status: 'approved',
          total: 0,
          pdf_url: pdfUrl,
        };
        await addProposal(proposal);
        if (isSupabaseConfigured() && pdfUrl) {
          (async () => { try { await supabase.from('proposals').update({ pdf_url: pdfUrl }).eq('id', proposal.id); } catch (err) { console.error('pdf_url update error:', err); } })();
        }
        alert('PDF teklif olarak eklendi!');
      } catch (err) {
        console.error('PDF import error:', err);
        alert('PDF yüklenirken hata oluştu.');
      }
    } else {
      alert('Desteklenen formatlar: .xlsx, .xls, .csv, .json, .pdf');
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const statuses: { value: string; label: string }[] = [
    { value: 'all', label: 'Tümü' },
    { value: 'draft', label: 'Taslak' },
    { value: 'sent', label: 'Gönderildi' },
    { value: 'viewed', label: 'Görüntülendi' },
    { value: 'approved', label: 'Onaylandı' },
    { value: 'rejected', label: 'Reddedildi' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teklif Geçmişi</h1>
          <p className="text-sm text-gray-500 mt-1">{brand.fullName} - Tüm teklifleri yönetin</p>
        </div>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition"
        >
          <Upload className="w-4 h-4" /> Eski Teklif İçe Aktar
        </button>
      </div>

      {/* Upload Panel */}
      {showUpload && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-purple-800 mb-2">Geçmiş Teklifleri İçe Aktar</h3>
          <p className="text-xs text-purple-600 mb-3">
            Excel (.xlsx, .xls), CSV, JSON veya PDF dosyası yükleyin. PDF dosya adından teklif no ve proje adı otomatik çıkarılır.
          </p>
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.json,.pdf"
              onChange={handleFileUpload}
              className="text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-purple-600 file:text-white hover:file:bg-purple-700 cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Proje adı, müşteri, teklif no veya hazırlayan ara..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {/* Hazırlayan Filtresi */}
          {allPreparedBy.length > 0 && (
            <div className="flex items-center gap-1">
              <UserCheck className="w-4 h-4 text-gray-400" />
              <select
                value={preparedByFilter}
                onChange={(e) => setPreparedByFilter(e.target.value)}
                className="p-2 border border-gray-300 rounded-lg text-sm outline-none"
              >
                <option value="">Tüm Hazırlayanlar</option>
                {allPreparedBy.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
          )}
          {/* Tarih Filtresi */}
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={dateFilter ? dateFilter.split('.').reverse().join('-') : ''}
              onChange={(e) => {
                if (e.target.value) {
                  const [y, m, d] = e.target.value.split('-');
                  setDateFilter(`${d}.${m}.${y}`);
                } else {
                  setDateFilter('');
                }
              }}
              className="p-2 border border-gray-300 rounded-lg text-sm outline-none"
            />
          </div>
        </div>
        <div className="flex gap-1 flex-wrap">
          {statuses.map((s) => (
            <button
              key={s.value}
              onClick={() => setStatusFilter(s.value)}
              className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${
                statusFilter === s.value
                  ? `${brand.bgColor} ${brand.textColor} ${brand.borderColor}`
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {s.label}
            </button>
          ))}
          {(preparedByFilter || dateFilter) && (
            <button
              onClick={() => { setPreparedByFilter(''); setDateFilter(''); }}
              className="px-3 py-2 rounded-lg text-xs font-bold border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
            >
              Filtreleri Temizle
            </button>
          )}
        </div>
      </div>

      {/* Proposals List */}
      {brandProposals.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Clock className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Henüz teklif bulunamadı</p>
          <p className="text-sm mt-1">Yeni teklif oluşturarak başlayabilirsiniz</p>
          <Link href={`/${brandId}/teklif/yeni`} className={`inline-block mt-4 px-4 py-2 rounded-lg text-white text-sm font-bold ${brand.buttonColor}`}>
            Yeni Teklif Oluştur
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-xs text-gray-400 font-medium">{brandProposals.length} teklif bulundu</div>
          {brandProposals.map((p) => (
            <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition cursor-pointer" onClick={() => router.push(`/${brandId}/teklif/yeni?id=${p.id}`)}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <input
                      type="text"
                      value={p.project_name || ''}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => updateProposal(p.id, { project_name: e.target.value })}
                      className="text-base font-bold text-gray-900 bg-transparent outline-none border-b border-transparent hover:border-gray-300 focus:border-blue-500 truncate min-w-0 flex-1"
                      placeholder="İsimsiz Proje"
                    />
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[p.status]}`}>
                      {STATUS_LABELS[p.status]}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    <span className="font-medium text-gray-700">{stripHtml(p.customer_name || '') || 'Müşteri Yok'}</span>
                    <span className="mx-2">•</span>
                    <span>{p.proposal_no}</span>
                    <span className="mx-2">•</span>
                    <span>{p.proposal_date}</span>
                    {p.prepared_by && (
                      <>
                        <span className="mx-2">•</span>
                        <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">
                          <UserCheck className="w-3 h-3" /> {p.prepared_by}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-lg font-extrabold text-gray-900 whitespace-nowrap">
                    ₺{p.total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </span>

                  {/* Status Actions */}
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => handleStatusChange(p.id, 'sent')} className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition" title="Gönderildi"><Send className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleStatusChange(p.id, 'viewed')} className="p-1.5 rounded-lg bg-yellow-50 text-yellow-600 hover:bg-yellow-100 transition" title="Görüntülendi"><Eye className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleStatusChange(p.id, 'approved')} className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition" title="Onaylandı"><CheckCircle className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleStatusChange(p.id, 'rejected')} className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition" title="Reddedildi"><XCircle className="w-3.5 h-3.5" /></button>
                    {p.pdf_url && (
                      <a href={p.pdf_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="p-1.5 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 transition" title="PDF İndir"><FileDown className="w-3.5 h-3.5" /></a>
                    )}
                    <button onClick={() => duplicateProposal(p)} className="p-1.5 rounded-lg bg-purple-50 text-purple-500 hover:bg-purple-100 transition" title="Çoğalt"><Copy className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500 transition" title="Sil"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
