'use client';

import { useParams } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { getBrand } from '@/lib/brands';
import { Search, Plus, Trash2, Edit2, X, Save, Users } from 'lucide-react';
import { useState } from 'react';
import type { Customer } from '@/lib/types';

export default function MusterilerPage() {
  const params = useParams();
  const brandId = params.brand as string;
  const brand = getBrand(brandId);
  const { customers, proposals, addCustomer, updateCustomer, removeCustomer, setCustomers } = useAppStore();

  // Teklifteki müşteri adını düz metne çevirir (HTML olabilir)
  const stripHtml = (h: string) => (h || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

  // Mevcut tekliflerdeki müşterileri Müşteriler listesine aktarır (yoksa)
  const [importing, setImporting] = useState(false);
  const backfillFromProposals = async () => {
    const existing = new Set(customers.filter((c) => c.brand_id === brandId).map((c) => (c.name || '').trim().toLocaleLowerCase('tr')));
    const toAdd: Record<string, { id: string; brand_id: string; name: string; phone: string; city: string; address: string }> = {};
    proposals.filter((p) => p.brand_id === brandId).forEach((p) => {
      const name = stripHtml(p.customer_name || '');
      if (!name) return;
      const key = name.toLocaleLowerCase('tr');
      if (existing.has(key) || toAdd[key]) return;
      toAdd[key] = { id: `cust-${Date.now()}-${Object.keys(toAdd).length}`, brand_id: brandId, name, phone: p.customer_phone || '', city: p.customer_city || '', address: p.customer_address || '' };
    });
    const list = Object.values(toAdd);
    if (list.length === 0) return alert('Aktarılacak yeni müşteri yok — tekliflerdeki müşteriler zaten kayıtlı.');
    if (!confirm(`${list.length} yeni müşteri tekliflerden aktarılacak. Devam edilsin mi?`)) return;
    setImporting(true);
    try {
      for (const c of list) await addCustomer(c);
      alert(`${list.length} müşteri aktarıldı.`);
    } finally {
      setImporting(false);
    }
  };
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', city: '', address: '' });

  const brandCustomers = customers
    .filter((c) => {
      if (!search) return true;
      const s = search.toLowerCase();
      return c.name.toLowerCase().includes(s) || c.phone.toLowerCase().includes(s) || c.city.toLowerCase().includes(s);
    });

  const handleSave = async () => {
    if (!form.name.trim()) return alert('Müşteri adı giriniz.');
    if (editingId) {
      await updateCustomer(editingId, form);
      setEditingId(null);
    } else {
      const newCustomer: Customer = {
        id: Date.now().toString(),
        brand_id: brandId,
        name: form.name,
        phone: form.phone,
        city: form.city,
        address: form.address,
      };
      await addCustomer(newCustomer);
    }
    setForm({ name: '', phone: '', city: '', address: '' });
    setShowForm(false);
  };

  const handleEdit = (c: Customer) => {
    setEditingId(c.id);
    setForm({ name: c.name, phone: c.phone, city: c.city, address: c.address });
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Bu müşteriyi silmek istediğinize emin misiniz?')) {
      removeCustomer(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Müşteriler</h1>
          <p className="text-sm text-gray-500 mt-1">{brand.fullName} - Müşteri yönetimi</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={backfillFromProposals}
            disabled={importing}
            className="px-4 py-2.5 rounded-lg text-sm font-bold border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition flex items-center gap-2 disabled:opacity-60"
            title="Mevcut tekliflerdeki müşterileri listeye aktar"
          >
            <Users className="w-4 h-4" /> {importing ? 'Aktarılıyor…' : 'Tekliflerden Aktar'}
          </button>
          <button
            onClick={() => { setShowForm(true); setEditingId(null); setForm({ name: '', phone: '', city: '', address: '' }); }}
            className="text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:opacity-90 transition flex items-center gap-2"
            style={{ backgroundColor: brand.buttonColorHex }}
          >
            <Plus className="w-4 h-4" /> Yeni Müşteri
          </button>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-bold text-lg">{editingId ? 'Müşteri Düzenle' : 'Yeni Müşteri'}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Firma / Kişi Adı *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Firma / Kişi Adı" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Telefon</label>
                  <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Telefon" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Şehir</label>
                  <input type="text" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Şehir" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Adres</label>
                <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm h-20 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Adres" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50">İptal</button>
                <button onClick={handleSave} className={`px-4 py-2 rounded-lg text-white text-sm font-bold hover:opacity-90 ${brand.buttonColor} flex items-center gap-2`}>
                  <Save className="w-4 h-4" /> Kaydet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
        <input type="text" placeholder="İsim, telefon veya şehir ara..." className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Customer List */}
      {brandCustomers.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Henüz müşteri eklenmemiş</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {brandCustomers.map((c) => (
            <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition">
              <div className="flex items-start justify-between mb-2">
                <div className="font-bold text-gray-900">{c.name}</div>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(c)} className="p-1.5 rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              {c.phone && <div className="text-sm text-gray-500">{c.phone}</div>}
              {c.city && <div className="text-sm text-gray-500">{c.city}</div>}
              {c.address && <div className="text-xs text-gray-400 mt-1 line-clamp-2">{c.address}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
