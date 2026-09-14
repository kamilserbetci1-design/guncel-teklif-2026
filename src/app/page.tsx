'use client';

import { useRouter } from 'next/navigation';
import { BRANDS } from '@/lib/brands';

export default function HomePage() {
  const router = useRouter();

  const handleBrandSelect = (brandId: string) => {
    localStorage.setItem('currentBrand', brandId);
    router.push(`/${brandId}/dashboard`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
            Teklif Yönetim Sistemi
          </h1>
          <p className="text-gray-400 text-lg">
            Profesyonel teklif hazırlama ve yönetim paneli
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {Object.values(BRANDS).map((brand) => (
            <button
              key={brand.id}
              onClick={() => handleBrandSelect(brand.id)}
              className="group relative bg-white rounded-2xl shadow-xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] p-8 flex flex-col items-center gap-6 border border-gray-100"
            >
              <div className="w-full h-32 flex items-center justify-center rounded-xl bg-white p-4 border border-gray-100">
                {brand.logo ? (
                  <img
                    src={brand.logo}
                    alt={brand.name}
                    className="max-h-full max-w-[280px] object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      if (target.parentElement) {
                        target.parentElement.innerHTML = `<span class="text-3xl font-extrabold text-gray-800">${brand.fullName}</span>`;
                      }
                    }}
                  />
                ) : (
                  <div className="text-center">
                    <div className="text-3xl font-extrabold text-slate-800 tracking-tight">MARKASIZ</div>
                    <p className="text-xs text-gray-400 mt-2">İsim veya logo teklifte eklenir</p>
                  </div>
                )}
              </div>

              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{brand.fullName}</h2>
                <p className="text-sm text-gray-500">{brand.slogan}</p>
                {brand.address.length > 0 && (
                  <p className="text-xs text-gray-400 mt-2">{brand.address.join(', ')}</p>
                )}
              </div>

              <div className="w-full py-3 rounded-xl text-white font-bold text-sm tracking-wide transition-opacity group-hover:opacity-90" style={{ backgroundColor: brand.accentColor }}>
                Panele Giriş →
              </div>
            </button>
          ))}
        </div>

        <p className="text-center text-gray-600 text-xs mt-12">
          © {new Date().getFullYear()} Teklif Yönetim Sistemi • Tüm hakları saklıdır.
        </p>
      </div>
    </div>
  );
}
