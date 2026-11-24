import { afterEach, describe, expect, it, vi } from 'vitest'

const configured = async (url: string, key = 'x'.repeat(30)) => {
  vi.resetModules()
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', url)
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', key)
  return (await import('./env')).isSupabaseConfigured()
}

describe('Supabase configuration check', () => {
  afterEach(() => vi.unstubAllEnvs())
  it('accepts a hosted or a local project', async () => {
    expect(await configured('https://abcdefgh.supabase.co')).toBe(true)
    expect(await configured('http://127.0.0.1:54321')).toBe(true)
    expect(await configured('http://localhost:54321')).toBe(true)
  })
  it('rejects other hosts, plain http outside localhost and a missing key', async () => {
    expect(await configured('https://evil.example.com')).toBe(false)
    expect(await configured('http://abcdefgh.supabase.co')).toBe(false)
    expect(await configured('https://abcdefgh.supabase.co', 'short')).toBe(false)
    expect(await configured('')).toBe(false)
  })
})
