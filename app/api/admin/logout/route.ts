import { NextResponse } from 'next/server'
import { COOKIE_ADMIN } from '@/lib/admin'

export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete(COOKIE_ADMIN)
  return res
}
