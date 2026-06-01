import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function kirimWA(nomor: string, pesan: string) {
  const response = await fetch('https://api.fonnte.com/send', {
    method: 'POST',
    headers: {
      'Authorization': process.env.FONNTE_TOKEN!,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      target: nomor,
      message: pesan,
      countryCode: '62'
    })
  })
  return response.json()
}

export async function POST(request: Request) {
  const { jenis_jadwal } = await request.json()
  // jenis_jadwal: 'baru' atau 'lama'

  const today = new Date().toISOString().split('T')[0]
  const hari = new Date().toLocaleDateString('id-ID', { weekday: 'long' })
  const hariAktif = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Sabtu']

  // Cek apakah hari ini hari aktif
  if (!hariAktif.includes(hari)) {
    return NextResponse.json({ message: 'Bukan hari aktif' })
  }

  // Ambil semua santri beserta data wali
  const { data: semuaSantri } = await supabaseAdmin
    .from('santri')
    .select('*, wali:wali_id(nama, no_wa)')

  if (!semuaSantri || semuaSantri.length === 0) {
    return NextResponse.json({ message: 'Tidak ada santri' })
  }

  // Ambil santri yang sudah setor hari ini sesuai jenis
  const { data: setoranHariIni } = await supabaseAdmin
    .from('setoran')
    .select('santri_id, status, surah, ayat_mulai, ayat_selesai')
    .eq('tanggal', today)
    .eq('jenis', jenis_jadwal)

  const sudahSetor = (setoranHariIni || []).map(s => s.santri_id)

  let berhasilKirim = 0
  let gagalKirim = 0

  for (const santri of semuaSantri) {
    const noWali = santri.wali?.no_wa
    if (!noWali) continue

    const setoranSantri = (setoranHariIni || []).find(
      s => s.santri_id === santri.id
    )

    let pesan = ''

    if (!sudahSetor.includes(santri.id)) {
      // Santri belum setor
      pesan = `Assalamu'alaikum Wr. Wb.\n\nYth. Wali dari *${santri.nama}*\n\nKami informasikan bahwa hari ini *${santri.nama}* belum menyetorkan hafalan *${jenis_jadwal === 'baru' ? 'baru' : 'lama (murojaah)'}*.\n\nMohon semangat dan dukungannya agar putra/putri Bapak/Ibu tetap istiqomah dalam menghafal Al-Qur'an.\n\nJazakumullahu khairan.\n_Sistem Hafalan Santri_`
    } else if (setoranSantri?.status === 'rosib') {
      // Santri setor tapi rosib
      pesan = `Assalamu'alaikum Wr. Wb.\n\nYth. Wali dari *${santri.nama}*\n\nKami informasikan bahwa hari ini *${santri.nama}* telah menyetorkan hafalan *${setoranSantri.surah}* ayat *${setoranSantri.ayat_mulai}-${setoranSantri.ayat_selesai}*, namun hafalannya *perlu diulang kembali (rosib)*.\n\nMohon bantu muroja'ah di rumah agar hafalan semakin kuat.\n\nJazakumullahu khairan.\n_Sistem Hafalan Santri_`
    }

    if (pesan) {
      const hasil = await kirimWA(noWali, pesan)
      if (hasil.status) berhasilKirim++
      else gagalKirim++

      // Simpan log notifikasi
      await supabaseAdmin.from('notifikasi').insert({
        santri_id: santri.id,
        wali_id: santri.wali_id,
        jenis: !sudahSetor.includes(santri.id) ? 'tidak_setor' : 'rosib',
        pesan,
        status_kirim: hasil.status ? 'terkirim' : 'gagal',
        tanggal: today
      })
    }
  }

  return NextResponse.json({
    message: `Notifikasi selesai. Terkirim: ${berhasilKirim}, Gagal: ${gagalKirim}`
  })
}