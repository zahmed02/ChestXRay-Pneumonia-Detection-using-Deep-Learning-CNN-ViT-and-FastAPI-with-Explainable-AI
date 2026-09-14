'use client'

import { useEffect, useState } from 'react'
import { MdDarkMode, MdLightMode } from 'react-icons/md'

export default function ThemeToggle() {
  const [dark, setDark] = useState(true)

  useEffect(() => {
    const saved = window.localStorage.getItem('pneumoniaai-theme')
    const isDark = saved ? saved === 'dark' : true
    document.documentElement.classList.toggle('dark', isDark)
    document.documentElement.classList.toggle('light', !isDark)
    const timer = window.setTimeout(() => setDark(isDark), 0)
    return () => window.clearTimeout(timer)
  }, [])

  const toggle = () => {
    const next = !dark
    document.documentElement.classList.toggle('dark', next)
    document.documentElement.classList.toggle('light', !next)
    window.localStorage.setItem('pneumoniaai-theme', next ? 'dark' : 'light')
    setDark(next)
  }

  return <button type="button" onClick={toggle} aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'} className="flex size-10 items-center justify-center rounded-full border bg-card text-muted-foreground transition hover:border-primary hover:text-primary">{dark ? <MdLightMode /> : <MdDarkMode />}</button>
}
