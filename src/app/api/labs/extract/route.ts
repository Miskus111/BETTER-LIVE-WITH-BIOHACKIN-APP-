import { NextResponse } from 'next/server'
import { z } from 'zod/v4'
import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { getSession } from '@/lib/auth'
import { sniffLabFile } from '@/lib/labs/file-type'
import { gate, getPlan } from '@/lib/plan'
import { coachDailyLimit } from '@/lib/billing'
import { addTokens, reserveAiCall } from '@/lib/ai/usage'
import { AI_MODEL, fallbackParams, getAnthropic } from '@/lib/ai/client'
import { normalizeRow, type LabCandidate } from '@/lib/labs/markers'
import { parseLabText } from '@/lib/labs/parse-text'

export const runtime = 'nodejs'
export const maxDuration = 120

const MAX_BYTES = 10 * 1024 * 1024
const TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'] as const

const Extraction = z.object({
  kind: z.enum(['blood', 'inbody', 'other']),
  taken_on: z.string().nullable().describe('YYYY-MM-DD collection/measurement date, null if not printed'),
  lab_name: z.string().nullable(),
  values: z.array(
    z.object({
      name: z.string().describe('analyte name exactly as printed'),
      value: z.number(),
      unit: z.string().nullable(),
      ref_low: z.number().nullable(),
      ref_high: z.number().nullable(),
      ref_text: z.string().nullable(),
    }),
  ),
  inbody: z
    .object({
      weight_kg: z.number().nullable(),
      skeletal_muscle_kg: z.number().nullable(),
      body_fat_pct: z.number().nullable(),
      visceral_fat_level: z.number().nullable(),
    })
    .nullable(),
})

const PROMPT = `You transcribe medical lab reports and body-composition (InBody) printouts into JSON.
Copy only what is printed. Never infer, estimate or interpret values, and never add analytes that are not on the page.
Use a dot as decimal separator. If a value is printed as "<0.5" use 0.5 and put "<0.5" in ref_text.
For reference ranges like "3.9 - 5.6" fill ref_low/ref_high; for "< 5.0" fill only ref_high.
For InBody sheets fill the inbody object (weight, skeletal muscle mass, percent body fat, visceral fat level) and leave values empty unless other analytes are printed.
If the document is not a lab report or body-composition sheet, return kind "other" with no values.`

export type ExtractResponse = {
  source: 'ai' | 'text'
  kind: 'blood' | 'inbody' | 'other'
  taken_on: string | null
  lab_name: string | null
  rows: LabCandidate[]
  inbody: z.infer<typeof Extraction>['inbody']
  storage_path: string | null
}

export async function POST(req: Request) {
  const s = await getSession()
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!s.healthConsent) return NextResponse.json({ error: 'consent_required' }, { status: 403 })

  const form = await req.formData()
  const text = String(form.get('text') ?? '').slice(0, 20_000)
  const file = form.get('file')

  // Pasted text: deterministic parser, no AI needed.
  if (!(file instanceof File)) {
    if (!text.trim()) return NextResponse.json({ error: 'empty' }, { status: 400 })
    const body: ExtractResponse = {
      source: 'text',
      kind: 'blood',
      taken_on: null,
      lab_name: null,
      rows: parseLabText(text),
      inbody: null,
      storage_path: null,
    }
    return NextResponse.json(body)
  }

  if (!(await gate(s.supabase, s.user.id, 'labs_ai')).allowed)
    return NextResponse.json({ error: 'upgrade' }, { status: 402 })
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'too_large' }, { status: 413 })
  if (!(TYPES as readonly string[]).includes(file.type))
    return NextResponse.json({ error: 'unsupported_type' }, { status: 415 })

  const bytes = Buffer.from(await file.arrayBuffer())
  // the content decides, not the declared type: a renamed file must not cost an AI call or reach storage
  const type = sniffLabFile(bytes)
  if (!type) return NextResponse.json({ error: 'unsupported_type' }, { status: 415 })

  const ai = getAnthropic()
  if (!ai) return NextResponse.json({ error: 'ai_not_configured', storage_path: null }, { status: 503 })

  // shares the daily AI allowance with the coach (counted server-side in ai_usage)
  const reserved = await reserveAiCall(s.user.id, coachDailyLimit(await getPlan(s.supabase, s.user.id)))
  if (reserved === false) return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  // the allowance can't be counted without the service key; in production don't run unmetered calls
  if (reserved === null && process.env.VERCEL)
    return NextResponse.json({ error: 'ai_error' }, { status: 503 })

  const data = bytes.toString('base64')
  const doc: Anthropic.Beta.BetaContentBlockParam =
    type === 'application/pdf'
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } }
      : {
          type: 'image',
          source: {
            type: 'base64',
            media_type: type as 'image/png' | 'image/jpeg' | 'image/webp',
            data,
          },
        }

  try {
    const res = await ai.beta.messages.parse({
      ...fallbackParams(),
      model: AI_MODEL,
      max_tokens: 16000,
      output_config: { effort: 'low', format: zodOutputFormat(Extraction) },
      system: PROMPT,
      messages: [{ role: 'user', content: [doc, { type: 'text', text: 'Transcribe this document.' }] }],
    })
    await addTokens(s.user.id, res.usage.input_tokens, res.usage.output_tokens)
    if (res.stop_reason === 'refusal' || !res.parsed_output)
      return NextResponse.json({ error: 'extraction_failed' }, { status: 422 })
    const out = res.parsed_output

    // keep the original only once it was read successfully (private bucket, path prefixed with the
    // user id — storage RLS); failed or refused documents are never stored
    const ext = type === 'application/pdf' ? 'pdf' : type.split('/')[1]
    const storage_path = `${s.user.id}/${crypto.randomUUID()}.${ext}`
    const up =
      out.kind === 'other'
        ? { error: 'not a lab report' }
        : await s.supabase.storage.from('lab-reports').upload(storage_path, bytes, { contentType: type })
    const body: ExtractResponse = {
      source: 'ai',
      kind: out.kind,
      taken_on: out.taken_on && /^\d{4}-\d{2}-\d{2}$/.test(out.taken_on) ? out.taken_on : null,
      lab_name: out.lab_name,
      rows: out.values.map(normalizeRow),
      inbody: out.inbody,
      storage_path: up.error ? null : storage_path,
    }
    return NextResponse.json(body)
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError)
      return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
    if (e instanceof Anthropic.APIError) console.error('[labs] Anthropic API error', e.status, e.message)
    if (e instanceof Anthropic.APIError) return NextResponse.json({ error: 'ai_error' }, { status: 502 })
    throw e
  }
}
