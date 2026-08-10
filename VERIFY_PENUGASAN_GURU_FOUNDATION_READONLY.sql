-- =====================================================================
-- VERIFY_PENUGASAN_GURU_FOUNDATION_READONLY.sql
-- =====================================================================
-- TUJUAN
--   Verifikasi READ-ONLY setelah migration
--   supabase/migrations/20260810090000_add_penugasan_guru_foundation.sql
--   dijalankan, untuk mengonfirmasi: tabel baru terbentuk dengan kolom dan
--   constraint yang benar, RLS aktif dengan policy yang benar, index
--   terbentuk, TIDAK ADA data auto-migrated ke tabel baru, dan field/tabel
--   lama (profiles/santri) tidak berubah.
--
-- CARA PAKAI
--   1. Jalankan migration 20260810090000_add_penugasan_guru_foundation.sql
--      lebih dulu (di luar sesi ini -- lihat laporan Tahap 9B, migration
--      SENGAJA belum di-apply dari sesi ini).
--   2. Buka project Supabase (staging/production sesuai kebutuhan) > SQL
--      Editor.
--   3. Paste SELURUH isi file ini, jalankan (Run).
--   4. Salin seluruh hasil untuk diperiksa.
--
-- BATASAN KERAS
--   - Semua statement di file ini adalah SELECT murni.
--   - TIDAK ADA INSERT / UPDATE / DELETE / ALTER / DROP / CREATE POLICY /
--     GRANT / REVOKE / COMMENT ON di file ini.
--   - File ini tidak dijalankan otomatis oleh Claude, dan tidak commit ke
--     riwayat migration (murni alat verifikasi manual).
-- =====================================================================


-- =====================================================================
-- BAGIAN A -- TABEL BARU TERBENTUK?
-- =====================================================================
select
  table_name,
  table_type
from information_schema.tables
where table_schema = 'public'
  and table_name in ('periode_akademik', 'penugasan_hafalan', 'wali_kelas_assignment')
order by table_name;


-- =====================================================================
-- BAGIAN B -- KOLOM PER TABEL BARU (tipe, nullable, default)
-- =====================================================================
select
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in ('periode_akademik', 'penugasan_hafalan', 'wali_kelas_assignment')
order by table_name, ordinal_position;


-- =====================================================================
-- BAGIAN C -- CONSTRAINT (CHECK, UNIQUE, FOREIGN KEY) PER TABEL BARU
-- =====================================================================
select
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  string_agg(kcu.column_name, ', ' order by kcu.ordinal_position) as kolom
from information_schema.table_constraints tc
left join information_schema.key_column_usage kcu
  on kcu.constraint_name = tc.constraint_name
  and kcu.table_schema = tc.table_schema
where tc.table_schema = 'public'
  and tc.table_name in ('periode_akademik', 'penugasan_hafalan', 'wali_kelas_assignment')
group by tc.table_name, tc.constraint_name, tc.constraint_type
order by tc.table_name, tc.constraint_type, tc.constraint_name;

-- Detail definisi CHECK constraint (isi ekspresinya, bukan cuma nama)
select
  conrelid::regclass as table_name,
  conname as constraint_name,
  pg_get_constraintdef(oid) as definisi
from pg_constraint
where conrelid in (
  'public.periode_akademik'::regclass,
  'public.penugasan_hafalan'::regclass,
  'public.wali_kelas_assignment'::regclass
)
order by conrelid::regclass::text, conname;


-- =====================================================================
-- BAGIAN D -- FOREIGN KEY MENUNJUK KE TABEL YANG BENAR?
-- =====================================================================
select
  tc.table_name as tabel_asal,
  kcu.column_name as kolom_asal,
  ccu.table_name as tabel_tujuan,
  ccu.column_name as kolom_tujuan,
  rc.delete_rule
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on kcu.constraint_name = tc.constraint_name and kcu.table_schema = tc.table_schema
join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name and ccu.table_schema = tc.table_schema
join information_schema.referential_constraints rc
  on rc.constraint_name = tc.constraint_name and rc.constraint_schema = tc.table_schema
where tc.constraint_type = 'FOREIGN KEY'
  and tc.table_schema = 'public'
  and tc.table_name in ('penugasan_hafalan', 'wali_kelas_assignment')
order by tc.table_name, kcu.column_name;


-- =====================================================================
-- BAGIAN E -- RLS ENABLED PER TABEL BARU
-- =====================================================================
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('periode_akademik', 'penugasan_hafalan', 'wali_kelas_assignment')
order by c.relname;


-- =====================================================================
-- BAGIAN F -- POLICY RLS PER TABEL BARU (nama, command, role, kondisi)
-- =====================================================================
select
  schemaname,
  tablename,
  policyname,
  cmd,
  roles,
  qual as using_expression,
  with_check as with_check_expression
from pg_policies
where schemaname = 'public'
  and tablename in ('periode_akademik', 'penugasan_hafalan', 'wali_kelas_assignment')
order by tablename, cmd, policyname;


-- =====================================================================
-- BAGIAN G -- INDEX PER TABEL BARU (termasuk partial unique index)
-- =====================================================================
select
  schemaname,
  tablename,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in ('periode_akademik', 'penugasan_hafalan', 'wali_kelas_assignment')
order by tablename, indexname;


-- =====================================================================
-- BAGIAN H -- TRIGGER PER TABEL BARU (updated_at + enforce max 2 aktif)
-- =====================================================================
select
  event_object_table as table_name,
  trigger_name,
  action_timing,
  event_manipulation,
  action_statement
from information_schema.triggers
where event_object_schema = 'public'
  and event_object_table in ('periode_akademik', 'penugasan_hafalan', 'wali_kelas_assignment')
order by event_object_table, trigger_name;


-- =====================================================================
-- BAGIAN I -- FUNGSI BARU TERBENTUK? (set_updated_at,
-- enforce_max_2_penugasan_hafalan_aktif) -- DAN fungsi lama TIDAK berubah
-- (current_user_role, current_user_can_access_jenis_kelas tetap ada persis
-- seperti sebelumnya, tidak di-CREATE OR REPLACE ulang oleh migration ini)
-- =====================================================================
select
  proname as function_name,
  prosecdef as security_definer,
  proconfig as config_settings
from pg_proc
where pronamespace = 'public'::regnamespace
  and proname in (
    'set_updated_at',
    'enforce_max_2_penugasan_hafalan_aktif',
    'current_user_role',
    'current_user_can_access_jenis_kelas'
  )
order by proname;


-- =====================================================================
-- BAGIAN I2 -- ISI FUNGSI enforce_max_2_penugasan_hafalan_aktif (koreksi
-- Tahap 9B) -- konfirmasi definisi final BENAR-BENAR memakai
-- pg_advisory_xact_lock (transaction-scoped), BUKAN pg_advisory_lock/
-- pg_advisory_unlock (session-scoped, bisa tertinggal menggantung), dan
-- BUKAN SECURITY DEFINER.
-- =====================================================================
select
  p.prosecdef as security_definer,
  p.proconfig as config_settings,
  pg_get_functiondef(p.oid) as definisi_lengkap
from pg_proc p
where p.pronamespace = 'public'::regnamespace
  and p.proname = 'enforce_max_2_penugasan_hafalan_aktif';

-- Pengecekan otomatis atas isi definisi -- harus TRUE semua:
--   pakai_xact_lock        -> memakai pg_advisory_xact_lock (transaction-scoped)
--   tidak_pakai_session_lock -> TIDAK memakai pg_advisory_lock/pg_advisory_unlock (session-scoped)
--   bukan_security_definer -> prosecdef = false
select
  (pg_get_functiondef(p.oid) like '%pg_advisory_xact_lock%') as pakai_xact_lock,
  (pg_get_functiondef(p.oid) not like '%pg_advisory_lock(%'
    and pg_get_functiondef(p.oid) not like '%pg_advisory_unlock%') as tidak_pakai_session_lock,
  (p.prosecdef = false) as bukan_security_definer
from pg_proc p
where p.pronamespace = 'public'::regnamespace
  and p.proname = 'enforce_max_2_penugasan_hafalan_aktif';


-- =====================================================================
-- BAGIAN J -- PASTIKAN TIDAK ADA DATA AUTO-MIGRATED (ketiga tabel baru
-- harus KOSONG -- migration Tahap 9B sengaja tidak insert apapun)
-- =====================================================================
select 'periode_akademik' as tabel, count(*) as jumlah_baris from public.periode_akademik
union all
select 'penugasan_hafalan', count(*) from public.penugasan_hafalan
union all
select 'wali_kelas_assignment', count(*) from public.wali_kelas_assignment;


-- =====================================================================
-- BAGIAN K -- PASTIKAN KOLOM/TABEL LAMA TIDAK BERUBAH
-- =====================================================================
-- Kolom lama pada profiles yang wajib tetap ada apa adanya.
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'profiles'
  and column_name in ('role', 'jenis_kelas', 'is_wali_kelas', 'wali_kelas_num', 'wali_kelas_jenis')
order by column_name;

-- Kolom lama pada santri yang wajib tetap ada apa adanya.
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'santri'
  and column_name in ('guru_id', 'guru_id_2', 'jenis_kelas', 'wali_id', 'status')
order by column_name;

-- Policy RLS lama pada santri/setoran/profiles/nilai_ujian wajib masih
-- persis nama-nama yang sama seperti sebelum migration ini (bandingkan
-- manual dengan daftar di bawah terhadap isi migration
-- 20260808150000/180000/200000/220000):
--   santri:  santri_select_scoped, santri_insert_admin, santri_update_admin, santri_delete_admin
--   setoran: setoran_select_scoped, setoran_insert_guru, setoran_update_guru_own
--   profiles: profiles_select_scoped, profiles_update_admin
--   nilai_ujian: nilai_ujian_select_admin_kepsek
select
  schemaname,
  tablename,
  policyname,
  cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('santri', 'setoran', 'profiles', 'nilai_ujian')
order by tablename, cmd, policyname;
