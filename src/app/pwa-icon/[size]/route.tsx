import { appIcon } from '@/lib/app-icon'

export const dynamic = 'force-static'
export const generateStaticParams = () => [{ size: '192' }, { size: '512' }, { size: 'maskable-512' }]

/** PNG app icons for the web manifest, drawn from the logo mark. */
export async function GET(_: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size } = await params
  const maskable = size.startsWith('maskable')
  return appIcon(Number(size.replace('maskable-', '')) || 512, maskable ? 'maskable' : 'rounded')
}
