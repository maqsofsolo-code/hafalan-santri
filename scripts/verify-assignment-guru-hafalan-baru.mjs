// Verifikasi deterministik: app/lib/wingAkses.ts fungsi validasiKandidatGuru/
// validasiDuaSlotGuru (Tahap 9L) -- validasi kandidat Guru Hafalan (role +
// wing) untuk CREATE santri, dan deteksi duplikat slot Guru 1/Guru 2.
// Bukan unit test framework -- script verifikasi berdiri sendiri:
//   node scripts/verify-assignment-guru-hafalan-baru.mjs
// Exit code 0 jika semua cocok, 1 jika ada satu saja yang berbeda.

import { validasiKandidatGuru, validasiDuaSlotGuru } from '../app/lib/wingAkses.ts'

let gagal = 0

function cek(label, aktual, diharapkan) {
  const aktualStr = JSON.stringify(aktual)
  const diharapkanStr = JSON.stringify(diharapkan)
  const cocok = aktualStr === diharapkanStr
  if (!cocok) gagal++
  console.log(`${cocok ? 'PASS' : 'GAGAL'} — ${label}${cocok ? '' : `\n       aktual:     ${aktualStr}\n       diharapkan: ${diharapkanStr}`}`)
}

console.log('=== validasiKandidatGuru ===\n')

cek('Guru tidak ditemukan',
  validasiKandidatGuru('G1', undefined, 'banin'),
  { guruId: 'G1', status: 'GURU_TIDAK_DITEMUKAN' })

cek('Profile ditemukan tapi bukan role guru',
  validasiKandidatGuru('G1', { id: 'G1', role: 'wali', jenis_kelas: 'banin' }, 'banin'),
  { guruId: 'G1', status: 'BUKAN_ROLE_GURU' })

cek('Wing banin -> santri banin: VALID',
  validasiKandidatGuru('G1', { id: 'G1', role: 'guru', jenis_kelas: 'banin' }, 'banin'),
  { guruId: 'G1', status: 'VALID' })

cek('Wing banin -> santri banat: LINTAS_WING',
  validasiKandidatGuru('G1', { id: 'G1', role: 'guru', jenis_kelas: 'banin' }, 'banat'),
  { guruId: 'G1', status: 'LINTAS_WING' })

cek('Wing banat -> santri tn_a: VALID (mapping wingAkses)',
  validasiKandidatGuru('G1', { id: 'G1', role: 'guru', jenis_kelas: 'banat' }, 'tn_a'),
  { guruId: 'G1', status: 'VALID' })

cek('Wing tn -> santri tn_b: VALID',
  validasiKandidatGuru('G1', { id: 'G1', role: 'guru', jenis_kelas: 'tn' }, 'tn_b'),
  { guruId: 'G1', status: 'VALID' })

cek('Wing tn -> santri banin: LINTAS_WING',
  validasiKandidatGuru('G1', { id: 'G1', role: 'guru', jenis_kelas: 'tn' }, 'banin'),
  { guruId: 'G1', status: 'LINTAS_WING' })

cek('Guru belum terklasifikasi (jenis_kelas null): LINTAS_WING',
  validasiKandidatGuru('G1', { id: 'G1', role: 'guru', jenis_kelas: null }, 'banin'),
  { guruId: 'G1', status: 'LINTAS_WING' })

console.log('\n=== validasiDuaSlotGuru ===\n')

const profilMap = new Map([
  ['G1', { id: 'G1', role: 'guru', jenis_kelas: 'banin' }],
  ['G2', { id: 'G2', role: 'guru', jenis_kelas: 'banin' }],
  ['G3', { id: 'G3', role: 'guru', jenis_kelas: 'banat' }],
])

cek('Guru 1 & Guru 2 sama persis -> duplikat, kedua slot null',
  validasiDuaSlotGuru('G1', 'G1', profilMap, 'banin'),
  { duplikat: true, slot1: null, slot2: null })

cek('Guru 1 & Guru 2 berbeda, keduanya valid',
  validasiDuaSlotGuru('G1', 'G2', profilMap, 'banin'),
  { duplikat: false, slot1: { guruId: 'G1', status: 'VALID' }, slot2: { guruId: 'G2', status: 'VALID' } })

cek('Guru 2 lintas wing',
  validasiDuaSlotGuru('G1', 'G3', profilMap, 'banin'),
  { duplikat: false, slot1: { guruId: 'G1', status: 'VALID' }, slot2: { guruId: 'G3', status: 'LINTAS_WING' } })

cek('Hanya Guru 1 diisi -> slot2 null (bukan error)',
  validasiDuaSlotGuru('G1', '', profilMap, 'banin'),
  { duplikat: false, slot1: { guruId: 'G1', status: 'VALID' }, slot2: null })

cek('Keduanya kosong -> tidak ada slot, tidak duplikat',
  validasiDuaSlotGuru('', '', profilMap, 'banin'),
  { duplikat: false, slot1: null, slot2: null })

cek('Whitespace-only dianggap kosong',
  validasiDuaSlotGuru('  ', undefined, profilMap, 'banin'),
  { duplikat: false, slot1: null, slot2: null })

console.log(`\n${gagal === 0 ? 'SEMUA COCOK' : `${gagal} GAGAL`} (${gagal} kegagalan)`)
process.exit(gagal === 0 ? 0 : 1)
