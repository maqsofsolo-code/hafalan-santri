import { NextResponse } from 'next/server'
import { kirimPushKeUser } from '../../../lib/sendPush'

export async function POST(request: Request) {
  try {
    const { userId } = await request.json()
    if (!userId) {
      return NextResponse.json({ message: 'userId wajib diisi' }, { status: 400 })
    }

    const hasil = await kirimPushKeUser(userId, {
      title: '🔔 Test Notifikasi Daarus Salaf',
      body: 'Alhamdulillah! Notifikasi berhasil aktif. Anda akan menerima laporan hafalan ananda di sini.',
      url: '/wali',
    })

    return NextResponse.json({
      message: `Test selesai. Terkirim: ${hasil.terkirim}, Gagal: ${hasil.gagal}`,
    })
  } catch (err: any) {
    return NextResponse.json({ message: 'Error: ' + err.message }, { status: 500 })
  }
}