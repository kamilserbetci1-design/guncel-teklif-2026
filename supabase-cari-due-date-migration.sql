-- ============================================
-- CARİ: Vade / çek tarihi
-- Bu dosyayı Supabase Dashboard > SQL Editor'de çalıştırın.
-- ============================================

ALTER TABLE cari_transactions
  ADD COLUMN IF NOT EXISTS due_date TEXT;
