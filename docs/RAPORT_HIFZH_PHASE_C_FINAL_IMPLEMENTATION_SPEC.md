# RAPORT HIFZH — PHASE C FINAL IMPLEMENTATION SPEC
## Source of Truth Teknis & Bisnis
**Status:** Final implementation reference sebelum commit / migration production  
**Project:** Hafalan Santri / Hafalan Digital  
**Scope:** Semester Gasal 2026/2027 — Raport Hifzh, Ujian Hafalan, Ranking, Tajwid, Exam Scope Snapshot  
**Catatan penggunaan:** Dokumen ini wajib dibaca ulang oleh Antigravity sebelum mengerjakan perubahan terkait Phase C, Raport Hifzh, Ranking Ujian Hafalan, Tajwid, atau snapshot cakupan ujian.

---

# 1. TUJUAN DOKUMEN

Dokumen ini menyatukan seluruh keputusan bisnis dan teknis terbaru agar implementasi tidak saling tumpang tindih.

Masalah yang ingin dicegah:

1. Satu helper dipakai untuk Raw Score, Ranking, dan Raport sekaligus.
2. Cap nilai Raport ikut merusak Ranking.
3. Nilai guru dipotong sebelum masuk database.
4. Partial segment dianggap wajib ujian penuh.
5. Partial juz dianggap gagal hanya karena seluruh juz belum hafal.
6. Tajwid dianggap wajib pada partial juz.
7. Banat/TN ikut dianggap cohort ujian Semester Gasal padahal sistem baru hanya digunakan Banin.
8. Snapshot menggunakan data live secara salah setelah ujian berjalan.
9. Santri yang ujian tidak selesai hilang dari ranking.
10. Perubahan besar schema dilakukan padahal belum perlu.

Prinsip utama: **pisahkan domain. Satu aturan = satu source of truth. Jangan membuat helper serbaguna yang diam-diam mengubah business rule domain lain.**

---

# 2. SCOPE SEMESTER GASAL 2026/2027

Untuk Semester Gasal 2026/2027 saat ini:

- Sistem ujian baru dipakai untuk **Banin**.
- Banat, `tn_a`, dan `tn_b` **tidak masuk cohort ujian Gasal ini**.
- Baseline resmi cakupan ujian = kondisi hafalan santri pada **1 Agustus 2026**.
- Deadline penyelesaian input ujian saat ini = **5 September 2026**.
- Hafalan/setoran baru selama masa ujian **tidak boleh memperbesar required scope Semester Gasal**.
- Future semester harus memakai snapshot formal yang dikunci Admin.
- Cohort wajib selalu dihitung dari data Banin yang relevan pada periode, bukan dari keberadaan nilai saja.

---

# 3. KONTRAK RANKING — FREEZE

Formula ranking **TIDAK BOLEH DIUBAH**:

```text
Nilai Peringkat =
(Nilai Ujian Keseluruhan * 4 + Nilai Hafalan) / 5
```

Bobot:

- Nilai Ujian Keseluruhan = 80%
- Nilai Hafalan = 20%

Formula Nilai Hafalan existing:

```text
Nilai Hafalan =
(total_hafalan_juz santri / max total_hafalan_juz kelas) * 10
```

Pembulatan existing tetap dipertahankan.

Tajwid **tidak masuk** formula ranking.

## Tie-break existing — jangan diubah

Urutan:

1. `nilaiPeringkat` DESC
2. `nilaiUjianKeseluruhan` DESC
3. `total_hafalan_juz` DESC
4. `nama` ASC
5. `id` ASC

Nomor peringkat tetap linear setelah sorting deterministik.

## Eligibility Ranking

- Ujian selesai penuh → ikut ranking.
- Ujian incomplete tetapi sudah menyelesaikan >= 1 required juz → tetap ikut ranking.
- Required scope > 0 tetapi completed = 0:
  - mode provisional → boleh `null` / `belumAdaHasil`
  - mode final → `nilaiUjianKeseluruhan = 0`, tetap ikut ranking.
- Santri tanpa required scope resmi → bukan gagal ujian.

**Ranking harus memakai nilai ujian raw/murni, bukan nilai yang sudah di-cap untuk Raport.**

---

# 4. PEMISAHAN DOMAIN NILAI

Arsitektur final:

```text
RAW INPUT GURU
    |
    v
RAW DB SCORE
    |
    +------------------------+
    |                        |
    v                        v
RANKING CALC             RAPORT CALC
raw 0-10                 cap khusus Raport
raw average              cap per komponen
    |                        |
    v                        v
formula 80/20            display max 90
```

Domain wajib dipisah menjadi:

1. Raw Exam Scoring
2. Required Exam Scope
3. Final Exam Completion
4. Ranking Calculation
5. Raport-specific Scoring / Presentation
6. Tajwid Requirement

Tidak boleh ada cap Raport yang ikut mempengaruhi Ranking.

---

# 5. RAW NILAI GURU

## Kelancaran

Guru boleh memberi nilai sampai **10.0**.

Business rule existing minimum normal Kelancaran tetap dipertahankan.

Artinya write-path normal harus mempertahankan pola:

```text
min = 5
max = 10
```

Contoh:

```ts
Math.min(10, Math.max(5, roundedValue))
```

Jangan mengubah minimum Kelancaran menjadi 0.

Nilai `0` adalah **special system penalty** untuk ujian required yang tidak selesai pada hasil final. Nilai 0 bukan nilai normal input guru.

## Tajwid

- Pertahankan minimum existing.
- Maksimum harus menerima sampai 10.
- Jangan reject atau cap 9.6–10 menjadi 9.5.

## Raw DB

- Simpan nilai guru sebagaimana mestinya.
- Jangan mass-update historical rows.
- Historical raw values harus tetap audit-friendly.

---

# 6. RAPORT HIFZH — CAP MAKSIMUM 9.0 / 90

Keputusan final Owner:

Guru boleh input 10, tetapi Raport Hifzh tidak boleh menampilkan nilai di atas **9.0 / 90**.

Contoh:

```text
raw 10.0 -> Raport 90
raw 9.8  -> Raport 90
raw 9.5  -> Raport 90
raw 9.2  -> Raport 90
raw 9.0  -> Raport 90
raw 8.7  -> Raport 87
raw 7.2  -> Raport 72
```

## Sangat penting: cap dilakukan sebelum average Raport

Cap Raport dilakukan pada **component score** terlebih dahulu.

Contoh:

```text
raw component = [10, 8]

Ranking/raw average:
(10 + 8) / 2 = 9.0

Raport:
cap component -> [9, 8]
average -> 8.5
display -> 85
```

Bukan:

```text
average raw = 9.0
baru cap = 9.0
display = 90
```

Jadi diperlukan pemisahan raw calculation dan report calculation.

## Floor 50

Jangan memaksa nilai normal Raport ke minimum 50 jika itu mengubah nilai sebenarnya.

Mapping normal:

```text
reportComponent = min(raw, 9.0)
display100 = round(reportComponent * 10)
```

Special case:

```text
incomplete required juz = 0 merah
```

Nilai 0 penalty tidak boleh melewati mapper normal.

---

# 7. REQUIRED EXAM SCOPE

Required scope Semester Gasal ditentukan dari baseline **1 Agustus 2026**.

Future exam:

1. jika snapshot ada → pakai snapshot
2. jika snapshot belum ada → `CAKUPAN_BELUM_DIKUNCI`
3. tidak boleh fallback ke posisi live/current saat membaca scope

Posisi live hanya boleh dipakai saat Admin secara eksplisit menekan **Kunci Cakupan Ujian** untuk membuat snapshot.

Semester Gasal 2026/2027 adalah masa transisi:

1. pakai snapshot jika ada
2. jika belum ada → reconstruction cutoff 1 Agustus 2026

---

# 8. PARTIAL SEGMENT

Jika baseline hafalan berhenti di tengah segmen:

- segmen tersebut **bukan required segment penuh**
- jangan dimasukkan ke `segmentIds`
- jangan menambah `jumlahSegmenPerJuz`
- jangan membuat santri incomplete hanya karena baru menyentuh sebagian segmen

Rule:

```text
checkpoint belum mencapai akhir segment
=> segment OUTSIDE REQUIRED SCOPE
=> stop pembentukan scope pada rantai kontinu tersebut
```

Contoh: santri baru hafal Al-Fath ayat 1–3, sedangkan satu segmen ujian lebih panjang. Maka segmen itu belum menjadi kewajiban ujian penuh.

---

# 9. PARTIAL JUZ

Partial juz tetap boleh memiliki nilai Kelancaran.

Contoh:

```text
Juz 25 required hanya segmen 1,2,3
```

Jika completed 1,2,3 maka:

- status juz = selesai untuk required scope
- nilai juz = average segmen 1,2,3
- bukan 0
- segmen 4,5 outside scope
- segmen 4,5 tidak masuk denominator

Jika required 1,2,3 tetapi completed 1,2 maka:

- status = belum selesai
- hasil final juz = 0
- 0 merah di Raport
- tetap masuk denominator

Status juz ditentukan oleh **required segments santri**, bukan semua segmen standar di juz.

---

# 10. TAJWID — RULE FINAL

Tajwid wajib dinilai **hanya untuk FULL JUZ**.

## Full Juz

Jika seluruh segmen standar juz memang sudah menjadi hafalan penuh dan Kelancaran selesai:

```text
FULL JUZ + Tajwid kosong
=> missing Tajwid
=> wajib dilengkapi
=> pada hasil final Raport dapat menjadi 0 merah jika tetap kosong
```

## Partial Juz

Jika santri hanya memiliki sebagian juz:

```text
PARTIAL JUZ + semua required segment partial selesai
=> nilai Kelancaran sah
=> Tajwid BELUM WAJIB
=> Tajwid kosong = normal
=> blank pada bagian Tajwid
=> bukan 0
=> bukan missing
```

Audit terakhir menghasilkan referensi operasional:

- 31 santri
- 52 full juz benar-benar missing Tajwid
- 12 partial juz dikeluarkan dari kewajiban Tajwid

Angka operasional ini harus selalu diverifikasi ulang terhadap DB sebelum tindakan manual, tetapi rule bisnisnya final.

---

# 11. INCOMPLETE EXAM

Jika required scope > 0:

## Provisional

Jika completed = 0 selama ujian masih berjalan:

```text
nilaiUjianKeseluruhan = null
status provisional
boleh masuk belumAdaHasil
```

## Final

Jika required scope > 0 dan completed = 0:

```text
status = TIDAK_SELESAI
nilaiUjianKeseluruhan = 0
tetap ikut ranking final
```

Jika sebagian required juz selesai:

- juz selesai → nilai normal
- required juz yang belum selesai → 0
- denominator tetap seluruh required juz

Contoh required 10 juz, selesai 5:

```text
overall =
(sum 5 juz selesai + 5*0) / 10
```

Santri incomplete tetap ikut ranking final secara natural.

---

# 12. FINALIZATION / isFinal

Jangan membuat mutation otomatis DB hanya karena waktu lewat.

Tetapi wajib memastikan caller/UI resmi bisa benar-benar meminta hasil final.

Audit/implementasi harus memastikan:

- Raport Hifzh = selalu output final
- Ranking punya jalur final yang benar (`final=true` atau mekanisme existing)
- Admin Rekap dapat membedakan provisional/final
- completed0 tidak selamanya berada di `belumAdaHasil`

Jika final lifecycle belum wired penuh, jangan membuat lifecycle baru tanpa review; laporkan terlebih dahulu.

---

# 13. SNAPSHOT SEMESTER GASAL

Snapshot Semester Gasal harus:

- hanya cohort Banin relevan
- tidak memasukkan Banat / TN
- idempotent
- preserve history
- tidak overwrite existing snapshot diam-diam

Conflict behavior:

```sql
ON CONFLICT (santri_id, kalender_id) DO NOTHING
```

Cohort/snapshot count **harus dihitung ulang dari DB terbaru** sebelum migration final.

Jangan mengandalkan count lama jika status santri berubah.

---

# 14. KASUS KHUSUS

## Salim Al Kautsar

Fakta bisnis:

- hafalannya sangat sedikit, sekitar An-Nas sampai An-Nasr
- belum mencapai satu required segment penuh pada baseline
- required official scope = 0
- ada nilai formatif Kelancaran/Tajwid yang pernah diinput guru

Treatment:

- raw history dipertahankan
- jangan delete
- jangan dianggap gagal ujian
- jangan masukkan nilai outside official scope ke denominator resmi

## Luqman Kelas 10

Owner menyatakan data santri ini salah dan akan dikeluarkan/dibersihkan.

Treatment:

- jangan jadikan contoh business rule
- jangan tambahkan ke snapshot selama data salah belum dibereskan
- pre-flight harus query DB terbaru sebelum generate migration final

## Yahya

Untuk Semester Gasal:

- required scope tetap baseline 1 Agustus
- setoran baru selama Agustus tidak memperbesar required scope
- required Juz 26/25 yang tidak selesai → 0 sesuai Phase C
- Juz yang selesai di dalam scope → nilai normal
- data setelah baseline di luar required scope tidak mengubah denominator Gasal

Jangan membuat schema exact-segment snapshot baru pada Phase C ini.

Isu true non-contiguous official hafalan disimpan sebagai backlog jika suatu hari terbukti memang menjadi business process permanen.

---

# 15. RANKING DAN RAPORT TIDAK BOLEH BERBAGI CAP

Dilarang membuat helper seperti:

```text
effectiveExamScore = min(raw, reportCap)
```

lalu dipakai oleh ranking, raport, dan raw summary.

Target:

```text
raw exam helper
=> tidak mengenal cap Raport

ranking helper
=> memakai raw exam result

report helper
=> melakukan cap 9.0 khusus Raport
```

---

# 16. SOURCE OF TRUTH MINIMAL

## A. Raw Exam Scoring
Tugas:
- validasi input guru
- rounding
- save raw score
- max 10
- minimum Kelancaran existing tetap

## B. Required Exam Scope
Tugas:
- baseline
- snapshot
- partial segment exclusion
- required segment per santri

## C. Final Exam Completion
Tugas:
- selesai/belum selesai
- incomplete penalty 0
- provisional vs final

## D. Ranking Calculation
Tugas:
- raw score
- 80/20
- tie-break
- eligibility

## E. Raport Scoring
Tugas:
- cap per component ke 9
- report average
- display 0–90
- incomplete 0 merah

## F. Tajwid Requirement
Tugas:
- full juz required
- partial juz not required
- missing Tajwid determination

Jangan membuat refactor besar jika pemisahan minimal sudah cukup.

---

# 17. FILE/AREA YANG WAJIB DIAUDIT SAAT IMPLEMENTASI

Minimal:

```text
app/lib/adminNilaiUjian.ts
app/lib/ranking.ts
app/lib/raportHifzhExcel.ts
app/api/nilai-ujian/route.ts
app/api/admin/nilai-ujian/route.ts
app/api/admin/nilai-ujian-excel/route.ts
app/api/ranking-ujian-hafalan/route.ts
app/api/admin/kunci-cakupan-ujian/route.ts
app/components/InputNilaiUjianSegment.tsx
app/components/AdminRekapNilaiUjian.tsx
app/admin/components/KalenderSection.tsx
```

Jangan mengasumsikan hanya file ini; cari penggunaan helper terkait sebelum mengubah signature.

---

# 18. ACCEPTANCE TEST WAJIB

## Test 1 — Raw 10
Teacher input 10:
- raw result = 10
- DB/save path tidak menjadi 9.5

## Test 2 — Raw 9.8
Teacher input 9.8:
- raw = 9.8

## Test 3 — Ranking membedakan 10 vs 9.5
Semua komponen lain sama:
- raw 10 harus ranking score lebih tinggi daripada raw 9.5

## Test 4 — Raport cap
- 10 → 90
- 9.8 → 90
- 9.5 → 90
- 9.2 → 90
- 9.0 → 90
- 8.7 → 87

## Test 5 — Cap before average
raw components `[10, 8]`

Expected:

```text
raw/ranking average = 9.0
Raport average = 8.5
Raport display = 85
```

## Test 6 — Incomplete required
- Raport = 0 merah
- tidak menjadi 50
- tetap masuk denominator

## Test 7 — Partial segment
Baseline berhenti di tengah segmen:
- segment tidak required

## Test 8 — Partial juz complete
Required segmen 1,2,3; completed 1,2,3:
- juz selesai
- average 3 segmen
- bukan 0

## Test 9 — Partial juz incomplete
Required 1,2,3; completed 1,2:
- final = 0

## Test 10 — Tajwid partial
Partial juz + Tajwid kosong:
- tidak missing
- blank
- bukan 0

## Test 11 — Tajwid full
Full juz + Tajwid kosong:
- missing
- final treatment sesuai policy

## Test 12 — Ranking formula
Pastikan tetap 80/20.

## Test 13 — Tie-break
Pastikan 5 tingkat tie-break existing tidak berubah.

## Test 14 — Completed0 final
Required >0, completed0:
- final score 0
- eligible ranking

## Test 15 — Salim
Scope0:
- tidak gagal
- raw formative history tidak masuk denominator resmi

## Test 16 — Yahya
Setoran setelah cutoff:
- tidak memperbesar required scope Gasal

## Test 17 — Future no snapshot
- `CAKUPAN_BELUM_DIKUNCI`
- tidak fallback live

## Test 18 — Gasal transition
- reconstruction cutoff tetap berjalan jika snapshot belum ada

---

# 19. GIT / MIGRATION SAFETY

Sebelum final:

- jangan `git add -A`
- jangan stage unrelated audit docs
- jangan stage `standard1-quran.pdf`
- jangan menyentuh tracked scripts yang bermasalah filesystem
- jangan commit file deletion yang tidak disengaja
- jangan apply migration sebelum final review
- jangan mass update historical nilai

Migration snapshot production hanya dijalankan setelah:

1. cohort DB terbaru diverifikasi
2. status Luqman sudah jelas
3. snapshot SQL final diverifikasi
4. test/build lolos
5. final review disetujui

---

# 20. VERIFICATION WAJIB

Setelah implementasi:

```text
relevant regression tests
npx tsc --noEmit
ESLint file terkait
npm run build
git diff
git status --short
```

Semua perubahan harus dilaporkan sebelum commit.

---

# 21. IMPLEMENTATION ORDER

Urutan kerja yang aman:

1. Pre-flight DB terbaru
2. Audit caller/helper yang terdampak
3. Lepaskan cap 9.5 dari raw input/write-path
4. Pastikan ranking memakai raw
5. Pisahkan report component cap 9.0
6. Pastikan report average dihitung dari capped components
7. Pastikan floor 50 tidak mengubah nilai normal
8. Implement full-juz-only Tajwid requirement
9. Verifikasi final/provisional caller
10. Regenerate/review historical snapshot
11. Run all tests
12. TypeScript
13. ESLint
14. Build
15. Git diff/status
16. STOP untuk review
17. Setelah approval baru commit/apply migration/push

---

# 22. HAL YANG TIDAK BOLEH DIUBAH PADA PHASE C

Jangan mengubah tanpa keputusan baru:

- formula ranking 80/20
- tie-break ranking
- formula Nilai Hafalan
- Tajwid tidak masuk ranking
- historical raw data
- scope Banin-only Semester Gasal saat ini
- baseline 1 Agustus 2026
- incomplete penalty 0
- partial segment exclusion
- partial juz Kelancaran tetap sah
- future snapshot locking requirement
- Phase D post-exam baseline adjustment belum dikerjakan

---

# 23. BACKLOG SETELAH PHASE C

Bukan bagian implementasi Phase C sekarang:

1. Phase D — penurunan baseline hafalan setelah ujian incomplete
2. teacher notification terkait baseline turun
3. true non-contiguous official hafalan jika business process memang mengizinkan permanen
4. suspicious/high-grade integrity monitoring
5. lifecycle finalization formal jika dibutuhkan
6. Guru Mapel future
7. legacy assignment retirement
8. minor timezone backlog
9. filesystem recovery folder `scripts/`

Jangan menarik backlog ini masuk ke Phase C kecuali diminta Owner.

---

# 24. DEFINITION OF DONE PHASE C

Phase C dianggap selesai jika:

- raw nilai guru dapat mencapai 10
- ranking memakai raw score, tidak ter-cap Raport
- Raport max 90
- cap Raport dilakukan per component sebelum average
- nilai di bawah 9 tetap proporsional
- incomplete tetap 0 merah
- partial segment tidak required
- partial juz Kelancaran tetap sah
- Tajwid hanya wajib full juz
- final ranking eligibility benar
- future no snapshot diblokir
- Gasal transition tetap jalan
- cohort snapshot hanya Banin relevan
- snapshot SQL idempotent
- tests, TS, lint, build lolos
- tidak ada unrelated deletion/staging
- belum ada migration production sebelum final approval

---

# 25. INSTRUKSI UNTUK ANTIGRAVITY

Sebelum menyentuh kode terkait Phase C / Raport / Ranking:

1. Baca dokumen ini dari awal sampai akhir.
2. Anggap dokumen ini sebagai **source of truth terbaru** untuk Phase C.
3. Jika menemukan kode existing yang bertentangan, jangan mempertahankan behavior lama hanya karena sudah ada.
4. Jika menemukan keputusan yang tampak ambigu, STOP dan laporkan sebelum membuat business rule baru.
5. Jangan menambah rule baru di luar dokumen ini.
6. Jangan refactor besar jika perubahan minimal cukup.
7. Jangan commit atau apply migration sampai diminta eksplisit.
