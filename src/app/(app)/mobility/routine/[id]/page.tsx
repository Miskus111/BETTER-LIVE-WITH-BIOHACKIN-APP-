import { getLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { ROUTINES } from '@/data/mobility'
import { RoutinePlayer } from '@/components/mobility/RoutinePlayer'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const routine = ROUTINES.find((r) => r.id === id)
  return routine ? { title: routine.name[(await getLocale()) as 'cs' | 'en'] } : {}
}

export default async function RoutinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const routine = ROUTINES.find((r) => r.id === id)
  if (!routine) notFound()
  return <RoutinePlayer routine={routine} />
}
