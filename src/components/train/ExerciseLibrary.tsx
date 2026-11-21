'use client'

import Link from '@/components/ui/Link'
import { useLocale, useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { EQUIPMENT_KINDS, EXERCISES, MUSCLES, type Equipment, type Muscle } from '@/data/exercises'

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

export function ExerciseLibrary() {
  const t = useTranslations('train')
  const m = useTranslations('muscles')
  const q2 = useTranslations('equipment')
  const locale = useLocale() as 'cs' | 'en'
  const [q, setQ] = useState('')
  const [muscle, setMuscle] = useState<Muscle | ''>('')
  const [equip, setEquip] = useState<Equipment | ''>('')
  const list = useMemo(() => {
    const nq = norm(q)
    return EXERCISES.filter(
      (e) =>
        (!muscle || e.primary.includes(muscle) || e.secondary.includes(muscle)) &&
        (!equip || e.equipment.includes(equip)) &&
        (!nq || norm(e.name.cs).includes(nq) || norm(e.name.en).includes(nq)),
    ).sort((a, b) => a.name[locale].localeCompare(b.name[locale], locale))
  }, [q, muscle, equip, locale])

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <label className="field flex items-center gap-2 !py-2">
          <Search size={16} className="text-subtle" aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('search')}
            className="flex-1 bg-transparent outline-none"
          />
        </label>
        <select
          aria-label={t('primary')}
          className="field"
          value={muscle}
          onChange={(e) => setMuscle(e.target.value as Muscle | '')}
        >
          <option value="">{t('allMuscles')}</option>
          {MUSCLES.map((x) => (
            <option key={x} value={x}>
              {m(x)}
            </option>
          ))}
        </select>
        <select
          aria-label={t('equipment')}
          className="field"
          value={equip}
          onChange={(e) => setEquip(e.target.value as Equipment | '')}
        >
          <option value="">{t('equipment')}</option>
          {EQUIPMENT_KINDS.map((x) => (
            <option key={x} value={x}>
              {q2(x)}
            </option>
          ))}
        </select>
      </div>
      <p className="text-subtle mt-3 font-mono text-[12.5px]">
        {list.length} {t('exercises')}
      </p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {list.map((e) => (
          <li key={e.slug}>
            <Link
              href={`/train/exercises/${e.slug}`}
              className="card hover:border-cyan/40 flex h-full flex-col p-3.5 transition"
            >
              <span className="text-[15px] font-medium">{e.name[locale]}</span>
              <span className="text-subtle mt-0.5 text-[12.5px]">
                {e.primary.map((p) => m(p)).join(', ')} · {e.equipment.map((x) => q2(x)).join(', ')}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
