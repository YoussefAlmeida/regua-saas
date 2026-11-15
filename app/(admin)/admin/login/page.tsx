import { redirect } from 'next/navigation'
import { adminLogado } from '@/lib/admin'
import LoginAdmin from './login-admin'

export default async function AdminLoginPage() {
  if (await adminLogado()) redirect('/admin')
  return <LoginAdmin />
}
