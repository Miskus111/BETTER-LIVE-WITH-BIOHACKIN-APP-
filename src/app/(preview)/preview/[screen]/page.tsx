import { LooksHabits } from '@/components/looks/LooksHabits'
import { ProgressCharts } from '@/components/train/ProgressCharts'
import { WeightTracker } from '@/components/body/WeightTracker'
import { PhotoJournal } from '@/components/body/PhotoJournal'
import { Paywall } from '@/components/app/Paywall'
import { exerciseProgress, weeklyVolume, type ProgressSet } from '@/lib/train/progress'
import { PILLARS } from '@/data/looksmaxing'
import { EVIDENCE } from '@/data/sources'
import { CoachChat } from '@/components/coach/CoachChat'
import { LabsClient } from '@/components/labs/LabsClient'
import { notFound } from 'next/navigation'
import { TrainHome } from '@/components/train/TrainHome'
import { TEMPLATES } from '@/data/exercises/templates'
import { rankTemplates } from '@/lib/train/template-fit'
import { WorkoutLogger } from '@/components/train/WorkoutLogger'
import { ExerciseLibrary } from '@/components/train/ExerciseLibrary'
import { PainFlow } from '@/components/mobility/PainFlow'
import { PainMap } from '@/components/mobility/PainMap'
import { RoutinePlayer } from '@/components/mobility/RoutinePlayer'
import { StackTracker } from '@/components/supplements/StackTracker'
import { FoodDiary } from '@/components/eat/FoodDiary'
import { TargetsCard } from '@/components/eat/TargetsCard'
import { SportForm } from '@/components/train/SportForm'
import { ROUTINES } from '@/data/mobility'
import { targetsFor } from '@/lib/eat/targets'
import { dayDaysAgo } from '@/lib/dates'

export const dynamic = 'force-dynamic'

export default async function Preview({ params }: { params: Promise<{ screen: string }> }) {
  if (process.env.ENABLE_PREVIEW !== '1') notFound()
  const { screen } = await params
  switch (screen) {
    case 'train':
      return (
        <TrainHome
          finished={false}
          base="/preview"
          // sample profile: a runner training at home without equipment
          fit={rankTemplates(TEMPLATES, { equipment: ['none'], sports: ['running'] })}
        />
      )
    case 'session':
      return <WorkoutLogger home="/preview/train" />
    case 'library':
      return <ExerciseLibrary />
    case 'sport':
      return <SportForm />
    case 'pain-map':
      return <PainMap latest={{ lower_back: 6, knee: 3 }} />
    case 'pain-lower-back':
      return <PainFlow region="lower_back" />
    case 'routine':
      return <RoutinePlayer routine={ROUTINES[0]} />
    case 'stack':
      return (
        <StackTracker
          medications="Warfarin"
          rows={[
            {
              id: 'a',
              slug: 'omega-3',
              dose_amount: 1000,
              timing: 'S večeří',
              reminder_time: '19:00:00',
              takenToday: true,
            },
            {
              id: 'b',
              slug: 'vitamin-d3',
              dose_amount: 125,
              timing: 'Ráno',
              reminder_time: null,
              takenToday: false,
            },
          ]}
        />
      )
    case 'progress': {
      // ten weeks of a slowly progressing squat, three sessions a week
      const now = new Date()
      const sets: ProgressSet[] = []
      for (let w = 9; w >= 0; w--)
        for (const d of [0, 2, 4]) {
          const date = new Date(now.getTime() - (w * 7 + d) * 864e5).toISOString()
          for (let s = 0; s < 3; s++)
            sets.push({
              workoutId: `${w}-${d}`,
              exercise: 'back-squat',
              date,
              reps: 5,
              weightKg: 80 + (9 - w) * 2.5,
              type: 'normal',
            })
        }
      return (
        <ProgressCharts
          weeks={weeklyVolume(sets, 12, now)}
          exercises={[
            {
              slug: 'back-squat',
              name: 'Dřep s velkou činkou',
              points: exerciseProgress(sets).get('back-squat')!,
            },
          ]}
        />
      )
    }
    case 'weight': {
      const today = dayDaysAgo(0)
      const rows = Array.from({ length: 40 }, (_, i) => ({
        id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
        measured_at: dayDaysAgo(39 - i),
        weight_kg: Math.round((84 - i * 0.04 + ((i * 7) % 5) * 0.2) * 10) / 10,
        waist_cm: i % 7 === 0 ? 89 - i * 0.05 : null,
        hips_cm: null,
        chest_cm: null,
        arm_cm: null,
        thigh_cm: null,
      }))
      return <WeightTracker rows={rows} today={today} goal="lose" />
    }
    case 'photos': {
      const today = new Date().toISOString().slice(0, 10)
      const photos = [
        {
          id: 'a',
          taken_at: '2026-09-14',
          pose: 'front' as const,
          notes: null,
          url: '/pwa-icon/512',
          weightKg: 83.8,
        },
        {
          id: 'b',
          taken_at: '2026-10-15',
          pose: 'side' as const,
          notes: null,
          url: '/pwa-icon/512',
          weightKg: 82.9,
        },
        {
          id: 'c',
          taken_at: '2026-11-16',
          pose: 'front' as const,
          notes: 'ráno',
          url: '/pwa-icon/512',
          weightKg: 81.8,
        },
      ]
      return <PhotoJournal photos={photos} userId="00000000-0000-4000-8000-000000000000" today={today} />
    }
    case 'paywall':
      return <Paywall feature="photos" />
    case 'looks':
      return (
        <LooksHabits
          habits={PILLARS.map((p) => ({
            id: p.id,
            title: p.title,
            howTo: p.howTo[0] ?? p.lead,
            level: EVIDENCE[p.level].label,
          }))}
        />
      )
    case 'coach':
      return (
        <CoachChat
          conversations={[]}
          conversationId={null}
          initial={[]}
          aiEnabled
          endpoint="/api/preview/coach"
        />
      )
    case 'labs':
      return (
        <LabsClient
          aiEnabled={false}
          reports={[{ id: 'r1', kind: 'blood', taken_on: '2026-10-02', lab_name: 'Synlab' }]}
          comps={[
            {
              measured_on: '2026-10-05',
              weight_kg: 82.4,
              skeletal_muscle_kg: 37.1,
              body_fat_pct: 17.8,
              visceral_fat_level: 6,
            },
          ]}
          values={[
            {
              marker: 'vitd',
              value: 38,
              unit: 'nmol/L',
              flag: 'low',
              taken_on: '2026-03-01',
              ref_low: 75,
              ref_high: 250,
            },
            {
              marker: 'vitd',
              value: 71,
              unit: 'nmol/L',
              flag: 'low',
              taken_on: '2026-10-02',
              ref_low: 75,
              ref_high: 250,
            },
            {
              marker: 'ferritin',
              value: 84,
              unit: 'µg/L',
              flag: 'normal',
              taken_on: '2026-10-02',
              ref_low: 30,
              ref_high: 300,
            },
            {
              marker: 'glucose',
              value: 5.1,
              unit: 'mmol/L',
              flag: 'normal',
              taken_on: '2026-10-02',
              ref_low: 3.9,
              ref_high: 5.6,
            },
            {
              marker: 'ldl',
              value: 3.4,
              unit: 'mmol/L',
              flag: 'high',
              taken_on: '2026-10-02',
              ref_low: null,
              ref_high: 3.0,
            },
          ]}
        />
      )
    case 'eat': {
      const t = targetsFor({
        sex: 'male',
        weightKg: 82,
        heightCm: 181,
        age: 32,
        level: 'moderate',
        goal: 'muscle',
      })
      return (
        <div className="space-y-6">
          <TargetsCard
            result={{ status: 'ok', targets: t }}
            totals={{ kcal: 1450, protein: 96, fat: 52, carbs: 150, fiber: 18 }}
          />
          <FoodDiary
            day="2026-11-16"
            profile={{ diet: 'vegetarian', allergies: ['nuts'], dislikes: [] }}
            rows={[
              {
                id: '1',
                meal: 'breakfast',
                title: 'Ovesné vločky|oats',
                grams: 80,
                kcal: 311,
                protein_g: 13.5,
                fat_g: 5.5,
                carbs_g: 53,
                fiber_g: 8.5,
              },
              {
                id: '2',
                meal: 'breakfast',
                title: 'Řecký jogurt|greek-yogurt',
                grams: 200,
                kcal: 194,
                protein_g: 18,
                fat_g: 10,
                carbs_g: 8,
                fiber_g: 0,
              },
              {
                id: '3',
                meal: 'lunch',
                title: 'Losos obecný|salmon',
                grams: 180,
                kcal: 374,
                protein_g: 36.7,
                fat_g: 24.1,
                carbs_g: 0,
                fiber_g: 0,
              },
            ]}
          />
        </div>
      )
    }
    default:
      notFound()
  }
}
