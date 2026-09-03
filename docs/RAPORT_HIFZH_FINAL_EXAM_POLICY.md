# RAPORT HIFZH — FINAL EXAM POLICY & POST-EXAM HAFALAN ADJUSTMENT

## Status
Dokumen ini menjadi panduan implementasi untuk Antigravity terkait finalisasi logika Ujian Hafalan dan Raport Hifzh.

Dokumen ini bukan sekadar catatan diskusi. Seluruh aturan di bawah harus dianggap sebagai keputusan bisnis yang menjadi acuan implementasi, kecuali bagian yang secara eksplisit ditandai perlu audit teknis terlebih dahulu.

# 1. Tujuan

Menyelesaikan tiga masalah yang saling berkaitan:

1. Nilai ujian yang terlalu tinggi / nilai 10.
2. Santri yang tidak menyelesaikan seluruh kewajiban ujian.
3. Penyesuaian baseline hafalan pada periode berikutnya berdasarkan batas terakhir ujian yang benar-benar diselesaikan.

Tujuan akhir:

- Raport Hifzh merefleksikan hasil ujian yang sebenarnya.
- Santri yang tidak menyelesaikan ujian tidak mendapatkan rata-rata tinggi hanya dari juz yang sempat diuji.
- Nilai 10/100 tidak pernah tampil sebagai nilai resmi Raport Hifzh.
- Hafalan resmi periode berikutnya turun ke batas terakhir yang berhasil diuji jika ujian tidak diselesaikan.
- Riwayat lama tidak dihapus.
- Sistem tetap period-aware dan audit-friendly.

# 2. Prinsip Dasar

## 2.1 Nilai mentah vs nilai resmi

Nilai yang pernah dimasukkan guru tetap dipertahankan di database sebagai nilai mentah/historis.

Nilai mentah tersebut tidak boleh diubah massal hanya karena kebijakan baru.

Untuk seluruh perhitungan resmi, gunakan:

```text
nilai_resmi = min(nilai_mentah, 9.5)
```

Contoh:

```text
10   -> 9.5
9.8  -> 9.5
9.5  -> 9.5
8.7  -> 8.7
```

Nilai mentah tetap tersedia untuk audit internal.

# 3. Batas Nilai Maksimum

## 3.1 Nilai maksimum resmi

Nilai maksimum ujian adalah:

```text
9.5
```

atau setelah dikonversi ke skala raport:

```text
95
```

Raport Hifzh tidak boleh menampilkan nilai 10 atau 100 untuk komponen ujian.

## 3.2 Input baru

Untuk input baru setelah fitur ini aktif:

```text
0.0 <= nilai <= 9.5
```

Nilai 9.6, 9.8, 10.0 harus ditolak server-side.

## 3.3 Data lama bernilai >9.5

Jangan UPDATE data lama secara massal.

Data lama tetap seperti aslinya.

Tetapi pada seluruh kalkulasi resmi gunakan effective score = min(raw, 9.5).

# 4. Cap Nilai Harus Sebelum Rata-Rata

Contoh nilai segmen:

```text
10
10
8
8
8
```

SALAH:

```text
(10 + 10 + 8 + 8 + 8) / 5 = 8.8
```

BENAR:

```text
(9.5 + 9.5 + 8 + 8 + 8) / 5 = 8.6
```

Setiap nilai komponen dinormalisasi dahulu sebelum rata-rata per juz maupun rata-rata keseluruhan.

# 5. Kewajiban Ujian Santri

Kewajiban ujian ditentukan dari cakupan hafalan resmi santri pada awal periode ujian.

Contoh: hafalan resmi 10 juz pada awal ujian → kewajiban ujian 10 juz.

PENTING: sistem harus punya cara terpercaya untuk mengetahui berapa cakupan hafalan resmi santri ketika periode ujian dimulai. Jangan menggunakan total_hafalan_juz terkini secara buta jika dapat berubah setelah ujian.

Antigravity wajib mengaudit apakah sudah ada snapshot/baseline periode ujian. Jika belum, jangan mengarang histori; laporkan kebutuhan snapshot minimal.

# 6. Definisi Ujian Selesai

Santri dianggap MENYELESAIKAN UJIAN hanya jika seluruh cakupan hafalan wajib pada periode tersebut telah selesai diuji.

Contoh:
- wajib 10 juz
- selesai 5 juz
- status = TIDAK MENYELESAIKAN UJIAN

# 7. Juz Tidak Selesai = Nilai 0

Jika wajib Juz 1–10 dan selesai hanya Juz 1–5:

```text
Juz 1-5  = nilai hasil ujian
Juz 6-10 = 0
```

Nilai 0:
- wajib tampil di raport;
- berwarna merah;
- masuk denominator rata-rata.

# 8. Nilai Ujian Keseluruhan

Jika kewajiban santri = N juz:

```text
nilai_ujian_keseluruhan =
jumlah seluruh nilai resmi juz wajib / jumlah seluruh juz wajib
```

Termasuk missing juz bernilai 0.

Contoh:

```text
9.5 + 9.2 + 8.8 + 9.1 + 9.0 + 0 + 0 + 0 + 0 + 0 = 45.6
45.6 / 10 = 4.56
```

Bukan dibagi 5.

# 9. Kelancaran Per Juz

Kelancaran tetap berasal dari hasil segmen ujian.

Setiap segmen:
```text
effective_segment_score = min(raw_segment_score, 9.5)
```

Jika seluruh segmen wajib pada juz belum lengkap, dan juz itu termasuk cakupan wajib ujian, nilai final juz pada Raport Hifzh = 0.

# 10. Tajwid

Tajwid tetap terpisah per juz.

Aturan:
- input baru maksimal 9.5;
- historical >9.5 dibaca 9.5 untuk output resmi;
- juz wajib yang tidak diselesaikan: Kelancaran = 0 dan Tajwid = 0, keduanya merah.

Jika implementasi existing punya alasan teknis kuat agar Tajwid kosong, Antigravity harus lapor sebelum mengubah aturan ini.

# 11. Tampilan Raport

Juz wajib yang tidak diselesaikan:
- nilai 0 merah;
- jangan blank;
- harus jelas bahwa ujian tidak selesai.

Boleh ada label kecil “Belum Menyelesaikan Ujian” bila layout memungkinkan.

# 12. Status Ujian

Sistem harus menghasilkan status eksplisit:

```text
SELESAI
TIDAK_SELESAI
```

Dipakai oleh Raport Hifzh, Admin/Kepsek, dan penyesuaian hafalan periode berikutnya.

# 13. Ranking Ujian Hafalan

Ranking memakai nilai resmi:
- raw >9.5 → 9.5
- missing required juz → 0

Formula existing tetap:

```text
Nilai Peringkat =
(Nilai Ujian Keseluruhan * 4 + Nilai Hafalan) / 5
```

# 14. Ranking Sementara / Final

Eligibility lama yang hanya mensyaratkan minimal satu juz selesai harus diaudit ulang.

Untuk ranking final, santri yang tidak menyelesaikan seluruh kewajiban tetap punya nilai resmi dan tetap muncul di ranking; missing juz = 0.

# 15. Penyesuaian Hafalan Setelah Ujian

Jika santri tidak menyelesaikan seluruh ujian:

> Hafalan resmi periode berikutnya turun sampai batas terakhir yang benar-benar berhasil diuji.

Contoh:
- sebelum ujian: 10 juz
- terakhir benar-benar selesai diuji sampai Surah X
- baseline periode berikutnya: sampai Surah X
- bagian setelah Surah X sampai batas lama kembali dianggap HAFALAN BARU.

# 16. Jangan Hapus Riwayat Lama

Jangan hapus:
- setoran lama
- histori hafalan
- nilai lama
- data ujian
- histori progress

Yang berubah hanya baseline hafalan resmi periode berikutnya.

# 17. Batas Terakhir Harus Presisi

Jangan menurunkan hanya 10 juz → 5 juz jika sistem punya batas surah/ayat yang lebih presisi.

Audit:
- progress hafalan
- surah terakhir
- ayat terakhir
- total_hafalan_juz
- segment ujian
- mapping juz ↔ surah

Gunakan mapping existing jika ada.

# 18. Kapan Penurunan Dilakukan

Penurunan baseline harus terjadi satu kali setelah hasil ujian final/ditutup.

Cari apakah sistem punya finalisasi ujian.

Jika belum ada lifecycle aman, jangan auto-mutate. Rekomendasi aman:

```text
Admin -> Finalisasi Ujian -> Terapkan Penyesuaian Hafalan
```

# 19. Notifikasi Guru Periode Berikutnya

Ketika santri mulai setoran setelah baseline diturunkan, tampilkan pemberitahuan seperti:

> Penyesuaian Hafalan Pasca-Ujian  
> Hafalan Ahmad diturunkan dari 10 juz menjadi sampai Surah X karena ujian hafalan periode sebelumnya tidak diselesaikan. Bagian setelah Surah X sampai batas hafalan sebelumnya kembali dihitung sebagai Hafalan Baru.

Notifikasi tidak boleh tampil terus-menerus secara mengganggu.

# 20. Bagian Setelah Baseline Baru

Histori setoran lama tetap ada.

Tetapi progress periode berikutnya memperlakukan bagian setelah baseline baru sebagai HAFALAN BARU sampai dibuktikan kembali.

# 21. Audit Nilai 10 Existing

Sebelum mutation, audit read-only:
- jumlah nilai segmen >9.5
- jumlah nilai =10
- jumlah santri terdampak
- jumlah juz terdampak
- nilai Tajwid >9.5 jika ada
- distribusi per guru
- distribusi per periode ujian

Raw data tidak diubah.

# 22. Integrity Monitoring Guru

Jangan langsung menghukum/memblokir guru.

Boleh ada flag internal Admin/Kepsek:
- mis. 18 dari 20 juz >=9.4
- atau >90% segmen berada di nilai maksimal resmi

Status internal:
```text
PERLU_DITINJAU
```

Ini tahap sekunder, bukan blocker policy utama.

# 23. Source of Truth

Pertahankan source existing:
- nilai ujian: nilai_ujian
- Tajwid: nilai_tajwid_juz
- periode ujian: kalender_akademik / mekanisme existing
- Wali Kelas: wali_kelas_assignment + periode_akademik
- Guru Hafalan: penugasan_hafalan + periode_akademik

Jangan kembali ke legacy untuk implementasi baru.

# 24. Historical Safety

Semua kalkulasi laporan historis harus memakai periode ujian yang dipilih.

Jangan campurkan nilai dari periode berbeda.

# 25. Existing Decision yang Harus Dipertahankan

Ranking:
```text
Nilai Peringkat =
(Nilai Ujian Keseluruhan * 4 + Nilai Hafalan) / 5
```

Nilai Hafalan:
```text
(total_hafalan_juz santri / max total_hafalan_juz kelas) * 10
```

Identity kelas:
```text
jenjang + kelas_num + jenis_kelas
```

TN tetap tn_a / tn_b.

# 26. Urutan Implementasi

## Phase A — Audit
Tanpa mutation.

Audit:
1. source kewajiban ujian
2. snapshot hafalan awal ujian
3. batas terakhir surah/ayat yang diuji
4. jumlah nilai >9.5 dan =10
5. Nilai Ujian Keseluruhan saat ini
6. Raport Hifzh per-juz
7. ranking ujian
8. baseline hafalan
9. Setoran Hafalan Baru/Lama
10. finalisasi ujian

## Phase B — Effective Score 9.5 (IMPLEMENTED)
Status: **IMPLEMENTED**. Helper kanonik `effectiveExamScore(raw) = min(raw, 9.5)` telah diterapkan di `app/lib/adminNilaiUjian.ts`, `hitungRingkasanJuz`, write-path POST/PUT guru, PATCH/PUT admin, dan `nilaiRapor` (maks 95). Data mentah historis DB dipertahankan tanpa mutasi.
Satu helper/domain rule:
```text
effectiveExamScore(raw) = min(raw, 9.5)
```
Dipakai konsisten di kelancaran, overall, ranking, Raport Hifzh, report resmi.
Input baru >9.5 ditolak server.
Raw history tidak diubah.

## Phase C — Incomplete Exam
Implementasikan:
- required scope
- completed scope
- missing required juz =0
- denominator seluruh required scope
- merah di Raport
- status SELESAI/TIDAK_SELESAI

## Phase D — Post Exam Adjustment
Hanya jika audit membuktikan mapping progress aman.
Baseline turun sekali.

## Phase E — Guru Notification
Setelah baseline adjustment stabil.

## Phase F — Integrity Flag
Opsional setelah policy utama stabil.

# 27. Larangan

JANGAN:
- UPDATE massal nilai 10 menjadi 9.5
- hapus histori
- hapus setoran lama
- bulatkan baseline ke integer juz jika data lebih presisi tersedia
- gunakan raw >9.5 dalam ranking resmi
- abaikan missing required juz
- hitung average hanya dari juz selesai
- pakai periode aktif untuk histori tanpa period id benar
- buat business rule berbeda UI vs server
- sentuh Rapot Digital
- ubah Guru Pengganti
- ubah assignment tanpa kebutuhan

# 28. QA Minimum

Score cap:
1. 10→9.5
2. 9.8→9.5
3. 9.5 tetap
4. 8.5 tetap
5. input baru 10 ditolak server

Per-juz:
6. segmen >9.5 dinormalisasi sebelum rata-rata
7. juz lengkap benar
8. juz wajib tidak lengkap →0

Incomplete:
9. wajib10 selesai5 →5 lainnya0
10. denominator10
11. status TIDAK_SELESAI
12. missing merah

Complete:
13. wajib10 selesai10 → tidak ada0
14. status SELESAI

Ranking:
15. >9.5 tidak memberi keuntungan
16. incomplete tetap masuk ranking

Baseline:
17. histori tetap
18. baseline turun ke batas terakhir ujian
19. setelah baseline = Hafalan Baru
20. adjustment tidak dobel

Notification:
21. guru mendapat info benar
22. tidak mengganggu

Regression:
23. TypeScript
24. verify
25. build
26. Setoran tidak rusak
27. Nilai Ujian tidak rusak
28. Raport Hifzh tetap generate

# 29. Output Phase A yang Diharapkan

Sebelum coding Phase B/C/D, laporkan:
1. source kewajiban ujian saat ini
2. snapshot awal ujian tersedia atau tidak
3. batas terakhir ujian ditentukan bagaimana
4. jumlah nilai existing >9.5 dan =10
5. helper nilai per juz
6. helper overall
7. ranking terdampak
8. generator Raport Hifzh terdampak
9. Setoran Hafalan Baru/Lama
10. mekanisme finalisasi ujian
11. kebutuhan migration jika ada
12. risiko historical
13. perubahan file minimal

Jika data/snapshot tidak cukup:
STOP. Jangan mengarang.

# 30. Backlog Tetap Terbuka

Jangan kerjakan kecuali langsung diperlukan:
- Rapot Digital period/history
- verifikasi RLS nilai_rapot
- legacy Guru Hafalan read-path
- legacy Wali Kelas retirement
- bug useAdminNaikKelas
- constraint satu periode aktif
- timezone minor findings
- cron timezone
- notif WA Wali Kelas
- retirement legacy fields

# 31. Instruksi Kerja Antigravity

Baca dokumen ini sebelum mengubah kode.

Kerjakan Phase A audit terlebih dahulu.

Jangan langsung mengimplementasikan Phase B-F dalam satu loncatan.

Tujuannya memastikan:
- cakupan ujian historis benar
- raw history aman
- baseline bisa diturunkan presisi
- business rule existing tidak rusak

Setelah Phase A selesai, laporkan sebelum mutation besar/database migration.
