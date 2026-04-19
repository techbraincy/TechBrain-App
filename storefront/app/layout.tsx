import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const inter = Inter({ subsets: ['latin', 'greek'], variable: '--font-inter', display: 'swap' })

export const metadata: Metadata = {
  title: 'TechBrain Shop',
  description: 'Order food online',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="el" className={inter.variable}>
      <body>
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  )
}
