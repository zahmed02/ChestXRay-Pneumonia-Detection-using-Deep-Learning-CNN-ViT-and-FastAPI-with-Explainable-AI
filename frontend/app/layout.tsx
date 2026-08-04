import './globals.css'
import { Inter, Manrope, JetBrains_Mono } from 'next/font/google'
import Navbar from '@/components/Navbar'
import type { Metadata } from 'next'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope' })
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains' })

export const metadata: Metadata = {
  title: 'PneumoniaAI - Chest X-Ray Diagnosis',
  description: 'AI-powered pneumonia detection from chest X-rays with explainability.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-on-background font-body-lg antialiased min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 lg:px-8 lg:py-10">
          {children}
        </main>
        <footer className="border-t border-outline-variant py-4 px-4 text-center text-sm text-on-surface-variant">
          © 2026 PneumoniaAI – For clinical decision support only.
        </footer>
      </body>
    </html>
  )
}