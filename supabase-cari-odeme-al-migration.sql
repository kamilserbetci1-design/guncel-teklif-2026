-- ============================================
-- CARİ: "Ödeme Al" işlem tipi için CHECK kısıtını güncelle
-- Bu dosyayı Supabase Dashboard > SQL Editor'de çalıştırın.
-- ============================================

-- Mevcut type CHECK kısıtını kaldır, 'odeme_al' dahil yenisini ekle
ALTER TABLE cari_transactions DROP CONSTRAINT IF EXISTS cari_transactions_type_check;
ALTER TABLE cari_transactions
  ADD CONSTRAINT cari_transactions_type_check
  CHECK (type IN ('borc', 'satis', 'alacak', 'odeme_al'));
