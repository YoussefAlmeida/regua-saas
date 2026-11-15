import { redirect } from 'next/navigation'

/* A área do barbeiro começa no dia de hoje */
export default function BarbeiroIndex() {
  redirect('/barbeiro/hoje')
}
