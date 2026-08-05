-- ==========================================
-- UMCA — Enable Realtime untuk Tabel Kehadiran
-- Jalankan di Supabase Dashboard → SQL Editor.
-- Memungkinkan dashboard mendengarkan event INSERT baru
-- tanpa reload manual (postgres_changes).
-- ==========================================

alter publication supabase_realtime add table "Kehadiran";
