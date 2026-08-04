'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import ThemeToggle from './ThemeToggle'
import { MdNotifications, MdSettings } from 'react-icons/md'

export default function Navbar() {
  const pathname = usePathname()
  const navItems = [
    { name: 'Predict', href: '/' },
    { name: 'History', href: '/history' },
    { name: 'About', href: '/about' },
  ]

  return (
    <header className="bg-surface dark:bg-surface-dim border-b border-outline-variant shadow-sm h-16 px-4 lg:px-8 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-primary font-headline-md text-headline-md font-bold">PneumoniaAI</span>
        </Link>
        <nav className="hidden md:flex gap-6 h-full items-center">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-body-md font-medium transition-colors h-full flex items-center border-b-2 ${
                pathname === item.href
                  ? 'text-primary border-primary'
                  : 'text-on-surface-variant border-transparent hover:text-primary hover:border-primary'
              }`}
            >
              {item.name}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <button className="text-on-surface-variant hover:text-primary transition-colors">
          <MdNotifications size={24} />
        </button>
        <button className="text-on-surface-variant hover:text-primary transition-colors">
          <MdSettings size={24} />
        </button>
        <div className="w-8 h-8 rounded-full overflow-hidden border border-outline-variant">
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBlJQYUMYGMQqoexBCjKXyxmpe_cTHN_JHkgZScCyqmWOgNThaKjAgYVLvMPQMHEoUnvIfdlAuTIt7tQap_QlPxHbzyPaUfs693awBsnSWYcRxE1ugqUCHrwqmYCU7YiwTLjUe-Ox6titpYQT0NOIoThJ-z-JbFLKYSKbsBibcTkNueRZ-ZSW35QkHqybBYoDKI1Jmk3JUPalvyZJwwyfim3C3sRFsLYypvxkWsSqRzYcCk4D4Ro_Q9cg"
            alt="Profile"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </header>
  )
}