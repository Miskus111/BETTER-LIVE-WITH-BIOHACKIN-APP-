import Link from '@/components/ui/Link'
import { webUrl } from '@/lib/web'

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-32 text-center">
      <p className="eyebrow">404</p>
      <h1 className="display mt-3 text-[52px]">Na této adrese nic není.</h1>
      <p className="text-muted mt-3">Stránka, kterou hledáte, v aplikaci neexistuje.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/today" className="btn btn-primary">
          Do aplikace
        </Link>
        <a href={webUrl('/jak-funguje-telo')} className="btn btn-ghost">
          Jak funguje tělo
        </a>
      </div>
    </div>
  )
}
