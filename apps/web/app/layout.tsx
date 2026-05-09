import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'BlackBook - Premium Professional Network',
  description: "Africa's premium professional network for Black decision-makers",
  icons: [{ rel: 'icon', url: '/favicon.ico' }],
  openGraph: {
    title: 'BlackBook - Premium Professional Network',
    description: "Africa's premium professional network for Black decision-makers",
    images: ['/og-image.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
