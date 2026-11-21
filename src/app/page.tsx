import { redirect } from 'next/navigation'

/** The app has no landing page of its own — the website is the front door. Signed-out users go to login. */
export default function Home() {
  redirect('/today')
}
