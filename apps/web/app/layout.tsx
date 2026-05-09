import type { Metadata } from 'next'
import './globals.css'
import ThemeWrapper from '@/components/theme/ThemeWrapper'

export const metadata: Metadata = {
  metadataBase: new URL('https://blackbook.com'),
  title: {
    default: 'BlackBook - Premium Professional Network for Black Professionals',
    template: '%s | BlackBook',
  },
  description:
    "Africa's premier professional network connecting Black decision-makers across the continent and diaspora. Join thousands of professionals for networking, mentorship, events, and career growth.",
  keywords: [
    'Black professionals', 'African professional network', 'networking Africa',
    'Black business network', 'mentorship', 'career growth', 'African diaspora',
    'professional community', 'BlackBook', 'premium network',
  ],
  authors: [{ name: 'BlackBook' }],
  icons: [{ rel: 'icon', url: '/favicon.ico' }, { rel: 'apple-touch-icon', url: '/logo.png' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'BlackBook',
    title: 'BlackBook - Premium Professional Network for Black Professionals',
    description:
      "Africa's premier professional network connecting Black decision-makers across the continent and diaspora.",
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'BlackBook - Premium Professional Network',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BlackBook - Premium Professional Network',
    description:
      "Africa's premier professional network connecting Black decision-makers across the continent and diaspora.",
    images: ['/og-image.png'],
  },
  robots: { index: true, follow: true },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('blackbook-theme');if(t==='light')document.documentElement.setAttribute('data-theme','light')}catch(e){}})()`,
          }}
        />
      </head>
      <body>
        <ThemeWrapper>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('blackbook-theme');if(t==='light')document.documentElement.setAttribute('data-theme','light')}catch(e){}})()`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'BlackBook',
              description:
                "Africa's premium professional network for Black decision-makers",
              url: 'https://blackbook.com',
              logo: 'https://blackbook.com/logo.png',
              sameAs: [
                'https://twitter.com/blackbook',
                'https://linkedin.com/company/blackbook',
              ],
            }),
          }}
        />
        </ThemeWrapper>
      </body>
    </html>
  )
}
