'use client'

import { useEffect, useState } from 'react'
import { MdLightMode, MdDarkMode } from 'react-icons/md'

export default function ThemeToggle() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark')
    setDark(isDark)
  }, [])

  const toggle = () => {
    const html = document.documentElement
    html.classList.toggle('dark')
    html.classList.toggle('light')
    setDark(html.classList.contains('dark'))
  }

  return (
    <button onClick={toggle} className="text-on-surface-variant hover:text-primary transition-colors">
      {dark ? <MdLightMode size={24} /> : <MdDarkMode size={24} />}
    </button>
  )
}