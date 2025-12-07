import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://quizzerd.com'

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/sign-in/',
          '/sign-up/',
          '/exam/*/edit',
          '/exam/*/preview',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}

