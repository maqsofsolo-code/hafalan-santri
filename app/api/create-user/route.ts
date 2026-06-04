import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  const body = await request.json()
  const { email, password, nama, role, no_wa, userId, isUpdate, isDelete } = body

  // ===== HAPUS USER =====
  if (isDelete && userId) {
    // Hapus dari profiles dulu
    await supabaseAdmin.from('profiles').delete().eq('id', userId)
    // Hapus dari auth
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  }

  // ===== UPDATE USER =====
  if (isUpdate && userId) {
    const updateData: any = {}
    if (email) updateData.email = email
    if (password) updateData.password = password
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, updateData)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  }

  // ===== BUAT USER BARU =====
  if (!email || !password) {
    return NextResponse.json({ error: 'Email dan password wajib diisi' }, { status: 400 })
  }
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email, password, email_confirm: true
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await supabaseAdmin.from('profiles').insert({
    id: data.user.id, nama, role, no_wa
  })

  return NextResponse.json({ success: true, user: data.user })
}