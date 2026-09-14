'use client';

import { useParams, useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getBrand, VALID_BRAND_IDS } from '@/lib/brands';
import { useAppStore } from '@/lib/store';
import { LayoutDashboard, FileText, Package, Users, Upload, ArrowLeft, Menu, X, Tag, ClipboardList, Wallet, Boxes } from 'lucide-react';
import Link from 'next/link';

export default function BrandLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const brandId = params.brand as string;
  const brand = getBrand(brandId);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const hasHydrated = useAppStore((s) => s._hasHydrated);

  useEffect(() => {
    if (!(VALID_BRAND_IDS as readonly string[]).includes(brandId)) {
      router.push('/');
    }
  }, [brandId, router]);

  const navItems = [
    { href: `/${brandId}/dashboard`, label: 'Dashboard', icon: LayoutDashboard },
    { href: `/${brandId}/teklif/yeni`, label: 'Yeni Teklif', icon: FileText },
    { href: `/${brandId}/teklifler`, label: 'Teklif Geçmişi', icon: Package },
    { href: `/${brandId}/musteriler`, label: 'Müşteriler', icon: Users },
    { href: `/${brandId}/urunler`, label: 'Ürün Yönetimi', icon: Upload },
    { href: `/${brandId}/siparisler`, label: 'Sipariş Takip', icon: ClipboardList },
    { href: `/${brandId}/kargo-etiket`, label: 'Kargo Etiketi', icon: Tag },
    // Cari Takip ve Stok Yönetimi yalnızca MutPro markasında görünür
    ...(brandId === 'mutpro'
      ? [
          { href: `/${brandId}/cari`, label: 'Cari Takip', icon: Wallet },
          { href: `/${brandId}/stok`, label: 'Stok Yönetimi', icon: Boxes },
        ]
      : []),
  ];

  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + '/');

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-white border-r border-gray-200 z-50 transform transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} flex flex-col`}>
        <div className={`p-4 border-b border-gray-200 ${brand.sidebarBg}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {brand.logo ? (
                <img
                  src={brand.logo}
                  alt={brand.name}
                  className="h-10 object-contain brightness-0 invert"
                  onError={(e) => {
                    const t = e.target as HTMLImageElement;
                    t.style.display = 'none';
                  }}
                />
              ) : (
                <span className="text-white text-sm font-extrabold tracking-wide">{brand.fullName}</span>
              )}
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? `${brand.bgColor} ${brand.textColor}`
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-gray-200">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Marka Değiştir
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-h-screen">
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between lg:px-6">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100">
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <div className="text-sm text-gray-500 font-medium">
            {brand.fullName} • Teklif Yönetim Paneli
          </div>
          <div className="w-8 lg:w-0" />
        </header>
        <div className="p-4 lg:p-6">
          {hasHydrated ? children : (
            <div className="flex items-center justify-center py-20">
              <div className="text-gray-400 text-sm animate-pulse">Veriler yükleniyor...</div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
