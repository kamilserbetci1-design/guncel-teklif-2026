'use client';

import { useParams, useRouter } from 'next/navigation';
import { getBrand } from '@/lib/brands';
import { useAppStore } from '@/lib/store';
import { FileText, Users, Package, TrendingUp, Plus, Clock, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { stripHtml } from '@/components/RichEditor';

export default function DashboardPage() {
  const params = useParams();
  const brandId = params.brand as string;
  const brand = getBrand(brandId);
  const { proposals, customers, products } = useAppStore();

  const brandProposals = proposals;
  const brandCustomers = customers;
  const brandProducts = products;

  const totalRevenue = brandProposals
    .filter((p) => p.status === 'approved')
    .reduce((sum, p) => sum + p.total, 0);

  const stats = [
    { label: 'Toplam Teklif', value: brandProposals.length, icon: FileText, color: 'bg-blue-50 text-blue-600', border: 'border-blue-200' },
    { label: 'Müşteriler', value: brandCustomers.length, icon: Users, color: 'bg-green-50 text-green-600', border: 'border-green-200' },
    { label: 'Ürünler', value: brandProducts.length, icon: Package, color: 'bg-purple-50 text-purple-600', border: 'border-purple-200' },
    { label: 'Onaylanan Ciro', value: `₺${totalRevenue.toLocaleString('tr-TR')}`, icon: TrendingUp, color: 'bg-orange-50 text-orange-600', border: 'border-orange-200' },
  ];

  const recentProposals = brandProposals.slice(0, 5);

  const statusLabels: Record<string, string> = {
    draft: 'Taslak', sent: 'Gönderildi', viewed: 'Görüntülendi', approved: 'Onaylandı', rejected: 'Reddedildi',
  };
  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600', sent: 'bg-blue-100 text-blue-600', viewed: 'bg-yellow-100 text-yellow-700', approved: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-600',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img src={brand.logo} alt={brand.name} className="h-14 max-w-[180px] object-contain" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">{brand.fullName} - Genel Bakış</p>
          </div>
        </div>
        <Link
          href={`/${brandId}/teklif/yeni`}
          className="text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:opacity-90 transition flex items-center gap-2"
          style={{ backgroundColor: brand.buttonColorHex }}
        >
          <Plus className="w-4 h-4" /> Yeni Teklif
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={`bg-white rounded-xl border ${stat.border} p-5 shadow-sm`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{stat.label}</span>
                <div className={`p-2 rounded-lg ${stat.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-gray-900">{stat.value}</div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions + Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide">Hızlı İşlemler</h3>
          <div className="space-y-2">
            <Link href={`/${brandId}/teklif/yeni`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition group">
              <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><FileText className="w-4 h-4" /></div>
              <div className="flex-1"><div className="text-sm font-semibold text-gray-800">Yeni Teklif Oluştur</div><div className="text-xs text-gray-500">Hızlı teklif hazırlama</div></div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition" />
            </Link>
            <Link href={`/${brandId}/musteriler`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition group">
              <div className="p-2 bg-green-50 rounded-lg text-green-600"><Users className="w-4 h-4" /></div>
              <div className="flex-1"><div className="text-sm font-semibold text-gray-800">Müşteri Ekle</div><div className="text-xs text-gray-500">Yeni müşteri kaydı</div></div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition" />
            </Link>
            <Link href={`/${brandId}/urunler`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition group">
              <div className="p-2 bg-purple-50 rounded-lg text-purple-600"><Package className="w-4 h-4" /></div>
              <div className="flex-1"><div className="text-sm font-semibold text-gray-800">Ürün Yönetimi</div><div className="text-xs text-gray-500">CSV yükle, düzenle</div></div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition" />
            </Link>
          </div>
        </div>

        {/* Recent Proposals */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Son Teklifler</h3>
            <Link href={`/${brandId}/teklifler`} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
              Tümünü Gör →
            </Link>
          </div>
          {recentProposals.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Henüz teklif oluşturulmamış</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentProposals.map((p) => (
                <Link key={p.id} href={`/${brandId}/teklif/yeni?id=${p.id}`} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition cursor-pointer">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-800 truncate">{p.project_name || 'İsimsiz Proje'}</div>
                    <div className="text-xs text-gray-500">{stripHtml(p.customer_name || '') || 'Müşteri Yok'} • {p.proposal_no}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${statusColors[p.status] || 'bg-gray-100 text-gray-600'}`}>
                      {statusLabels[p.status] || p.status}
                    </span>
                    <span className="text-sm font-bold text-gray-800 whitespace-nowrap">
                      ₺{p.total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
