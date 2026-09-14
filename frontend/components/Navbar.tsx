'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MdHistory, MdLocalHospital, MdUploadFile } from 'react-icons/md'
import ThemeToggle from './ThemeToggle'

export default function Navbar() {
  const pathname = usePathname()
  const items = [
    { name: 'New analysis', href: '/', icon: MdUploadFile },
    { name: 'History', href: '/history', icon: MdHistory },
  ]

  return (
    <header className="sticky top-0 z-50 border-b bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="PneumoniaAI home">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm"><MdLocalHospital className="text-2xl" /></span>
          <span><span className="block font-display text-lg font-extrabold tracking-tight">PneumoniaAI</span><span className="hidden text-[10px] font-semibold uppercase tracking-[.18em] text-muted-foreground sm:block">Chest X-ray lab</span></span>
        </Link>
        <nav className="flex items-center gap-1 rounded-full border bg-card p-1" aria-label="Primary navigation">
          {items.map(({ name, href, icon: Icon }) => {
            const active = pathname === href
            return <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={`flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition-colors sm:px-4 ${active ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}><Icon data-icon="inline-start" /> <span className="hidden sm:inline">{name}</span></Link>
          })}
        </nav>
        <div className="flex items-center gap-3"><span className="hidden items-center gap-2 text-xs font-medium text-muted-foreground lg:flex"><span className="size-2 rounded-full bg-primary" /> API guidance active</span><ThemeToggle /></div>
      </div>
    </header>
  )
}
