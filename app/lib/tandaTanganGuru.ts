// Konstanta & helper kecil untuk fitur Tanda Tangan Digital Wali Kelas (Tahap 9P), dipakai bersama
// oleh app/api/admin/guru-tanda-tangan/route.ts (upload/hapus/preview, admin-only) dan
// app/api/admin/nilai-ujian-excel/route.ts (embed ke Raport Hifzh). Bukan abstraksi baru -- hanya
// menghindari duplikasi nama bucket & daftar tipe file yang diizinkan di dua tempat.

export const BUCKET_TANDA_TANGAN_GURU = 'tanda-tangan-guru'

// Dibatasi PNG/JPEG saja (bukan mengikuti daftar "prefer PNG/JPG/WebP" instruksi apa adanya) --
// satu-satunya konsumen yang meng-EMBED gambar ini (ExcelJS, lihat raportHifzhExcel.ts) hanya
// mendukung extension 'jpeg' | 'png' | 'gif' (dikonfirmasi dari node_modules/exceljs/index.d.ts),
// jadi menerima WebP di sini hanya akan menghasilkan gambar yang gagal di-embed saat generate
// raport -- lebih aman ditolak saat upload daripada gagal diam-diam saat raport dibuat.
export const TIPE_TANDA_TANGAN_DIIZINKAN: Record<string, 'png' | 'jpeg'> = {
  'image/png': 'png',
  'image/jpeg': 'jpeg',
}

// 1MB cukup longgar untuk gambar tanda tangan (biasanya beberapa puluh KB) tanpa perlu image
// processing/crop apa pun, sesuai instruksi "Jangan overengineering crop/editor".
export const UKURAN_TANDA_TANGAN_MAKS_BYTES = 1024 * 1024

export function pathTandaTanganGuru(guruId: string, ekstensi: 'png' | 'jpeg') {
  return `${guruId}/tanda-tangan.${ekstensi}`
}
