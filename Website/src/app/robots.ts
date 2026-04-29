import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/message'] },
    sitemap: 'https://bluelight.edu.et/sitemap.xml',
  }
}
