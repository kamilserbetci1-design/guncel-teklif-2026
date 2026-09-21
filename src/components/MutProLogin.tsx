'use client';

import { useState } from 'react';
import { Lock, Loader2 } from 'lucide-react';

const NAVY = '#040023';
const ORANGE = '#f97316';

export function MutProLogin({
  setupRequired,
  title = 'MutPro Paneli',
  onSuccess,
}: {
  setupRequired: boolean;
  title?: string;
  onSuccess: () => void;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/cari/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, remember: true }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Giriş başarısız.'); return; }
      onSuccess();
    } catch {
      setError('Bağlantı hatası.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 w-full">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-4 border border-white/10 shadow-xl" style={{ background: NAVY }}>
            <Lock className="w-6 h-6 text-white" />
          </div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] mb-2" style={{ color: ORANGE }}>MutPro</p>
          <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: NAVY }}>{title}</h1>
          <p className="text-sm text-gray-500 mt-1.5">
            {setupRequired ? 'İlk kurulum — yönetici hesabı oluşturun' : 'Cari Takip ile aynı kullanıcı adı ve şifre'}
          </p>
        </div>

        <form onSubmit={submit} autoComplete="on" className="bg-white rounded-2xl border border-black/[0.06] shadow-[0_12px_40px_-24px_rgba(4,0,35,0.35)] p-6 space-y-4">
          {setupRequired && (
            <div className="text-xs bg-blue-50 text-blue-700 rounded-lg p-3 border border-blue-100">
              Bu sistemde henüz kullanıcı yok. Belirleyeceğiniz kullanıcı adı ve şifre <b>ilk yönetici hesabı</b> olacak.
            </div>
          )}
          <div>
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Kullanıcı Adı</label>
            <input
              type="text" name="username" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus
              className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
              placeholder="kullanici"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Şifre</label>
            <input
              type="password" name="password" autoComplete={setupRequired ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} required
              className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
              placeholder="••••••••"
            />
          </div>
          <p className="text-[11px] text-gray-400">Oturum 30 gün geçerlidir; sonra tekrar giriş istenir.</p>
          {error && <div className="text-xs text-red-600 bg-red-50 rounded-lg p-2.5 border border-red-100">{error}</div>}
          <button
            type="submit" disabled={loading}
            className="w-full text-white font-bold py-3 rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ background: NAVY }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            {setupRequired ? 'Hesabı Oluştur ve Gir' : 'Giriş Yap'}
          </button>
        </form>
      </div>
    </div>
  );
}
