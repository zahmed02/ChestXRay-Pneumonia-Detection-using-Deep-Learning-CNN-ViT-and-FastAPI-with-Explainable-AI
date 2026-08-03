import './globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Pneumonia Detection AI',
  description: 'Upload a chest X-ray to detect pneumonia using deep learning.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <main className="min-h-screen bg-gray-50 p-4">
          {children}
        </main>
      </body>
    </html>
  )
}