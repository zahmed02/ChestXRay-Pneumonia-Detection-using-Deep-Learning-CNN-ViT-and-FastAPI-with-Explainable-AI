import './globals.css'
import { Inter, Manrope } from 'next/font/google'
import Navbar from '@/components/Navbar'
import type { Metadata } from 'next'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope' })

export const metadata: Metadata = {
  title: 'PneumoniaAI | Chest X-ray analysis',
  description: 'AI-assisted chest X-ray analysis with transparent, reviewable results.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${manrope.variable} min-h-screen antialiased`}>
        <Navbar />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">{children}</main>
        <footer className="border-t px-4 py-5 text-center text-xs text-muted-foreground">
          PneumoniaAI is a clinical decision-support aid, not a substitute for professional review.
        </footer>
      </body>
    </html>
  )
}
