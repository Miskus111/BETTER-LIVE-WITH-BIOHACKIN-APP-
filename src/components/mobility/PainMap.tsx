'use client'

import Link from '@/components/ui/Link'
import { useTranslations } from 'next-intl'
import { BODY_PATH } from '@/components/anatomy/geometry'
import type { Region } from '@/lib/pain/red-flags'

/** Tap points on the front silhouette (body coordinates 400 × 920). */
const POINTS: { region: Region; x: number; y: number }[] = [
  { region: 'neck', x: 200, y: 166 },
  { region: 'shoulder', x: 106, y: 212 },
  { region: 'upper_back', x: 200, y: 240 },
  { region: 'lower_back', x: 200, y: 392 },
  { region: 'hip', x: 148, y: 466 },
  { region: 'knee', x: 170, y: 668 },
  { region: 'ankle', x: 174, y: 878 },
  { region: 'wrist_elbow', x: 96, y: 366 },
]

export function PainMap({ latest }: { latest: Partial<Record<Region, number>> }) {
  const t = useTranslations('mob')
  return (
    <div className="grid items-center gap-6 md:grid-cols-[280px_1fr]">
      <svg viewBox="0 0 400 920" className="mx-auto h-[460px] w-auto" role="group" aria-label={t('pain')}>
        <path d={BODY_PATH} fill="rgba(94,231,255,0.06)" stroke="rgba(143,233,255,0.45)" strokeWidth={1.5} />
        {POINTS.map((p) => {
          const score = latest[p.region]
          const hot = score !== undefined && score >= 5
          return (
            <Link
              key={p.region}
              href={`/mobility/pain/${p.region}`}
              aria-label={
                score === undefined
                  ? t(`regions.${p.region}`)
                  : t('regionScore', { region: t(`regions.${p.region}`), score })
              }
              data-testid={`pain-${p.region}`}
            >
              <circle
                cx={p.x}
                cy={p.y}
                r={26}
                fill={hot ? 'rgba(255,125,139,0.25)' : 'rgba(94,231,255,0.12)'}
                className="transition hover:opacity-80"
              />
              <circle cx={p.x} cy={p.y} r={8} fill={hot ? '#ff7d8b' : '#5ee7ff'} />
              {score !== undefined && (
                <text
                  x={p.x + 30}
                  y={p.y + 6}
                  fontSize={22}
                  fill="#eef3f7"
                  fontFamily="var(--font-geist-mono)"
                >
                  {score}
                </text>
              )}
            </Link>
          )
        })}
      </svg>
      <div>
        <p className="text-muted text-[15px]">{t('painIntro')}</p>
        <ul className="mt-4 grid grid-cols-2 gap-2">
          {POINTS.map((p) => (
            <li key={p.region}>
              <Link
                href={`/mobility/pain/${p.region}`}
                className="card hover:border-cyan/40 flex items-center justify-between p-3 text-[14.5px]"
              >
                {t(`regions.${p.region}`)}
                {latest[p.region] !== undefined && (
                  <span className="text-subtle font-mono text-[13px]">{latest[p.region]}/10</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
