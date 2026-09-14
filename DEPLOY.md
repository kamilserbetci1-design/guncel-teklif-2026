# Teklif Yönetim — Deploy Rehberi

## Gereksinimler
- Node.js 18+
- Vercel hesabı (ücretsiz plan yeterli)
- Supabase hesabı (opsiyonel — Supabase olmadan da çalışır, veriler sadece tarayıcıda tutulur)

## 1. Projeyi Kur

```bash
npm install
```

## 2. Ortam Değişkenleri

Proje kökünde `.env.local` dosyası oluştur:

```
NEXT_PUBLIC_SUPABASE_URL=<supabase-proje-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
```

> Supabase kullanmayacaksan bu dosyayı oluşturmana gerek yok. Uygulama otomatik olarak sadece tarayıcı depolama (IndexedDB) ile çalışır.

## 3. Supabase Kurulumu (opsiyonel)

Yeni bir Supabase projesi açtıysan, `supabase-migration.sql` dosyasını Supabase Dashboard → SQL Editor'de çalıştır. Bu dosya gerekli tabloları (proposals, products, customers, packages) ve güvenlik kurallarını oluşturur.

## 4. Lokal Geliştirme

```bash
npm run dev
```

Tarayıcıda http://localhost:3000 aç.

## 5. Vercel'e Deploy

### Yöntem A — Vercel CLI
```bash
npm i -g vercel
vercel login
vercel
```
Sorulara cevap ver (framework: Next.js). Sonra Vercel Dashboard'dan ortam değişkenlerini ekle.

### Yöntem B — GitHub üzerinden
1. Projeyi kendi GitHub hesabına push et
2. vercel.com → New Project → GitHub repo seç
3. Framework: Next.js (otomatik algılar)
4. Environment Variables bölümüne `.env.local` değişkenlerini ekle
5. Deploy

### Yöntem C — Domain bağlama
Vercel Dashboard → Settings → Domains → Kendi domainini ekle.
DNS ayarlarında:
- **A kaydı:** `76.76.21.21`
- **CNAME:** `cname.vercel-dns.com`

## 6. Önemli Notlar

- **Framework:** Next.js 14 (App Router)
- **Veritabanı:** Supabase (PostgreSQL) — opsiyonel
- **Lokal depolama:** IndexedDB (tarayıcıda)
- **Ürün verileri:** `/public/products-*.json` ve `/public/packages-*.json` dosyalarından yüklenir
- Supabase bağlantısı yoksa uygulama tamamen çevrimdışı çalışır, veriler tarayıcıda saklanır
